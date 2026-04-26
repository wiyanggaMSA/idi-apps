<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cash\TransactionStoreRequest;
use App\Http\Requests\Cash\TransactionUpdateRequest;
use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\Document;
use App\Services\Cash\LedgerBalanceService;
use App\Services\Cash\TransactionQueryService;
use Illuminate\Http\File;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Inertia\Inertia;
use Inertia\Response;

class TransactionsController extends Controller
{
    public function index(Request $request, TransactionQueryService $queryService, LedgerBalanceService $balanceService): Response
    {
        $perPage = (int) $request->input('perPage', 10);
        $page = (int) $request->input('page', 1);
        $sortBy = $request->input('sortBy', 'tx_date');
        $sortDir = $request->input('sortDir', 'desc');

        $query = CashTransaction::query()
            ->with(['category', 'method', 'member', 'attachmentDocument'])
            ->whereNull('voided_at');

        $queryService->applyFilters($query, $request, true);
        $queryService->applySorting($query, $sortBy, $sortDir);

        $transactions = $query
            ->paginate($perPage)
            ->withQueryString();

        $openingBalance = $balanceService->openingBalance($request, $queryService);
        $openingByMethod = $balanceService->openingBalanceByMethod($request, $queryService);
        $offsetBalance = $balanceService->offsetBalance($query, $page, $perPage);
        $summary = $balanceService->totals($request, $queryService);
        $closingBalance = $openingBalance + ($summary['net'] ?? 0);
        $runningBalance = $sortDir === 'desc'
            ? $closingBalance - $offsetBalance
            : $openingBalance + $offsetBalance;

        $mapped = $transactions->getCollection()->map(function (CashTransaction $transaction) use (&$runningBalance, $sortDir) {
            $delta = $transaction->type === 'in' ? $transaction->amount : -$transaction->amount;
            $description = $transaction->description;

            if ($transaction->dues_payment_id && $transaction->member) {
                $memberLabel = $transaction->member->npa
                    ? sprintf('%s (%s)', $transaction->member->full_name, $transaction->member->npa)
                    : $transaction->member->full_name;
                $description = sprintf('Pembayaran iuran anggota %s', $memberLabel);
            }

            $rowRunningBalance = $sortDir === 'desc' ? $runningBalance : ($runningBalance += $delta);

            if ($sortDir === 'desc') {
                $runningBalance -= $delta;
            }

            return [
                'id' => $transaction->id,
                'tx_date' => optional($transaction->tx_date)->format('Y-m-d H:i:s'),
                'type' => $transaction->type,
                'category_id' => $transaction->category_id,
                'category' => $transaction->category?->name,
                'method_id' => $transaction->method_id,
                'method' => $transaction->method?->name,
                'amount' => $transaction->amount,
                'description' => $description,
                'reference_no' => $transaction->reference_no,
                'member_name' => $transaction->member?->full_name,
                'member_npa' => $transaction->member?->npa,
                'dues_payment_id' => $transaction->dues_payment_id,
                'source' => $transaction->dues_payment_id ? 'Iuran' : 'Manual',
                'attachment' => $transaction->attachmentDocument ? [
                    'id' => $transaction->attachmentDocument->id,
                    'title' => $transaction->attachmentDocument->title,
                    'url' => URL::temporarySignedRoute(
                        'transactions.attachments.show',
                        now()->addMinutes(10),
                        [
                            'transaction' => $transaction->id,
                            'document' => $transaction->attachmentDocument->id,
                        ]
                    ),
                    'download_url' => URL::temporarySignedRoute(
                        'transactions.attachments.show',
                        now()->addMinutes(10),
                        [
                            'transaction' => $transaction->id,
                            'document' => $transaction->attachmentDocument->id,
                            'download' => 1,
                        ]
                    ),
                    'mime_type' => $transaction->attachmentDocument->mime_type,
                    'size' => $transaction->attachmentDocument->size,
                ] : null,
                'running_balance' => $rowRunningBalance,
                'is_locked' => (bool) $transaction->dues_payment_id,
            ];
        });

        $transactions->setCollection($mapped);

        $methodTotals = CashTransaction::query();
        $queryService->applyFilters($methodTotals, $request, true);
        $methodTotals = $methodTotals
            ->selectRaw('method_id, SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->groupBy('method_id')
            ->get()
            ->mapWithKeys(function ($row) use ($openingByMethod) {
                $net = (int) $row->total_in - (int) $row->total_out;
                $opening = $openingByMethod[$row->method_id] ?? 0;

                return [$row->method_id => $opening + $net];
            })
            ->all();

        return Inertia::render('Transactions/Index', [
            'transactions' => $transactions,
            'summary' => [
                ...$summary,
                'opening_balance' => $openingBalance,
                'closing_balance' => $closingBalance,
            ],
            'balances_by_method' => $methodTotals,
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

    public function store(TransactionStoreRequest $request): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($request, $data) {
            $documentId = $this->storeAttachment($request->file('attachment'), $request->user()->id);

            CashTransaction::query()->create([
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
        });

        return redirect()->back()->with('success', 'Transaksi berhasil ditambahkan.');
    }

    public function update(TransactionUpdateRequest $request, CashTransaction $transaction): RedirectResponse
    {
        if ($transaction->dues_payment_id) {
            return redirect()->back()->withErrors(['transaction' => 'Transaksi iuran tidak dapat diubah manual.']);
        }

        $data = $request->validated();

        DB::transaction(function () use ($request, $data, $transaction) {
            $documentId = $transaction->attachment_document_id;
            $previousDocumentId = $transaction->attachment_document_id;

            if ($request->boolean('remove_attachment')) {
                $documentId = null;
            }

            if ($request->file('attachment')) {
                $documentId = $this->storeAttachment($request->file('attachment'), $request->user()->id);
            }

            $transaction->update([
                'tx_date' => $data['tx_date'],
                'type' => $data['type'],
                'category_id' => $data['category_id'],
                'method_id' => $data['method_id'],
                'amount' => $data['amount'],
                'description' => $data['description'] ?? null,
                'reference_no' => $data['reference_no'] ?? null,
                'attachment_document_id' => $documentId,
                'updated_by' => $request->user()->id,
            ]);

            if ($previousDocumentId && $previousDocumentId !== $documentId) {
                $this->cleanupDocumentIfOrphan((int) $previousDocumentId);
            }
        });

        return redirect()->back()->with('success', 'Transaksi berhasil diperbarui.');
    }

    public function destroy(Request $request, CashTransaction $transaction): RedirectResponse
    {
        if ($transaction->dues_payment_id) {
            return redirect()->back()->withErrors(['transaction' => 'Transaksi iuran tidak dapat dihapus manual.']);
        }

        $transaction->update([
            'voided_at' => now(),
            'voided_by' => $request->user()->id,
        ]);

        return redirect()->back()->with('success', 'Transaksi berhasil dibatalkan.');
    }

    public function attachment(Request $request, CashTransaction $transaction, Document $document): BinaryFileResponse
    {
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
}
