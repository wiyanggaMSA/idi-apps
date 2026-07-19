<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cash\TransactionStoreRequest;
use App\Http\Requests\Cash\TransactionUpdateRequest;
use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\Document;
use App\Models\FinancialActionRequest;
use App\Services\Cash\LedgerBalanceService;
use App\Services\Cash\TransactionQueryService;
use App\Services\Finance\FinancePeriodService;
use App\Services\Finance\FinancialActionRequestService;
use Carbon\CarbonImmutable;
use Illuminate\Http\File;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Inertia\Inertia;
use Inertia\Response;

class TransactionsController extends Controller
{
    public function index(Request $request, TransactionQueryService $queryService, LedgerBalanceService $balanceService): Response
    {
        $this->authorize('viewAny', CashTransaction::class);

        $perPage = (int) $request->input('perPage', 10);
        $page = (int) $request->input('page', 1);
        $sortBy = $request->input('sortBy', 'tx_date');
        $sortDir = $request->input('sortDir', 'desc');

        $query = CashTransaction::query()
            ->with(['category', 'method', 'member', 'attachmentDocument'])
            ->validForFinance();

        $queryService->applyFilters($query, $request, true);
        $queryService->applySorting($query, $sortBy, $sortDir);

        $transactions = $query
            ->paginate($perPage)
            ->withQueryString();

        $pendingVoidIds = FinancialActionRequest::query()
            ->where('actionable_type', (new CashTransaction())->getMorphClass())
            ->where('action', FinancialActionRequest::ACTION_VOID)
            ->where('status', FinancialActionRequest::STATUS_PENDING)
            ->whereIn('actionable_id', $transactions->getCollection()->pluck('id'))
            ->pluck('actionable_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $balanceContext = $balanceService->summaryForPage($request, $queryService, $query, $page, $perPage, $sortDir);
        $mapped = $balanceService->decorateTransactions(
            $transactions->getCollection(),
            $balanceContext['running_balance_start'],
            $sortDir,
            $pendingVoidIds
        );

        $transactions->setCollection($mapped);

        return Inertia::render('Transactions/Index', [
            'transactions' => $transactions,
            'summary' => [
                ...$balanceContext['summary'],
                'opening_balance' => $balanceContext['opening_balance'],
                'closing_balance' => $balanceContext['closing_balance'],
            ],
            'filters' => [
                'search' => $request->input('search'),
                'type' => $request->input('type'),
                'category_id' => $request->input('category_id'),
                'method_id' => $request->input('method_id'),
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
                'sortBy' => $sortBy,
                'sortDir' => $sortDir,
                'perPage' => $perPage,
            ],
            'categories' => CashCategory::query()->active()->orderBy('name')->get(['id', 'name', 'type']),
            'methods' => CashMethod::query()->active()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(TransactionStoreRequest $request, FinancePeriodService $financePeriodService): RedirectResponse
    {
        $this->authorize('create', CashTransaction::class);

        $data = $request->validated();
        try {
            $financePeriodService->ensureOpen(
                $data['tx_date'],
                'Periode transaksi sudah closed. Buat adjustment pada periode yang masih open.'
            );
        } catch (\RuntimeException $exception) {
            return redirect()->back()->withErrors(['transaction' => $exception->getMessage()]);
        }

        $lock = Cache::lock($this->cashStoreLockKey($request->user()->id, $data), 10);

        if (! $lock->get()) {
            return redirect()->back()->withErrors([
                'transaction' => 'Transaksi sedang diproses. Mohon jangan submit berulang.',
            ]);
        }

        try {
            DB::transaction(function () use ($request, $data) {
                $documentId = $this->storeAttachment($request->file('attachment'), $request->user()->id);

                $transaction = CashTransaction::query()->create([
                    'tx_date' => $data['tx_date'],
                    'type' => $data['type'],
                    'category_id' => $data['category_id'],
                    'method_id' => $data['method_id'],
                    'amount' => $data['amount'],
                    'description' => $data['description'] ?? null,
                    'reference_no' => $data['reference_no'] ?? null,
                    'attachment_document_id' => $documentId,
                    'created_by' => $request->user()->id,
                ]);

                activity('finance')
                    ->causedBy($request->user())
                    ->performedOn($transaction)
                    ->withProperties(['attributes' => $this->transactionSnapshot($transaction)])
                    ->log('cash_transaction.created');
            });
        } finally {
            $lock->release();
        }

        return redirect()->back()->with('success', 'Transaksi berhasil ditambahkan.');
    }

    public function update(TransactionUpdateRequest $request, CashTransaction $transaction, FinancePeriodService $financePeriodService): RedirectResponse
    {
        $this->authorize('updateNonFinancialFields', $transaction);

        $this->rejectImmutableFieldChanges($request, $transaction);

        try {
            $financePeriodService->ensureOpen(
                $transaction->tx_date,
                'Periode transaksi sudah closed. Field transaksi tidak dapat diubah setelah tutup buku.'
            );
        } catch (\RuntimeException $exception) {
            return redirect()->back()->withErrors(['transaction' => $exception->getMessage()]);
        }

        $data = $request->validated();

        DB::transaction(function () use ($request, $data, $transaction) {
            $before = $this->transactionSnapshot($transaction->fresh());

            $documentId = $transaction->attachment_document_id;
            $previousDocumentId = $transaction->attachment_document_id;

            if ($request->boolean('remove_attachment')) {
                $documentId = null;
            }

            if ($request->file('attachment')) {
                $documentId = $this->storeAttachment($request->file('attachment'), $request->user()->id);
            }

            $transaction->update([
                'description' => $data['description'] ?? null,
                'reference_no' => $data['reference_no'] ?? null,
                'attachment_document_id' => $documentId,
                'updated_by' => $request->user()->id,
            ]);

            if ($previousDocumentId && $previousDocumentId !== $documentId) {
                $this->cleanupDocumentIfOrphan((int) $previousDocumentId);
            }

            activity('finance')
                ->causedBy($request->user())
                ->performedOn($transaction)
                ->withProperties([
                    'reason' => $data['reason'],
                    'before' => $before,
                    'after' => $after = $this->transactionSnapshot($transaction->fresh()),
                    'changes' => $this->snapshotChanges($before, $after),
                ])
                ->log('cash_transaction.updated');
        });

        return redirect()->back()->with('success', 'Transaksi berhasil diperbarui.');
    }

    public function destroy(Request $request, CashTransaction $transaction, FinancialActionRequestService $actionRequestService, FinancePeriodService $financePeriodService): RedirectResponse
    {
        $this->authorize('requestVoid', $transaction);

        $data = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        try {
            $financePeriodService->ensureOpen(
                $transaction->tx_date,
                'Periode transaksi sudah closed. Void hanya dapat dilakukan melalui adjustment pada periode open.'
            );
            $actionRequestService->requestVoid($transaction, $data['reason'], $request->user());
        } catch (\RuntimeException $exception) {
            return redirect()->back()->withErrors(['transaction' => $exception->getMessage()]);
        }

        return redirect()->back()->with('success', 'Request void transaksi dikirim untuk approval.');
    }

    public function attachment(Request $request, CashTransaction $transaction, Document $document): BinaryFileResponse
    {
        $this->authorize('view', $transaction);

        if ((int) $transaction->attachment_document_id !== (int) $document->id) {
            abort(403);
        }

        [$disk, $path] = $this->resolveDocumentStorage($document);
        if (! $disk || ! $path) {
            abort(404);
        }

        $absolutePath = Storage::disk($disk)->path($path);
        $headers = [
            'Content-Type' => $document->mime_type ?: (new File($absolutePath))->getMimeType(),
        ];

        if ($request->boolean('download')) {
            return response()->download(
                $absolutePath,
                $document->title ?: basename($path),
                $headers
            );
        }

        return response()->file($absolutePath, $headers);
    }

    private function storeAttachment(?UploadedFile $file, int $userId): ?int
    {
        if (! $file) {
            return null;
        }

        $periodFolder = now()->format('Y-m');
        $baseFolder = "transactions/{$periodFolder}";
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $filename = sprintf(
            '%s-%s.%s',
            now()->format('Ymd-His'),
            Str::lower(Str::random(8)),
            $extension
        );

        $path = $file->storeAs($baseFolder, $filename, 'local');

        $document = Document::query()->create([
            'title' => $file->getClientOriginalName(),
            'category' => 'cash_transaction',
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'uploaded_by' => $userId,
        ]);

        return $document->id;
    }

    private function cleanupDocumentIfOrphan(int $documentId): void
    {
        $isStillUsed = CashTransaction::query()
            ->where('attachment_document_id', $documentId)
            ->exists();

        if ($isStillUsed) {
            return;
        }

        $document = Document::query()->find($documentId);
        if (! $document) {
            return;
        }

        [$disk, $path] = $this->resolveDocumentStorage($document);
        if ($disk && $path && Storage::disk($disk)->exists($path)) {
            Storage::disk($disk)->delete($path);
        }

        $document->delete();
    }

    /**
     * @return array{0:?string,1:?string}
     */
    private function resolveDocumentStorage(Document $document): array
    {
        $path = $document->file_path;
        if (! $path) {
            return [null, null];
        }

        if (Storage::disk('local')->exists($path)) {
            return ['local', $path];
        }

        if (Storage::disk('public')->exists($path)) {
            return ['public', $path];
        }

        return [null, null];
    }

    private function rejectImmutableFieldChanges(Request $request, CashTransaction $transaction): void
    {
        $immutableFields = [
            'amount',
            'type',
            'tx_date',
            'category_id',
            'method_id',
            'dues_payment_id',
            'transaction_number',
            'created_by',
            'voided_at',
            'voided_by',
        ];

        foreach ($immutableFields as $field) {
            if (! $request->exists($field)) {
                continue;
            }

            if (! $this->immutableValueEquals($field, $request->input($field), $transaction->{$field})) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'transaction' => 'Transaksi yang sudah tercatat tidak dapat diubah pada nominal/tanggal/tipe/kategori. Silakan lakukan void/reversal lalu buat transaksi baru.',
                ]);
            }
        }
    }

    private function cashStoreLockKey(int $userId, array $data): string
    {
        return 'cash_transaction_store_'.$userId.'_'.sha1(json_encode([
            'tx_date' => $data['tx_date'] ?? null,
            'type' => $data['type'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'method_id' => $data['method_id'] ?? null,
            'amount' => $data['amount'] ?? null,
            'reference_no' => $data['reference_no'] ?? null,
        ]));
    }

    private function immutableValueEquals(string $field, mixed $incoming, mixed $current): bool
    {
        if (is_array($incoming)) {
            return false;
        }

        if ($field === 'tx_date') {
            try {
                return CarbonImmutable::parse($incoming)->equalTo(CarbonImmutable::parse($current));
            } catch (\Throwable) {
                return false;
            }
        }

        if (in_array($field, ['amount', 'category_id', 'method_id', 'dues_payment_id', 'created_by', 'voided_by'], true)) {
            return (string) ($incoming ?? '') === (string) ($current ?? '');
        }

        if ($field === 'voided_at') {
            try {
                $incomingValue = $incoming ? CarbonImmutable::parse($incoming)->format('Y-m-d H:i:s') : null;
                $currentValue = $current ? CarbonImmutable::parse($current)->format('Y-m-d H:i:s') : null;
            } catch (\Throwable) {
                return false;
            }

            return $incomingValue === $currentValue;
        }

        return (string) ($incoming ?? '') === (string) ($current ?? '');
    }

    private function transactionSnapshot(?CashTransaction $transaction): array
    {
        if (! $transaction) {
            return [];
        }

        return [
            'id' => $transaction->id,
            'transaction_number' => $transaction->transaction_number,
            'tx_date' => optional($transaction->tx_date)->format('Y-m-d H:i:s'),
            'type' => $transaction->type,
            'category_id' => $transaction->category_id,
            'method_id' => $transaction->method_id,
            'amount' => $transaction->amount,
            'description' => $transaction->description,
            'reference_no' => $transaction->reference_no,
            'member_id' => $transaction->member_id,
            'dues_payment_id' => $transaction->dues_payment_id,
            'attachment_document_id' => $transaction->attachment_document_id,
            'voided_at' => optional($transaction->voided_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function snapshotChanges(array $before, array $after): array
    {
        $changes = [];

        foreach ($after as $field => $afterValue) {
            $beforeValue = $before[$field] ?? null;
            if ($beforeValue !== $afterValue) {
                $changes[$field] = [
                    'before' => $beforeValue,
                    'after' => $afterValue,
                ];
            }
        }

        return $changes;
    }
}
