import type { ReactNode } from 'react';
import { MonthlyInvoices, type MonthlyInvoice } from './expense-month-details';
import type { Configuration, Summary } from './expense-control-page';
import { personNames, PersonBalanceCards, SummaryIndicators, type SummaryScope } from './expense-summary-overview';
import '../css/expense-control-mobile.css';

type Scope = 'all' | 'one' | 'two' | 'shared';
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (value = 0) => currencyFormatter.format(value / 100);

export default function ExpenseMobileSummary({ summary, config, portraits, onInstitution, onDebt, onInvoice, onPerson, onCompactPerson, onPay, onSharedPay, onExport, onNext, onMonth }: {
  summary?: Summary; config: Configuration; month: string; portraits: ReactNode[];
  onInstitution: (id: number, scope: Scope) => void; onDebt: (id: number) => void; onInvoice?: (invoice: MonthlyInvoice) => void; onPerson?: (person: 'one' | 'two' | 'shared') => void; onPay?: (person: 'one' | 'two') => void;
  onExport: (scope: SummaryScope) => void; onNext: () => void; onMonth: () => void;
  onSharedPay: () => void;
  onCompactPerson: (person: 'one' | 'two') => void;
}) {
  const total = summary?.totals || {};
  const [one, two] = personNames(config.people);
  return <section className="cg-mobile-summary" aria-label="Resumo financeiro mobile">
    <SummaryIndicators totals={total} people={config.people} nextDue={summary?.next_due?.[0]} portraits={portraits} onMonth={onMonth} onExport={onExport} onNext={onNext} onPay={onPay} onSharedPay={onSharedPay} onPerson={onCompactPerson} />
    <PersonBalanceCards totals={total} people={config.people} portraits={portraits} onOpen={onPerson} onPay={onPay} />
    <MonthlyInvoices items={summary?.monthly_invoices} onOpen={item => onInvoice ? onInvoice(item) : item.debt_id !== null ? onDebt(item.debt_id) : onInstitution(item.institution_id, 'all')} />
    {!!summary?.partial_installments?.length && <details className="cgm-partials"><summary>Pagamentos parciais · {summary.partial_installments.length} parcelas</summary>{summary.partial_installments.map(i => <button key={i.id} onClick={() => onDebt(i.debt_id)}><b>{i.name}</b><small>{i.institution_name} · parcela {i.number}</small><span>Pago / abatido: {money(i.amount_cents - i.remaining_cents)}</span><span>{one}: {money(i.remaining_one_cents)} · {two}: {money(i.remaining_two_cents)}</span><strong>Falta {money(i.remaining_cents)}</strong></button>)}</details>}
  </section>;
}
