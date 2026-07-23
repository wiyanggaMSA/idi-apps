<?php

namespace Database\Seeders;

use App\Models\Division;
use App\Models\Member;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\Position;
use App\Models\User;
use App\Services\Organization\OrganizationAssignmentService;
use App\Support\RoleName;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;
use Spatie\Permission\Models\Role;

class OrganizationDemoSeeder extends Seeder
{
    private const PERIOD_NAME = 'Contoh Kepengurusan IDI 2025–2028';

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('OrganizationDemoSeeder tidak boleh dijalankan di production.');
        }

        DB::transaction(function (): void {
            $actor = User::query()
                ->whereHas('roles', fn ($query) => $query->whereRaw('lower(name) = ?', [RoleName::SUPERADMIN]))
                ->orderBy('id')
                ->first()
                ?? User::query()
                    ->whereHas('roles', fn ($query) => $query->whereRaw('lower(name) = ?', [RoleName::ADMIN]))
                    ->orderBy('id')
                    ->first()
                ?? throw new RuntimeException('Seeder membutuhkan user superadmin atau admin.');

            $period = $this->period($actor);
            $units = $this->units($period, $actor);
            $slots = $this->slots($period, $units);

            foreach ($this->appointments() as $appointment) {
                $member = $this->member($appointment);
                $slot = $slots[$appointment['slot']];

                $existing = OrganizationAssignment::query()
                    ->where('period_id', $period->id)
                    ->where('unit_position_id', $slot->id)
                    ->current()
                    ->first();

                if ($existing) {
                    continue;
                }

                app(OrganizationAssignmentService::class)->assign([
                    'period_id' => $period->id,
                    'organization_unit_id' => $slot->organization_unit_id,
                    'unit_position_id' => $slot->id,
                    'member_id' => $member->id,
                    'portal_role_id' => RoleName::findOrFail($appointment['role'])->id,
                    'started_at' => '2025-01-18',
                    'appointment_number' => sprintf('001/IDI-PC/SK/I/2025-%02d', $appointment['number']),
                    'appointment_date' => '2025-01-18',
                    'notes' => 'Data contoh untuk visualisasi Dashboard Pengurus.',
                ], $actor);
            }
        });

        $period = OrganizationPeriod::query()->where('name', self::PERIOD_NAME)->firstOrFail();

        $this->command?->info(sprintf(
            'Demo pengurus siap: %s — %d unit, %d slot, %d assignment.',
            $period->name,
            $period->units()->count(),
            $period->unitPositions()->count(),
            $period->assignments()->count()
        ));
    }

    private function period(User $actor): OrganizationPeriod
    {
        $period = OrganizationPeriod::withTrashed()
            ->where('name', self::PERIOD_NAME)
            ->first();

        if (! $period) {
            $period = OrganizationPeriod::factory()->create([
                'name' => self::PERIOD_NAME,
                'start_date' => '2025-01-18',
                'end_date' => '2028-12-31',
                'notes' => 'Periode demo untuk menampilkan contoh struktur dan pengurus.',
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);
        }

        if ($period->trashed()) {
            $period->restore();
        }

        $hasOtherActivePeriod = OrganizationPeriod::query()
            ->whereKeyNot($period->id)
            ->where(fn ($query) => $query
                ->where('status', OrganizationPeriod::STATUS_ACTIVE)
                ->orWhere('is_active', true))
            ->exists();

        $period->update([
            'start_date' => '2025-01-18',
            'end_date' => '2028-12-31',
            'status' => $hasOtherActivePeriod
                ? OrganizationPeriod::STATUS_DRAFT
                : OrganizationPeriod::STATUS_ACTIVE,
            'is_active' => ! $hasOtherActivePeriod,
            'published_at' => $hasOtherActivePeriod ? null : ($period->published_at ?? now()),
            'published_by' => $hasOtherActivePeriod ? null : ($period->published_by ?? $actor->id),
            'activated_at' => $hasOtherActivePeriod ? null : ($period->activated_at ?? now()),
            'activated_by' => $hasOtherActivePeriod ? null : ($period->activated_by ?? $actor->id),
            'ended_at' => null,
            'ended_by' => null,
            'updated_by' => $actor->id,
        ]);

        return $period->fresh();
    }

    /** @return array<string, OrganizationUnit> */
    private function units(OrganizationPeriod $period, User $actor): array
    {
        $definitions = [
            'daily' => [
                'parent' => null,
                'division' => null,
                'name' => 'Pengurus Harian',
                'code' => 'DEMO-HARIAN',
                'type' => 'core',
                'core' => true,
                'order' => 10,
            ],
            'council' => [
                'parent' => null,
                'division' => null,
                'name' => 'Dewan Pertimbangan',
                'code' => 'DEMO-DEWAN',
                'type' => 'council',
                'core' => true,
                'order' => 20,
            ],
            'organization' => [
                'parent' => 'daily',
                'division' => 'ORG',
                'name' => 'Bidang Organisasi',
                'code' => 'DEMO-ORG',
                'type' => 'division',
                'core' => false,
                'order' => 30,
            ],
            'education' => [
                'parent' => 'daily',
                'division' => 'P2KB',
                'name' => 'Bidang Pendidikan Kedokteran Berkelanjutan',
                'code' => 'DEMO-P2KB',
                'type' => 'division',
                'core' => false,
                'order' => 40,
            ],
            'community' => [
                'parent' => 'daily',
                'division' => 'YANMAS',
                'name' => 'Bidang Pengabdian Masyarakat',
                'code' => 'DEMO-YANMAS',
                'type' => 'division',
                'core' => false,
                'order' => 50,
            ],
            'membership_unit' => [
                'parent' => 'organization',
                'division' => 'REK-SIP',
                'name' => 'Unit Keanggotaan dan Rekomendasi SIP',
                'code' => 'DEMO-KEANGGOTAAN',
                'type' => 'bureau',
                'core' => false,
                'order' => 10,
            ],
            'cme_unit' => [
                'parent' => 'education',
                'division' => 'P2KB',
                'name' => 'Unit Ilmiah dan CME',
                'code' => 'DEMO-CME',
                'type' => 'bureau',
                'core' => false,
                'order' => 10,
            ],
            'social_unit' => [
                'parent' => 'community',
                'division' => 'YANMAS',
                'name' => 'Unit Bakti Sosial',
                'code' => 'DEMO-BAKSOS',
                'type' => 'committee',
                'core' => false,
                'order' => 10,
            ],
        ];
        $units = [];

        foreach ($definitions as $key => $definition) {
            $unit = OrganizationUnit::withTrashed()
                ->where('period_id', $period->id)
                ->where('code', $definition['code'])
                ->first();

            $attributes = [
                'period_id' => $period->id,
                'parent_id' => $definition['parent'] ? $units[$definition['parent']]->id : null,
                'master_unit_id' => $definition['division']
                    ? Division::query()->where('code', $definition['division'])->value('id')
                    : null,
                'name' => $definition['name'],
                'code' => $definition['code'],
                'unit_type' => $definition['type'],
                'description' => 'Contoh '.mb_strtolower($definition['name']).' pada struktur kepengurusan.',
                'display_order' => $definition['order'],
                'is_core_structure' => $definition['core'],
                'is_active' => true,
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ];

            if (! $unit) {
                $unit = OrganizationUnit::factory()->create($attributes);
            } else {
                if ($unit->trashed()) {
                    $unit->restore();
                }

                $unit->update($attributes);
            }

            $units[$key] = $unit->fresh();
        }

        return $units;
    }

    /**
     * @param  array<string, OrganizationUnit>  $units
     * @return array<string, OrganizationUnitPosition>
     */
    private function slots(OrganizationPeriod $period, array $units): array
    {
        $definitions = [
            'chair' => ['unit' => 'daily', 'position' => 'KETUA', 'order' => 10],
            'vice_chair' => ['unit' => 'daily', 'position' => 'WAKIL-KETUA', 'order' => 20],
            'secretary' => ['unit' => 'daily', 'position' => 'SEKRETARIS', 'order' => 30],
            'treasurer' => ['unit' => 'daily', 'position' => 'BENDAHARA', 'order' => 40],
            'council_chair' => ['unit' => 'council', 'position' => 'DEWAN-PERTIMBANGAN', 'order' => 10],
            'organization_chair' => ['unit' => 'organization', 'position' => 'KETUA-BIDANG', 'order' => 10],
            'organization_secretary' => ['unit' => 'organization', 'position' => 'SEKRETARIS-BIDANG', 'order' => 20],
            'education_chair' => ['unit' => 'education', 'position' => 'KETUA-BIDANG', 'order' => 10],
            'education_secretary' => ['unit' => 'education', 'position' => 'SEKRETARIS-BIDANG', 'order' => 20],
            'community_chair' => ['unit' => 'community', 'position' => 'KETUA-BIDANG', 'order' => 10],
            'community_secretary' => ['unit' => 'community', 'position' => 'SEKRETARIS-BIDANG', 'order' => 20],
            'membership_coordinator' => ['unit' => 'membership_unit', 'position' => 'KOORDINATOR', 'order' => 10],
            'cme_coordinator' => ['unit' => 'cme_unit', 'position' => 'KOORDINATOR', 'order' => 10],
            'social_coordinator' => ['unit' => 'social_unit', 'position' => 'KOORDINATOR', 'order' => 10],
        ];
        $slots = [];

        foreach ($definitions as $key => $definition) {
            $unit = $units[$definition['unit']];
            $position = Position::query()->where('code', $definition['position'])->firstOrFail();
            $slot = OrganizationUnitPosition::withTrashed()
                ->where('organization_unit_id', $unit->id)
                ->where('position_id', $position->id)
                ->first();

            $attributes = [
                'period_id' => $period->id,
                'organization_unit_id' => $unit->id,
                'position_id' => $position->id,
                'display_order' => $definition['order'],
                'is_required' => true,
                'is_active' => true,
            ];

            if (! $slot) {
                $slot = OrganizationUnitPosition::factory()->required()->create($attributes);
            } else {
                if ($slot->trashed()) {
                    $slot->restore();
                }

                $slot->update($attributes);
            }

            $slots[$key] = $slot->fresh();
        }

        return $slots;
    }

    /** @param array{number: int, name: string, education: string, slot: string, role: string} $appointment */
    private function member(array $appointment): Member
    {
        $email = sprintf('demo.pengurus%02d@example.test', $appointment['number']);
        $npa = sprintf('DEMO-ORG-%03d', $appointment['number']);
        $user = User::withTrashed()->where('email', $email)->first();

        if (! $user) {
            $user = User::factory()->create([
                'name' => $appointment['name'],
                'email' => $email,
                'password' => Hash::make(Str::password(40)),
                'email_verified_at' => now(),
                'is_active' => true,
            ]);
        } else {
            if ($user->trashed()) {
                $user->restore();
            }

            $user->update([
                'name' => $appointment['name'],
                'is_active' => true,
            ]);
        }

        $member = Member::withTrashed()->where('npa', $npa)->first();
        $attributes = [
            'user_id' => $user->id,
            'npa' => $npa,
            'full_name' => $appointment['name'],
            'education' => $appointment['education'],
            'email' => $email,
            'phone' => sprintf('0812-0000-%04d', $appointment['number']),
            'join_date' => '2020-01-01',
            'status' => 'aktif',
            'notes' => 'Member contoh untuk visualisasi modul Pengurus.',
        ];

        if (! $member) {
            return Member::factory()->create($attributes);
        }

        if ($member->trashed()) {
            $member->restore();
        }

        $member->update($attributes);

        return $member->fresh();
    }

    /**
     * @return list<array{number: int, name: string, education: string, slot: string, role: string}>
     */
    private function appointments(): array
    {
        return [
            ['number' => 1, 'name' => 'dr. Raka Pratama', 'education' => 'Sp.PD', 'slot' => 'chair', 'role' => 'ketua'],
            ['number' => 2, 'name' => 'dr. Maya Lestari', 'education' => 'Sp.A', 'slot' => 'vice_chair', 'role' => 'ketua'],
            ['number' => 3, 'name' => 'dr. Andi Kurniawan', 'education' => 'M.Kes', 'slot' => 'secretary', 'role' => 'sekretaris'],
            ['number' => 4, 'name' => 'dr. Sinta Maharani', 'education' => 'Sp.M', 'slot' => 'treasurer', 'role' => 'bendahara'],
            ['number' => 5, 'name' => 'dr. Hendra Wijaya', 'education' => 'Sp.B', 'slot' => 'council_chair', 'role' => 'ketua'],
            ['number' => 6, 'name' => 'dr. Nabila Putri', 'education' => 'Sp.P', 'slot' => 'organization_chair', 'role' => 'ketua'],
            ['number' => 7, 'name' => 'dr. Dimas Saputra', 'education' => 'MARS', 'slot' => 'organization_secretary', 'role' => 'sekretaris'],
            ['number' => 8, 'name' => 'dr. Ratna Dewi', 'education' => 'Sp.KK', 'slot' => 'education_chair', 'role' => 'ketua'],
            ['number' => 9, 'name' => 'dr. Fajar Nugroho', 'education' => 'Sp.OT', 'slot' => 'education_secretary', 'role' => 'sekretaris'],
            ['number' => 10, 'name' => 'dr. Intan Permata', 'education' => 'Sp.OG', 'slot' => 'community_chair', 'role' => 'ketua'],
            ['number' => 11, 'name' => 'dr. Arief Rahman', 'education' => 'Sp.THT-KL', 'slot' => 'community_secretary', 'role' => 'sekretaris'],
            ['number' => 12, 'name' => 'dr. Citra Anindya', 'education' => 'M.H.Kes', 'slot' => 'membership_coordinator', 'role' => 'sekretaris'],
            ['number' => 13, 'name' => 'dr. Bayu Firmansyah', 'education' => 'Sp.JP', 'slot' => 'cme_coordinator', 'role' => 'sekretaris'],
            ['number' => 14, 'name' => 'dr. Laila Hasanah', 'education' => 'Sp.N', 'slot' => 'social_coordinator', 'role' => 'sekretaris'],
        ];
    }
}
