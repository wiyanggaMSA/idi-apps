<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pratinjau Surat</title>
        @php
            $layout = $renderData['layout'] ?? [];
            $blocks = $renderData['blocks'] ?? [];
            $data = $renderData['data'] ?? [];
            $organization = $data['organization'] ?? [];
            $logoSource = $organization['logo_data_uri'] ?? ($organization['logo_url'] ?? null);
            $headerVariant = ($organization['header_variant'] ?? 'logo_left') === 'classic_center'
                ? 'classic_center'
                : 'logo_left';
            $letter = $data['letter'] ?? [];
            $recipientContent = (string) ($letter['recipient_text'] ?? '');
            $recipientSanitized = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $recipientContent);
            $recipientSanitized = preg_replace('/\son\w+=(["\']).*?\1/i', '', (string) $recipientSanitized);
            $recipientSanitized = preg_replace('/\s(href|src)=(["\'])javascript:[^"\']*\2/i', '', (string) $recipientSanitized);
            $recipientIsHtml = preg_match('/<[a-z][\s\S]*>/i', $recipientContent) === 1;
            $recipientPlain = preg_replace("/(\r\n|\r|\n){3,}/", "\n\n", trim($recipientContent));
            $recipientHtml = preg_replace('/(<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>\s*){2,}/i', '<p><br></p>', $recipientSanitized);
            $signer = $data['signer'] ?? [];
            $signers = is_array($data['signers'] ?? null) ? $data['signers'] : [];
            $signature = $data['signature'] ?? null;
            $style = $data['style'] ?? [];

            $allowedFonts = ['Times New Roman', 'Arial', 'Calibri'];
            $fontFamily = in_array(($style['font_family'] ?? ''), $allowedFonts, true)
                ? $style['font_family']
                : 'Times New Roman';
            $fontFamilyCssMap = [
                'Times New Roman' => '"Times New Roman", Times, serif',
                'Arial' => 'Arial, Helvetica, sans-serif',
                'Calibri' => 'Calibri, Carlito, "Segoe UI", Arial, sans-serif',
            ];
            $fontFamilyCss = $fontFamilyCssMap[$fontFamily] ?? $fontFamilyCssMap['Times New Roman'];
            $fontSize = max(10, min(20, (float) ($style['font_size'] ?? 12)));
            $lineHeight = max(1.1, min(2.2, (float) ($style['line_height'] ?? 1.35)));
            $paragraphSpacing = max(0, min(32, (float) ($style['paragraph_spacing'] ?? 4)));
            $repeatHeader = (bool) ($style['repeat_header'] ?? true);
            $signatureQrPosition = in_array(($style['signature_qr_position'] ?? ''), ['left', 'right'], true)
                ? $style['signature_qr_position']
                : 'right';
            $headerImageSource = $style['header_image_data_uri'] ?? ($style['header_image_url'] ?? null);
            $headerHeight = max(80, min(260, (int) ($style['header_height_px'] ?? 132)));
            $marginLeft = max(32, min(140, (int) ($style['margin_left_px'] ?? 64)));
            $marginRight = max(32, min(140, (int) ($style['margin_right_px'] ?? 64)));
            $marginBottom = max(40, min(160, (int) ($style['margin_bottom_px'] ?? 72)));
            $contentTopGap = max(16, min(120, (int) ($style['content_top_gap_px'] ?? 54)));
            $qrCenterLogo = $signature['org_logo_data_uri'] ?? ($organization['logo_data_uri'] ?? ($signature['org_logo_url'] ?? $organization['logo_url'] ?? null));
            if (empty($signers) && (!empty($signer['name']) || !empty($signer['title']) || !empty($signer['role']))) {
                $signers = [[
                    'name' => $signer['name'] ?? '',
                    'title' => $signer['title'] ?? ($signer['role'] ?? ''),
                    'position' => $signatureQrPosition,
                    'signature' => $data['signature'] ?? null,
                ]];
            }
            $signatureSlots = ['left' => [], 'center' => [], 'right' => []];
            foreach ($signers as $signatureSigner) {
                $slot = in_array(($signatureSigner['position'] ?? ''), ['left', 'center', 'right'], true)
                    ? $signatureSigner['position']
                    : 'right';
                $signatureSlots[$slot][] = $signatureSigner;
            }

            $layoutMap = [];
            foreach ($layout as $item) {
                if (isset($item['i'])) {
                    $layoutMap[$item['i']] = $item;
                }
            }

            usort($blocks, function ($a, $b) use ($layoutMap) {
                $posA = $layoutMap[$a['id'] ?? ''] ?? ['y' => 9999, 'x' => 9999];
                $posB = $layoutMap[$b['id'] ?? ''] ?? ['y' => 9999, 'x' => 9999];
                if (($posA['y'] ?? 9999) !== ($posB['y'] ?? 9999)) {
                    return ($posA['y'] ?? 9999) <=> ($posB['y'] ?? 9999);
                }
                return ($posA['x'] ?? 9999) <=> ($posB['x'] ?? 9999);
            });

            $kopBlock = null;
            foreach ($blocks as $block) {
                if (($block['type'] ?? '') === 'kop_surat') {
                    $kopBlock = $block;
                    break;
                }
            }

            $metaContent = '';
            foreach ($blocks as $block) {
                if (($block['type'] ?? '') === 'nomor_tanggal') {
                    $metaContent = (string) ($block['content'] ?? '');
                    break;
                }
            }

            $metaLines = preg_split('/\r\n|\r|\n/', $metaContent ?: '') ?: [];
            $metaLines = array_values(array_filter(array_map('trim', $metaLines)));
            $metaValues = [];
            foreach ($metaLines as $line) {
                if (str_starts_with($line, ':')) {
                    $metaValues[] = trim(substr($line, 1));
                }
            }
            $lampiran = $metaValues[1] ?? '-';
            $perihal = $letter['subject'] ?? ($metaValues[2] ?? '-');

            $alignColonRows = function (string $html): string {
                $rows = [];
                $flushRows = function () use (&$rows): string {
                    if ($rows === []) {
                        return '';
                    }

                    $table = '<table class="colon-table">';
                    foreach ($rows as $row) {
                        $table .= '<tr><td class="colon-label">'.$row['label'].'</td><td class="colon-separator">:</td><td class="colon-value">'.$row['value'].'</td></tr>';
                    }
                    $table .= '</table>';
                    $rows = [];

                    return $table;
                };

                $pattern = '/<(p|div)([^>]*)>(.*?)<\/\1>/is';
                $formatted = preg_replace_callback($pattern, function (array $match) use (&$rows, $flushRows) {
                    $tag = $match[1];
                    $attributes = $match[2] ?? '';
                    $inner = trim((string) ($match[3] ?? ''));
                    $plain = trim(html_entity_decode(strip_tags($inner), ENT_QUOTES | ENT_HTML5, 'UTF-8'));

                    if (preg_match('/^([^:]{2,42})\s*:\s*(.+)$/u', $plain, $parts) === 1) {
                        $label = trim($parts[1]);
                        $valuePlain = trim($parts[2]);
                        if ($label !== '' && $valuePlain !== '') {
                            $valueHtml = preg_replace('/^'.preg_quote($parts[1], '/').'\s*:\s*/u', '', $inner, 1);
                            $rows[] = [
                                'label' => e($label),
                                'value' => $valueHtml,
                            ];

                            return '';
                        }
                    }

                    return $flushRows().'<'.$tag.$attributes.'>'.$inner.'</'.$tag.'>';
                }, $html);

                return $formatted.$flushRows();
            };

            $contacts = $organization['contacts'] ?? [];
            $contactParts = [];
            if (!empty($contacts['tel'])) {
                $contactParts[] = 'Telp. ' . $contacts['tel'];
            }
            if (!empty($contacts['email'])) {
                $contactParts[] = 'Email: ' . $contacts['email'];
            }
            if (!empty($contacts['website'])) {
                $contactParts[] = $contacts['website'];
            }

            $kopContent = (string) ($kopBlock['content'] ?? '');
            $kopPlain = trim(strip_tags($kopContent));
            $hasCustomKop = $kopPlain !== '' && !in_array(strtolower($kopPlain), ['kop surat otomatis', 'kop surat...'], true);
            $kopHtml = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $kopContent);
            $kopHtml = preg_replace('/\son\w+=(["\']).*?\1/i', '', (string) $kopHtml);
            $kopHtml = preg_replace('/\s(href|src)=(["\'])javascript:[^"\']*\2/i', '', (string) $kopHtml);
            $kopHasHtml = preg_match('/<[a-z][\s\S]*>/i', $kopContent) === 1;
            $hasOfficialHeader = !empty($headerImageSource);
            $useFixedHeader = $repeatHeader && ($hasOfficialHeader || !$hasCustomKop);
            $renderBlocks = $useFixedHeader
                ? array_values(array_filter($blocks, fn ($block) => ($block['type'] ?? '') !== 'kop_surat'))
                : $blocks;
        @endphp
        <style>
            @page {
                size: A4;
                margin: 0;
            }
            * {
                box-sizing: border-box;
            }
            body {
                margin: 0;
                font-family: {{ $fontFamilyCss }};
                color: #111827;
            }
            .paper {
                width: 794px;
                min-height: 1123px;
                margin: 0 auto;
                padding: {{ $useFixedHeader ? ($hasOfficialHeader ? $headerHeight + $contentTopGap : 164) : $contentTopGap }}px {{ $marginRight }}px {{ $marginBottom }}px {{ $marginLeft }}px;
            }
            .section {
                margin-bottom: {{ max(8, $paragraphSpacing + 1) }}px;
            }
            .kop {
                text-align: center;
                background: #fff;
            }
            .kop-left {
                display: grid;
                grid-template-columns: 92px auto 92px;
                align-items: center;
                column-gap: 12px;
                text-align: center;
                justify-content: center;
                width: 100%;
            }
            .kop-left-main {
                text-align: center;
                grid-column: 2;
                width: 620px;
                max-width: 100%;
            }
            .kop-left-spacer {
                grid-column: 3;
            }
            .kop-fixed {
                position: fixed;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 794px;
                padding: {{ $hasOfficialHeader ? 24 : 20 }}px {{ $marginRight }}px 6px {{ $marginLeft }}px;
                z-index: 10;
            }
            .kop-image {
                width: 100%;
                height: {{ $headerHeight }}px;
                object-fit: contain;
                object-position: center top;
                display: block;
            }
            .kop-logo {
                max-height: 70px;
                margin: 0 auto 8px;
                display: block;
            }
            .kop-left .kop-logo {
                grid-column: 1;
                justify-self: center;
                margin: 0;
                max-height: 78px;
                max-width: 78px;
            }
            .kop-name {
                font-size: 28px;
                font-weight: 700;
                line-height: 1.1;
                letter-spacing: 0.2px;
                text-transform: uppercase;
            }
            .kop-unit {
                margin-top: 3px;
                font-size: 15px;
                font-weight: 700;
                text-transform: uppercase;
            }
            .kop-address {
                margin-top: 6px;
                font-size: 12px;
                line-height: 1.2;
            }
            .kop-contact {
                margin-top: 2px;
                font-size: 12px;
            }
            .kop-divider {
                border-top: 2px solid #1f2937;
                margin-top: 6px;
            }
            .kop-custom {
                width: 100%;
                font-size: {{ max(11, $fontSize) }}px;
                line-height: {{ $lineHeight }};
                text-align: center;
            }
            .kop-custom-wrap {
                width: 100%;
                text-align: center;
            }
            .kop-custom-wrap-left {
                display: flex;
                align-items: center;
                gap: 14px;
                text-align: center;
            }
            .kop-custom-wrap-left .kop-custom {
                text-align: center;
            }
            .kop-custom-logo {
                max-height: 74px;
                max-width: 94px;
                display: block;
                margin: 0 auto 6px;
            }
            .kop-custom-wrap-left .kop-custom-logo {
                margin: 0;
                max-height: 82px;
                max-width: 92px;
                flex: 0 0 auto;
            }
            .kop-custom p,
            .kop-custom div,
            .kop-custom h1,
            .kop-custom h2,
            .kop-custom h3 {
                margin: 0 0 3px;
            }
            .meta-wrap {
                display: flex;
                justify-content: space-between;
                gap: 16px;
            }
            .meta-table {
                width: 68%;
                font-size: {{ $fontSize }}px;
                border-collapse: collapse;
                line-height: {{ $lineHeight }};
            }
            .meta-table td {
                vertical-align: top;
                padding: 1px 0;
            }
            .meta-label {
                width: 120px;
            }
            .meta-colon {
                width: 20px;
                text-align: center;
            }
            .meta-date {
                width: 28%;
                text-align: right;
                font-size: {{ $fontSize }}px;
            }
            .content {
                font-size: {{ $fontSize }}px;
                line-height: {{ $lineHeight }};
                text-align: justify;
            }
            .content p,
            .content div {
                margin: 0 0 {{ max(2, $paragraphSpacing) }}px;
            }
            .content ul,
            .content ol {
                margin: 0 0 {{ max(2, $paragraphSpacing) }}px 20px;
                padding: 0;
            }
            .content .ql-align-center {
                text-align: center;
            }
            .content .ql-align-right {
                text-align: right;
            }
            .content .ql-align-justify {
                text-align: justify;
            }
            .colon-table {
                width: 100%;
                border-collapse: collapse;
                margin: 0 0 {{ max(2, $paragraphSpacing) }}px;
                font-size: {{ $fontSize }}px;
                line-height: {{ $lineHeight }};
            }
            .colon-table td {
                vertical-align: top;
                padding: 0 0 2px;
            }
            .colon-label {
                width: 150px;
                white-space: nowrap;
            }
            .colon-separator {
                width: 18px;
                text-align: center;
            }
            .colon-value {
                width: auto;
            }
            .recipient {
                font-size: {{ $fontSize }}px;
                line-height: {{ $lineHeight }};
                margin: 22px 0 18px;
            }
            .recipient p,
            .recipient div {
                margin: 0 0 {{ max(2, $paragraphSpacing) }}px;
            }
            .recipient .ql-align-center {
                text-align: center;
            }
            .recipient .ql-align-right {
                text-align: right;
            }
            .recipient .ql-align-justify {
                text-align: justify;
            }
            .signature {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 24px;
                align-items: start;
                margin-top: 18px;
            }
            .signature-stack {
                font-size: {{ $fontSize }}px;
                line-height: {{ $lineHeight }};
                text-align: center;
                max-width: 220px;
                justify-self: center;
            }
            .signature-stack + .signature-stack {
                margin-top: 22px;
            }
            .signature-column {
                min-height: 1px;
                justify-self: stretch;
                text-align: center;
            }
            .signature-left {
                grid-column: 1;
            }
            .signature-center {
                grid-column: 2;
            }
            .signature-right {
                grid-column: 3;
            }
            .signature-opening {
                margin-bottom: 8px;
            }
            .signature-name {
                margin-top: 8px;
                font-weight: 700;
                text-decoration: underline;
            }
            .signature-qr {
                text-align: center;
                font-size: 12px;
                color: #374151;
                margin: 6px 0;
            }
            .signature-qr-box {
                width: 116px;
                height: 116px;
                position: relative;
                margin: 0 auto 6px;
            }
            .signature-qr img.qr-image {
                width: 116px;
                height: 116px;
                object-fit: contain;
                display: block;
                margin: 0;
            }
            .signature-qr-center-logo {
                position: absolute;
                width: 30px;
                height: 30px;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                border-radius: 6px;
                background: #fff;
                padding: 2px;
                object-fit: contain;
            }
            .signature-qr-caption {
                margin-top: 2px;
            }
            .content-left {
                text-align: left !important;
            }
        </style>
    </head>
    <body>
        @if ($useFixedHeader && ($kopBlock || $hasOfficialHeader))
            <section class="kop kop-fixed">
                @if ($hasOfficialHeader)
                    <img class="kop-image" src="{{ $headerImageSource }}" alt="Kop surat resmi" />
                @elseif ($hasCustomKop)
                    <div class="kop-custom-wrap {{ $headerVariant === 'logo_left' ? 'kop-custom-wrap-left' : '' }}">
                        @if (!empty($logoSource))
                            <img class="kop-custom-logo" src="{{ $logoSource }}" alt="Logo" />
                        @endif
                        <div class="kop-custom">
                            {!! $kopHasHtml ? $kopHtml : nl2br(e($kopContent)) !!}
                        </div>
                    </div>
                @else
                    @if ($headerVariant === 'logo_left')
                        <div class="kop-left">
                            @if (!empty($logoSource))
                                <img class="kop-logo" src="{{ $logoSource }}" alt="Logo" />
                            @endif
                            <div class="kop-left-main">
                                <div class="kop-name">{{ $organization['org_name'] ?? config('app.name') }}</div>
                                @if (!empty($organization['org_unit']))
                                    <div class="kop-unit">{{ $organization['org_unit'] }}</div>
                                @endif
                                @if (!empty($organization['address_lines']) && is_array($organization['address_lines']))
                                    <div class="kop-address">
                                        @foreach ($organization['address_lines'] as $line)
                                            <div>{{ $line }}</div>
                                        @endforeach
                                    </div>
                                @endif
                                @if (!empty($contactParts))
                                    <div class="kop-contact">{{ implode(' | ', $contactParts) }}</div>
                                @endif
                            </div>
                            <div class="kop-left-spacer"></div>
                        </div>
                    @else
                        @if (!empty($logoSource))
                            <img class="kop-logo" src="{{ $logoSource }}" alt="Logo" />
                        @endif
                        <div class="kop-name">{{ $organization['org_name'] ?? config('app.name') }}</div>
                        @if (!empty($organization['org_unit']))
                            <div class="kop-unit">{{ $organization['org_unit'] }}</div>
                        @endif
                        @if (!empty($organization['address_lines']) && is_array($organization['address_lines']))
                            <div class="kop-address">
                                @foreach ($organization['address_lines'] as $line)
                                    <div>{{ $line }}</div>
                                @endforeach
                            </div>
                        @endif
                        @if (!empty($contactParts))
                            <div class="kop-contact">{{ implode(' | ', $contactParts) }}</div>
                        @endif
                    @endif
                @endif
                <div class="kop-divider"></div>
            </section>
        @endif

        <div class="paper">
            @foreach ($renderBlocks as $block)
                @php
                    $type = $block['type'] ?? '';
                    $content = (string) ($block['content'] ?? '');
                    $sanitizedContent = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $content);
                    $sanitizedContent = preg_replace('/\son\w+=(["\']).*?\1/i', '', (string) $sanitizedContent);
                    $sanitizedContent = preg_replace('/\s(href|src)=(["\'])javascript:[^"\']*\2/i', '', (string) $sanitizedContent);
                    $isHtmlContent = preg_match('/<[a-z][\s\S]*>/i', $content) === 1;
                    $normalizedPlain = preg_replace("/(\r\n|\r|\n){3,}/", "\n\n", trim($content));
                    $normalizedHtml = preg_replace('/(<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>\s*){2,}/i', '<p><br></p>', $sanitizedContent);
                @endphp

                @if ($type === 'kop_surat')
                    <section class="section kop">
                        @if ($hasOfficialHeader)
                            <img class="kop-image" src="{{ $headerImageSource }}" alt="Kop surat resmi" />
                        @elseif ($hasCustomKop)
                            <div class="kop-custom-wrap {{ $headerVariant === 'logo_left' ? 'kop-custom-wrap-left' : '' }}">
                                @if (!empty($logoSource))
                                    <img class="kop-custom-logo" src="{{ $logoSource }}" alt="Logo" />
                                @endif
                                <div class="kop-custom">
                                    {!! $kopHasHtml ? $kopHtml : nl2br(e($kopContent)) !!}
                                </div>
                            </div>
                        @else
                            @if ($headerVariant === 'logo_left')
                                <div class="kop-left">
                                    @if (!empty($logoSource))
                                        <img class="kop-logo" src="{{ $logoSource }}" alt="Logo" />
                                    @endif
                                    <div class="kop-left-main">
                                        <div class="kop-name">{{ $organization['org_name'] ?? config('app.name') }}</div>
                                        @if (!empty($organization['org_unit']))
                                            <div class="kop-unit">{{ $organization['org_unit'] }}</div>
                                        @endif
                                        @if (!empty($organization['address_lines']) && is_array($organization['address_lines']))
                                            <div class="kop-address">
                                                @foreach ($organization['address_lines'] as $line)
                                                    <div>{{ $line }}</div>
                                                @endforeach
                                            </div>
                                        @endif
                                        @if (!empty($contactParts))
                                            <div class="kop-contact">{{ implode(' | ', $contactParts) }}</div>
                                        @endif
                                    </div>
                                    <div class="kop-left-spacer"></div>
                                </div>
                            @else
                                @if (!empty($logoSource))
                                    <img class="kop-logo" src="{{ $logoSource }}" alt="Logo" />
                                @endif
                                <div class="kop-name">{{ $organization['org_name'] ?? config('app.name') }}</div>
                                @if (!empty($organization['org_unit']))
                                    <div class="kop-unit">{{ $organization['org_unit'] }}</div>
                                @endif
                                @if (!empty($organization['address_lines']) && is_array($organization['address_lines']))
                                    <div class="kop-address">
                                        @foreach ($organization['address_lines'] as $line)
                                            <div>{{ $line }}</div>
                                        @endforeach
                                    </div>
                                @endif
                                @if (!empty($contactParts))
                                    <div class="kop-contact">{{ implode(' | ', $contactParts) }}</div>
                                @endif
                            @endif
                        @endif
                        <div class="kop-divider"></div>
                    </section>
                @elseif ($type === 'nomor_tanggal')
                    <section class="section meta-wrap">
                        <table class="meta-table">
                            <tr>
                                <td class="meta-label">Nomor</td>
                                <td class="meta-colon">:</td>
                                <td>{{ $letter['number'] ?? '-' }}</td>
                            </tr>
                            <tr>
                                <td class="meta-label">Lampiran</td>
                                <td class="meta-colon">:</td>
                                <td>{{ $lampiran }}</td>
                            </tr>
                            <tr>
                                <td class="meta-label">Perihal</td>
                                <td class="meta-colon">:</td>
                                <td>{{ $perihal }}</td>
                            </tr>
                        </table>
                        <div class="meta-date">Purwakarta, {{ $letter['date'] ?? '-' }}</div>
                    </section>
                @elseif ($type === 'tanda_tangan')
                    <section class="section signature">
                        @foreach ($signatureSlots as $signerPosition => $slotSigners)
                            <div class="signature-column signature-{{ $signerPosition }}">
                                @foreach ($slotSigners as $signatureSigner)
                                    @php
                                        $signerSignature = $signatureSigner['signature'] ?? null;
                                        $signerLogo = $signerSignature['org_logo_data_uri'] ?? ($organization['logo_data_uri'] ?? ($signerSignature['org_logo_url'] ?? $organization['logo_url'] ?? null));
                                    @endphp
                                    <div class="signature-stack">
                                        <div class="signature-opening">Hormat kami,</div>
                                        @if (!empty($signerSignature['qr_data_uri']))
                                            <div class="signature-qr">
                                                <div class="signature-qr-box">
                                                    <img class="qr-image" src="{{ $signerSignature['qr_data_uri'] }}" alt="QR Verifikasi" />
                                                    @if (!empty($signerLogo))
                                                        <img class="signature-qr-center-logo" src="{{ $signerLogo }}" alt="Logo organisasi" />
                                                    @endif
                                                </div>
                                                <div class="signature-qr-caption">Scan untuk verifikasi keaslian surat</div>
                                            </div>
                                        @endif
                                        <div class="signature-name">{{ $signatureSigner['name'] ?? '-' }}</div>
                                        <div>{{ $signatureSigner['title'] ?? ($signatureSigner['role'] ?? '-') }}</div>
                                    </div>
                                @endforeach
                            </div>
                        @endforeach
                    </section>
                @else
                    @if ($type === 'isi_surat' && trim(strip_tags($recipientContent)) !== '')
                        <section class="section recipient">
                            {!! $alignColonRows($recipientIsHtml ? $recipientHtml : nl2br(e($recipientPlain))) !!}
                        </section>
                    @endif
                    <section class="section content">
                        @if ($type === 'tembusan')
                            <div class="content-left">
                                {!! $alignColonRows($isHtmlContent ? $normalizedHtml : nl2br(e($normalizedPlain))) !!}
                            </div>
                        @else
                            {!! $alignColonRows($isHtmlContent ? $normalizedHtml : nl2br(e($normalizedPlain))) !!}
                        @endif
                    </section>
                @endif
            @endforeach
        </div>
    </body>
</html>
