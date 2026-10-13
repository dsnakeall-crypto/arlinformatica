import { useEffect, useRef, useState } from 'react';
import { CircleDollarSign } from 'lucide-react';
import OrderPopup from './order-popup';
import { expenseControlApi as api } from './expense-control-api';
import { expenseRequestId } from './expense-browser-crypto';
import type { Configuration } from './expense-control-page';

type Plan = { balance_cents: number; remaining_cents: number; preview_hash: string; allocations: { id: number; name: string; number: number; shared: boolean; amount_cents: number; remaining_cents: number }[] };
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function ExpenseInstitutionSettlement({ bank, type, institutionName, typeName, target, scope, month, config, busy, saveError, onClose, onSave }: {
  bank: number; type: number; institutionName: string; typeName: string; target: 'one' | 'two'; scope?: 'one' | 'two' | 'shared';
  month: string; config: Configuration; busy: boolean; saveError: string; onClose: () => void; onSave: (data: unknown) => Promise<boolean>;
}) {
  const [plan, setPlan] = useState<Plan>();
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const key = useRef(expenseRequestId());
  const submitting = useRef(false);
  const person = config.people.find(p => p.id === (target === 'one' ? 1 : 2))?.name || 'Responsável';
  useEffect(() => {
    const controller = new AbortController();
    setPlan(undefined); setError('');
    const base = { institution_id: bank, type_id: type, scope: scope === 'shared' ? 'shared' : target, month, target, preview: true };
    void (async () => {
      const balance = await api<Plan>('/institution-payments', 'POST', { ...base, amount_cents: 0 }, controller.signal);
      const preview = await api<Plan>('/institution-payments', 'POST', { ...base, amount_cents: balance.balance_cents }, controller.signal);
      if (!controller.signal.aborted) { key.current = expenseRequestId(); setPlan(preview); }
    })().catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [bank, type, target, scope, month, reload]);
  const confirm = async () => {
    if (!plan || plan.balance_cents <= 0 || busy || submitting.current) return;
    submitting.current = true;
    try {
      const ok = await onSave({ institution_id: bank, type_id: type, scope: scope === 'shared' ? 'shared' : target, month, target,
        amount_cents: plan.balance_cents, request_key: key.current, preview_hash: plan.preview_hash, kind: 'payment',
        paid_by: target === 'one' ? 1 : 2, occurred_on: new Date().toLocaleDateString('sv-SE') });
      if (ok) onClose();
    } finally { submitting.current = false; }
  };
  return <OrderPopup theme="expense" title="Quitar fatura da instituição" eyebrow="CONTROLE DE GASTO" icon={CircleDollarSign} variant="budget" description={institutionName + ' · ' + typeName + ' · ' + month.split('-').reverse().join('/')} closeLabel="Fechar quitação da instituição" onClose={() => { if (!submitting.current) onClose(); }}>
    <div className="cg-dialog cg-form"><div className="cg-dialog-body">
      {(error || saveError) && <p className="cg-alert" role="alert">{error || saveError}</p>}
      {!plan && !error && <p role="status">Conferindo fatura da instituição…</p>}
      <p>Responsável: <b>{person}</b>. Somente {scope === 'shared' ? 'sua participação nas despesas do casal' : 'suas dívidas pessoais e sua participação no casal'} neste mês e nesta modalidade.</p>
      {plan && <><div className="cg-payment-preview"><span>Total que será pago</span><strong>{money(plan.balance_cents)}</strong></div>
        <div className="cg-institution-allocation">{plan.allocations.map(item => <article key={item.id}><span><b>{item.name}</b><small>Parcela {item.number} · {item.shared ? 'Sua parte do casal' : 'Pessoal'}</small></span><strong>{money(item.amount_cents)}</strong></article>)}</div>
        {plan.balance_cents === 0 && <p>Nenhum saldo pendente nesta fatura.</p>}</>}
      <p className="cg-muted">A outra pessoa, as outras modalidades e parcelas futuras permanecem preservadas. O pagamento só será registrado após confirmar.</p>
    </div><footer className="cg-dialog-footer"><button type="button" disabled={busy} onClick={onClose}>Cancelar</button>
      {(error || saveError) && <button type="button" disabled={busy} onClick={() => setReload(n => n + 1)}>Conferir novamente</button>}
      <button type="button" className="cg-primary" disabled={busy || !plan || plan.balance_cents <= 0} onClick={() => void confirm()}>{busy ? 'Registrando…' : 'Confirmar quitação da instituição'}</button>
    </footer></div>
  </OrderPopup>;
}
