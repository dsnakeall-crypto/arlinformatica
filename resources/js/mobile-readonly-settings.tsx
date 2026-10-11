import { useEffect, useState } from 'react';
import { api } from './app-shared';

type ReadOnlyData = Record<string, string | null>;

export default function MobileReadOnlySettings() {
  const [data, setData] = useState<ReadOnlyData>({});
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void api('/settings/overview').then(result => {
      if (active) setData(result);
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : 'Não foi possível consultar as configurações.');
    });
    return () => { active = false; };
  }, []);
  return <section className="panel arl-settings-readonly">
    <h2>Informações gerais (somente leitura)</h2>
    <p>As configurações administrativas são protegidas. Este perfil pode ajustar apenas o menu do próprio dispositivo.</p>
    {error && <p role="alert">{error}</p>}
    <dl>{[
      ['Empresa', data.company_name],
      ['Nome fantasia', data.trade_name],
      ['Cidade', [data.city, data.state].filter(Boolean).join(' / ')],
      ['Telefone', data.phone],
      ['Endereço', [data.street, data.number, data.district].filter(Boolean).join(', ')],
      ['Instagram', data.instagram],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Não informado'}</dd></div>)}</dl>
  </section>;
}
