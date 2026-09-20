import { useEffect, useState } from 'react';

type AuditEntry = {
  id: number;
  created_at: string;
  user: string;
  action: string;
  changes: string[];
};

export default function OrderAuditHistory({ orderId }: { orderId: number }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEntries([]);
    setLoaded(false);
    setError('');
  }, [orderId]);

  const load = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/orders/${orderId}/audit-history`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Não foi possível carregar o histórico de alterações.');
      setEntries(await response.json());
      setLoaded(true);
    } catch (reason: any) {
      setError(reason?.message || 'Não foi possível carregar o histórico de alterações.');
    } finally {
      setLoading(false);
    }
  };

  const when = (value: string | null | undefined) => {
    if (!value?.trim()) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
  };

  return <details className="panel arl-audit-history" onToggle={(event) => {
    if (event.currentTarget.open) void load();
  }}>
    <summary>Histórico de alterações</summary>
    {loading && <p>Carregando histórico…</p>}
    {error && <div className="alert">{error}</div>}
    {loaded && !entries.length && <p>Nenhuma alteração auditada nesta OS.</p>}
    {entries.map((entry) => <article key={entry.id}>
      <div><b>{entry.action}</b><small>{when(entry.created_at)} · {entry.user}</small></div>
      <ul>{entry.changes.map((change, index) => <li key={`${entry.id}-${index}`}>{change}</li>)}</ul>
    </article>)}
  </details>;
}
