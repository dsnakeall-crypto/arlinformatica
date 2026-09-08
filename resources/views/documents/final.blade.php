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
*{box-sizing:border-box}body{font-family:DejaVu Sans,Arial,sans-serif;color:#17221c;font-size:9px;line-height:1.35;margin:0}.green{color:#087a43}.muted{color:#66736b}.box{border:1px solid #dce6df;border-radius:7px;padding:9px 11px;margin-bottom:8px}.section-title{font-size:8px;font-weight:700;color:#087a43;text-transform:uppercase;letter-spacing:.35px;margin:0 0 5px}.header{width:100%;border-collapse:collapse;margin-bottom:8px}.header td{vertical-align:middle}.brand{width:22%;padding-right:8px}.brand img{max-width:105px;max-height:58px;object-fit:contain}.brand-fallback{font-size:24px;font-weight:800;color:#087a43;letter-spacing:2px}.company{width:51%;padding:0 8px}.company strong{display:block;font-size:11px;margin-bottom:3px}.company div{font-size:7.5px;line-height:1.45}.os-card{width:27%;background:#f1f8f4;border:1px solid #d4eadc;border-radius:7px;padding:9px;text-align:center;color:#087a43}.os-card small{display:block;font-size:7px;font-weight:700;text-transform:uppercase}.os-card strong{display:block;font-size:14px;margin-top:6px}.dates{width:100%;border-collapse:separate;border-spacing:0 6px}.dates td{width:50%;border:1px solid #dce6df;border-radius:6px;padding:7px 10px}.dates b{color:#087a43;margin-right:7px}.grid{width:100%;border-collapse:separate;border-spacing:7px 0;margin:0 -7px 8px}.grid td{vertical-align:top;width:50%;border:1px solid #dce6df;border-radius:7px;padding:9px 11px}.grid p{margin:2px 0}.equipment-photo{float:right;max-width:82px;max-height:65px;margin-left:8px;border-radius:5px}.problem-tech{width:100%;border-collapse:separate;border-spacing:7px 0;margin:0 -7px 8px}.problem-tech td{vertical-align:top;width:50%;border:1px solid #dce6df;border-radius:7px;padding:9px 11px;min-height:65px}.problem-tech p{margin:0}.checklist p{margin:2px 0}.items{width:100%;border-collapse:collapse;margin-top:3px}.items thead th{background:#087a43;color:white;padding:5px 6px;text-align:left;font-size:7.5px}.items td{padding:5px 6px;border-bottom:1px solid #e3ebe6;vertical-align:top}.items th:nth-child(2),.items td:nth-child(2){width:9%;text-align:center}.items th:nth-child(3),.items td:nth-child(3),.items th:nth-child(4),.items td:nth-child(4){width:19%;text-align:right}.warranty{font-size:6.8px;color:#66736b}.totals{width:43%;margin-left:auto;margin-top:6px;border-collapse:collapse}.totals td{padding:3px 5px;text-align:right}.totals .total-label,.totals .total-value{background:#f1f8f4;color:#087a43;font-weight:800;font-size:11px;border-top:1px solid #d4eadc;border-bottom:1px solid #d4eadc}.totals .total-label{text-align:left}.general-warranty{margin-top:8px;background:#f8fbf9}.photos{margin-top:6px}.photos img{width:108px;height:78px;object-fit:contain;border:1px solid #e0e8e3;border-radius:5px;margin:0 5px 5px 0}.footer-table{width:100%;margin-top:14px;border-collapse:collapse}.footer-table td{vertical-align:bottom}.closing{width:60%;font-size:7.5px;color:#66736b}.closing strong{display:block;color:#17221c;font-size:8px}.thanks{width:40%;text-align:right;color:#66736b}.thanks b{color:#087a43}.footer-line{margin-top:7px;border-top:1px solid #dce6df;padding-top:5px;text-align:center;font-size:6.8px;color:#7a857e}.result{font-weight:700;color:#17221c;margin:4px 0 0}
.green,.section-title,.brand-fallback,.dates b,.totals .total-label,.totals .total-value{color:{{ $themePrimary }}!important}.os-card{background:{{ $themeSoft }}!important;border-color:{{ $themeBorder }}!important;color:{{ $themePrimary }}!important}.items thead th{background:{{ $themePrimary }}!important;color:{{ $themeOnPrimary }}!important}.totals .total-label,.totals .total-value{background:{{ $themeSoft }}!important;border-color:{{ $themeBorder }}!important}.general-warranty{background:{{ $themeSoft }}!important;border-color:{{ $themeBorder }}!important}.thanks b{color:{{ $themeAccent }}!important}
</style>
@endsection
@section('content')
<table class="dates"><tr><td><b>ENTRADA</b>{{ $receivedAt->format('d/m/Y H:i') }}</td><td><b>SAÍDA</b>{{ $completedAt->format('d/m/Y H:i') }}</td></tr></table>

<table class="grid"><tr>
<td><div class="section-title">Dados do cliente</div><p><strong>{{ $order['client']['name'] }}</strong></p><p>CPF/CNPJ: {{ $order['client']['document'] }} · {{ $order['client']['phone'] }}</p><p>{{ $order['client']['street'] }}, {{ $order['client']['number'] }}{{ filled($order['client']['district'] ?? null) ? ' — '.$order['client']['district'] : '' }}</p><p>{{ $order['client']['city'] }}/{{ $order['client']['state'] }}{{ filled($order['client']['postal_code'] ?? null) ? ' · CEP '.$order['client']['postal_code'] : '' }}</p></td>
<td>@if(count($photos))<img class="equipment-photo" src="data:{{ $photos[0]['mime'] }};base64,{{ $photos[0]['data'] }}">@endif<div class="section-title">Equipamento</div><p><strong>{{ data_get($order, 'snapshot.equipment.name', data_get($order, 'snapshot.equipment.type_name', 'Equipamento informado na OS')) }}</strong></p><p>{{ data_get($order, 'snapshot.manufacturer.name', data_get($order, 'snapshot.manufacturer_name', '')) }}</p><p class="muted">{{ $order['attendance_type'] === 'bench' ? 'Análise na Bancada' : 'Atendimento Externo' }}</p></td>
</tr></table>

<table class="problem-tech"><tr>
<td><div class="section-title">Problema relatado</div><p>{{ $order['reported_problem'] }}</p></td>
<td><div class="section-title">Laudo técnico / descrição do atendimento</div><p>{!! nl2br(e($finalization['technical_report'] ?: 'Atendimento concluído conforme itens discriminados.')) !!}</p><p class="result">Resultado: {{ $result_label }}</p></td>
</tr></table>

<div class="box checklist"><div class="section-title">Checklist de entrada</div>@if(count($order['checklists'])) @foreach($order['checklists'] as $check)<p>• {{ $check['label'] }}{{ $check['note'] ? ': '.$check['note'] : '' }}</p>@endforeach @else <p><strong>CHECKLIST DE ENTRADA: 100% OK</strong></p> @endif</div>

<div class="box"><div class="section-title">Serviços realizados / produtos</div>@if(count($items))<table class="items"><thead><tr><th>Descrição</th><th>Qtd.</th><th>Valor unitário</th><th>Subtotal</th></tr></thead><tbody>@foreach($items as $item)<tr><td><strong>{{ $item['description'] }}</strong>@if($item['warranty_snapshot'])<br><span class="warranty">Garantia adicional: {{ data_get(json_decode($item['warranty_snapshot'], true), 'term') }} {{ ['days'=>'dias','months'=>'meses','years'=>'anos'][data_get(json_decode($item['warranty_snapshot'], true), 'unit')] }}</span>@endif</td><td>{{ $item['quantity'] }}</td><td>R$ {{ number_format($item['unit_price_cents']/100, 2, ',', '.') }}</td><td>R$ {{ number_format($item['subtotal_cents']/100, 2, ',', '.') }}</td></tr>@endforeach</tbody></table>@else<p><strong>Nenhum serviço realizado</strong></p>@endif
<table class="totals"><tr><td>Subtotal</td><td>R$ {{ number_format($finalization['subtotal_cents']/100, 2, ',', '.') }}</td></tr>@if($finalization['discount_cents'] > 0)<tr><td>Desconto</td><td>R$ {{ number_format($finalization['discount_cents']/100, 2, ',', '.') }}</td></tr>@endif<tr><td class="total-label">VALOR TOTAL</td><td class="total-value">R$ {{ number_format($finalization['total_cents']/100, 2, ',', '.') }}</td></tr></table></div>

@if(!empty($company['warranty_general_enabled']) && $company['warranty_general_enabled'] !== '0' && filled($company['warranty_general_text'] ?? null))<div class="box general-warranty"><div class="section-title">GARANTIA GERAL</div><p>{!! nl2br(e($company['warranty_general_text'])) !!}</p></div>@endif

@if(count($photos) > 1)<div class="box photos"><div class="section-title">Registro fotográfico</div>@foreach(array_slice($photos,1) as $photo)<img src="data:{{ $photo['mime'] }};base64,{{ $photo['data'] }}">@endforeach</div>@endif
@endsection
