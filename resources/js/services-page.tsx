import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Ban, Box, CheckCircle2, History, PackagePlus, Pencil, Plus, RotateCcw, Search, ShieldCheck, Wrench, X } from 'lucide-react';
import '../css/services-page.css';
import '../css/stock-management.css';
import PageHeader from './page-header';
import { centsFromMoneyInput, maskMoneyInput } from './money-input';

type ServiceItem = {
  id: number;
  name: string;
  category: 'service' | 'product' | null;
  price_cents: number;
  stock_quantity: number;
  warranty_enabled: boolean;
  warranty_term: number | null;
  warranty_unit: 'days' | 'months' | 'years' | null;
  active: boolean;
  usage_count?: number | string;
  created_at?: string | null;
};

type Draft = {
  name: string;
  price: string;
  stock_quantity: number;
  warranty_enabled: boolean;
  warranty_term: number;
  warranty_unit: 'days' | 'months' | 'years';
};

type StockMovement = {
  id: number;
  type: 'entry' | 'order_out' | 'order_return';
  quantity: number;
  balance_after: number;
  reason: string;
  user_name?: string | null;
  created_at: string;
};

const emptyDraft = (): Draft => ({
  name: '',
  price: '0,00',
  stock_quantity: 0,
  warranty_enabled: false,
  warranty_term: 30,
  warranty_unit: 'days',
});

const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrf() ? { 'X-CSRF-TOKEN': csrf() } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({ message: 'Resposta inválida do servidor.' }));
  if (!response.ok) {
    const firstValidation = body?.errors ? Object.values(body.errors).flat()[0] : null;
    throw new Error(String(firstValidation || body?.message || 'Não foi possível concluir.'));
  }
  return body;
}

function money(cents = 0) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

const cents = centsFromMoneyInput;

function unitLabel(unit: ServiceItem['warranty_unit']) {
  if (unit === 'months') return 'meses';
  if (unit === 'years') return 'anos';
  return 'dias';
}

function TypeIcon({ category }: { category: ServiceItem['category'] }) {
  return category === 'product' ? <Box aria-hidden="true" /> : <Wrench aria-hidden="true" />;
}

function usage(item: ServiceItem) {
  const value = Number(item.usage_count || 0);
  return Number.isFinite(value) ? value : 0;
}

function recency(item: ServiceItem) {
  const timestamp = item.created_at ? Date.parse(item.created_at) : 0;
  return Number.isFinite(timestamp) ? timestamp : item.id;
}

type CatalogKind = 'services' | 'products';

function CatalogPage({ kind }: { kind: CatalogKind }) {
  const product = kind === 'products';
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [edit, setEdit] = useState<(Draft & { id: number }) | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [stockEntry, setStockEntry] = useState<{ item: ServiceItem; quantity: number; reason: string } | null>(null);
  const [stockHistory, setStockHistory] = useState<{ item: ServiceItem; rows: StockMovement[] } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await api(`/catalogs/${kind}?active=0`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o catálogo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [kind]);

  const topThree = useMemo(
    () => [...items]
      .filter((item) => item.active)
      .sort((a, b) => usage(b) - usage(a) || recency(b) - recency(a) || b.id - a.id)
      .slice(0, 3),
    [items],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return items;
    return items.filter((item) => {
      const state = item.active ? 'ativo' : 'inativo';
      return `${item.name} ${state}`.toLocaleLowerCase('pt-BR').includes(term);
    });
  }, [items, query]);

  const payload = (source: Draft) => {
    const price = cents(source.price);
    if (!source.name.trim()) throw new Error('Informe o nome ou a descrição.');
    if (!Number.isFinite(price)) throw new Error('Informe um valor válido.');
    return {
      name: source.name.trim(),
      price_cents: price,
      ...(product ? { stock_quantity: Math.max(0, Math.floor(source.stock_quantity || 0)) } : {}),
      warranty_enabled: source.warranty_enabled,
      warranty_term: source.warranty_enabled ? source.warranty_term : null,
      warranty_unit: source.warranty_enabled ? source.warranty_unit : null,
    };
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/catalogs/${kind}`, { method: 'POST', body: JSON.stringify({ ...payload(draft), active: true }) });
      setDraft(emptyDraft());
      setMessage(`${product ? 'Produto' : 'Serviço'} cadastrado com sucesso.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível cadastrar.');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!edit) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/catalogs/${kind}/${edit.id}`, { method: 'PATCH', body: JSON.stringify(payload(edit)) });
      setEdit(null);
      setMessage('Alterações salvas. O histórico das OS anteriores permanece preservado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar a alteração.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (item: ServiceItem) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/catalogs/${kind}/${item.id}`, { method: 'PATCH', body: JSON.stringify({ active: !item.active }) });
      setMessage(item.active
        ? 'Item desativado. Ele não aparecerá em novas OS, mas continua preservado no histórico.'
        : 'Item reativado e disponível novamente para novas OS.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível alterar o status.');
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (item: ServiceItem) => setEdit({
    id: item.id,
    name: item.name,
    price: (item.price_cents / 100).toFixed(2).replace('.', ','),
    stock_quantity: Number(item.stock_quantity || 0),
    warranty_enabled: Boolean(item.warranty_enabled),
    warranty_term: item.warranty_term || 30,
    warranty_unit: item.warranty_unit || 'days',
  });

  const openStockHistory = async (item: ServiceItem) => {
    setBusy(true);
    setError('');
    try {
      const rows = await api(`/catalogs/products/${item.id}/stock-movements`);
      setStockHistory({ item, rows });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as movimentações.');
    } finally {
      setBusy(false);
    }
  };

  const saveStockEntry = async (event: FormEvent) => {
    event.preventDefault();
    if (!stockEntry) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/catalogs/products/${stockEntry.item.id}/stock-entries`, {
        method: 'POST',
        body: JSON.stringify({ quantity: stockEntry.quantity, reason: stockEntry.reason.trim() }),
      });
      setStockEntry(null);
      setMessage('Entrada de estoque registrada e somada ao saldo atual.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar a entrada.');
    } finally {
      setBusy(false);
    }
  };

  const singular = product ? 'produto' : 'serviço';
  const plural = product ? 'produtos' : 'serviços';

  return <div className="services-page" data-testid={product ? 'products-page' : 'services-page'}>
    <PageHeader eyebrow="CATÁLOGO ARL" title={product ? 'Produtos' : 'Serviços'} description={`Cadastre, organize e consulte os ${plural} usados nas ordens de serviço.`} icon={product ? Box : Wrench}/>

    {(error || message) && <div className={error ? 'alert services-feedback' : 'notice services-feedback'} role="status">
      {error || message}
    </div>}

    <form className="services-create-card" onSubmit={create}>
      <div className="services-section-heading">
        <span className="services-heading-icon"><Plus aria-hidden="true" /></span>
        <div>
          <h2>Novo {singular}</h2>
          <p>Preencha as informações para adicionar um novo {singular} ao catálogo.</p>
        </div>
      </div>

      <div className="services-create-grid">
        <label className="services-field services-name-field">
          <span>Nome / descrição</span>
          <input aria-label={`Nome ou descrição do ${singular}`} spellCheck={true} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nome / descrição" />
        </label>
        <label className="services-field">
          <span>Valor (R$)</span>
          <div className="services-money-input"><b>R$</b><input aria-label="Valor em R$" inputMode="decimal" value={draft.price} onChange={(event) => setDraft({ ...draft, price: maskMoneyInput(event.target.value) })} /></div>
        </label>
        {product && <label className="services-field">
          <span>Quantidade em estoque</span>
          <input aria-label="Quantidade inicial em estoque" type="number" min="0" step="1" value={draft.stock_quantity} onChange={(event) => setDraft({ ...draft, stock_quantity: Math.max(0, Number(event.target.value) || 0) })} />
        </label>}
        <button className="primary services-add" disabled={busy}><Plus aria-hidden="true" />{busy ? 'Salvando…' : 'Adicionar'}</button>
      </div>

      <div className="services-warranty-row">
        <label className="services-warranty-toggle">
          <input type="checkbox" checked={draft.warranty_enabled} onChange={(event) => setDraft({ ...draft, warranty_enabled: event.target.checked })} />
          <span><ShieldCheck aria-hidden="true" /><b>Garantia adicional</b><small>Oferece uma garantia estendida para este item.</small></span>
        </label>
        {draft.warranty_enabled && <>
          <label className="services-field"><span>Duração da garantia</span><input aria-label="Duração da garantia" type="number" min="1" max="9999" value={draft.warranty_term} onChange={(event) => setDraft({ ...draft, warranty_term: Number(event.target.value) || 1 })} /></label>
          <label className="services-field"><span>Unidade da garantia</span><select aria-label="Unidade da garantia" value={draft.warranty_unit} onChange={(event) => setDraft({ ...draft, warranty_unit: event.target.value as Draft['warranty_unit'] })}><option value="days">Dias</option><option value="months">Meses</option><option value="years">Anos</option></select></label>
        </>}
      </div>
    </form>

    <section className="services-most-used" aria-labelledby="services-most-used-title">
      <div className="services-list-heading">
        <div><h2 id="services-most-used-title">Mais usados</h2><p>Os três {plural} mais presentes em OS; sem histórico suficiente, entram os cadastros mais recentes.</p></div>
      </div>
      <div className="services-most-used-grid">
        {topThree.length ? topThree.map((item, index) => <article className="services-top-card" data-testid="service-top-card" key={item.id}>
          <span className="services-rank">#{index + 1}</span>
          <span className={`services-type-icon ${product ? 'product' : 'service'}`}><TypeIcon category={product ? 'product' : 'service'} /></span>
          <div><b>{item.name}</b><small>{product ? 'Produto' : 'Serviço'} · {usage(item)} OS</small></div>
          <strong>{money(item.price_cents)}</strong>
        </article>) : <div className="services-empty">Cadastre o primeiro {singular} para começar.</div>}
      </div>
    </section>

    <section className="services-list-card">
      <div className="services-list-heading">
        <div><h2>{product ? 'Produtos cadastrados' : 'Serviços cadastrados'}</h2><p>{items.length} {items.length === 1 ? `${singular} cadastrado` : `${plural} cadastrados`} no catálogo.</p></div>
        <label className="services-search"><Search aria-hidden="true" /><input aria-label={`Pesquisar ${plural}`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Pesquisar ${singular}`} /></label>
      </div>

      {loading ? <div className="services-empty">Carregando catálogo…</div> : !visible.length ? <div className="services-empty">Nenhum item encontrado para esta pesquisa.</div> : <div className="services-list" data-testid="services-list">
        {visible.map((item) => <article className={`services-row${item.active ? '' : ' inactive'}`} key={item.id}>
          <span className={`services-type-icon ${product ? 'product' : 'service'}`}><TypeIcon category={product ? 'product' : 'service'} /></span>
          <div className="services-row-main">
            <b>{item.name}</b>
            <small><span className={`services-state ${item.active ? 'active' : 'inactive'}`}>{item.active ? 'Ativo' : 'Inativo'}</span> · {money(item.price_cents)} · {product ? `Produto · Estoque: ${item.stock_quantity}` : 'Serviço'}{product && item.stock_quantity === 1 ? ' · Última unidade em estoque' : ''}{item.warranty_enabled ? ` · Garantia ${item.warranty_term} ${unitLabel(item.warranty_unit)}` : ''}</small>
          </div>
          <span className="services-usage"><b>{usage(item)}</b><small>uso em OS</small></span>
          <div className="services-row-actions">
            {product && <button type="button" className="services-stock-entry" onClick={() => setStockEntry({ item, quantity: 1, reason: '' })}><PackagePlus aria-hidden="true" />Entrada de estoque</button>}
            {product && <button type="button" className="services-history" disabled={busy} onClick={() => void openStockHistory(item)}><History aria-hidden="true" />Movimentações</button>}
            <button type="button" className="services-edit" onClick={() => openEdit(item)}><Pencil aria-hidden="true" />Editar</button>
            <button type="button" className={item.active ? 'services-disable' : 'services-reactivate'} disabled={busy} onClick={() => void toggleActive(item)}>{item.active ? <Ban aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}{item.active ? 'Desativar' : 'Reativar'}</button>
          </div>
        </article>)}
      </div>}
    </section>

    {edit && <div className="modal services-modal" role="dialog" aria-modal="true" aria-label={`Editar ${singular}`}>
      <form className="modal-card services-edit-card" onSubmit={saveEdit}>
        <button type="button" className="modal-close" aria-label="Fechar edição" onClick={() => setEdit(null)}><X aria-hidden="true" /></button>
        <div className="services-section-heading"><span className="services-heading-icon"><Pencil aria-hidden="true" /></span><div><h2>Editar {singular}</h2><p>Alterações futuras não modificam o histórico das OS já abertas.</p></div></div>
        <label className="services-field"><span>Nome / descrição</span><input spellCheck={true} value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} /></label>
        <label className="services-field"><span>Valor (R$)</span><input inputMode="decimal" value={edit.price} onChange={(event) => setEdit({ ...edit, price: maskMoneyInput(event.target.value) })} /></label>
        {product && <label className="services-field"><span>Quantidade em estoque</span><input aria-label="Quantidade atual em estoque" type="number" value={edit.stock_quantity} readOnly /><small>Use a ação de entrada de estoque para acrescentar unidades.</small></label>}
        <label className="services-warranty-toggle compact"><input type="checkbox" checked={edit.warranty_enabled} onChange={(event) => setEdit({ ...edit, warranty_enabled: event.target.checked })} /><span><ShieldCheck aria-hidden="true" /><b>Garantia adicional</b></span></label>
        {edit.warranty_enabled && <div className="services-edit-warranty"><label className="services-field"><span>Duração</span><input type="number" min="1" max="9999" value={edit.warranty_term} onChange={(event) => setEdit({ ...edit, warranty_term: Number(event.target.value) || 1 })} /></label><label className="services-field"><span>Unidade</span><select value={edit.warranty_unit} onChange={(event) => setEdit({ ...edit, warranty_unit: event.target.value as Draft['warranty_unit'] })}><option value="days">Dias</option><option value="months">Meses</option><option value="years">Anos</option></select></label></div>}
        <div className="actions"><button type="button" onClick={() => setEdit(null)}>Cancelar</button><button className="primary" disabled={busy}><CheckCircle2 aria-hidden="true" />{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
      </form>
    </div>}

    {stockEntry && <div className="modal services-modal" role="dialog" aria-modal="true" aria-label="Entrada de estoque">
      <form className="modal-card services-edit-card" onSubmit={saveStockEntry}>
        <button type="button" className="modal-close" aria-label="Fechar entrada de estoque" onClick={() => setStockEntry(null)}><X aria-hidden="true" /></button>
        <div className="services-section-heading"><span className="services-heading-icon"><PackagePlus aria-hidden="true" /></span><div><h2>Entrada de estoque</h2><p>{stockEntry.item.name} · saldo atual: {stockEntry.item.stock_quantity}</p></div></div>
        <label className="services-field"><span>Quantidade a somar</span><input aria-label="Quantidade da entrada" type="number" min="1" step="1" value={stockEntry.quantity} onChange={(event) => setStockEntry({ ...stockEntry, quantity: Math.max(1, Number(event.target.value) || 1) })} /></label>
        <label className="services-field"><span>Motivo</span><input aria-label="Motivo da entrada" spellCheck={true} required maxLength={500} value={stockEntry.reason} onChange={(event) => setStockEntry({ ...stockEntry, reason: event.target.value })} placeholder="Ex.: compra de mercadoria ou brinde recebido" /></label>
        <div className="actions"><button type="button" onClick={() => setStockEntry(null)}>Cancelar</button><button className="primary" disabled={busy || !stockEntry.reason.trim()}><PackagePlus aria-hidden="true" />{busy ? 'Registrando…' : 'Somar ao estoque'}</button></div>
      </form>
    </div>}

    {stockHistory && <div className="modal services-modal" role="dialog" aria-modal="true" aria-label="Movimentações de estoque">
      <div className="modal-card services-edit-card services-stock-history">
        <button type="button" className="modal-close" aria-label="Fechar movimentações" onClick={() => setStockHistory(null)}><X aria-hidden="true" /></button>
        <div className="services-section-heading"><span className="services-heading-icon"><History aria-hidden="true" /></span><div><h2>Movimentações de estoque</h2><p>{stockHistory.item.name}</p></div></div>
        {stockHistory.rows.length ? <div className="services-stock-history-list">{stockHistory.rows.map((row) => <article key={row.id}><div><b>{row.type === 'entry' ? 'Entrada' : row.type === 'order_out' ? 'Baixa em OS' : 'Devolução de OS'}</b><small>{new Date(row.created_at).toLocaleString('pt-BR')} · {row.user_name || 'Usuário'}</small></div><strong>{row.type === 'order_out' ? '-' : '+'}{row.quantity}</strong><p>{row.reason}</p><small>Saldo após movimento: {row.balance_after}</small></article>)}</div> : <div className="services-empty">Nenhuma movimentação registrada.</div>}
        <div className="actions"><button type="button" onClick={() => setStockHistory(null)}>Fechar</button></div>
      </div>
    </div>}
  </div>;
}

export default function ServicesCatalogPage() {
  return <CatalogPage kind="services"/>;
}

export function ProductsCatalogPage() {
  return <CatalogPage kind="products"/>;
}
