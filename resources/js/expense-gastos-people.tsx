import { useState } from 'react';
import { ArrowDownLeft, ChevronRight, Landmark, Users, Wallet } from 'lucide-react';
import OrderPopup from './order-popup';
import type { Configuration, Summary } from './expense-control-page';
import '../css/expense-gastos-people-mobile.css';

type Scope = 'one' | 'two' | 'shared';
type Target = 'one' | 'two';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (value: number | undefined) => currencyFormatter.format(Number(value ?? 0) / 100);

/** Interface apenas de leitura: totais e rateios são sempre calculados no backend. */
export default function ExpenseGastosPeople({ summary, config, month, loading, onPay, onInstitution }: {
  summary?: Summary;
  config: Configuration;
  month: string;
  loading: boolean;
  onPay: (scope: Scope, target: Target, institutionId?: number) => void;
  onInstitution: (scope: Scope, id: number) => void;
}) {
  const [selected, setSelected] = useState<Scope>();
  const name = (id: number) => config.people.find(person => person.id === id)?.name || 'Responsável ' + id;
  const labels: Record<Scope, string> = { one: name(1), two: name(2), shared: 'Casal' };
  const scopes: Scope[] = ['one', 'two', 'shared'];
  const selectedView = selected ? summary?.views?.[selected] : undefined;
  const makePayment = (scope: Scope, target: Target, institutionId?: number) => {
    setSelected(undefined);
    onPay(scope, target, institutionId);
  };
  return <>
    <section className="cg-gastos-people" aria-label="Dívidas do mês por responsável">
      <div className="cg-gastos-people-heading">
        <span>COMPROMISSOS DO MÊS</span>
        <h3>Quem deve o quê?</h3>
        <small>{month.slice(5, 7)}/{month.slice(0, 4)} · Cada pessoa inclui sua própria parte do casal.</small>
      </div>
      <div className="cg-gastos-people-list">
        {scopes.map(scope => {
          const view = summary?.views?.[scope];
          return <button key={scope} type="button" className={'cg-gastos-person-card cg-gastos-person-' + scope}
            aria-label={'Ver dívidas de ' + labels[scope]} disabled={loading || !view}
            onClick={() => setSelected(scope)}>
            <span className="cg-gastos-person-top">
              <span className="cg-gastos-person-avatar" aria-hidden="true">{scope === 'shared' ? <Users /> : <Wallet />}</span>
              <strong>{labels[scope]}</strong><ChevronRight aria-hidden="true" />
            </span>
            <span className="cg-gastos-person-values">
              <span><small>O que deve no mês</small><b>{money(view?.original_cents)}</b></span>
              <span><small>Pagou adiantado</small><b>{money(view?.advance_cents)}</b></span>
              <span className="cg-gastos-person-outstanding"><small>Falta pagar</small><b>{money(view?.remaining_cents)}</b></span>
            </span>
            <span className="cg-gastos-person-open">Ver dívidas por instituição <ChevronRight aria-hidden="true" /></span>
          </button>;
        })}
      </div>
      <p className="cg-gastos-explanation">O adiantado mostra apenas antecipações registradas para parcelas deste mês. Pagamentos comuns e abatimentos também reduzem o saldo. O card Casal mostra somente despesas compartilhadas — não deve ser somado novamente aos individuais.</p>
    </section>
    {selected && <OrderPopup
      theme="expense" variant="budget" icon={Landmark}
      className="cg-gastos-people-popup"
      title={'Dívidas de ' + labels[selected]}
      eyebrow="CONTROLE DE GASTOS"
      description={'Somente o mês ' + month.slice(5, 7) + '/' + month.slice(0, 4) + ' · saldos por instituição'}
      closeLabel="Fechar dívidas por instituição"
      onClose={() => setSelected(undefined)}
    >
      <div className="cg-dialog-body cg-gastos-people-details">
        <div className="cg-gastos-person-values">
          <span><small>O que deve</small><b>{money(selectedView?.original_cents)}</b></span>
          <span><small>Adiantado</small><b>{money(selectedView?.advance_cents)}</b></span>
          <span><small>Falta pagar</small><b>{money(selectedView?.remaining_cents)}</b></span>
        </div>
        <h3>Instituições deste mês</h3>
        <div className="cg-gastos-institutions">
          {(selectedView?.institutions ?? []).map(institution => <article key={institution.id}>
            <div className="cg-gastos-institution-heading"><div><strong>{institution.name}</strong><small>{institution.count} {institution.count === 1 ? 'parcela' : 'parcelas'} neste mês</small></div>
              <span><small>Falta pagar</small><b>{money(institution.remaining_cents)}</b></span>
            </div>
            <div className="cg-gastos-institution-actions">
              <button type="button" onClick={() => { const scope = selected; setSelected(undefined); onInstitution(scope, institution.id); }}>Ver dívidas</button>
              {institution.remaining_cents > 0 && (selected === 'shared' ? <>
                <button type="button" onClick={() => makePayment('shared', 'one', institution.id)}><ArrowDownLeft /> Pagar parte de {name(1)}</button>
                <button type="button" onClick={() => makePayment('shared', 'two', institution.id)}><ArrowDownLeft /> Pagar parte de {name(2)}</button>
              </> : <button className="cg-gastos-pay" type="button" onClick={() => makePayment(selected, selected, institution.id)}><ArrowDownLeft /> Pagar dívida</button>)}
            </div>
          </article>)}
          {!selectedView?.institutions?.length && <p>Nenhuma dívida cadastrada para este responsável neste mês.</p>}
        </div>
        <p className="cg-gastos-explanation">O pagamento abre a conferência já existente. Você escolhe pagar uma parte ou o saldo total do mês. Nunca paga automaticamente a parte de outra pessoa.</p>
        <button className="cg-gastos-popup-close" type="button" onClick={() => setSelected(undefined)}>Fechar</button>
      </div>
    </OrderPopup>}
  </>;
}
