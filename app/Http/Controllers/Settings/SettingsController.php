<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Settings/Index', [
            'profile' => [
                'name' => 'IDI Cabang Purwakarta',
                'address' => 'Sekretariat IDI Purwakarta',
                'phone' => '',
                'email' => '',
                'logo_url' => null,
            ],
            'counts' => [
                'divisions' => 0,
                'positions' => 0,
                'cash_categories' => 0,
                'payment_statuses' => 0,
            ],
            'backups' => [
                ['id' => 1, 'scope' => 'members', 'created_at' => '2026-01-12 10:11', 'file' => 'backups/members_20260112.sql'],
                ['id' => 2, 'scope' => 'finance', 'created_at' => '2026-01-12 10:15', 'file' => 'backups/finance_20260112.sql'],
            ],
        ]);
    }
}
