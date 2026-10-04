import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TrendingDown, TrendingUp, CalendarDays } from 'lucide-react';
import { expenseControlApi } from './expense-control-api';

type Month = { month: string; amount_cents: number; advance_cents: number; count: number; change_cents: number | null; change_percent: number | null };
type Report = { start: string; end: string; person: string; months: Month[]; total_cents: number; advance_cents: number; highest: Month | null; lowest: Month | null };
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const label = (month: string) => month.slice(5) + '/' + month.slice(0, 4);

export default function ExpenseSpendingHistory({ month, people }: { month: string; people: { id: number; name: string }[] }) {
  const [end, setEnd] = useState(month);
  const [start, setStart] = useState(() => { const date = new Date(month + '-01T12:00:00'); date.setMonth(date.getMonth() - 5); return date.toLocaleDateString('sv-SE').slice(0, 7); });
  const [person, setPerson] = useState('all');
  const [report, setReport] = useState<Report>();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setReport(undefined);
    try { const result = await expenseControlApi<Report>('/spending-history?' + new URLSearchParams({ start, end, person }), 'GET', undefined, controller.signal); if (!controller.signal.aborted) setReport(result); }
    catch (e: any) { if (!controller.signal.aborted) setError(e.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const name = report?.person === 'one' ? people.find(p => p.id === 1)?.name : report?.person === 'two' ? people.find(p => p.id === 2)?.name : report?.person === 'shared' ? 'Casal' : 'Todos';
  const max = Math.max(1, ...report?.months.map(row => row.amount_cents) || []);
  return <section className="cg-spending-history">
    <div className="cg-section-heading"><div><span className="cg-eyebrow">COMPARE OS MESES</span><h2>Histórico de gastos</h2><p>Valores originais das parcelas, incluindo as compras já quitadas.</p></div></div>
    <form className="cg-history-filters cg-panel" onSubmit={event => void submit(event)}>
      <label>Responsável<select aria-label="Responsável no histórico" value={person} onChange={e => setPerson(e.target.value)}><option value="all">Todos</option><option value="one">{people.find(p => p.id === 1)?.name || 'Allan'}</option><option value="two">{people.find(p => p.id === 2)?.name || 'Carol'}</option><option value="shared">Casal</option></select></label>
      <label>Mês inicial<input required aria-label="Mês inicial do histórico" type="month" min="2000-01" max="2099-12" value={start} onChange={e => setStart(e.target.value)} /></label>
      <label>Mês final<input required aria-label="Mês final do histórico" type="month" min={start || '2000-01'} max="2099-12" value={end} onChange={e => setEnd(e.target.value)} /></label>
      <button disabled={busy} type="submit">{busy ? 'Consultando…' : 'OK'}</button>
    </form>
    <p className="cg-history-note">A visão individual inclui sua parte das despesas do casal. Antecipações ficam separadas e não reduzem os valores do gráfico. Despesas canceladas ficam fora; meses recorrentes seguem a configuração cadastrada.</p>
    {error && <p className="cg-alert" role="alert">{error}</p>}
    {!report && !busy && !error && <p className="cg-muted">Escolha o período e toque em OK para comparar.</p>}
    {report && <>
      <div className="cg-history-caption"><b>{name}</b><span>{label(report.start)} a {label(report.end)}</span></div>
      <div className="cg-history-totals">
        <article className="cg-panel"><span>Total do período</span><strong>{money(report.total_cents)}</strong></article>
        <article className="cg-panel"><span><TrendingUp /> Maior mês</span><strong>{report.highest ? money(report.highest.amount_cents) : '—'}</strong><small>{report.highest ? label(report.highest.month) : 'Sem parcelas'}</small></article>
        <article className="cg-panel"><span><TrendingDown /> Menor mês</span><strong>{report.lowest ? money(report.lowest.amount_cents) : '—'}</strong><small>{report.lowest ? label(report.lowest.month) : 'Sem parcelas'}</small></article>
        <article className="cg-panel"><span>Antecipações no período</span><strong>{money(report.advance_cents)}</strong><small>Por data do lançamento · fora do gráfico</small></article>
      </div>
      <div className="cg-panel cg-history-chart" aria-label="Gráfico dos gastos por mês"><div className="cg-history-chart-heading"><CalendarDays /><h3>Valor das parcelas por mês</h3></div>
        {report.months.map(row => <div className="cg-history-month" key={row.month}>
          <span>{label(row.month)}</span><div className="cg-history-track"><span style={{ width: (100 * row.amount_cents / max) + '%' }} /></div><strong>{money(row.amount_cents)}</strong>
          <small>{row.change_cents === null ? 'Primeiro mês do período' : row.change_cents === 0 ? 'Sem mudança' : (row.change_cents > 0 ? '+' : '−') + money(Math.abs(row.change_cents)) + (row.change_percent === null ? ' · mês anterior sem valor' : ' (' + (row.change_percent > 0 ? '+' : '') + row.change_percent.toLocaleString('pt-BR') + '%)')}</small>
        </div>)}
        {!report.total_cents && <p className="cg-muted">Nenhuma parcela neste período.</p>}
        <p className="cg-history-note">Comparação com o mês anterior dentro do período. Em empates, o primeiro mês é exibido. Meses sem parcelas também entram no menor valor.</p>
      </div>
    </>}
  </section>;
}
