@extends('documents.base')
@section('title', $template['name'])
@section('content')
<div class="head"><div class="brand">@if(!empty($company['logo']))<img src="{{ storage_path('app/private/'.$company['logo']) }}">@else<h1>ARL</h1>@endif</div><div class="company"><h1>{{ $company['company_name'] }}</h1><div>{{ $company['street'] }}, {{ $company['number'] }} · {{ $company['city'] }}/{{ $company['state'] }}</div><div>{{ $company['phone'] }} · {{ $company['email'] }}</div></div></div><h2>{{ $template['name'] }} · Revisão</h2>
<p><b>OS Nº {{ $order['number'] }}</b> · {{ $order['client']['name'] }} · {{ $order['client']['document'] }}</p>
<p><b>Equipamento:</b> {{ data_get($order, 'snapshot.equipment.name', 'Conforme OS') }}<br><b>Problema relatado:</b> {{ $order['reported_problem'] }}</p>
@foreach(['customer_report'=>'RELATO','technical_analysis'=>'ANÁLISE TÉCNICA','tests_performed'=>'TESTES REALIZADOS','components'=>'COMPONENTES AVALIADOS / DANIFICADOS','diagnosis'=>'DIAGNÓSTICO','conclusion'=>'CONCLUSÃO','equipment_situation'=>'SITUAÇÃO DO EQUIPAMENTO','observations'=>'OBSERVAÇÕES'] as $key=>$label) @if(!empty($content[$key]))<h2>{{ $label }}</h2><p>{!! nl2br(e($content[$key])) !!}</p>@endif @endforeach
@if($template['kind']==='electrical')<h2>AVALIAÇÃO DE POSSÍVEL DANO ELÉTRICO</h2><p>Data aproximada do evento: {{ $content['event_date'] ?? 'Não informada' }}<br>Conclusão selecionada pelo técnico: {{ ['compatible'=>'Compatível com origem elétrica','not_evidenced'=>'Sem evidência de origem elétrica','inconclusive'=>'Inconclusiva'][$content['electrical_conclusion']] }}</p>@endif
<h2>RESPONSÁVEL TÉCNICO</h2><p>{{ $content['responsible_technician'] }}@if(!empty($content['qualification'])) · {{ $content['qualification'] }}@endif @if(!empty($content['certification']))<br>Registro/certificação informado: {{ $content['certification'] }}@endif</p>
@if(count($photos))<h2>REGISTRO FOTOGRÁFICO</h2>@foreach($photos as $photo)<img style="width:220px;max-height:170px;object-fit:contain;margin:6px" src="data:{{ $photo['mime'] }};base64,{{ $photo['data'] }}">@endforeach @endif
<div class="footer">{{ $company['instagram'] }}</div>
@endsection
