@extends('documents.letterhead')
@section('document-head')
@php
$normalizeColor = static function ($value, string $fallback): string {
    $value = is_string($value) ? strtoupper($value) : '';
    return preg_match('/^#[0-9A-F]{6}$/', $value) ? $value : $fallback;
};
$mixWhite = static function (string $hex, float $ratio): string {
    $hex = ltrim($hex, '#');
    $parts = [];
    for ($i = 0; $i < 3; $i++) {
        $base = hexdec(substr($hex, $i * 2, 2));
        $parts[] = (int) round($base + (255 - $base) * $ratio);
    }
    return sprintf('#%02X%02X%02X', $parts[0], $parts[1], $parts[2]);
};
$contrastText = static function (string $hex): string {
    $hex = ltrim($hex, '#');
    $r = hexdec(substr($hex, 0, 2));
    $g = hexdec(substr($hex, 2, 2));
    $b = hexdec(substr($hex, 4, 2));
    return (($r * 299 + $g * 587 + $b * 114) / 1000) >= 150 ? '#111827' : '#FFFFFF';
};
$themePrimary = $normalizeColor($company['theme_primary'] ?? null, '#087443');
$themeAccent = $normalizeColor($company['theme_accent'] ?? null, '#28BD65');
$themeSoft = $mixWhite($themePrimary, .90);
$themeBorder = $mixWhite($themePrimary, .72);
$themeOnPrimary = $contrastText($themePrimary);
$documentTimezone = config('app.timezone', 'America/Sao_Paulo');
$receivedAt = \Carbon\Carbon::parse($order['received_at'])->setTimezone($documentTimezone);
$completedAt = \Carbon\Carbon::parse($finalization['completed_at'])->setTimezone($documentTimezone);
@endphp
<style>
*{box-sizing:border-box}body{font-family:DejaVu Sans,Arial,sans-serif;color:#17221c;font-size:8px;line-height:1.25;margin:0}.muted{color:#66736b}.section-title{font-size:7.2px;font-weight:700;color:{{ $themePrimary }};text-transform:uppercase;letter-spacing:.3px;margin:0 0 3px}.document-identity{display:table;width:100%;margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid #dce6df;color:{{ $themePrimary }}}.document-identity span,.document-identity strong{display:table-cell;vertical-align:middle}.document-identity span{font-size:8.5px;font-weight:700;text-transform:uppercase}.document-identity strong{text-align:right;font-size:12px}.dates-line{width:100%;margin:0 0 5px;border-collapse:collapse;border-bottom:1px solid #dce6df}.dates-line td{padding:3px 5px 4px}.dates-line td+td{border-left:1px solid #dce6df}.dates-line b{color:{{ $themePrimary }};margin-right:5px}.two-column{width:100%;border-collapse:separate;border-spacing:5px 0;margin:0 -5px 5px}.two-column td{vertical-align:top;width:50%;border:1px solid #dce6df;border-radius:5px;padding:6px 8px}.two-column p{margin:1px 0}.full-box{border:1px solid #dce6df;border-radius:5px;padding:6px 8px;margin-bottom:5px;page-break-inside:avoid}.full-box p{margin:1px 0}.photo-strip{width:100%;border-collapse:separate;border-spacing:4px 0;table-layout:fixed}.photo-strip td{padding:0;text-align:center;vertical-align:middle}.photo-strip img{display:block;width:100%;height:31mm;object-fit:contain;border:1px solid #e0e8e3;border-radius:4px}.result{font-weight:700;margin:3px 0 0}.items{width:100%;border-collapse:collapse;margin-top:2px;page-break-inside:auto}.items thead{display:table-header-group}.items tr{page-break-inside:avoid}.items th{background:{{ $themePrimary }};color:{{ $themeOnPrimary }};padding:4px 5px;text-align:left;font-size:7px}.items td{padding:4px 5px;border-bottom:1px solid #e3ebe6;vertical-align:top}.items th:nth-child(2),.items td:nth-child(2){width:8%;text-align:center}.items th:nth-child(3),.items td:nth-child(3),.items th:nth-child(4),.items td:nth-child(4){width:18%;text-align:right}.item-warranty{font-size:6.2px;color:#66736b}.final-summary{width:100%;margin-top:4px;border-collapse:collapse;page-break-inside:avoid}.final-summary td{vertical-align:middle;padding:4px 6px}.final-summary .grand-total{width:38%;background:{{ $themeSoft }};border:1px solid {{ $themeBorder }};color:{{ $themePrimary }};font-size:10.5px;font-weight:800;text-align:right}.footer-table{width:100%;margin-top:7px;border-collapse:collapse;page-break-inside:avoid}.footer-table td{vertical-align:bottom}.closing{width:60%;font-size:7px;color:#66736b}.closing strong{display:block;color:#17221c;font-size:7.5px}.thanks{width:40%;text-align:right;color:#66736b}.thanks b{color:{{ $themeAccent }}}.footer-line{margin-top:4px;border-top:1px solid #dce6df;padding-top:3px;text-align:center;font-size:6.2px;color:#7a857e}
</style>
@endsection
@section('content')
<div class="document-identity"><span>ORDEM DE SERVIÇO / RELATÓRIO TÉCNICO</span><strong>OS Nº {{ $order['number'] }}</strong></div>

<table class="dates-line"><tr><td><b>ENTRADA</b>{{ $receivedAt->format('d/m/Y H:i') }}</td><td><b>SAÍDA</b>{{ $completedAt->format('d/m/Y H:i') }}</td></tr></table>

<table class="two-column"><tr>
<td><div class="section-title">Dados do cliente</div><p><strong>{{ $order['client']['name'] }}</strong></p><p>CPF/CNPJ: {{ $order['client']['document'] }} · {{ $order['client']['phone'] }}</p><p>{{ $order['client']['street'] }}, {{ $order['client']['number'] }}{{ filled($order['client']['district'] ?? null) ? ' — '.$order['client']['district'] : '' }}</p><p>{{ $order['client']['city'] }}/{{ $order['client']['state'] }}{{ filled($order['client']['postal_code'] ?? null) ? ' · CEP '.$order['client']['postal_code'] : '' }}</p></td>
<td><div class="section-title">Equipamento</div><p><strong>{{ data_get($order, 'snapshot.equipment.name', data_get($order, 'snapshot.equipment.type_name', 'Equipamento informado na OS')) }}</strong></p>@if(filled(data_get($order, 'snapshot.equipment.details')))<p>{{ data_get($order, 'snapshot.equipment.details') }}</p>@endif<p class="muted">{{ $order['attendance_type'] === 'bench' ? 'Análise na Bancada' : 'Atendimento Externo' }}</p></td>
</tr></table>

@if(count($photos))<div class="full-box"><div class="section-title">Fotos</div><table class="photo-strip"><tr>@foreach(array_slice($photos, 0, 4) as $photo)<td><img src="data:{{ $photo['mime'] }};base64,{{ $photo['data'] }}"></td>@endforeach</tr></table></div>@endif

<table class="two-column"><tr>
<td><div class="section-title">Problema relatado</div><p>{{ $order['reported_problem'] }}</p></td>
<td><div class="section-title">Laudo técnico / descrição do atendimento</div>@if(filled($finalization['technical_report'] ?? null))<p>{!! nl2br(e($finalization['technical_report'])) !!}</p>@endif<p class="result">Resultado: {{ $result_label }}</p></td>
</tr></table>

<div class="full-box"><div class="section-title">Estado físico na entrada</div><p>{{ data_get($order, 'intake_condition') ?: 'Equipamento aparentemente 100% sem avarias' }}</p></div>

<div class="full-box"><div class="section-title">Serviços realizados / produtos</div>@if(count($items))<table class="items"><thead><tr><th>Descrição</th><th>Qtd.</th><th>Valor unitário</th><th>Subtotal</th></tr></thead><tbody>@foreach($items as $item)<tr><td><strong>{{ $item['description'] }}</strong>@if(!empty($show_item_warranties) && $item['warranty_snapshot'])<br><span class="item-warranty">Garantia adicional: {{ data_get(json_decode($item['warranty_snapshot'], true), 'term') }} {{ ['days'=>'dias','months'=>'meses','years'=>'anos'][data_get(json_decode($item['warranty_snapshot'], true), 'unit')] }}</span>@endif</td><td>{{ $item['quantity'] }}</td><td>R$ {{ number_format($item['unit_price_cents']/100, 2, ',', '.') }}</td><td>R$ {{ number_format($item['subtotal_cents']/100, 2, ',', '.') }}</td></tr>@endforeach</tbody></table>@else<p><strong>Nenhum serviço realizado</strong></p>@endif</div>

<table class="final-summary"><tr><td></td><td class="grand-total">VALOR TOTAL&nbsp;&nbsp;R$ {{ number_format($finalization['total_cents']/100, 2, ',', '.') }}</td></tr></table>

<table class="footer-table"><tr><td class="closing">Fechamento em <strong>{{ $completedAt->locale('pt_BR')->translatedFormat('d \d\e F \d\e Y') }}</strong></td><td class="thanks">Obrigado pela confiança! <b>♥</b></td></tr></table>
<div class="footer-line">Documento privado emitido a partir do snapshot histórico da OS nº {{ $order['number'] }}.</div>
@endsection
