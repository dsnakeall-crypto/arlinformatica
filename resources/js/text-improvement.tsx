import { useState } from 'react';

type Props = { value: string; onUse: (text: string) => void };
const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

export default function TextImprovement({ value, onUse }: Props) {
  const [loading, setLoading] = useState(false), [suggestion, setSuggestion] = useState(''), [error, setError] = useState(''), [controller, setController] = useState<AbortController>();
  const improve = async () => {
    const next = new AbortController(); setController(next); setLoading(true); setError(''); setSuggestion('');
    try {
      const response = await fetch('/api/text-improvements', { method: 'POST', credentials: 'same-origin', signal: next.signal, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(csrf() ? { 'X-CSRF-TOKEN': csrf() } : {}) }, body: JSON.stringify({ text: value }) });
      const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(); setSuggestion(body.suggestion);
    } catch { if (!next.signal.aborted) setError('Não foi possível melhorar o texto agora.'); } finally { setLoading(false); setController(undefined); }
  };
  return <div className="arl-text-improvement"><button type="button" disabled={!value.trim() || loading} onClick={() => void improve()}>{loading ? 'Melhorando…' : 'Melhorar texto'}</button>{loading && <button type="button" onClick={() => controller?.abort()}>Cancelar</button>}{error && <small className="alert">{error}</small>}{suggestion && <div className="notice"><p>{suggestion}</p><button type="button" onClick={() => { onUse(suggestion); setSuggestion(''); }}>Usar este</button><button type="button" onClick={() => setSuggestion('')}>Manter o meu</button></div>}</div>;
}
