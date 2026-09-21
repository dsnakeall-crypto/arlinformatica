import { useMemo, useState } from 'react';
import { Box, ListPlus, Search, Wrench, X } from 'lucide-react';
import '../css/services-page.css';
import '../css/service-product-search.css';

export type ServiceProductCatalogItem = {
  id: number;
  name: string;
  category: 'service' | 'product' | null;
  price_cents: number;
  stock_quantity?: number;
  warranty_enabled: boolean;
  warranty_term: number | null;
  warranty_unit: 'days' | 'months' | 'years' | null;
  active?: boolean;
};

type Props = {
  items: ServiceProductCatalogItem[];
  onSelect: (item: ServiceProductCatalogItem, quantity?: number) => void;
  ariaLabel?: string;
  showBrowseAll?: boolean;
  context?: 'order' | 'budget';
  browseButtonLabel?: string;
};

const money = (cents = 0) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
const unitLabel = (unit: ServiceProductCatalogItem['warranty_unit']) => unit === 'months' ? 'meses' : unit === 'years' ? 'anos' : 'dias';
const isProduct = (item: ServiceProductCatalogItem) => item.category === 'product';
const stock = (item: ServiceProductCatalogItem) => Math.max(0, Number(item.stock_quantity || 0));

function TypeIcon({ category }: { category: ServiceProductCatalogItem['category'] }) {
  return category === 'product' ? <Box aria-hidden="true"/> : <Wrench aria-hidden="true"/>;
}

function ItemDetails({ item }: { item: ServiceProductCatalogItem }) {
  const available = stock(item);
  return <span className="services-row-main">
    <b>{item.name}</b>
    <small>{money(item.price_cents)} · {isProduct(item) ? `Produto · Disponível: ${available}` : 'Serviço'}{isProduct(item) && available === 0 ? ' · Sem estoque' : ''}{isProduct(item) && available === 1 ? ' · Última unidade em estoque' : ''}{item.warranty_enabled ? ` · Garantia ${item.warranty_term} ${unitLabel(item.warranty_unit)}` : ' · Sem garantia'}</small>
  </span>;
}

export default function ServiceProductSearch({ items, onSelect, ariaLabel = 'Pesquisar Serviço / Produto', showBrowseAll = true, context = 'order', browseButtonLabel = 'Produto/Serviço' }: Props) {
  const [query, setQuery] = useState('');
  const [browseOpen, setBrowseOpen] = useState(false);
  const [tab, setTab] = useState<'service' | 'product'>('service');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const activeItems = useMemo(() => items.filter((item) => item.active !== false), [items]);
  const services = useMemo(() => activeItems.filter((item) => !isProduct(item)), [activeItems]);
  const products = useMemo(() => activeItems.filter(isProduct), [activeItems]);
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return [];
    return activeItems
      .filter((item) => `${item.name} ${isProduct(item) ? 'produto' : 'serviço'}`.toLocaleLowerCase('pt-BR').includes(term))
      .slice(0, 12);
  }, [activeItems, query]);
  const unavailable = (item: ServiceProductCatalogItem) => context === 'order' && isProduct(item) && stock(item) === 0;
  const choose = (item: ServiceProductCatalogItem, quantity = 1) => {
    if (unavailable(item)) return;
    onSelect(item, quantity);
    setQuery('');
    setBrowseOpen(false);
  };

  return <div className="arl-service-product-search">
    <div className="arl-service-product-search-controls">
      <label className="services-search">
        <Search aria-hidden="true"/>
        <input type="search" aria-label={ariaLabel} autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar serviço ou produto"/>
      </label>
      {showBrowseAll && <button type="button" className="primary arl-service-product-browse" aria-label={browseButtonLabel} aria-expanded={browseOpen} onClick={() => setBrowseOpen(true)}><ListPlus aria-hidden="true"/><span>{browseButtonLabel}</span></button>}
    </div>

    {query.trim() && <div className="services-list arl-service-product-results" role="list" aria-label="Resultados da busca">
      {visible.length ? visible.map((item) => <button type="button" key={item.id} disabled={unavailable(item)} className="services-row arl-service-product-result" data-category={isProduct(item) ? 'product' : 'service'} aria-label={`${unavailable(item) ? 'Sem estoque: ' : 'Adicionar '}${item.name}`} onClick={() => choose(item)}>
        <span className={`services-type-icon ${isProduct(item) ? 'product' : 'service'}`}><TypeIcon category={item.category}/></span>
        <ItemDetails item={item}/>
      </button>) : <div className="services-empty">Nenhum serviço ou produto ativo encontrado.</div>}
    </div>}

    {browseOpen && <div className="arl-catalog-picker-backdrop" role="dialog" aria-modal="true" aria-label="Selecionar Produto ou Serviço">
      <section className="arl-catalog-picker">
        <header><div><h2>Produto/Serviço</h2><p>Escolha um serviço ou informe a quantidade do produto.</p></div><button type="button" aria-label="Fechar seletor" onClick={() => setBrowseOpen(false)}><X/></button></header>
        <div className="arl-catalog-picker-tabs" role="tablist" aria-label="Tipo de item">
          <button type="button" role="tab" aria-selected={tab === 'service'} onClick={() => setTab('service')}>Serviços</button>
          <button type="button" role="tab" aria-selected={tab === 'product'} onClick={() => setTab('product')}>Produtos</button>
        </div>
        <div className="arl-catalog-picker-columns">
          <CatalogColumn title="Serviços" kind="service" active={tab === 'service'} context={context} items={services} unavailable={unavailable} quantities={quantities} setQuantities={setQuantities} choose={choose}/>
          <CatalogColumn title="Produtos" kind="product" active={tab === 'product'} context={context} items={products} unavailable={unavailable} quantities={quantities} setQuantities={setQuantities} choose={choose}/>
        </div>
      </section>
    </div>}
  </div>;
}

function CatalogColumn({ title, kind, active, context, items, unavailable, quantities, setQuantities, choose }: {
  title: string;
  kind: 'service' | 'product';
  active: boolean;
  context: 'order' | 'budget';
  items: ServiceProductCatalogItem[];
  unavailable: (item: ServiceProductCatalogItem) => boolean;
  quantities: Record<number, number>;
  setQuantities: (value: Record<number, number>) => void;
  choose: (item: ServiceProductCatalogItem, quantity?: number) => void;
}) {
  return <section className={`arl-catalog-picker-column ${kind}${active ? ' active' : ''}`} aria-label={title}>
    <h3>{title}</h3>
    <div>{items.length ? items.map((item) => {
      const blocked = unavailable(item);
      const limit = context === 'order' && kind === 'product' ? Math.max(1, stock(item)) : 999;
      const quantity = Math.max(1, Math.min(limit, quantities[item.id] || 1));
      return <article key={item.id} className={blocked ? 'unavailable' : ''}>
        <span className={`services-type-icon ${kind}`}><TypeIcon category={item.category}/></span>
        <ItemDetails item={item}/>
        {kind === 'product' && <input aria-label={`Quantidade de ${item.name} no seletor`} type="number" min="1" max={limit} disabled={blocked} value={quantity} onChange={(event) => setQuantities({ ...quantities, [item.id]: Math.max(1, Math.min(limit, Number(event.target.value) || 1)) })}/>}
        <button type="button" disabled={blocked} aria-label={`${blocked ? 'Sem estoque: ' : 'Adicionar '}${item.name}`} onClick={() => choose(item, kind === 'product' ? quantity : 1)}>{blocked ? 'Sem estoque' : 'Adicionar'}</button>
      </article>;
    }) : <div className="services-empty">Nenhum {kind === 'product' ? 'produto' : 'serviço'} ativo cadastrado.</div>}</div>
  </section>;
}
