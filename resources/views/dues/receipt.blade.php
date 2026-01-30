<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kwitansi Pembayaran Iuran</title>
    <style>
        body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .title { font-size: 20px; font-weight: bold; }
        .meta { font-size: 12px; color: #555; }
        .box { border: 1px solid #ddd; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label { color: #555; }
        .amount { font-size: 18px; font-weight: bold; }
        @media print { .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="title">Kwitansi Pembayaran Iuran</div>
            <div class="meta">No. Referensi: {{ $payment->reference_no ?? '-' }}</div>
        </div>
        <button class="no-print" onclick="window.print()">Cetak</button>
    </div>

    <div class="box">
        <div class="row">
            <span class="label">Nama Anggota</span>
            <span>{{ $member?->full_name ?? '-' }}</span>
        </div>
        <div class="row">
            <span class="label">NPA</span>
            <span>{{ $member?->npa ?? '-' }}</span>
        </div>
        <div class="row">
            <span class="label">Periode</span>
            <span>{{ $period?->name ?? $period?->period ?? '-' }}</span>
        </div>
        <div class="row">
            <span class="label">Tanggal Bayar</span>
            <span>{{ optional($payment->paid_at)->format('d-m-Y H:i') }}</span>
        </div>
        <div class="row">
            <span class="label">Metode</span>
            <span>{{ $payment->method ?? '-' }}</span>
        </div>
    </div>

    <div class="box">
        <div class="row">
            <span class="label">Nominal</span>
            <span class="amount">Rp {{ number_format($payment->amount ?? 0, 0, ',', '.') }}</span>
        </div>
        <div class="row">
            <span class="label">Catatan</span>
            <span>{{ $payment->notes ?? '-' }}</span>
        </div>
    </div>
</body>
</html>
