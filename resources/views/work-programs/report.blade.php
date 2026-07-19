<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Program Kerja</title>
    <style>
        body { color: #18181b; font-family: DejaVu Sans, Arial, sans-serif; font-size: 11px; margin: 24px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .muted { color: #71717a; }
        .summary { display: table; margin: 16px 0; width: 100%; }
        .summary div { border: 1px solid #d4d4d8; display: table-cell; padding: 8px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #d4d4d8; padding: 6px; text-align: left; vertical-align: top; }
        th { background: #f4f4f5; font-weight: 700; }
        .number { text-align: right; white-space: nowrap; }
        @media print { body { margin: 12px; } }
    </style>
</head>
<body>
    <h1>Laporan Program Kerja</h1>
    <div class="muted">Dicetak pada {{ $generatedAt->format('Y-m-d H:i:s') }}</div>

    @if (! empty($filters))
        <p class="muted">Filter aktif: {{ collect($filters)->map(fn ($value, $key) => "{$key}: {$value}")->implode(', ') }}</p>
    @endif

    <div class="summary">
        <div><strong>Total</strong><br>{{ $summary['total'] }}</div>
        <div><strong>Terlambat</strong><br>{{ $summary['overdue'] }}</div>
        <div><strong>Rata-rata Progress</strong><br>{{ $summary['average_progress'] }}%</div>
        <div><strong>Estimasi Anggaran</strong><br>Rp {{ number_format($summary['estimated_budget'], 0, ',', '.') }}</div>
        <div><strong>Realisasi Anggaran</strong><br>Rp {{ number_format($summary['realized_budget'], 0, ',', '.') }}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Kode</th>
                <th>Nama Program</th>
                <th>Periode</th>
                <th>Tahun</th>
                <th>Bidang</th>
                <th>Status</th>
                <th>Prioritas</th>
                <th>Progress</th>
                <th>PIC</th>
                <th>Rencana</th>
                <th>Terlambat</th>
                <th>Anggaran</th>
                <th>Task</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    <td>{{ $row['program_code'] }}</td>
                    <td>{{ $row['name'] }}</td>
                    <td>{{ $row['period'] }}</td>
                    <td>{{ $row['year'] }}</td>
                    <td>{{ $row['division'] }}</td>
                    <td>{{ $row['status'] }}</td>
                    <td>{{ $row['priority'] }}</td>
                    <td class="number">{{ $row['progress'] }}%</td>
                    <td>{{ $row['primary_pic'] }}</td>
                    <td>{{ $row['planned_start_date'] }} s.d. {{ $row['planned_end_date'] }}</td>
                    <td>{{ $row['overdue'] ? 'Ya' : 'Tidak' }}</td>
                    <td class="number">
                        Est. Rp {{ number_format($row['estimated_budget'], 0, ',', '.') }}<br>
                        Real. Rp {{ number_format($row['realized_budget'], 0, ',', '.') }}
                    </td>
                    <td>{{ $row['task_completed'] }}/{{ $row['task_total'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="13">Tidak ada data laporan.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
