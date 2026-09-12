import { useEffect, useState } from 'react';

const phone = (value: string) => value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
const documentLabel = (value: string) => {
  const n = value.replace(/\D/g, '');
  return n.length <= 11 ? n.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2') : n.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

type Client = { id: number; name: string; phone: string; document: string; [key: string]: any };

export default function NewOrderClientPicker({ selected, onSelect }: { selected?: Client; onSelect: (client: Client) => void }) {
  const [query, setQuery] = useState(selected?.name || '');
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setQuery(selected?.name || ''); setSearching(false); }, [selected?.id]);
  useEffect(() => {
    if (!searching || !query.trim()) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setMessage('…');
      try {
        const response = await fetch(`/api/clients?q=${encodeURIComponent(query.trim())}&per_page=100`, {
          credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Não foi possível pesquisar.');
        const body = await response.json();
        if (controller.signal.aborted) return;
        setResults(body.data); setMessage(body.data.length ? '' : 'Nenhum cliente encontrado.');
      } catch {
        if (!controller.signal.aborted) { setResults([]); setMessage('Não foi possível pesquisar.'); }
      }
    }, 90);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, searching]);
  return <div className="arl-client-search">
    <label><span className="arl-search-icon">⌕</span><input type="search" autoComplete="off" placeholder="Buscar por nome, telefone ou CPF/CNPJ" value={query} onChange={event => { setQuery(event.target.value); setSearching(true); }}/><span className="arl-client-search-state">{searching ? message : ''}</span></label>
    <div className="arl-client-results">{searching && results.map(client => <button type="button" key={client.id} data-id={client.id} onClick={() => { onSelect(client); setQuery(client.name); setSearching(false); setResults([]); }}><b>{client.name}</b><small>{phone(client.phone)} · {documentLabel(client.document)}{client.city ? ` · ${client.city}/${client.state}` : ''}</small></button>)}</div>
  </div>;
}
