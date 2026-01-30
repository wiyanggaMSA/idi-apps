<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Resume Keuangan</title>
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
    <h1>Resume Keuangan</h1>
    <div class="muted">{{ $org?->org_name ?? 'Aplikasi Keuangan Organisasi' }}</div>
    <div class="muted">
        Periode:
        {{ $filters['start_date'] ?? '-' }} s/d {{ $filters['end_date'] ?? '-' }}
    </div>

    <div style="margin-top: 12px;">
        <div class="kpi">Kas Masuk: Rp {{ number_format($summary['cash']['total_in'], 0, ',', '.') }}</div>
        <div class="kpi">Kas Keluar: Rp {{ number_format($summary['cash']['total_out'], 0, ',', '.') }}</div>
        <div class="kpi">Net Kas: Rp {{ number_format($summary['cash']['net'], 0, ',', '.') }}</div>
        <div class="kpi">Saldo Awal: Rp {{ number_format($summary['cash']['opening_balance'], 0, ',', '.') }}</div>
        <div class="kpi">Saldo Akhir: Rp {{ number_format($summary['cash']['closing_balance'], 0, ',', '.') }}</div>
        <div class="kpi">Iuran Ditagih: Rp {{ number_format($summary['dues']['billed'], 0, ',', '.') }}</div>
        <div class="kpi">Iuran Diterima: Rp {{ number_format($summary['dues']['collected'], 0, ',', '.') }}</div>
        <div class="kpi">Outstanding: Rp {{ number_format($summary['dues']['outstanding'], 0, ',', '.') }}</div>
    </div>

    <p class="muted" style="margin-top: 8px;">
        Catatan: Iuran diterima sudah termasuk dalam kas masuk.
    </p>

    <h2 style="margin-top: 16px;">Top 10 Pengeluaran</h2>
    <table>
        <thead>
        <tr>
            <th>Tanggal</th>
            <th>Kategori</th>
            <th>Keterangan</th>
            <th class="right">Jumlah</th>
        </tr>
        </thead>
        <tbody>
        @foreach($summary['top_expenses'] as $row)
            <tr>
                <td>{{ $row['date'] }}</td>
                <td>{{ $row['category'] }}</td>
                <td>{{ $row['description'] }}</td>
                <td class="right">Rp {{ number_format($row['amount'], 0, ',', '.') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <h2 style="margin-top: 16px;">Top 10 Penunggak Iuran</h2>
    <table>
        <thead>
        <tr>
            <th>Nama</th>
            <th>NPA</th>
            <th class="right">Outstanding</th>
        </tr>
        </thead>
        <tbody>
        @foreach($summary['top_arrears'] as $row)
            <tr>
                <td>{{ $row['name'] }}</td>
                <td>{{ $row['npa'] }}</td>
                <td class="right">Rp {{ number_format($row['outstanding'], 0, ',', '.') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <h2 style="margin-top: 16px;">Rekap Bulanan Gabungan</h2>
    <table>
        <thead>
        <tr>
            <th>Periode</th>
            <th class="right">Kas Masuk</th>
            <th class="right">Kas Keluar</th>
            <th class="right">Net</th>
            <th class="right">Iuran Ditagih</th>
            <th class="right">Iuran Diterima</th>
            <th class="right">Outstanding</th>
        </tr>
        </thead>
        <tbody>
        @foreach($summary['charts'] as $row)
            <tr>
                <td>{{ $row['period'] }}</td>
                <td class="right">Rp {{ number_format($row['cash_in'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['cash_out'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['net'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['dues_billed'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['dues_collected'], 0, ',', '.') }}</td>
                <td class="right">Rp {{ number_format($row['dues_outstanding'], 0, ',', '.') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
</body>
</html>
