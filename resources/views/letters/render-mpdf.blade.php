<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Surat</title>
    @php
        $blocks = $renderData['blocks'] ?? [];
        $data = $renderData['data'] ?? [];
        $organization = $data['organization'] ?? [];
        $letter = $data['letter'] ?? [];
        $style = $data['style'] ?? [];
        $signers = is_array($data['signers'] ?? null) ? $data['signers'] : [];
        $fontSize = max(10, min(20, (float) ($style['font_size'] ?? 11)));
        $lineHeight = max(1.1, min(2.2, (float) ($style['line_height'] ?? 1.25)));
        $fontFamilies = [
            'Times New Roman' => 'freeserif',
            'Arial' => 'freesans',
            'Calibri' => 'dejavusans',
        ];
        $fontFamily = $fontFamilies[$style['font_family'] ?? 'Times New Roman'] ?? 'freeserif';
        $paragraphSpacing = max(0, min(32, (float) ($style['paragraph_spacing'] ?? 2))) * 25.4 / 96;
        $contentTopGap = max(0, min(40, (float) ($style['content_top_gap_mm'] ?? 3)));
        $repeatHeader = (bool) ($style['repeat_header'] ?? true);
        $logoSource = $organization['logo_data_uri'] ?? ($organization['logo_url'] ?? null);
        $headerImageSource = $style['header_image_data_uri'] ?? ($style['header_image_url'] ?? null);
        $contacts = $organization['contacts'] ?? [];
        $contactParts = [];
        if (!empty($contacts['tel'])) {
            $contactParts[] = 'Telp. '.$contacts['tel'];
        }
        if (!empty($contacts['email'])) {
            $contactParts[] = 'e-mail : '.$contacts['email'];
        }
        if (!empty($contacts['website'])) {
            $contactParts[] = $contacts['website'];
        }

        $metaContent = '';
        $bodyContent = '';
        $ccContent = '';
        foreach ($blocks as $block) {
            $type = $block['type'] ?? '';
            if ($type === 'nomor_tanggal') {
                $metaContent = (string) ($block['content'] ?? '');
            } elseif ($type === 'isi_surat') {
                $bodyContent = (string) ($block['content'] ?? '');
            } elseif ($type === 'tembusan') {
                $ccContent = (string) ($block['content'] ?? '');
            }
        }

        $metaLines = preg_split('/\r\n|\r|\n/', $metaContent ?: '') ?: [];
        $metaValues = [];
        foreach (array_values(array_filter(array_map('trim', $metaLines))) as $line) {
            if (str_contains($line, ':')) {
                $metaValues[] = trim(substr($line, strpos($line, ':') + 1));
            }
        }
        $nomor = $letter['number'] ?? ($metaValues[0] ?? '-');
        $lampiran = $metaValues[1] ?? '-';
        $perihal = $letter['subject'] ?? ($metaValues[2] ?? '-');

        $sanitize = function (string $html): string {
            $html = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $html);
            $html = preg_replace('/\son\w+=(["\']).*?\1/i', '', (string) $html);
            return preg_replace('/\s(href|src)=(["\'])javascript:[^"\']*\2/i', '', (string) $html);
        };
        $bodyHtml = trim($sanitize($bodyContent));
        if ($bodyHtml === '' || strip_tags($bodyHtml) === $bodyHtml) {
            $bodyHtml = nl2br(e($bodyContent ?: ''));
        }
        $bodyHtml = str_replace('{isi_surat}', '', $bodyHtml);
        $bodyHtml = preg_replace('/<(p|div)(?:\s[^>]*)?>\s*(?:<br\s*\/?>|&nbsp;|\x{00A0})?\s*<\/\1>/iu', '', $bodyHtml);

        $recipientHtml = trim($sanitize((string) ($letter['recipient_text'] ?? '')));
        if ($recipientHtml !== '' && strip_tags($recipientHtml) === $recipientHtml) {
            $recipientHtml = nl2br(e($recipientHtml));
        }

        $signatureSlots = ['left' => [], 'center' => [], 'right' => []];
        foreach ($signers as $signatureSigner) {
            $slot = in_array(($signatureSigner['position'] ?? ''), ['left', 'center', 'right'], true)
                ? $signatureSigner['position']
                : 'right';
            $signatureSlots[$slot][] = $signatureSigner;
        }
    @endphp
    <style>
        body, table {
            color: #111827;
            font-family: {{ $fontFamily }};
            font-size: {{ $fontSize }}pt;
            line-height: {{ $lineHeight }};
        }
        .document-header { margin-bottom: {{ $contentTopGap }}mm; }
        .kop-table { width: 100%; border-collapse: collapse; }
        .kop-image { width: 100%; height: auto; }
        .kop-logo-cell { width: 25mm; text-align: center; vertical-align: middle; }
        .kop-logo { max-width: 22mm; max-height: 22mm; }
        .kop-text { text-align: center; vertical-align: middle; }
        .kop-title { font-size: 20pt; font-weight: bold; letter-spacing: 0.4pt; }
        .kop-subtitle { font-size: 12pt; font-weight: bold; }
        .kop-small { font-size: 10pt; }
        .kop-divider { border-top: 1.5pt solid #1f2937; margin-top: 4mm; margin-bottom: 5mm; }
        .meta-table { width: 100%; border-collapse: collapse; }
        .meta-left { width: 67%; vertical-align: top; }
        .meta-date { width: 33%; text-align: right; vertical-align: top; }
        .colon-table { border-collapse: collapse; }
        .colon-label { width: 34mm; vertical-align: top; }
        .colon-separator { width: 5mm; text-align: center; vertical-align: top; }
        .colon-value { vertical-align: top; }
        .section { margin-top: 3mm; }
        .section p { margin: 0 0 1mm; }
        .content { text-align: justify; }
        .content p { margin: 0 0 {{ $paragraphSpacing }}mm; }
        .detail-table { width: 100%; border-collapse: collapse; margin: 0.5mm 0 1.5mm; }
        .detail-table td { padding: 0 0 0.5mm; vertical-align: top; }
        .detail-label { white-space: nowrap; padding-right: 2mm !important; }
        .detail-separator { text-align: center; }
        .detail-value { width: auto; }
        .content h2 { margin: 0 0 3mm; font-size: 1.35em; }
        .content h3 { margin: 0 0 2.5mm; font-size: 1.15em; }
        .content blockquote { margin: 2mm 0 3mm 6mm; padding-left: 4mm; border-left: 1pt solid #6b7280; }
        .content ol, .content ul { margin: 1mm 0 3mm 7mm; padding-left: 5mm; }
        .content .ql-align-center { text-align: center; }
        .content .ql-align-right { text-align: right; }
        .content .ql-align-justify { text-align: justify; }
        .content .ql-indent-1 { margin-left: 8mm; }
        .content .ql-indent-2 { margin-left: 16mm; }
        .content .ql-indent-3 { margin-left: 24mm; }
        .content a { color: #1d4ed8; text-decoration: underline; }
        .signature-table { width: 100%; border-collapse: collapse; margin-top: 5mm; }
        .signature-cell { width: 33.33%; text-align: center; vertical-align: top; }
        .qr-image { width: 25mm; height: 25mm; }
        .signature-caption { font-size: 8pt; color: #374151; }
        .signature-name { margin-top: 1.5mm; font-weight: bold; text-decoration: underline; }
        .cc { margin-top: 10mm; }
    </style>
</head>
<body>
    @if ($repeatHeader)
    @else
        <div class="document-header">
            @include('letters.partials.mpdf-header')
        </div>
    @endif

    <table class="meta-table">
        <tr>
            <td class="meta-left">
                <table class="colon-table">
                    <tr><td class="colon-label">Nomor</td><td class="colon-separator">:</td><td class="colon-value">{{ $nomor }}</td></tr>
                    <tr><td class="colon-label">Lampiran</td><td class="colon-separator">:</td><td class="colon-value">{{ $lampiran }}</td></tr>
                    <tr><td class="colon-label">Perihal</td><td class="colon-separator">:</td><td class="colon-value">{{ $perihal }}</td></tr>
                </table>
            </td>
            <td class="meta-date">Purwakarta, {{ $letter['date'] ?? '-' }}</td>
        </tr>
    </table>

    @if ($recipientHtml !== '')
        <div class="section">{!! $recipientHtml !!}</div>
    @endif

    <div class="section content">{!! $bodyHtml !!}</div>

    <table class="signature-table">
        <tr>
            @foreach (['left', 'center', 'right'] as $slot)
                <td class="signature-cell">
                    @foreach ($signatureSlots[$slot] as $signatureSigner)
                        @php $signerSignature = $signatureSigner['signature'] ?? null; @endphp
                        <div>Hormat kami,</div>
                        @if (!empty($signerSignature['qr_data_uri']))
                            <div style="margin-top: 3mm;">
                                <img class="qr-image" src="{{ $signerSignature['qr_data_uri'] }}" alt="QR Verifikasi">
                                <div class="signature-caption">Scan untuk verifikasi keaslian surat</div>
                            </div>
                        @else
                            <div style="height: 23mm;">&nbsp;</div>
                        @endif
                        <div class="signature-name">{{ $signatureSigner['name'] ?? '-' }}</div>
                        <div>{{ $signatureSigner['title'] ?? ($signatureSigner['role'] ?? '-') }}</div>
                    @endforeach
                </td>
            @endforeach
        </tr>
    </table>

    @if (trim(strip_tags($ccContent)) !== '')
        <div class="cc">
            <div>Tembusan:</div>
            {!! $sanitize($ccContent) !!}
        </div>
    @endif
</body>
</html>
