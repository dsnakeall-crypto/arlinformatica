import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CarFront, Droplets, Wrench, Plus, CalendarClock, Gauge, MapPin, Wallet, Check, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { expenseControlApi as api } from './expense-control-api';
import { expenseRequestId } from './expense-browser-crypto';
import { centsFromMoneyInput, maskMoneyInput } from './money-input';
import type { Configuration } from './expense-control-page';
import '../css/expense-vehicles-20261020.css';

type Vehicle = {id:number; name:string; plate:string|null; notes:string|null};
type EventItem = {id:number; description:string; amount_cents:number};
type VehicleEvent = {id:number; vehicle_id:number; vehicle_name:string; kind:'wash'|'maintenance'; occurred_on:string;
  location:string|null; odometer_km:number|null; next_due_on:string|null; next_due_km:number|null;
  work_notes:string|null; attention_notes:string|null; responsibility:'one'|'two'|'shared';percent_one:number;
  amount_cents:number;institution_name:string|null; debt_id:number;debt_cancelled_at:string|null;items:EventItem[]};
type VehicleResult={vehicles:Vehicle[];events:VehicleEvent[];next_page?:number|null};
type Row={description:string;amount:string;locked:boolean};
const blankRow=():Row=>({description:'',amount:'',locked:false});
const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const today=()=>new Date().toLocaleDateString('sv-SE');
const humanDate=(d?:string|null)=>d?d.slice(0,10).split('-').reverse().join('/'):'—';

export default function ExpenseVehiclesPage({config,onSaved}:{config:Configuration;onSaved:()=>void}) {
  const [data,setData]=useState<VehicleResult>({vehicles:[],events:[]});
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState('');
  const [vehicleName,setVehicleName]=useState(''),[vehiclePlate,setVehiclePlate]=useState('');
  const [vehicleNotes,setVehicleNotes]=useState('');
  const [newVehicle,setNewVehicle]=useState(false);
  const [form,setForm]=useState<'wash'|'maintenance'|null>(null);
  const [vehicleId,setVehicleId]=useState('');
  const [occurred,setOccurred]=useState(today());
  const [location,setLocation]=useState('');
  const [km,setKm]=useState(''),[nextKm,setNextKm]=useState(''),[nextDate,setNextDate]=useState('');
  const [work,setWork]=useState('');
  const [responsibility,setResponsibility]=useState<'one'|'two'|'shared'|''>('');
  const [institution,setInstitution]=useState(''),[type,setType]=useState(''),[amount,setAmount]=useState('');
  const [rows,setRows]=useState<Row[]>([blankRow()]);
  const [manualTotal,setManualTotal]=useState(false);
  const [itemError,setItemError]=useState('');
  const confirmedItems=rows.filter(row=>row.locked);
  const itemsTotalCents=confirmedItems.reduce((sum,row)=>sum+centsFromMoneyInput(row.amount),0);
  const amountCents=form==='maintenance'&&!manualTotal ? itemsTotalCents : centsFromMoneyInput(amount);
  const pendingItem=rows.some(row=>!row.locked && (row.description.trim()!==''||row.amount.trim()!==''));
  const [expanded,setExpanded]=useState<number|null>(null);
  const pendingKey=useRef(expenseRequestId());

  const refresh=useCallback(async()=>{
    const result=await api<VehicleResult>('/vehicles');
    setData(result);
    if(!vehicleId && result.vehicles.length) setVehicleId(String(result.vehicles[0].id));
  },[vehicleId]);
  useEffect(()=>{
    let active=true;
    setLoading(true);
    void api<VehicleResult>('/vehicles').then(result=>{
      if(!active)return;
      setData(result);
      setVehicleId(previous=>previous || (result.vehicles[0] ? String(result.vehicles[0].id):''));
    }).catch((e:Error)=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});
    return ()=>{active=false};
  },[]);
  const activeInstitutions=config.institutions.filter(x=>x.active);
  const activeTypes=config.types.filter(x=>x.active);
  const selectedBank=activeInstitutions.find(x=>String(x.id)===institution);
  const validTypes=activeTypes.filter(x=>!selectedBank?.restricted_type_id||x.id===selectedBank.restricted_type_id);
  const reset=()=>{
    pendingKey.current=expenseRequestId();
    setOccurred(today());setLocation('');setKm('');setNextKm('');setNextDate('');
    setWork('');setAmount('');setRows([blankRow()]);setManualTotal(false);setItemError('');
    setResponsibility('');setInstitution('');setType('');
    setError('');setForm(null);
  };
  const confirmItem=(index:number)=>{
    const row=rows[index];
    if (!row||row.locked)return;
    if (!row.description.trim()||!row.amount.trim()){
      setItemError('Preencha a descrição e o valor antes de confirmar o item.');return;
    }
    const value=centsFromMoneyInput(row.amount);
    if (!Number.isSafeInteger(value)||value<0||value>100000000){
      setItemError('Informe um valor válido para este item.');return;
    }
    setRows(current=>{
      const next=current.map((item,i)=>i===index?{...item,description:item.description.trim(),locked:true}:item);
      return next.some(item=>!item.locked)||next.length>=60?next:[...next,blankRow()];
    });
    setItemError('');
  };
  const latestMaintenanceByVehicle=new Map<number,VehicleEvent>();
  for(const entry of data.events){
    if(entry.kind!=='maintenance'||latestMaintenanceByVehicle.has(entry.vehicle_id))continue;
    latestMaintenanceByVehicle.set(entry.vehicle_id,entry);
  }
  const upcomingDateAlerts=Array.from(latestMaintenanceByVehicle.values()).filter(entry=>{
    if(!entry.next_due_on)return false;
    const todayKey=today();
    // Sem inferir datas com base na quilometragem. Somente data explicitamente cadastrada.
    const inThirtyDays=new Date(todayKey+'T12:00:00');
    inThirtyDays.setDate(inThirtyDays.getDate()+30);
    const horizon=inThirtyDays.toLocaleDateString('sv-SE');
    return entry.next_due_on<=horizon;
  });
  async function moreHistory() {
    if (!data.next_page || loadingMore) return;
    setLoadingMore(true);setError('');
    try {
      const next=await api<VehicleResult>('/vehicles?page='+data.next_page);
      setData(current=>({...current,events:[...current.events,...next.events],next_page:next.next_page}));
    }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar histórico.')}
    finally{setLoadingMore(false)}
  }
  async function saveVehicle(e:FormEvent) {
    e.preventDefault();if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      const res=await api<{id:number}>('/vehicles','POST',{name:vehicleName.trim(),plate:vehiclePlate.trim()||null,notes:vehicleNotes.trim()||null});
      const all=await api<VehicleResult>('/vehicles');
      setData(all);setVehicleId(String(res.id));setVehicleName('');setVehiclePlate('');setVehicleNotes('');setNewVehicle(false);
      setNotice('Veículo cadastrado com sucesso.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível cadastrar o veículo.')}
    finally{setBusy(false)}
  }
  async function saveEvent(e:FormEvent) {
    e.preventDefault();if(busy||!form)return;
    setError('');setNotice('');
    const items=form==='maintenance'?confirmedItems.map(x=>({description:x.description.trim(),amount_cents:centsFromMoneyInput(x.amount)})):[];
    if(form==='maintenance'&&pendingItem){setError('Confirme o item que está sendo editado antes de registrar a manutenção.');return}
    if(form==='maintenance'&&!manualTotal&&!items.length){setError('Adicione um item ou ative o valor total manual.');return}
    if(!vehicleId||!institution||!type||!responsibility){setError('Informe veículo, quem paga, instituição e tipo de dívida.');return}
    if(amountCents<1){setError('Informe o valor da despesa.');return}
    if(items.reduce((sum,i)=>sum+i.amount_cents,0)>amountCents){setError('O total não pode ser menor que a soma dos itens.');return}
    setBusy(true);
    try{
      await api('/vehicle-events','POST',{
        request_key:pendingKey.current, vehicle_id:Number(vehicleId),kind:form,
        occurred_on:occurred,location:location.trim()||null,
        odometer_km:form==='maintenance'&&km!==''?Number(km):null,
        next_due_km:form==='maintenance'&&nextKm!==''?Number(nextKm):null,
        next_due_on:form==='maintenance'&&nextDate?nextDate:null,
        work_notes:form==='maintenance'?work.trim()||null:null,
        attention_notes:null,
        responsibility,institution_id:Number(institution),type_id:Number(type),
        amount_cents:amountCents,items:form==='maintenance'?items:[],
      });
      await refresh();reset();
      setNotice('Registrado no histórico do carro e nas dívidas. O pagamento permanece no fluxo financeiro normal.');
      onSaved();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o registro.')}
    finally{setBusy(false)}
  }
  return <div className="cgv-page" data-testid="expense-vehicles-page">
    <header className="cgv-heading"><span className="cg-eyebrow">SEUS VEÍCULOS</span><h2><CarFront/> Controle de Carros</h2><p>Lavagens, manutenções, revisões e custos integrados às suas dívidas.</p></header>
    <div className="cgv-toolbar"><button type="button" onClick={()=>setNewVehicle(v=>!v)} aria-expanded={newVehicle}><Plus/> Cadastrar veículo</button></div>
    {error&&<p role="alert" className="cg-alert">{error}</p>}
    {notice&&<p role="status" className="cg-notice"><Check/>{notice}</p>}
    {newVehicle&&<form className="cgv-form" onSubmit={saveVehicle}>
      <h3>Novo veículo</h3>
      <div className="cgv-fields"><label>Nome do veículo *<input required maxLength={120} placeholder="Ex.: Peugeot 3008" value={vehicleName} onChange={e=>setVehicleName(e.target.value)}/></label>
      <label>Placa (opcional)<input maxLength={12} placeholder="AAA0A00" value={vehiclePlate} onChange={e=>setVehiclePlate(e.target.value)}/></label></div>
      <label>Observações<textarea rows={2} maxLength={1000} value={vehicleNotes} onChange={e=>setVehicleNotes(e.target.value)}/></label>
      <div className="cgv-actions"><button type="button" onClick={()=>setNewVehicle(false)}>Cancelar</button><button type="submit" className="cgv-primary" disabled={busy}>{busy?'Salvando…':'Salvar veículo'}</button></div>
    </form>}
    <div className="cgv-intro-cards">
      <button type="button" className={form==='wash'?'selected':''} onClick={()=>{reset();setForm('wash')}}><span className="cgv-icon blue"><Droplets/></span><strong>Lavagem</strong><small>Data, valor e quem paga</small></button>
      <button type="button" className={form==='maintenance'?'selected':''} onClick={()=>{reset();setForm('maintenance')}}><span className="cgv-icon"><Wrench/></span><strong>Manutenção</strong><small>Serviços, peças e revisão</small></button>
    </div>
    {form&&<form className="cgv-form" onSubmit={saveEvent} data-testid="vehicle-event-form">
      <div className="cgv-form-title"><h3>{form==='wash'?'Registrar lavagem':'Registrar manutenção'}</h3><button type="button" onClick={reset} aria-label="Fechar cadastro">Fechar</button></div>
      {!data.vehicles.length&&<p role="note">Cadastre um veículo antes de registrar uma despesa.</p>}
      <div className="cgv-fields">
        <label>Veículo *<select required value={vehicleId} onChange={e=>setVehicleId(e.target.value)}><option value="">Escolha</option>{data.vehicles.map(x=><option value={x.id} key={x.id}>{x.name}{x.plate?' · '+x.plate:''}</option>)}</select></label>
        <label>Data *<input type="date" required value={occurred} max={today()} onChange={e=>setOccurred(e.target.value)}/></label>
        <label>{form==='wash'?'Local da lavagem':'Oficina / local da manutenção'}<input required={form==='maintenance'} maxLength={180} value={location} onChange={e=>setLocation(e.target.value)} placeholder="Onde foi feito"/></label>
      </div>
      {form==='maintenance'?<div className="cgv-total-card">
        <label className="cgv-total-checkbox"><input type="checkbox" checked={manualTotal} onChange={e=>setManualTotal(e.target.checked)}/> Informar valor total manualmente</label>
        <label>Valor total da manutenção (R$)
          {manualTotal?<input aria-label="Valor total manual (R$)" inputMode="decimal" required placeholder="0,00" value={amount} onChange={e=>setAmount(maskMoneyInput(e.target.value))}/>
            :<output aria-label="Total automático da manutenção" className="cgv-total-output">{money(itemsTotalCents)}</output>}
        </label>
        <small>{manualTotal?'Valor informado por você; os itens detalhados são opcionais.':'Total calculado automaticamente a partir dos itens confirmados.'}</small>
      </div>:<div className="cgv-fields"><label>Valor total (R$) *<input inputMode="decimal" required placeholder="0,00" value={amount} onChange={e=>setAmount(maskMoneyInput(e.target.value))}/></label></div>}
      {form==='maintenance'&&<>
        <div className="cgv-fields">
          <label>KM na manutenção<input type="number" min={0} max={9999999} value={km} onChange={e=>setKm(e.target.value)} placeholder="Ex.: 74000"/></label>
          <label>Próxima revisão — KM<input type="number" min={0} max={9999999} value={nextKm} onChange={e=>setNextKm(e.target.value)} placeholder="Ex.: 84000"/></label>
          <label>Próxima revisão — data<input type="date" min={occurred} value={nextDate} onChange={e=>setNextDate(e.target.value)}/></label>
        </div>
        <div className="cgv-items"><strong>O que foi trocado / serviços cobrados</strong>
          <small>Digite descrição e valor, confirme com ✓ e use o lápis para editar depois. O total é calculado automaticamente.</small>
          {rows.map((item,index)=><div className={'cgv-item'+(item.locked?' cgv-item-locked':'')} key={index}>
            {item.locked?<><span className="cgv-item-name">{item.description}</span>
              <strong className="cgv-item-value">{money(centsFromMoneyInput(item.amount))}</strong>
              <button type="button" aria-label={'Editar item '+(index+1)} title="Editar item" onClick={()=>{setRows(all=>all.map((x,i)=>i===index?{...x,locked:false}:x));setItemError('')}}><Pencil/></button>
            </>:<><input aria-label={'Descrição do item '+(index+1)} maxLength={180} placeholder="Descrição do item" value={item.description} onChange={e=>setRows(all=>all.map((x,i)=>i===index?{...x,description:e.target.value}:x))}/>
              <input aria-label={'Valor do item '+(index+1)} inputMode="decimal" placeholder="0,00" value={item.amount} onChange={e=>setRows(all=>all.map((x,i)=>i===index?{...x,amount:maskMoneyInput(e.target.value)}:x))}/>
              <button type="button" aria-label={'Confirmar item '+(index+1)} title="Confirmar item" onClick={()=>confirmItem(index)}><Check/></button>
              {rows.length>1&&<button type="button" aria-label={'Excluir item '+(index+1)} title="Excluir item" className="cgv-item-remove" onClick={()=>{setRows(all=>all.filter((_,i)=>i!==index));setItemError('')}}><Trash2/></button>}
            </>}
          </div>)}
          {itemError&&<p role="alert" className="cgv-item-error">{itemError}</p>}
          <output className="cgv-items-subtotal">Total dos itens: <strong>{money(itemsTotalCents)}</strong></output>
        </div>
        <label className="cgv-work-notes">O que foi feito / o que ficar atento (opcional)
          <textarea maxLength={3000} rows={3} placeholder="Descreva o serviço, observações e o que acompanhar futuramente." value={work} onChange={e=>setWork(e.target.value)}/>
        </label>
      </>}
      <div className="cgv-payment"><h4><Wallet/> Quem paga?</h4><div className="cgv-fields">
        <label>Responsável *<select required value={responsibility} onChange={e=>setResponsibility(e.target.value as 'one'|'two'|'shared')}><option value="">Selecione quem paga</option><option value="one">{config.people.find(p=>p.id===1)?.name||'Allan'}</option><option value="two">{config.people.find(p=>p.id===2)?.name||'Carol'}</option><option value="shared">Casal</option></select></label>
        <label>Instituição para cobrança *<select required value={institution} onChange={e=>{setInstitution(e.target.value);setType('')}}><option value="">Selecione</option>{activeInstitutions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Tipo de dívida *<select required value={type} onChange={e=>setType(e.target.value)}><option value="">Selecione</option>{validTypes.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      </div>
      {responsibility==='shared'&&<p className="cgv-split">Divisão atual do casal: {config.people.find(p=>p.id===1)?.default_percent??50}% para {config.people.find(p=>p.id===1)?.name||'Allan'} e {config.people.find(p=>p.id===2)?.default_percent??50}% para {config.people.find(p=>p.id===2)?.name||'Carol'}.</p>}
      <p className="cgv-hint">O registro cria uma dívida única no mês informado. Para quitar parcial ou integralmente, use os pagamentos do Controle de Gastos.</p>
      </div>
      <div className="cgv-actions"><button type="button" onClick={reset}>Cancelar</button><button type="submit" className="cgv-primary" disabled={busy||loading||!data.vehicles.length||!activeInstitutions.length||!activeTypes.length}>{busy?'Salvando…':'Registrar despesa e histórico'}</button></div>
    </form>}
    <div className="cgv-history">
      {upcomingDateAlerts.length>0&&<section className="cgv-reminders" aria-label="Lembretes de revisão por data">
        <h3><CalendarClock/> Lembretes de revisão por data</h3>
        {upcomingDateAlerts.map(item=><p key={item.id}><strong>{item.vehicle_name}</strong> — {item.next_due_on!<today()?'Revisão com data vencida':'Revisão programada'} para {humanDate(item.next_due_on)}.</p>)}
        <small>Os lembretes aparecem ao acessar Carros; revisões por KM não recebem data estimada.</small>
      </section>}
      <h3><CalendarClock/> Histórico de veículos</h3>
      {loading?<p role="status">Carregando veículos…</p>:!data.events.length?<p>Nenhuma lavagem ou manutenção cadastrada.</p>:data.events.map(x=><article className="cgv-event" key={x.id}>
        <button type="button" aria-expanded={expanded===x.id} onClick={()=>setExpanded(v=>v===x.id?null:x.id)}>
          <span className="cgv-icon">{x.kind==='wash'?<Droplets/>:<Wrench/>}</span><span className="cgv-event-head"><strong>{x.kind==='wash'?'Lavagem':'Manutenção'} · {x.vehicle_name}</strong><small>{humanDate(x.occurred_on)} · {x.institution_name} · {x.responsibility==='shared'?'Casal':x.responsibility==='one'?(config.people.find(p=>p.id===1)?.name||'Allan'):(config.people.find(p=>p.id===2)?.name||'Carol')}</small></span><b>{money(x.amount_cents)}</b><ChevronDown/></button>
        {expanded===x.id&&<div className="cgv-details">
          {x.location&&<p><MapPin/>Local: {x.location}</p>}
          {x.odometer_km!=null&&<p><Gauge/>KM registrado: {x.odometer_km.toLocaleString('pt-BR')} km</p>}
          {(x.next_due_km||x.next_due_on)&&<p><CalendarClock/>Próxima revisão: {[x.next_due_km!=null?x.next_due_km.toLocaleString('pt-BR')+' km':null,x.next_due_on?humanDate(x.next_due_on):null].filter(Boolean).join(' / ')}</p>}
          {x.work_notes&&<p><strong>O que foi feito:</strong> {x.work_notes}</p>}
          {x.attention_notes&&<p><strong>Atenção:</strong> {x.attention_notes}</p>}
          {x.items.length>0&&<div><strong>Itens</strong>{x.items.map(i=><div className="cgv-history-item" key={i.id}><span>{i.description}</span><b>{money(i.amount_cents)}</b></div>)}</div>}
          <p>Dívida vinculada #{x.debt_id}{x.debt_cancelled_at?' (cancelada financeiramente)':''}. O histórico do veículo é preservado.</p>
        </div>}
      </article>)}
      {data.next_page&&<button type="button" className="cgv-more" disabled={loadingMore} onClick={()=>void moreHistory()}>{loadingMore?'Carregando…':'Ver mais registros'}</button>}
    </div>
  </div>;
}
