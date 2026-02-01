<?php

namespace App\Http\Controllers\Members;

use App\Exports\MemberTemplateExport;
use App\Exports\MembersExport;
use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\MemberImportBatch;
use App\Models\MemberImportRow;
use App\Services\Members\MemberImportResolveService;
use App\Services\Members\MemberImportService;
use App\Services\Members\MemberQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class MemberImportExportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Members/ImportExport');
    }

    public function template(Request $request)
    {
        $format = $this->resolveFormat($request->input('format', 'xlsx'));
        $filename = "members-template.{$format}";

        return Excel::download(new MemberTemplateExport(), $filename, $this->formatType($format));
    }

    public function import(Request $request, MemberImportService $service): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv'],
        ]);

        $summary = $service->import($request->file('file'), $request->user()->id);

        return response()->json($summary);
    }

    public function conflicts(MemberImportBatch $batch): JsonResponse
    {
        $perPage = request()->integer('per_page', 200);
        $perPage = max(1, min($perPage, 200));

        $rows = MemberImportRow::query()
            ->where('batch_id', $batch->id)
            ->whereNotNull('conflict_type')
            ->orderBy('row_number')
            ->paginate($perPage);

        $rows->getCollection()->transform(function (MemberImportRow $row) {
            $members = Member::query()
                ->whereIn('id', $row->conflict_member_ids ?? [])
                ->get(['id', 'npa', 'full_name', 'email']);

            return [
                'id' => $row->id,
                'row_number' => $row->row_number,
                'npa' => $row->npa,
                'full_name' => $row->full_name,
                'email' => $row->email,
                'phone' => $row->phone,
                'division_name' => $row->division_name,
                'position_name' => $row->position_name,
                'status' => $row->status,
                'conflict_type' => $row->conflict_type ?? [],
                'conflict_members' => $members,
                'resolved_at' => optional($row->resolved_at)->toDateTimeString(),
                'action' => $row->action,
            ];
        });

        return response()->json($rows);
    }

    public function resolve(
        MemberImportBatch $batch,
        Request $request,
        MemberImportResolveService $service
    ): JsonResponse {
        $data = $request->validate([
            'actions' => ['required', 'array'],
            'actions.*.row_id' => ['required', 'integer', 'exists:member_import_rows,id'],
            'actions.*.action' => ['required', 'in:update,create,discard'],
            'actions.*.target_member_id' => ['nullable', 'integer', 'exists:members,id'],
        ]);

        foreach ($data['actions'] as $action) {
            if ($action['action'] === 'update' && empty($action['target_member_id'])) {
                return response()->json([
                    'message' => 'Target member wajib dipilih untuk aksi update.',
                ], 422);
            }
        }

        $summary = $service->resolve($batch, $data['actions'], $request->user()->id);

        return response()->json($summary);
    }

    public function export(Request $request, MemberQueryService $queryService)
    {
        $format = $this->resolveFormat($request->input('format', 'xlsx'));
        $filename = "members-export.{$format}";

        $query = $queryService->query($request)->with(['division', 'position']);

        return Excel::download(new MembersExport($query), $filename, $this->formatType($format));
    }

    private function resolveFormat(string $format): string
    {
        return strtolower($format) === 'csv' ? 'csv' : 'xlsx';
    }

    private function formatType(string $format): string
    {
        return $format === 'csv'
            ? \Maatwebsite\Excel\Excel::CSV
            : \Maatwebsite\Excel\Excel::XLSX;
    }
}
