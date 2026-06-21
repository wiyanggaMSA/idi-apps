<?php

namespace Database\Seeders;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\Division;
use App\Models\MemberStatus;
use App\Models\Position;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Seeder;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedDivisions();
        $this->seedPositions();
        $this->seedCashCategories();
        $this->seedCashMethods();
        $this->seedMemberStatuses();
    }

    private function seedDivisions(): void
    {
        $divisions = [
            ['code' => 'ORG', 'name' => 'Bidang Organisasi'],
            ['code' => 'REK-SIP', 'name' => 'Bidang Rekomendasi SIP dan Keanggotaan'],
            ['code' => 'MKEK', 'name' => 'Majelis Kehormatan Etik Kedokteran'],
            ['code' => 'MPPK', 'name' => 'Majelis Pengembangan Pelayanan Keprofesian'],
            ['code' => 'P2KB', 'name' => 'Bidang Pendidikan Kedokteran Berkelanjutan'],
            ['code' => 'YANMAS', 'name' => 'Bidang Pengabdian Masyarakat'],
            ['code' => 'ADVOKASI', 'name' => 'Bidang Hukum dan Advokasi Anggota'],
            ['code' => 'HUMAS', 'name' => 'Bidang Humas dan Kemitraan'],
            ['code' => 'SEKRETARIAT', 'name' => 'Kesekretariatan'],
            ['code' => 'KEU-ASET', 'name' => 'Keuangan dan Aset Organisasi'],
        ];

        foreach ($divisions as $division) {
            $this->upsertWithTrashed(Division::class, ['code' => $division['code']], [
                ...$division,
                'is_active' => true,
            ]);
        }
    }

    private function seedPositions(): void
    {
        $positions = [
            ['code' => 'KETUA', 'name' => 'Ketua'],
            ['code' => 'WAKIL-KETUA', 'name' => 'Wakil Ketua'],
            ['code' => 'SEKRETARIS', 'name' => 'Sekretaris'],
            ['code' => 'WAKIL-SEKRETARIS', 'name' => 'Wakil Sekretaris'],
            ['code' => 'BENDAHARA', 'name' => 'Bendahara'],
            ['code' => 'WAKIL-BENDAHARA', 'name' => 'Wakil Bendahara'],
            ['code' => 'KETUA-BIDANG', 'name' => 'Ketua Bidang'],
            ['code' => 'SEKRETARIS-BIDANG', 'name' => 'Sekretaris Bidang'],
            ['code' => 'KOORDINATOR', 'name' => 'Koordinator'],
            ['code' => 'ANGGOTA-PENGURUS', 'name' => 'Anggota Pengurus'],
            ['code' => 'DEWAN-PERTIMBANGAN', 'name' => 'Dewan Pertimbangan'],
            ['code' => 'DEWAN-PENASEHAT', 'name' => 'Dewan Penasehat'],
            ['code' => 'KETUA-MKEK', 'name' => 'Ketua MKEK'],
            ['code' => 'KETUA-MPPK', 'name' => 'Ketua MPPK'],
            ['code' => 'ADMIN-SEKRETARIAT', 'name' => 'Admin Sekretariat'],
        ];

        foreach ($positions as $position) {
            $this->upsertWithTrashed(Position::class, ['code' => $position['code']], [
                ...$position,
                'is_active' => true,
            ]);
        }
    }

    private function seedCashCategories(): void
    {
        $categories = [
            ['type' => 'in', 'code' => 'IURAN', 'name' => 'Iuran Anggota'],
            ['type' => 'in', 'code' => 'DONASI', 'name' => 'Donasi dan Hibah'],
            ['type' => 'in', 'code' => 'KEGIATAN-IN', 'name' => 'Pendapatan Kegiatan'],
            ['type' => 'in', 'code' => 'SPONSORSHIP', 'name' => 'Sponsorship dan Kemitraan'],
            ['type' => 'in', 'code' => 'BUNGA-BANK', 'name' => 'Bunga Bank'],
            ['type' => 'in', 'code' => 'REFUND', 'name' => 'Pengembalian Dana'],
            ['type' => 'out', 'code' => 'OPS-SEKRETARIAT', 'name' => 'Operasional Sekretariat'],
            ['type' => 'out', 'code' => 'HONOR-TRANSPORT', 'name' => 'Honorarium dan Transport'],
            ['type' => 'out', 'code' => 'CME', 'name' => 'Kegiatan Ilmiah dan CME'],
            ['type' => 'out', 'code' => 'BAKSOS', 'name' => 'Bakti Sosial'],
            ['type' => 'out', 'code' => 'RAPAT', 'name' => 'Rapat dan Konsumsi'],
            ['type' => 'out', 'code' => 'ADMIN-BANK', 'name' => 'Administrasi Bank'],
            ['type' => 'out', 'code' => 'PERLENGKAPAN', 'name' => 'Perlengkapan dan Inventaris'],
            ['type' => 'out', 'code' => 'PUBLIKASI', 'name' => 'Komunikasi dan Publikasi'],
            ['type' => 'out', 'code' => 'PERJALANAN', 'name' => 'Perjalanan Dinas'],
            ['type' => 'out', 'code' => 'LEGAL-PAJAK', 'name' => 'Legal, Perizinan, dan Pajak'],
            ['type' => 'out', 'code' => 'LAIN-LAIN', 'name' => 'Lain-lain'],
        ];

        foreach ($categories as $category) {
            $this->upsertWithTrashed(CashCategory::class, ['code' => $category['code']], [
                ...$category,
                'is_active' => true,
            ]);
        }
    }

    private function seedCashMethods(): void
    {
        $allowedMethods = ['Cash', 'Transfer'];

        foreach ($allowedMethods as $name) {
            $this->upsertWithTrashed(CashMethod::class, ['name' => $name], [
                'name' => $name,
                'is_active' => true,
            ]);
        }

        CashMethod::query()
            ->whereNotIn('name', $allowedMethods)
            ->update(['is_active' => false]);
    }

    private function seedMemberStatuses(): void
    {
        $statuses = [
            [
                'code' => 'aktif',
                'name' => 'Aktif',
                'sort_order' => 10,
                'is_active_member' => true,
                'is_billable' => true,
                'is_deceased' => false,
            ],
            [
                'code' => 'meninggal',
                'name' => 'Meninggal',
                'sort_order' => 20,
                'is_active_member' => false,
                'is_billable' => false,
                'is_deceased' => true,
            ],
            [
                'code' => 'mutasi',
                'name' => 'Mutasi',
                'sort_order' => 30,
                'is_active_member' => false,
                'is_billable' => false,
                'is_deceased' => false,
            ],
        ];

        foreach ($statuses as $status) {
            $this->upsertWithTrashed(MemberStatus::class, ['code' => $status['code']], [
                ...$status,
                'is_active' => true,
            ]);
        }

        MemberStatus::query()
            ->whereNotIn('code', collect($statuses)->pluck('code')->all())
            ->update(['is_active' => false]);
    }

    /**
     * @param class-string<Model> $modelClass
     */
    private function upsertWithTrashed(string $modelClass, array $attributes, array $values): Model
    {
        $query = $modelClass::query();

        if (in_array(SoftDeletes::class, class_uses_recursive($modelClass), true)) {
            $query = $modelClass::withTrashed();
        }

        $model = $query->where($attributes)->first();

        if (! $model) {
            return $modelClass::query()->create($values);
        }

        $model->fill($values);

        if (method_exists($model, 'trashed') && $model->trashed()) {
            $model->restore();
        }

        $model->save();

        return $model;
    }
}
