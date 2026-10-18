import { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import OrderPopup from './order-popup';
import { expenseControlApi as api } from './expense-control-api';
import { projectStatement, type StatementResponse } from './expense-statement-data';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (value: number) => currencyFormatter.format(value / 100);

/** Leitura do mês selecionado; inclui somente a participação do responsável. */
export default function ExpensePersonMonthSummary({ target, name, month, onClose }: {
  target: 'one' | 'two'; name: string; month: string; onClose: () => void;
}) {
  const [groups, setGroups] = useState<{ key: string; label: string; total: number }[]>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setGroups(undefined); setError('');
    void api<StatementResponse>('/statement-details?month=' + month, 'GET', undefined, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (result.month !== month || !Array.isArray(result.data)) throw new Error('Mês do resumo incompatível.');
      const grouped = new Map<string, { key: string; label: string; total: number }>();
      for (const institution of projectStatement(target, result.data).institutions) {
        for (const invoice of institution.invoices) {
          const key = institution.id + ':' + invoice.type_name;
          const group = grouped.get(key) || { key, label: institution.name + ' — ' + invoice.type_name, total: 0 };
          group.total += invoice.original_cents;
          grouped.set(key, group);
        }
      }
      setGroups([...grouped.values()]);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [target, month, revision]);
  return <OrderPopup title={'Resumo mensal de ' + name} eyebrow="CONTROLE DE GASTO" description={month.split('-').reverse().join('/') + ' · Total da fatura por instituição e modalidade, incluindo sua parte do casal.'} icon={Landmark} variant="budget" theme="expense" closeLabel="Fechar resumo mensal" onClose={onClose}>
    <div className="cg-dialog-body cg-person-month-summary">
      {error && <><p role="alert">{error}</p><button type="button" onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></>}
      {!groups && !error && <p role="status">Carregando valores do mês…</p>}
      {groups && <dl>{groups.map(group => <div key={group.key}><dt>{group.label}:</dt><dd>{money(group.total)}</dd></div>)}</dl>}
      {groups?.length === 0 && <p>Nenhuma fatura neste mês.</p>}
      <button type="button" onClick={onClose}>Fechar</button>
    </div>
  </OrderPopup>;
}
