import { useState } from 'react';

type Suggestions = { simples: string; tecnica: string };
type Props = { value: string; onUse: (text: string) => void };
const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

export default function TextImprovement({ value, onUse }: Props) {
  const [loading, setLoading] = useState(false), [suggestions, setSuggestions] = useState<Suggestions>(), [warnings, setWarnings] = useState<Partial<Suggestions>>({}), [error, setError] = useState(''), [controller, setController] = useState<AbortController>();
  const improve = async () => {
    const next = new AbortController(); setController(next); setLoading(true); setError(''); setSuggestions(undefined); setWarnings({});
    try {
      const response = await fetch('/api/text-improvements', { method: 'POST', credentials: 'same-origin', signal: next.signal, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(csrf() ? { 'X-CSRF-TOKEN': csrf() } : {}) }, body: JSON.stringify({ text: value }) });
      const body = await response.json().catch(() => ({})); if (!response.ok || typeof body.suggestions?.simples !== 'string' || typeof body.suggestions?.tecnica !== 'string') throw new Error(); setSuggestions(body.suggestions); setWarnings(typeof body.warnings === 'object' && body.warnings !== null ? body.warnings : {});
    } catch { if (!next.signal.aborted) setError('Não foi possível melhorar o texto agora.'); } finally { setLoading(false); setController(undefined); }
  };
  return <div className="arl-text-improvement"><button className="arl-text-improvement-action" type="button" disabled={!value.trim() || loading} onClick={() => void improve()}>{loading ? 'Melhorando…' : 'Melhorar texto'}</button>{loading && <button type="button" onClick={() => controller?.abort()}>Cancelar</button>}{error && <small className="alert">{error}</small>}{suggestions && <div className="notice arl-text-improvement-suggestions">{(['simples', 'tecnica'] as const).map((type) => <article className="arl-text-improvement-suggestion" key={type}><strong>{type === 'simples' ? 'Simples' : 'Técnica'}</strong><p>{suggestions[type]}</p>{warnings[type] && <small className="arl-text-improvement-warning">{warnings[type]}</small>}<button className="arl-text-improvement-action" type="button" onClick={() => { onUse(suggestions[type]); setSuggestions(undefined); setWarnings({}); }}>Usar este</button></article>)}<button className="arl-text-improvement-action" type="button" onClick={() => { setSuggestions(undefined); setWarnings({}); }}>Manter o meu</button></div>}</div>;
}
