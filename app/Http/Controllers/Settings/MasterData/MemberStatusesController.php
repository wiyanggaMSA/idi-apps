<?php

namespace App\Http\Controllers\Settings\MasterData;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\MemberStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MemberStatusesController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->merge([
            'code' => strtolower(trim((string) $request->input('code'))),
            'name' => trim((string) $request->input('name')),
        ]);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('member_statuses', 'code')],
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active_member' => ['sometimes', 'boolean'],
            'is_billable' => ['sometimes', 'boolean'],
            'is_deceased' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        MemberStatus::create([
            'code' => strtolower($data['code']),
            'name' => $data['name'],
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active_member' => $data['is_active_member'] ?? false,
            'is_billable' => $data['is_billable'] ?? false,
            'is_deceased' => $data['is_deceased'] ?? false,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return back()->with('success', 'Status anggota berhasil ditambahkan.');
    }

    public function destroy(MemberStatus $memberStatus): RedirectResponse
    {
        if (Member::query()->where('status', $memberStatus->code)->exists()) {
            return back()->with('error', 'Status anggota masih dipakai oleh data anggota dan tidak bisa dihapus.');
        }

        $memberStatus->delete();

        return back()->with('success', 'Status anggota berhasil dihapus.');
    }

    public function update(Request $request, MemberStatus $memberStatus): RedirectResponse
    {
        $request->merge([
            'code' => strtolower(trim((string) $request->input('code'))),
            'name' => trim((string) $request->input('name')),
        ]);

        $data = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                'alpha_dash',
                Rule::unique('member_statuses', 'code')->ignore($memberStatus->id)->whereNull('deleted_at'),
            ],
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active_member' => ['sometimes', 'boolean'],
            'is_billable' => ['sometimes', 'boolean'],
            'is_deceased' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($memberStatus->code !== $data['code'] && Member::query()->where('status', $memberStatus->code)->exists()) {
            return back()->with('error', 'Kode status anggota masih dipakai oleh data anggota dan tidak bisa diubah.');
        }

        $memberStatus->update([
            'code' => $data['code'],
            'name' => $data['name'],
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active_member' => $data['is_active_member'] ?? false,
            'is_billable' => $data['is_billable'] ?? false,
            'is_deceased' => $data['is_deceased'] ?? false,
            'is_active' => $data['is_active'] ?? false,
        ]);

        return back()->with('success', 'Status anggota berhasil diperbarui.');
    }
}
