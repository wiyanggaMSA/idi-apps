<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8" />
        <title>Surat Layout</title>
        <style>
            body {
                font-family: DejaVu Sans, sans-serif;
                font-size: 12px;
                color: #111827;
                margin: 24px;
            }
            .section {
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e5e7eb;
            }
            .section-title {
                font-weight: 700;
                margin-bottom: 6px;
                text-transform: uppercase;
                font-size: 11px;
                color: #374151;
            }
            .section-content {
                white-space: pre-wrap;
            }
        </style>
    </head>
    <body>
        <h2>Pratinjau Surat</h2>
        <p>
            Nomor: {{ $letter->number ?? '-' }}<br />
            Tanggal: {{ optional($letter->date)->format('d/m/Y') ?? '-' }}
        </p>

        @foreach ($blocks as $block)
            <div class="section">
                <div class="section-title">{{ $block['label'] ?? $block['type'] ?? 'Bagian' }}</div>
                <div class="section-content">{!! nl2br(e($block['content'] ?? '')) !!}</div>
            </div>
        @endforeach
    </body>
</html>
