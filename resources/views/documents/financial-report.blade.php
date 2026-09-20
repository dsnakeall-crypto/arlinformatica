@extends('documents.base')
@section('title', 'RELATÓRIO FINANCEIRO — '.substr($report['period'], 5, 2).'/'.substr($report['period'], 0, 4))
@section('content')
@php
    $methodLabels = ['cash' => 'Dinheiro', 'pix' => 'Pix', 'debit' => 'Débito', 'credit' => 'Crédito', 'transfer' => 'Transferência', 'other' => 'Outro'];
    $categoryLabels = ['merchandise_purchase' => 'Compra de mercadoria', 'usage_material' => 'Material de uso'];
@endphp
<style>.positive{color:#087443}.negative{color:#a61f2b}.nowrap{white-space:nowrap}</style>
<h1>RELATÓRIO FINANCEIRO — {{ substr($report['period'], 5, 2) }}/{{ substr($report['period'], 0, 4) }}</h1>
<p><strong>Período:</strong> 01/{{ substr($report['period'], 5, 2) }}/{{ substr($report['period'], 0, 4) }} até o fim do mês · <strong>Gerado:</strong> {{ $generated_at }}</p>

<h2>Resumo do caixa</h2>
<table><thead><tr><th>Recebido bruto</th><th>Estornos</th><th>Despesas</th><th>Líquido</th></tr></thead><tbody><tr>
<td class="positive">R$ {{ number_format($report['total_cents']/100, 2, ',', '.') }}</td>
<td class="negative">− R$ {{ number_format($report['refund_cents']/100, 2, ',', '.') }}</td>
<td class="negative">− R$ {{ number_format($report['expense_cents']/100, 2, ',', '.') }}</td>
<td class="{{ $report['net_cents'] >= 0 ? 'positive' : 'negative' }}"><strong>R$ {{ number_format($report['net_cents']/100, 2, ',', '.') }}</strong></td>
</tr></tbody></table>

<h2>Formas de pagamento e devolução</h2>
<table><thead><tr><th>Forma</th><th>Entradas</th><th>Saídas</th><th>Líquido da forma</th></tr></thead><tbody>
@forelse($report['methods'] as $method => $data)
<tr><td>{{ $methodLabels[$method] ?? ucfirst($method) }}</td><td class="positive">R$ {{ number_format($data['entry_cents']/100, 2, ',', '.') }}</td><td class="negative">− R$ {{ number_format($data['outflow_cents']/100, 2, ',', '.') }}</td><td>R$ {{ number_format($data['net_cents']/100, 2, ',', '.') }}</td></tr>
@empty<tr><td colspan="4">Sem pagamentos ou devoluções.</td></tr>@endforelse
</tbody></table>

<h2>Entradas detalhadas</h2>
<table><thead><tr><th>Data/hora</th><th>Tipo</th><th>OS</th><th>Descrição</th><th>Registrado por</th><th>Valor</th></tr></thead><tbody>
@forelse($report['transactions'] as $transaction)
<tr><td class="nowrap">{{ \Carbon\Carbon::parse($transaction['occurred_at'])->timezone($timezone)->format('d/m/Y H:i') }}</td><td>{{ $transaction['origin'] === 'service_order' ? 'Entrada de OS' : 'Entrada rápida' }}</td><td>{{ $transaction['order_number'] ? '#'.$transaction['order_number'] : '—' }}</td><td>{{ $transaction['description'] }}</td><td>{{ $transaction['user_name'] ?? 'Não identificado' }}</td><td class="positive nowrap">R$ {{ number_format($transaction['effective_cents']/100, 2, ',', '.') }}</td></tr>
@empty<tr><td colspan="6">Sem entradas.</td></tr>@endforelse
</tbody></table>

<h2>Estornos</h2>
<table><thead><tr><th>Data/hora</th><th>OS</th><th>Motivo</th><th>Devolvido por</th><th>Registrado por</th><th>Valor</th></tr></thead><tbody>
@forelse($report['refunds'] as $refund)
<tr><td class="nowrap">{{ \Carbon\Carbon::parse($refund['refunded_at'])->timezone($timezone)->format('d/m/Y H:i') }}</td><td>#{{ $refund['order_number'] }}</td><td>{{ $refund['reason'] }}</td><td>{{ $methodLabels[$refund['method']] ?? ucfirst($refund['method']) }}</td><td>{{ $refund['user_name'] ?? 'Não identificado' }}</td><td class="negative nowrap">− R$ {{ number_format($refund['amount_cents']/100, 2, ',', '.') }}</td></tr>
@empty<tr><td colspan="6">Sem estornos.</td></tr>@endforelse
</tbody></table>

<h2>Despesas</h2>
<table><thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Registrado por</th><th>Valor</th></tr></thead><tbody>
@forelse($report['expenses'] as $expense)
<tr><td>{{ \Carbon\Carbon::parse($expense['spent_on'])->format('d/m/Y') }}</td><td>{{ $categoryLabels[$expense['category']] ?? 'Sem categoria' }}</td><td>{{ $expense['description'] }}</td><td>{{ $expense['user_name'] ?? 'Não identificado' }}</td><td class="negative nowrap">− R$ {{ number_format($expense['amount_cents']/100, 2, ',', '.') }}</td></tr>
@empty<tr><td colspan="5">Sem despesas.</td></tr>@endforelse
</tbody></table>

<h2>Faturamento diário bruto</h2>
<table><thead><tr><th>Dia</th><th>Total</th></tr></thead><tbody>@forelse($report['daily'] as $date => $total)<tr><td>{{ \Carbon\Carbon::parse($date)->format('d/m/Y') }}</td><td class="positive">R$ {{ number_format($total/100, 2, ',', '.') }}</td></tr>@empty<tr><td colspan="2">Sem entradas.</td></tr>@endforelse</tbody></table>

<h2>Serviços e produtos</h2><p>{{ $report['allocation_note'] }}</p>
<table><thead><tr><th>Descrição</th><th>Quantidade</th><th>Total</th></tr></thead><tbody>@forelse($report['items'] as $item)<tr><td>{{ $item['description'] }}</td><td>{{ $item['quantity'] }}</td><td>R$ {{ number_format($item['total_cents']/100, 2, ',', '.') }}</td></tr>@empty<tr><td colspan="3">Nenhum item vinculado.</td></tr>@endforelse</tbody></table>
<h2>Líquido do mês: R$ {{ number_format($report['net_cents']/100, 2, ',', '.') }}</h2>
@endsection
