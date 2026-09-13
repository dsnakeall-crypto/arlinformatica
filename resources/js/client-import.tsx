import { useState, type FormEvent } from 'react';

type Result = { read: number; created: number; ignored: number; failed: number; errors: { line: number; reason: string }[] };

export default function ClientImport() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setResult(null); setError('');
    try {
      const response = await fetch('/api/settings/clients/import', {
        method: 'POST', credentials: 'same-origin', body: new FormData(form),
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(response.status >= 500 ? 'Não foi possível concluir a importação. Nenhum cliente foi gravado. Tente novamente.' : body.errors?.file?.[0] ?? body.message ?? 'Importação recusada.');
      setResult(body); form.reset();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Falha ao importar.');
    } finally { setBusy(false); }
  }
  return <section className="form-card" style={{ border: '1px solid var(--arl-border)', minWidth: 0 }} aria-labelledby="client-import-title">
    <h2 id="client-import-title">Importar clientes por CSV</h2>
    <p>Importe clientes do IntegraOS. CSV UTF-8, separado por ponto e vírgula, até 2 MB. Nome, CPF/CNPJ e Celular são obrigatórios. Endereço é opcional. Documentos já cadastrados serão ignorados.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <label className="field"><span>Arquivo CSV de clientes</span><input style={{ maxWidth: '100%' }} type="file" name="file" accept=".csv" required disabled={busy} /></label>
      <button className="primary" disabled={busy}>{busy ? 'Importando…' : 'Importar clientes'}</button>
    </form>
    {error && <p role="alert" style={{ overflowWrap: 'anywhere' }}>{error}</p>}
    {result && <div role="status">
      <p>Linhas lidas: {result.read} · Clientes criados: {result.created} · Ignorados por duplicidade: {result.ignored} · Erros: {result.failed}</p>
      {result.errors.length > 0 && <ul>{result.errors.map(item => <li key={item.line}>Linha {item.line}: {item.reason}</li>)}</ul>}
    </div>}
  </section>;
}
