import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, CircleDollarSign } from 'lucide-react';
import OrderPopup from './order-popup';
import type { Configuration } from './expense-control-page';
import { expenseControlApi as api } from './expense-control-api';
import { expenseRequestId } from './expense-browser-crypto';
import { centsFromMoneyInput, maskMoneyInput } from './money-input';

type Target = 'one' | 'two';
type Action = 'month' | 'partial' | 'total';
type Debt = { id: number; name: string; institution_id: number; institution_name: string; type_id: number; type_name: string; recurrence: string; responsibility: string; remaining_cents: number; month_remaining_cents: number };
type Plan = { name: string; target: Target; action: Action; recurrence: string; balance_cents: number; total_cents: number; remaining_cents: number; preview_hash: string; allocations: { id: number; number: number; due_on: string; amount_cents: number; remaining_cents: number }[] };
const money = (value = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const today = () => new Date().toLocaleDateString('sv-SE');
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/');
const actions: Record<Action, string> = { month: 'Quitar a fatura do mês', partial: 'Pagar parte da fatura do mês', total: 'Quitar a dívida inteira' };

export default function ExpensePersonPayment({ target, scope, month, config, busy, saveError, onClose, onSave }: {
  target: Target; scope?: 'one' | 'two' | 'shared'; month: string; config: Configuration; busy: boolean; saveError: string;
  onClose: () => void; onSave: (id: number, data: unknown) => Promise<boolean>;
}) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selected, setSelected] = useState<Debt>();
  const [action, setAction] = useState<Action>('month');
  const [value, setValue] = useState('0,00');
  const [totalConfirmed, setTotalConfirmed] = useState(false);
  const [occurred, setOccurred] = useState(today);
  const [plan, setPlan] = useState<Plan>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const previewRequest = useRef<AbortController | null>(null);
  const requestKey = useRef(expenseRequestId());
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const personName = config.people.find(p => p.id === (target === 'one' ? 1 : 2))?.name || 'Responsável';
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const overlay = formRef.current?.closest<HTMLElement>('.arl-3d-overlay');
      overlay?.style.setProperty('--cg-visible-height', (viewport?.height || window.innerHeight) + 'px');
      overlay?.style.setProperty('--cg-visible-top', (viewport?.offsetTop || 0) + 'px');
    };
    update(); viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update);
    return () => { viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void api<{ debts: Debt[] }>((scope ? '/invoice-balances?' : '/person-balances?') + new URLSearchParams({ target, month, ...(scope ? { scope } : {}) }), 'GET', undefined, controller.signal)
      .then(result => { if (!controller.signal.aborted) setDebts(result.debts.filter(debt => debt.month_remaining_cents > 0)); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); previewRequest.current?.abort(); };
  }, [target, scope, month, reload]);
  const invalidate = () => { previewRequest.current?.abort(); setLoading(false); setPlan(undefined); setError(''); requestKey.current = expenseRequestId(); };
  const choose = (debt: Debt) => { invalidate(); setSelected(debt); setAction('month'); setValue('0,00'); setTotalConfirmed(false); };
  const preview = async () => {
    if (!selected || loading || busy || (action === 'total' && !totalConfirmed)) return;
    const controller = new AbortController(); previewRequest.current = controller;
    setLoading(true); setError(''); setPlan(undefined);
    const query = new URLSearchParams({ target, month, action, ...(scope ? { scope } : {}) });
    if (action === 'partial') query.set('amount_cents', String(centsFromMoneyInput(value)));
    try {
      const result = await api<Plan>('/debts/' + selected.id + (scope ? '/invoice-payment?' : '/person-payment?') + query, 'GET', undefined, controller.signal);
      if (!controller.signal.aborted) { setPlan(result); requestKey.current = expenseRequestId(); }
    } catch (cause: any) { if (!controller.signal.aborted) setError(cause.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!plan || !selected || busy || submitting.current) return;
    submitting.current = true;
    try {
      const saved = await onSave(selected.id, { target, month, action, ...(scope ? { scope } : {}), request_key: requestKey.current, preview_hash: plan.preview_hash,
        amount_cents: plan.total_cents, paid_by: target === 'one' ? 1 : 2, occurred_on: occurred });
      if (saved) onClose();
    } finally { submitting.current = false; }
  };
  const groups = debts.reduce<Record<string, Debt[]>>((result, debt) => {
    const key = String(debt.institution_id);
    (result[key] ||= []).push(debt); return result;
  }, {});
  return <OrderPopup className="cg-quick-payment-popup" title={'Pagamento rápido de ' + personName} eyebrow="CONTROLE DE GASTO" description={month.split('-').reverse().join('/') + ' · Escolha uma dívida. Somente a sua parte.'} icon={CircleDollarSign} variant="budget" theme="expense" closeLabel="Fechar pagamento rápido" onClose={() => { if (!submitting.current) onClose(); }}>
    <form ref={formRef} className="cg-person-payment-form" onSubmit={event => void save(event)}>
      <div className="cg-dialog-grid cg-person-payment-body">
        {(error || saveError) && <p className="cg-alert" role="alert">{error || saveError}</p>}
        {loading && <p role="status">Conferindo saldos…</p>}
        {!selected ? <>
          {Object.entries(groups).map(([key, rows]) => <section className="cg-person-payment-group" key={key}>
            <h3>{rows[0].institution_name}</h3>
            {rows.map(debt => <button type="button" className="cg-person-debt-choice" key={debt.id} onClick={() => choose(debt)} disabled={loading}>
              <span><b>{debt.name}</b><small>{debt.type_name} · {debt.responsibility === 'shared' ? 'Sua parte do casal no mês' : 'Dívida pessoal no mês'}</small></span><strong>{money(debt.month_remaining_cents)}</strong>
            </button>)}
          </section>)}
          {!loading && !error && debts.length === 0 && <p>Nenhuma dívida pendente deste responsável.</p>}
          {!loading && error && <button type="button" onClick={() => setReload(n => n + 1)}>Tentar novamente</button>}
        </> : <>
          <button type="button" className="cg-back" disabled={busy} onClick={() => { invalidate(); setSelected(undefined); }}><ArrowLeft /> Escolher outra dívida</button>
          <div className="cg-person-payment-identity"><b>{selected.name}</b><small>{selected.institution_name} · {selected.type_name}</small><span>{personName} · pendente no mês: {money(selected.month_remaining_cents)}</span></div>
          <div className="cg-payment-modes" aria-label="Operação de pagamento rápido">{(['partial', 'month', ...(selected.responsibility === 'shared' ? [] : ['total'])] as Action[]).map(mode => <button type="button" key={mode} disabled={busy} aria-pressed={action === mode} onClick={() => { invalidate(); setAction(mode); setTotalConfirmed(false); }}>{actions[mode]}</button>)}</div>
          {action === 'month' && <p className="cg-muted">Somente vencimentos de {month.split('-').reverse().join('/')}: {money(selected.month_remaining_cents)}. Sem antecipar outros meses.</p>}
          {action === 'partial' && <label>Valor a pagar (R$)<input required inputMode="numeric" aria-label="Valor a pagar (R$)" value={value} disabled={busy} onChange={event => { invalidate(); setValue(maskMoneyInput(event.target.value)); }} /><small>Dinheiro efetivamente pago. Apenas esta dívida e este mês.</small></label>}
          {action === 'total' && <p className="cg-muted">Inclui as parcelas futuras já cadastradas, apenas de {personName}.{selected.recurrence === 'monthly' && ' Quita o saldo registrado; a recorrência continua ativa.'}</p>}
          {action === 'total' && <label className="cg-total-consent"><input type="checkbox" checked={totalConfirmed} disabled={busy} onChange={event => { invalidate(); setTotalConfirmed(event.target.checked); }} />Confirmo a quitação desta dívida individual, incluindo parcelas futuras.</label>}
          <p className="cg-muted">Responsável pelo pagamento: <b>{personName}</b></p>
          <label>Data do pagamento<input required type="date" max={today()} value={occurred} disabled={busy} onChange={event => { requestKey.current = expenseRequestId(); setOccurred(event.target.value); }} /></label>
          {!plan && <button type="button" className="cg-primary" disabled={loading || busy || (action === 'total' && !totalConfirmed) || (action === 'partial' && (centsFromMoneyInput(value) <= 0 || centsFromMoneyInput(value) > selected.month_remaining_cents))} onClick={() => void preview()}>Conferir pagamento</button>}
          {plan && <section className="cg-person-payment-confirmation" aria-label="Confira antes de pagar">
            <p><b>{personName}</b> · {selected.name} · {actions[action]}</p><strong>{money(plan.total_cents)}</strong><small>Ficará pendente nesta parte: {money(plan.remaining_cents)}</small>
            <div className="cg-institution-allocation">{plan.allocations.map(item => <article key={item.id}><span>Parcela {item.number} · {date(item.due_on)}</span><b>{money(item.amount_cents)}</b><small>Restante: {money(item.remaining_cents)}</small></article>)}</div>
            <p className="cg-muted">A parte do outro responsável e as outras dívidas permanecem preservadas.</p>
          </section>}
        </>}
      </div>
      <footer className="cg-dialog-footer"><button type="button" disabled={busy} onClick={onClose}>Cancelar</button>{plan && <button type="submit" className="cg-primary" disabled={busy || loading}>{busy ? 'Registrando…' : 'Confirmar pagamento'}</button>}</footer>
    </form>
  </OrderPopup>;
}
