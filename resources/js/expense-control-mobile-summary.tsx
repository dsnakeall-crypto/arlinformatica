import { useState, type ReactNode } from 'react';
import { Check, Wallet } from 'lucide-react';
import { MonthlyInvoices } from './expense-month-details';
import type { Configuration, Summary } from './expense-control-page';
import '../css/expense-control-mobile.css';

type Scope = 'all' | 'one' | 'two' | 'shared';
const money = (value = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function ExpenseMobileSummary({ summary, config, month, portraits, onInstitution, onDebt }: {
  summary?: Summary; config: Configuration; month: string; portraits: ReactNode[];
  onInstitution: (id: number, scope: Scope) => void; onDebt: (id: number) => void;
}) {
  const [scope, setScope] = useState<Scope>(() => Number(config.my_person_id) === 1 ? 'one' : Number(config.my_person_id) === 2 ? 'two' : 'all');
  const total = summary?.totals || {};
  const names = [config.people.find(p => p.id === 1)?.name || 'Allan', config.people.find(p => p.id === 2)?.name || 'Carol', 'Casal'];
  const selectedTotals = scope === 'all' ? { original_cents: total.original_cents || 0, remaining_cents: total.remaining_cents || 0 } : summary?.views?.[scope] || { original_cents: 0, remaining_cents: 0 };
  const scopeName = scope === 'all' ? 'Todos' : names[scope === 'one' ? 0 : scope === 'two' ? 1 : 2];
  return <section className="cg-mobile-summary" aria-label="Resumo financeiro mobile">
    <section className="cgm-total" aria-label="Total do mês">
      <div><span><Wallet /> {scopeName} · falta pagar no mês</span><small>{month.split('-').reverse().join('/')}</small></div>
      <strong>{money(selectedTotals.remaining_cents)}</strong>
      <dl><div><dt>Total original</dt><dd>{money(selectedTotals.original_cents)}</dd></div><div><dt><Check /> Pago / abatido</dt><dd>{money(selectedTotals.original_cents - selectedTotals.remaining_cents)}</dd></div></dl>
    </section>
    <section aria-label="Resumo por responsável" className="cgm-people">{(['one', 'two', 'shared'] as const).map((key, index) => {
      const original = total[key + '_original_cents'] || 0, remaining = total[key + '_remaining_cents'] || 0;
      return <button key={key} className="cgm-person" aria-pressed={scope === key} onClick={() => setScope(scope === key ? 'all' : key)}>
        <span className="cgm-person-name">{portraits[index]}<b>{names[index]}</b></span><small>Falta pagar</small><strong>{money(remaining)}</strong>
        <span className="cgm-person-paid">Pago / abatido<b>{money(original - remaining)}</b></span>
      </button>;
    })}</section>
    <p className="cgm-note">As partes individuais incluem a divisão do casal. O valor de Casal já está incluído nelas.</p>
    <button className="cgm-show-all" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todos</button>
    <MonthlyInvoices items={summary?.monthly_invoices} onOpen={item => item.debt_id !== null ? onDebt(item.debt_id) : onInstitution(item.institution_id, 'all')} />
    {!!summary?.partial_installments?.length && <details className="cgm-partials"><summary>Pagamentos parciais · {summary.partial_installments.length} parcelas</summary>{summary.partial_installments.map(i => <button key={i.id} onClick={() => onDebt(i.debt_id)}><b>{i.name}</b><small>{i.institution_name} · parcela {i.number}</small><span>Pago / abatido: {money(i.amount_cents - i.remaining_cents)}</span><span>{names[0]}: {money(i.remaining_one_cents)} · {names[1]}: {money(i.remaining_two_cents)}</span><strong>Falta {money(i.remaining_cents)}</strong></button>)}</details>}
  </section>;
}
