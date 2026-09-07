import { useMemo, useState } from 'react';
import { Box, Search, Wrench } from 'lucide-react';
import '../css/services-page.css';

export type ServiceProductCatalogItem = {
  id: number;
  name: string;
  category: 'service' | 'product' | null;
  price_cents: number;
  warranty_enabled: boolean;
  warranty_term: number | null;
  warranty_unit: 'days' | 'months' | 'years' | null;
  active?: boolean;
};

type Props = {
  items: ServiceProductCatalogItem[];
  onSelect: (item: ServiceProductCatalogItem) => void;
  ariaLabel?: string;
};

const money = (cents = 0) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
const unitLabel = (unit: ServiceProductCatalogItem['warranty_unit']) => unit === 'months' ? 'meses' : unit === 'years' ? 'anos' : 'dias';

function TypeIcon({ category }: { category: ServiceProductCatalogItem['category'] }) {
  return category === 'product' ? <Box aria-hidden="true"/> : <Wrench aria-hidden="true"/>;
}

export default function ServiceProductSearch({ items, onSelect, ariaLabel = 'Pesquisar Serviço / Produto' }: Props) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return [];
    return items
      .filter((item) => item.active !== false)
      .filter((item) => {
        const category = item.category === 'product' ? 'produto' : 'serviço';
        return `${item.name} ${category}`.toLocaleLowerCase('pt-BR').includes(term);
      })
      .slice(0, 12);
  }, [items, query]);

  return <div className="arl-service-product-search">
    <label className="services-search">
      <Search aria-hidden="true"/>
      <input
        type="search"
        aria-label={ariaLabel}
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Pesquisar serviço ou produto"
      />
    </label>
    {query.trim() && <div className="services-list arl-service-product-results" role="list" aria-label="Resultados da busca">
      {visible.length ? visible.map((item) => <button
        type="button"
        key={item.id}
        className="services-row arl-service-product-result"
        data-category={item.category === 'product' ? 'product' : 'service'}
        aria-label={`Adicionar ${item.name}`}
        onClick={() => { onSelect(item); setQuery(''); }}
      >
        <span className={`services-type-icon ${item.category === 'product' ? 'product' : 'service'}`}><TypeIcon category={item.category}/></span>
        <span className="services-row-main">
          <b>{item.name}</b>
          <small>{money(item.price_cents)} · {item.category === 'product' ? 'Produto' : 'Serviço'} · {item.warranty_enabled ? `Garantia ${item.warranty_term} ${unitLabel(item.warranty_unit)}` : 'Sem garantia'}</small>
        </span>
      </button>) : <div className="services-empty">Nenhum serviço ou produto ativo encontrado.</div>}
    </div>}
  </div>;
}
