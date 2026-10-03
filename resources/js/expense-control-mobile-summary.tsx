import { useState, type ReactNode } from 'react';
import { CalendarDays, ChevronRight, Check, Wallet } from 'lucide-react';
import type { Configuration, Summary } from './expense-control-page';
import '../css/expense-control-mobile.css';

type Scope = 'all' | 'one' | 'two' | 'shared';
const money = (value = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const shortDate = (value: string) => value.slice(0, 10).split('-').reverse().slice(0, 2).join('/');

export default function ExpenseMobileSummary({ summary, config, month, portraits, onInstitution, onDebt }: {
  summary?: Summary; config: Configuration; month: string; portraits: ReactNode[];
  onInstitution: (id: number, scope: Scope) => void; onDebt: (id: number) => void;
}) {
  const [scope, setScope] = useState<Scope>('all');
  const total = summary?.totals || {};
  const names = [config.people.find(p => p.id === 1)?.name || 'Allan', config.people.find(p => p.id === 2)?.name || 'Carol', 'Casal'];
  const today = new Date().toLocaleDateString('sv-SE');
  const scopeName = scope === 'all' ? 'Todos' : names[scope === 'one' ? 0 : scope === 'two' ? 1 : 2];
  const due = (id: number, key: 'one' | 'two' | 'shared') => summary?.views?.[key].due_institutions?.find(i => i.id === id);
  const institutions = (summary?.institutions || []).map(i => {
    const parts = [due(i.id, 'one'), due(i.id, 'two'), due(i.id, 'shared')];
    const active = scope === 'all' ? parts.slice(0, 2).filter(p => p && p.remaining_cents > 0) : [parts[scope === 'one' ? 0 : scope === 'two' ? 1 : 2]].filter(p => p && p.remaining_cents > 0);
    return { ...i, parts, remaining: scope === 'all' ? i.remaining_cents : active[0]?.remaining_cents || 0, dueOn: active.map(p => p!.due_on).sort()[0] };
  }).filter(i => i.remaining > 0);
  const overdue = institutions.filter(i => i.dueOn && i.dueOn < today);
  const next = institutions.filter(i => i.dueOn && i.dueOn >= today).sort((a, b) => a.dueOn.localeCompare(b.dueOn))[0];
  return <section className="cg-mobile-summary" aria-label="Resumo financeiro mobile">
    <section className="cgm-total" aria-label="Total do mês">
      <div><span><Wallet /> Falta pagar no mês</span><small>{month.split('-').reverse().join('/')}</small></div>
      <strong>{money(total.remaining_cents)}</strong>
      <dl><div><dt>Total original</dt><dd>{money(total.original_cents)}</dd></div><div><dt><Check /> Pago / abatido</dt><dd>{money((total.original_cents || 0) - (total.remaining_cents || 0))}</dd></div></dl>
    </section>
    <section aria-label="Resumo por responsável" className="cgm-people">{(['one', 'two', 'shared'] as const).map((key, index) => {
      const original = total[key + '_original_cents'] || 0, remaining = total[key + '_remaining_cents'] || 0;
      return <button key={key} className="cgm-person" aria-pressed={scope === key} onClick={() => setScope(scope === key ? 'all' : key)}>
        <span className="cgm-person-name">{portraits[index]}<b>{names[index]}</b></span><small>Falta pagar</small><strong>{money(remaining)}</strong>
        <span className="cgm-person-paid">Pago / abatido<b>{money(original - remaining)}</b></span>
      </button>;
    })}</section>
    <p className="cgm-note">As partes individuais incluem a divisão do casal. O valor de Casal já está incluído nelas.</p>
    <div className="cgm-institution-heading"><div><h2>Por instituição</h2><small>{scopeName} · saldo e vencimentos</small></div><button aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todos</button></div>
    <div className="cgm-attention" role="status">{overdue.length > 0 ? <span className="cgm-overdue">{overdue.length} {overdue.length === 1 ? 'instituição com atraso' : 'instituições com atraso'}</span> : <span>Sem vencimentos atrasados</span>}{next && <span><CalendarDays /> Próximo: {shortDate(next.dueOn)} · {next.name}</span>}</div>
    <section className="cgm-institutions" aria-label="Saldos por instituição">{institutions.map(i => <button className="cgm-institution" key={i.id} onClick={() => onInstitution(i.id, scope)}>
      <span className="cgm-institution-top"><b>{i.name}</b><ChevronRight /></span>
      <span className="cgm-institution-value"><strong>{money(i.remaining)}</strong><span className={i.dueOn < today ? 'cgm-overdue' : ''}><CalendarDays /> {i.dueOn ? (i.dueOn < today ? 'Pendente desde ' : i.dueOn === today ? 'Vence hoje · ' : 'Vence ') + shortDate(i.dueOn) : 'Sem vencimento'}</span></span>
      {scope === 'all' ? <span className="cgm-split">{names.map((name, index) => <span key={name + index}>{name}<b>{money(i.parts[index]?.remaining_cents || 0)}</b></span>)}</span> : <small>{scopeName} · {i.parts[scope === 'one' ? 0 : scope === 'two' ? 1 : 2]?.count || 0} parcelas pendentes</small>}
    </button>)}{!institutions.length && <p className="cgm-empty"><Check /> Nenhum saldo pendente para {scopeName.toLowerCase()} neste mês.</p>}</section>
    {!!summary?.partial_installments?.length && <details className="cgm-partials"><summary>Pagamentos parciais · {summary.partial_installments.length} parcelas</summary>{summary.partial_installments.map(i => <button key={i.id} onClick={() => onDebt(i.debt_id)}><b>{i.name}</b><small>{i.institution_name} · parcela {i.number}</small><span>Pago / abatido: {money(i.amount_cents - i.remaining_cents)}</span><span>{names[0]}: {money(i.remaining_one_cents)} · {names[1]}: {money(i.remaining_two_cents)}</span><strong>Falta {money(i.remaining_cents)}</strong></button>)}</details>}
  </section>;
}
