<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Kas</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; }
        h1, h2 { margin: 0 0 8px; }
        .muted { color: #6b7280; }
        .kpi { display: inline-block; margin-right: 16px; padding: 8px 12px; background: #f3f4f6; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f9fafb; }
        .right { text-align: right; }
    </style>
</head>
<body>
    <h1>Laporan Kas</h1>
    <div class="muted">{{ $org?->org_name ?? 'Aplikasi Keuangan Organisasi' }}</div>
    <div class="muted">
        Periode:
        {{ $filters['start_date'] ?? '-' }} s/d {{ $filters['end_date'] ?? '-' }}
    </div>

    <div style="margin-top: 12px;">
        <div class="kpi">Total Masuk: Rp {{ number_format($summary['total_in'], 0, ',', '.') }}</div>
        <div class="kpi">Total Keluar: Rp {{ number_format($summary['total_out'], 0, ',', '.') }}</div>
        <div class="kpi">Net: Rp {{ number_format($summary['net'], 0, ',', '.') }}</div>
        <div class="kpi">Saldo Awal: Rp {{ number_format($summary['opening_balance'], 0, ',', '.') }}</div>
        <div class="kpi">Saldo Akhir: Rp {{ number_format($summary['closing_balance'], 0, ',', '.') }}</div>
    </div>

    <h2 style="margin-top: 16px;">Rekap Periode</h2>
    <table>
        <thead>
        <tr>
            <th>Periode</th>
            <th class="right">Masuk</th>
            <th class="right">Keluar</th>
            <th class="right">Net</th>
            <th class="right">Saldo Akhir</th>
        </tr>
        </thead>
        <tbody>
        @foreach($monthly as $row)
            <tr>
                <td>{{ $row['period'] }}</td>
                <td class="right">Rp {{ number_format($row['total_in'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['total_out'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['net'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['closing_balance'], 0, ',', '.') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <h2 style="margin-top: 16px;">Rekap Kategori</h2>
    <table>
        <thead>
        <tr>
            <th>Kategori</th>
            <th class="right">Masuk</th>
            <th class="right">Keluar</th>
            <th class="right">Net</th>
        </tr>
        </thead>
        <tbody>
        @foreach($by_category as $row)
            <tr>
                <td>{{ $row['name'] }}</td>
                <td class="right">Rp {{ number_format($row['total_in'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['total_out'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['net'], 0, ',', '.') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <h2 style="margin-top: 16px;">Rekap Metode</h2>
    <table>
        <thead>
        <tr>
            <th>Metode</th>
            <th class="right">Masuk</th>
            <th class="right">Keluar</th>
            <th class="right">Net</th>
        </tr>
        </thead>
        <tbody>
        @foreach($by_method as $row)
            <tr>
                <td>{{ $row['name'] }}</td>
                <td class="right">Rp {{ number_format($row['total_in'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['total_out'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['net'], 0, ',', '.') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
</body>
</html>
