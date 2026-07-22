@php
    $organization = $organization ?? [];
    $style = $style ?? [];
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
@endphp

@if (!empty($headerImageSource))
    <img src="{{ $headerImageSource }}" alt="Kop surat resmi" style="width: 100%; height: auto;">
@else
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="width: 25mm; text-align: center; vertical-align: middle;">
                @if (!empty($logoSource))
                    <img src="{{ $logoSource }}" alt="Logo" style="max-width: 22mm; max-height: 22mm;">
                @endif
            </td>
            <td style="text-align: center; vertical-align: middle;">
                <div style="font-size: 20pt; font-weight: bold;">{{ $organization['org_name'] ?? config('app.name') }}</div>
                <div style="font-size: 12pt; font-weight: bold;">(THE INDONESIAN MEDICAL ASSOCIATION)</div>
                @if (!empty($organization['org_unit']))
                    <div style="font-size: 12pt; font-weight: bold;">{{ $organization['org_unit'] }}</div>
                @endif
                @if (!empty($organization['address_lines']) && is_array($organization['address_lines']))
                    <div style="font-size: 10pt;">{{ implode(' ', $organization['address_lines']) }}</div>
                @endif
                @if (!empty($contactParts))
                    <div style="font-size: 10pt;">{{ implode(' | ', $contactParts) }}</div>
                @endif
            </td>
            <td style="width: 25mm; text-align: center; vertical-align: middle;">&nbsp;</td>
        </tr>
    </table>
    <div style="border-top: 1.5pt solid #1f2937; margin-top: 4mm;"></div>
@endif
