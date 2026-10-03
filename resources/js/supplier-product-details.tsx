import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import OrderPopup from './order-popup';
import { supplierApi } from './supplier-workspace';

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) / 100);
const date = (v: string) => v.slice(0, 10).split('-').reverse().join('/');
type Pager = { data: any[]; current_page: number; last_page: number };
type Details = { product: { name: string; price_cents: number; stock_quantity: number; active: boolean }; summary: { ordered_quantity: number; received_quantity: number; received_cents: number; returned_quantity: number }; offering: { brand: string | null; supplier_code: string | null; cost_cents: number | null; minimum_quantity: number; delivery_days: number | null; active: boolean } | null; purchases: Pager; returns: Pager };

export default function SupplierProductDetails({ supplierId, productId, supplierName, close, onPurchase }: { supplierId: number; productId: number; supplierName: string; close: () => void; onPurchase: (id: number) => void }) {
  const [data, setData] = useState<Details>(), [error, setError] = useState(''), [tab, setTab] = useState('summary');
  const [pages, setPages] = useState({ purchases_page: 1, returns_page: 1 });
  useEffect(() => {
    const controller = new AbortController();
    void supplierApi(`/suppliers/${supplierId}/products/${productId}?purchases_page=${pages.purchases_page}&returns_page=${pages.returns_page}`, { signal: controller.signal }).then(r => { setData(r); setError(''); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [supplierId, productId, pages]);
  const pager = (key: keyof typeof pages, p: Pager) => p.last_page > 1 && <div className="supplier-pager"><button disabled={p.current_page <= 1} onClick={() => setPages(v => ({ ...v, [key]: p.current_page - 1 }))}>Anterior</button>{p.current_page}/{p.last_page}<button disabled={p.current_page >= p.last_page} onClick={() => setPages(v => ({ ...v, [key]: p.current_page + 1 }))}>Próxima</button></div>;
  return <OrderPopup variant="budget" title={data?.product.name || 'Dados do produto'} eyebrow="FORNECEDORES · PRODUTO ADQUIRIDO" description={supplierName} icon={Package} onClose={close} closeLabel="Fechar detalhes do produto">
    <div className="supplier-dialog-body supplier-product-detail">
      {error && <p role="alert" className="supplier-error">{error}</p>}
      {!data && !error && <p role="status">Carregando produto…</p>}
      {data && <><nav className="supplier-detail-tabs" aria-label="Seções do produto">{[['summary', 'Dados do produto'], ['purchases', 'Compras e custos'], ['returns', 'Devoluções']].map(([k, label]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{label}</button>)}</nav>
        {tab === 'summary' && <><div className="supplier-workspace-metrics"><article><small>Recebido deste fornecedor</small><strong>{data.summary.received_quantity} unidades</strong></article><article><small>Custo das entradas recebidas</small><strong>{money(data.summary.received_cents)}</strong></article><article><small>Devolvido ao fornecedor</small><strong>{data.summary.returned_quantity} unidades</strong></article></div><section className="supplier-detail-section"><h3>Cadastro atual</h3><dl className="supplier-product-facts"><div><dt>Preço de venda</dt><dd>{money(data.product.price_cents)}</dd></div><div><dt>Estoque de todas as origens</dt><dd>{data.product.stock_quantity} unidades</dd></div><div><dt>Situação no catálogo</dt><dd>{data.product.active ? 'Ativo' : 'Inativo'}</dd></div></dl></section><section className="supplier-detail-section"><h3>Condições deste fornecedor</h3>{data.offering ? <dl className="supplier-product-facts"><div><dt>Código no fornecedor</dt><dd>{data.offering.supplier_code || 'Não informado'}</dd></div><div><dt>Marca</dt><dd>{data.offering.brand || 'Não informada'}</dd></div><div><dt>Custo informado atual</dt><dd>{data.offering.cost_cents == null ? 'Não informado' : money(data.offering.cost_cents)}</dd></div><div><dt>Quantidade mínima</dt><dd>{data.offering.minimum_quantity}</dd></div><div><dt>Entrega</dt><dd>{data.offering.delivery_days == null ? 'Não informada' : `${data.offering.delivery_days} dias`}</dd></div><div><dt>Vínculo comercial</dt><dd>{data.offering.active ? 'Ativo' : 'Inativo'}</dd></div></dl> : <p>Condições comerciais ainda não cadastradas. O histórico das compras está disponível na aba Compras e custos.</p>}</section></>}
        {tab === 'purchases' && <section className="supplier-detail-section"><h3>Histórico de compras e custos</h3><p className="supplier-muted">Valores preservados de cada compra. O custo recebido não representa o valor do estoque restante.</p>{data.purchases.data.map(i => <button className="supplier-compact-row" key={i.id} onClick={() => onPurchase(i.purchase_id)}><span><b>Compra #{i.purchase_id}</b><small>{date(i.purchased_on)} · {i.description}{i.reference && ` · ${i.reference}`}{i.lot && ` · lote ${i.lot}`}</small></span><span><small>{i.received_quantity}/{i.quantity} recebidos</small><b>{money(i.unit_cost_cents)} / un.</b></span><span>Ver compra →</span></button>)}{pager('purchases_page', data.purchases)}</section>}
        {tab === 'returns' && <section className="supplier-detail-section"><h3>Devoluções deste produto</h3>{data.returns.data.map(r => <article className="supplier-compact-row" key={r.id}><span><b>{r.quantity} unidades · {date(r.returned_on)}</b><small>{r.reason}</small></span><span>{({ credit: 'Crédito', refund: 'Reembolso', exchange: 'Troca', pending: 'Em negociação' } as Record<string, string>)[r.resolution]}</span><b>{money(r.value_cents)}</b></article>)}{!data.returns.data.length && <p>Nenhuma devolução registrada.</p>}{pager('returns_page', data.returns)}</section>}
      </>}
    </div><footer className="arl-3d-footer"><button onClick={close}>Fechar produto</button></footer>
  </OrderPopup>;
}
