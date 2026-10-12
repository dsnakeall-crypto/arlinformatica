import { useEffect, useState } from 'react';
import { DollarSign, Wallet } from 'lucide-react';
import OrderPopup from './order-popup';
import type { Configuration } from './expense-control-page';
import { expenseControlApi as api } from './expense-control-api';

export type InvoiceScope = 'one' | 'two' | 'shared';
export type InvoiceTotals = { one_cents: number; two_cents: number; shared_cents: number; total_cents: number; shared_one_cents: number; shared_two_cents: number };
export type MonthlyStatement = { month: string; totals: InvoiceTotals; data: { id: number; debt_id: number; responsibility: InvoiceScope; institution_name: string; type_name: string; debt_name: string; due_on: string; remaining_cents: number; remaining_one_cents: number; remaining_two_cents: number }[] };
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

export default function ExpenseMonthlyInvoice({ month, config, onClose, onPay }: { month: string; config: Configuration; onClose: () => void; onPay: (scope: InvoiceScope, totals: InvoiceTotals) => void }) {
  const [result, setResult] = useState<MonthlyStatement>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void api<MonthlyStatement>('/monthly-statement?month=' + month, 'GET', undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) { if (data.month !== month) throw new Error('Mês do resumo incompatível.'); setResult(data); }
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [month]);
  const labels = { one: 'Total ' + (config.people.find(p => p.id === 1)?.name || 'Allan'), two: 'Total ' + (config.people.find(p => p.id === 2)?.name || 'Carol'), shared: 'Total Casal', month: 'TOTAL FATURA' };
  const download = async (scope: InvoiceScope | 'month') => {
    if (!result || busy) return;
    setBusy(true); setError('');
    try {
      const pdf = await import('./expense-statement-pdf');
      if (scope === 'month') await pdf.downloadMonthlyInvoice(scope, result, config);
      else {
        const [summary, details] = await Promise.all([api<import('./expense-control-page').Summary>('/summary?month='+month), api<import('./expense-statement-data').StatementResponse>('/statement-details?month='+month)]);
        await pdf.downloadExpenseStatement(scope, summary, config, month, details);
      }
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o PDF.'); }
    finally { setBusy(false); }
  };
  return <OrderPopup title="Total a pagar no mês" eyebrow="CONTROLE DE GASTO" description={month.split('-').reverse().join('/') + ' · Saldos pendentes, sem duplicar as partes do casal.'} icon={Wallet} variant="budget" theme="expense" closeLabel="Fechar total do mês" onClose={() => { if (!busy) onClose(); }}>
    <div className="cg-dialog-body cg-month-invoice-popup">
      {error && <p role="alert">{error}</p>}
      {!result && !error && <p role="status">Conferindo fatura…</p>}
      {result && <><dl className="cg-exclusive-totals">{(['one', 'two', 'shared', 'month'] as const).map(scope => <div key={scope} data-category={scope}>
        <dt>{labels[scope]}</dt>
        <dd>{scope !== 'month' && <button type="button" className="cg-person-quick-pay" id={'cg-month-pay-' + scope} disabled={busy} aria-label={'Pagar ' + labels[scope]} onClick={() => onPay(scope, result.totals)}><DollarSign aria-hidden="true" /></button>}<span>{money(result.totals[scope === 'month' ? 'total_cents' : scope === 'one' ? 'one_cents' : scope === 'two' ? 'two_cents' : 'shared_cents'])}</span></dd>
      </div>)}</dl><div className="cg-month-invoice-pdfs" aria-label="PDFs da fatura">{(['one', 'two', 'shared', 'month'] as const).map(scope => <button type="button" key={scope} disabled={busy} onClick={() => void download(scope)}>PDF {scope === 'month' ? 'Total Fatura' : scope === 'shared' ? 'Casal' : config.people.find(p => p.id === (scope === 'one' ? 1 : 2))?.name || (scope === 'one' ? 'Allan' : 'Carol')}</button>)}</div></>}
      <button type="button" disabled={busy} onClick={onClose}>Fechar</button>
    </div>
  </OrderPopup>;
}
