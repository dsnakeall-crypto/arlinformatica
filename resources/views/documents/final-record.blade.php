<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
@page{margin:16mm}body{font-family:DejaVu Sans,Arial,sans-serif;color:#111827;font-size:9px;line-height:1.35}h1{font-size:16px;margin:0 0 3mm}h2{font-size:10px;margin:4mm 0 1.5mm;border-bottom:1px solid #9ca3af;padding-bottom:1mm}.meta{width:100%;border-collapse:collapse}.meta td{width:50%;padding:1mm 2mm 1mm 0;vertical-align:top}.box{border:1px solid #d1d5db;padding:2.5mm;margin-top:2mm}p{margin:1mm 0}table.items{width:100%;border-collapse:collapse;margin-top:1mm}.items th,.items td{border-bottom:1px solid #d1d5db;padding:1.5mm;text-align:left}.items .number{text-align:right}.totals{margin-top:2mm;text-align:right}.totals strong{font-size:11px}.muted{color:#4b5563}
</style>
</head>
<body>
@php
$order = $record['order'];
$finalization = $record['finalization'];
$client = $order['client'] ?? data_get($order, 'snapshot.client', []);
$equipment = data_get($order, 'snapshot.equipment.name') ?? ($order['equipment_description'] ?? 'Não informado');
$equipmentDetails = data_get($order, 'snapshot.equipment.details') ?? ($order['equipment_details'] ?? null);
@endphp
<h1>Registro de revisão substituída</h1>
<table class="meta"><tr><td><b>OS:</b> {{ $record['order_number'] }}</td><td><b>Revisão:</b> R{{ $record['revision'] }}</td></tr><tr><td><b>Emissão original:</b> {{ \Carbon\Carbon::parse($record['original_issued_at'])->setTimezone(config('app.timezone'))->format('d/m/Y H:i') }}</td><td><b>Substituição:</b> {{ \Carbon\Carbon::parse($record['replaced_at'])->setTimezone(config('app.timezone'))->format('d/m/Y H:i') }}</td></tr><tr><td><b>Reaberta por:</b> {{ $record['reopened_by'] }}</td><td><b>Motivo:</b> {{ $record['reopen_reason'] ?: 'Não informado' }}</td></tr></table>
<h2>Dados históricos</h2>
<div class="box"><p><b>Cliente:</b> {{ $client['name'] ?? 'Não informado' }}@if(!empty($client['document'])) · {{ $client['document'] }}@endif</p><p><b>Equipamento:</b> {{ $equipment }}@if($equipmentDetails) · {{ $equipmentDetails }}@endif</p><p><b>Problema relatado:</b> {{ $order['reported_problem'] ?? 'Não informado' }}</p><p><b>Estado físico:</b> {{ $order['intake_condition'] ?? 'Equipamento aparentemente sem avarias' }}</p><p><b>Laudo:</b> {{ $finalization['technical_report'] ?? ($order['final_report'] ?? 'Não informado') }}</p><p><b>Resultado:</b> {{ $record['result_label'] ?: ($finalization['result'] ?? 'Não informado') }}</p></div>
<h2>Serviços e produtos</h2>
<table class="items"><thead><tr><th>Descrição</th><th class="number">Qtd.</th><th class="number">Valor unitário</th><th class="number">Subtotal</th></tr></thead><tbody>@forelse($record['items'] as $item)<tr><td>{{ $item['description'] }}</td><td class="number">{{ $item['quantity'] }}</td><td class="number">R$ {{ number_format($item['unit_price_cents']/100, 2, ',', '.') }}</td><td class="number">R$ {{ number_format($item['subtotal_cents']/100, 2, ',', '.') }}</td></tr>@empty<tr><td colspan="4" class="muted">Nenhum item registrado.</td></tr>@endforelse</tbody></table>
<div class="totals"><div>Subtotal: R$ {{ number_format(($finalization['subtotal_cents'] ?? 0)/100, 2, ',', '.') }}</div><div>Desconto: R$ {{ number_format(($finalization['discount_cents'] ?? 0)/100, 2, ',', '.') }}</div><strong>Total: R$ {{ number_format(($finalization['total_cents'] ?? 0)/100, 2, ',', '.') }}</strong></div>
</body>
</html>
