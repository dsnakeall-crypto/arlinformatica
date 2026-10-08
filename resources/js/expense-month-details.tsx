import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import PersonPortrait from './expense-person-portrait';
import OrderPopup from './order-popup';
import { expenseControlApi as api } from './expense-control-api';

export type MonthlyInvoice = { key: string; institution_id: number; institution_name: string; type_name: string; debt_id: number | null; name: string; due_on: string; remaining_cents: number; count: number };
const money = (value = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/');

export function MonthlyInvoices({ items = [], onOpen }: { items?: MonthlyInvoice[]; onOpen: (item: MonthlyInvoice) => void }) {
  return <section className="cg-monthly-invoices" aria-label="Faturas do mês"><div className="cg-section-heading"><div><span className="cg-eyebrow">MÊS SELECIONADO</span><h2>Faturas do mês</h2><p>Valores de todos os responsáveis. Cartões agrupados; empréstimos e demais dívidas separados.</p></div></div><div className="cg-invoice-grid">{items.map(item => <button key={item.key} className="cg-invoice-card" onClick={() => onOpen(item)}><span className="cg-invoice-description"><b>{item.institution_name}</b><span>{item.type_name}{item.debt_id !== null && ' · ' + item.name}</span><small><CalendarDays /> Vencimento: {date(item.due_on)}</small></span><strong>{money(item.remaining_cents)}</strong><ChevronRight /></button>)}</div>{!items.length && <p className="cg-muted">Nenhuma fatura pendente neste mês.</p>}</section>;
}

type Detail = { data: { id: number; name: string; institution_name: string; type_name: string; number: number; due_on: string; scope_cents: number }[]; one_cents: number; two_cents: number; shared_cents: number; total_cents: number; total: number; current_page: number; last_page: number };
export default function ProjectionMonth({ month, names, onClose }: { month: string; names: [string, string]; onClose: () => void }) {
  const [scope, setScope] = useState<'one' | 'two' | 'shared'>('one');
  const [page, setPage] = useState(1), [result, setResult] = useState<Detail>();
  const [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setResult(undefined);
    void api<Detail>(`/projection?details=1&month=${month}&person=${scope}&page=${page}`, 'GET', undefined, controller.signal).then(setResult).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, scope, page]);
  const label = new Date(month + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return <OrderPopup title={'Projeção · ' + label} eyebrow="CONTROLE DE GASTO" description="Consulta independente: o mês principal permanece inalterado." icon={TrendingUp} variant="budget" theme="expense" closeLabel="Fechar projeção do mês" onClose={onClose}>
    <div className="cg-projection-detail">
      <div className="cg-projection-total"><span>Total pendente do mês</span><strong>{result ? money(result.total_cents) : '—'}</strong></div>
      <div className="cg-projection-people" role="tablist" aria-label="Responsável na projeção">{(['one', 'two', 'shared'] as const).map((key, index) => <button key={key} role="tab" aria-selected={scope === key} onClick={() => { setScope(key); setPage(1); }}><PersonPortrait kind={key === 'shared' ? 'couple' : key === 'one' ? 'man' : 'woman'} /><span>{index === 2 ? 'Despesas compartilhadas' : names[index]}<b>{result ? money(result[key + '_cents' as 'one_cents' | 'two_cents' | 'shared_cents']) : '—'}</b></span></button>)}</div>
      <p className="cg-muted">As partes individuais incluem a divisão do casal; o compartilhado já está incluído no total.</p>
      {error && <p role="alert">{error}</p>}
      <div className="cg-projection-detail-rows" role="tabpanel" aria-busy={loading}>{loading ? <p role="status">Preparando detalhes…</p> : result?.data.map(item => <article key={item.id}><div><b>{item.institution_name} · {item.name}</b><small>{item.type_name} · parcela {item.number} · vence {date(item.due_on)}</small></div><strong>{money(item.scope_cents)}</strong></article>)}{!loading && !error && !result?.data.length && <p>Nenhuma parcela pendente para esta visão.</p>}</div>
      <footer><button disabled={loading || page === 1} aria-label="Página anterior da projeção" onClick={() => setPage(p => p - 1)}><ChevronLeft /></button><span>{page} / {result?.last_page || 1} · {result?.total || 0} parcelas</span><button disabled={loading || page >= (result?.last_page || 1)} aria-label="Próxima página da projeção" onClick={() => setPage(p => p + 1)}><ChevronRight /></button><button onClick={onClose}>Fechar</button></footer>
    </div>
  </OrderPopup>;
}
