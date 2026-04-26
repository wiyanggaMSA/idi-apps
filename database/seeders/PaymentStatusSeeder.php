<?php

namespace Database\Seeders;

use App\Models\PaymentStatus;
use Illuminate\Database\Seeder;

class PaymentStatusSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            ['code' => 'PAID', 'name' => 'Lunas', 'color' => 'green'],
            ['code' => 'UNPAID', 'name' => 'Belum Bayar', 'color' => 'gold'],
            ['code' => 'OVERDUE', 'name' => 'Menunggak', 'color' => 'red'],
            ['code' => 'PARTIAL', 'name' => 'Parsial', 'color' => 'orange'],
            ['code' => 'WAIVED', 'name' => 'Dibebaskan', 'color' => 'cyan'],
        ];

        foreach ($statuses as $status) {
            $existing = PaymentStatus::withTrashed()
                ->where('code', $status['code'])
                ->first();

            if ($existing) {
                $existing->fill([
                    'name' => $status['name'],
                    'color' => $status['color'],
                    'is_active' => true,
                ]);

                if (method_exists($existing, 'trashed') && $existing->trashed()) {
                    $existing->restore();
                }

                $existing->save();
                continue;
            }

            PaymentStatus::query()->create([
                'code' => $status['code'],
                'name' => $status['name'],
                'color' => $status['color'],
                'is_active' => true,
            ]);
        }
    }
}
