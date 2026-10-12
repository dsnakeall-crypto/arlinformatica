import type { ReactNode } from 'react';
import { CalendarDays, ChevronRight, CircleDollarSign, DollarSign, Users, Wallet } from 'lucide-react';
import '../css/expense-summary-overview.css';

/** Os valores originais e os saldos permanecem calculados pelo backend em centavos. */
type Totals = Record<string, number | string | null | undefined>;
type Person = { id: number; name: string };
export type SummaryScope = 'month' | 'one' | 'two' | 'shared';
export type NextDue = { name?: string; institution_name?: string; due_on?: string; remaining_cents?: number; amount_cents?: number; number?: number } | undefined;
const money = (value: unknown = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0) / 100);
const cents = (totals: Totals, key: string) => Number(totals[key] || 0);
const date = (value: unknown) => typeof value === 'string' && value ? value.slice(0, 10).split('-').reverse().join('/') : '';

export function personNames(people: Person[]) {
  return [people.find(p => p.id === 1)?.name || 'Responsável 1', people.find(p => p.id === 2)?.name || 'Responsável 2'] as const;
}

export function SummaryIndicators({ totals, people, portraits, onExport, onNext, onMonth }: {
  totals: Totals; people: Person[]; nextDue?: NextDue; portraits: ReactNode[];
  onExport?: (scope: SummaryScope) => void; onNext?: () => void; onMonth?: () => void;
}) {
  const [one, two] = personNames(people);
  const due = date(totals.next_due_on);
  const card = (key: SummaryScope, label: string, _original: number, remaining: number, icon: ReactNode) =>
    <article className={'cgo-indicator cgo-' + key + (onExport ? ' cgo-clickable' : '')} key={key}>
      {onExport ? <button className="cgo-card-action" type="button" onClick={() => key === 'month' && onMonth ? onMonth() : onExport(key)} aria-label={key === 'month' && onMonth ? 'Ver total a pagar no mês' : 'Ver opção de baixar PDF de ' + label}>
        <span className="cgo-card-content">
          <span className="cgo-card-heading"><span className="cgo-icon" aria-hidden="true">{icon}</span><span>{label}</span></span>
          <strong className="cgo-original">{money(remaining)}</strong>
          {key !== 'month' && <span className="cgo-remaining cgo-original-second"><span>Falta pagar</span><b>{money(remaining)}</b></span>}
        </span>
      </button> : <>
        <header><span className="cgo-icon" aria-hidden="true">{icon}</span><small>{label}</small></header>
        <strong className="cgo-original">{money(remaining)}</strong>
        {key !== 'month' && <p className="cgo-remaining cgo-original-second"><span>Falta pagar</span><b>{money(remaining)}</b></p>}
      </>}
    </article>;
  return <section className="cgo-indicators" aria-label="Indicadores do mês">
    {card('month', 'Total a pagar no mês', cents(totals, 'remaining_cents'), cents(totals, 'remaining_cents'), <Wallet />)}
    {card('one', 'Total ' + one, cents(totals, 'one_original_cents'), cents(totals, 'one_remaining_cents'), portraits[0])}
    {card('two', 'Total ' + two, cents(totals, 'two_original_cents'), cents(totals, 'two_remaining_cents'), portraits[1])}
    {card('shared', 'Total Casal', cents(totals, 'shared_original_cents'), cents(totals, 'shared_remaining_cents'), portraits[2] || <Users />)}
    <article className={'cgo-indicator cgo-next' + (onNext ? ' cgo-clickable' : '')}>
      {onNext ? <button type="button" className="cgo-card-action" onClick={onNext} aria-label="Ver detalhes do próximo pagamento">
        <span className="cgo-card-content">
          <span className="cgo-card-heading"><span className="cgo-icon" aria-hidden="true"><CalendarDays /></span><span>Próximo pagamento</span></span>
          <strong className="cgo-date">{due || '—'}</strong>
        </span>
      </button> : <>
        <header><span className="cgo-icon" aria-hidden="true"><CalendarDays /></span><small>Próximo pagamento</small></header>
        <strong className="cgo-date">{due || '—'}</strong>
      </>}
    </article>
  </section>;
}

export function PersonBalanceCards({ totals, people, portraits, onOpen, onPay }: { totals: Totals; people: Person[]; portraits: ReactNode[]; onOpen?: (person: 'one' | 'two') => void; onPay?: (person: 'one' | 'two') => void }) {
  const names = personNames(people);
  return <div className="cgo-people" aria-label="Valores por responsável">{(['one', 'two'] as const).map((key, index) => {
    const personal = cents(totals, key + '_personal_original_cents');
    const shared = cents(totals, key + '_shared_original_cents');
    const credited = cents(totals, key + '_credited_cents');
    const total = cents(totals, key + '_original_cents');
    const remaining = cents(totals, key + '_remaining_cents');
    return <article className={'cgo-person cgo-person-' + key} key={key}>
      <header><span className="cg-avatar" aria-hidden="true">{portraits[index]}</span><div><small>RESPONSÁVEL</small><h3>{names[index]}</h3></div></header>
      <dl>
        <div><dt>Valor pessoal</dt><dd>{money(personal)}</dd></div>
        <div><dt>Valor casal</dt><dd>{money(shared)}</dd></div>
        <div><dt>Pago / abatido</dt><dd className="cgo-paid">{money(credited)}</dd></div>
        <div className="cgo-total-row"><dt>Valor total</dt><dd>{money(total)}</dd></div>
        <div className={'cgo-due-row' + (onPay ? ' has-quick-pay' : '')}><dt>Falta pagar</dt><dd>{onPay && <button type="button" className="cg-person-quick-pay" aria-label={'Pagamento rápido de ' + names[index]} onClick={() => onPay(key)}><DollarSign aria-hidden="true" /></button>}<span>{money(remaining)}</span></dd></div>
      </dl>
      {onOpen && <button type="button" onClick={() => onOpen(key)}>Ver gastos de {names[index]} <ChevronRight /></button>}
    </article>;
  })}</div>;
}

export function SummaryLegend() {
  return <p className="cgo-legend"><CircleDollarSign aria-hidden="true" /> <span>Pagamentos e antecipações reduzem apenas o saldo que falta pagar.</span></p>;
}
