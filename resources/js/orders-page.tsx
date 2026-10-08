import { useEffect, useRef, useState } from "react";
import { CACHE_POLICIES, sessionCache } from './session-memory-cache';
import { orderListPresentation } from './cache-requests';
import PageHeader from "./page-header";
import { ClipboardList, Plus, Search } from "lucide-react";
import { Order, api } from './app-shared';
import { OrderTable, InterruptionModal, StatusPaymentModal } from './order-list-components';

export function Orders({ open, role, initialTab, onCountersChanged }: any) {
  const [initial] = useState(() => {
    const view = sessionCache.read<{ q: string; query: string; tab: string; page: number; perPage: number }>('orders-view')?.value;
    const tab = initialTab || view?.tab || 'progress';
    const page = initialTab && initialTab !== view?.tab ? 1 : view?.page ?? 1;
    const params = { tab, q: view?.query ?? '', page, per_page: view?.perPage ?? 12 };
    return { view, tab, page, cached: sessionCache.read<any>('orders', params) };
  });
  const [items, setItems] = useState<Order[]>(initial.cached?.value.data ?? []),
    [meta, setMeta] = useState<any>(initial.cached?.value ?? {}),
    [q, setQ] = useState(initial.view?.q ?? ""),
    [query, setQuery] = useState(initial.view?.query ?? ""),
    [searchRevision, setSearchRevision] = useState(0),
    [tab, setTab] = useState(initial.tab),
    [page, setPage] = useState(initial.page),
    [perPage, setPerPage] = useState(initial.view?.perPage ?? 12),
    [loading, setLoading] = useState(!initial.cached?.fresh),
    [hasData, setHasData] = useState(Boolean(initial.cached)),
    [error, setError] = useState(""),
    [interrupt, setInterrupt] = useState<Order>(),
    [payment, setPayment] = useState<Order>();
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    if (q === query && !activeRequest.current?.signal.aborted) return;
    const timer = setTimeout(() => {
      setQuery(q);
      setPage(1);
      if (activeRequest.current?.signal.aborted) setSearchRevision((value) => value + 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);
  const load = (force = false) => {
    if (!sessionCache.ready) return;
    activeRequest.current?.abort();
    const params = { tab, q: query, page, per_page: perPage };
    const cached = sessionCache.read<any>('orders', params);
    if (cached) { setItems(cached.value.data); setMeta(cached.value); setHasData(true); }
    if (cached?.fresh && !force) { setLoading(false); return; }
    const controller = new AbortController();
    activeRequest.current = controller;
    const ticket = sessionCache.begin('orders', params);
    setLoading(true);
    api(
      `/orders?q=${encodeURIComponent(query)}&tab=${tab}&page=${page}&per_page=${perPage}`,
      { signal: controller.signal },
    )
      .then((x) => {
        if (controller.signal.aborted || !sessionCache.write(ticket, orderListPresentation(x), CACHE_POLICIES.orders)) return;
        setItems(x.data);
        setMeta(x);
        setHasData(true);
        setError("");
      })
      .catch((e) => { if (!controller.signal.aborted && sessionCache.accepts(ticket)) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted && sessionCache.accepts(ticket)) setLoading(false); });
  };
  useEffect(() => {
    load();
    const unsubscribe = sessionCache.subscribe(event => {
      if (event.type === 'revoke' && event.resources.includes('orders')) { activeRequest.current?.abort(); setItems([]); setMeta({}); setHasData(false); setLoading(false); setError('Acesso às ordens recusado.'); }
      else if (event.type === 'invalidate' && event.resources.includes('orders')) load(true);
      else if (event.type === 'session' && sessionCache.ready) load();
    });
    const scope = sessionCache.sessionKey;
    return () => {
      if (sessionCache.sessionKey === scope) sessionCache.touch('orders', { tab, q: query, page, per_page: perPage });
      activeRequest.current?.abort(); unsubscribe();
    };
  }, [query, tab, page, perPage, searchRevision]);
  const priorInitialTab = useRef(initialTab);
  useEffect(() => {
    if (!initialTab || initialTab === priorInitialTab.current) { priorInitialTab.current = initialTab; return; }
    priorInitialTab.current = initialTab;
    setTab(initialTab);
    setPage(1);
  }, [initialTab]);
  useEffect(() => {
    const ticket = sessionCache.begin('orders-view');
    const save = () => { sessionCache.write(ticket, { q, query, tab, page, perPage }, CACHE_POLICIES.view); };
    save(); return save;
  }, [q, query, tab, page, perPage]);
  const changeStatus = async (o: Order, next: string) => {
    if (next === "interrupted") {
      setInterrupt(o);
      return;
    }
    if (next === "paid") {
      setPayment(o);
      return;
    }
    await api(`/orders/${o.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    onCountersChanged?.();
  };
  const remove = async (o: Order) => {
    if (!["Master", "Administrador"].includes(role)) {
      setError("Apenas Master ou Administrador pode excluir uma OS.");
      return;
    }
    if (
      !confirm(
        `Excluir a OS #${o.number} das listagens? O histórico será preservado.`,
      )
    )
      return;
    try {
      await api(`/orders/${o.id}`, { method: "DELETE" });
      onCountersChanged?.();
    } catch (x: any) {
      setError(x.message);
    }
  };
  const first = meta.total ? meta.from : 0,
    last = meta.total ? meta.to : 0;
  return (
    <>
      <PageHeader
        eyebrow="ATENDIMENTO ARL"
        title="Ordens de Serviço"
        description="Histórico completo e acompanhamento operacional."
        icon={ClipboardList}
        actions={
          <button className="primary" onClick={() => open("new")}>
            <Plus />
            Nova OS
          </button>
        }
      />
      <section className="panel orders-panel">
        <div className="order-tabs" role="tablist" aria-label="Filtrar ordens">
          <button
            className={tab === "progress" ? "active" : ""}
            onClick={() => {
              setTab("progress");
              setPage(1);
            }}
          >
            Em Andamento <small className="order-tab-count" aria-hidden="true">{meta.tab_counts?.progress ?? 0}</small>
          </button>
          <button
            className={tab === "awaiting_payment" ? "active" : ""}
            onClick={() => {
              setTab("awaiting_payment");
              setPage(1);
            }}
          >
            Aguardando PGTO <small className="order-tab-count" aria-hidden="true">{meta.tab_counts?.awaiting_payment ?? 0}</small>
          </button>
          <button
            className={tab === "finalized" ? "active" : ""}
            onClick={() => {
              setTab("finalized");
              setPage(1);
            }}
          >
            Finalizadas <small className="order-tab-count" aria-hidden="true">{meta.tab_counts?.finalized ?? 0}</small>
          </button>
          <button
            className={tab === "interrupted" ? "active" : ""}
            onClick={() => {
              setTab("interrupted");
              setPage(1);
            }}
          >
            Interrompidas <small className="order-tab-count" aria-hidden="true">{meta.tab_counts?.interrupted ?? 0}</small>
          </button>
          <button
            className={tab === "all" ? "active" : ""}
            onClick={() => {
              setTab("all");
              setPage(1);
            }}
          >
            Todas <small className="order-tab-count" aria-hidden="true">{meta.tab_counts?.all ?? 0}</small>
          </button>
        </div>
        <div className="filters">
          <label>
            <Search />
            <input
              value={q}
              onChange={(e) => {
                activeRequest.current?.abort();
                setQ(e.target.value);
              }}
              placeholder="Número da OS ou nome do cliente…"
            />
          </label>
        </div>
        {error && <div className="alert">{error}</div>}
        {loading && hasData && <small role="status">Atualizando ordens…</small>}
        {loading && !hasData ? (
          <div className="state">Carregando ordens…</div>
        ) : !items.length ? (
          <div className="state">Nenhuma ordem de serviço encontrada.</div>
        ) : (
          <OrderTable
            items={items}
            open={open}
            onEdit={(o: Order) =>
              open("orders", o.id, o.status === "completed" ? "reopen" : "edit")
            }
            onStatus={changeStatus}
            onDelete={remove}
            role={role}
          />
        )}
        <div className="orders-pagination">
          <span>
            Mostrando {first}–{last} de {meta.total || 0}
          </span>
          <label>
            Itens por página{" "}
            <select
              aria-label="Itens por página"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="12">12</option>
              <option value="30">30</option>
              <option value="100">100</option>
            </select>
          </label>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </button>
          <button
            disabled={!meta.next_page_url}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </button>
        </div>
      </section>
      {interrupt && (
        <InterruptionModal
          order={interrupt}
          onClose={() => setInterrupt(undefined)}
          onSaved={() => {
            setInterrupt(undefined);
            onCountersChanged?.();
          }}
        />
      )}
      {payment && (
        <StatusPaymentModal
          order={payment}
          onClose={() => setPayment(undefined)}
          onSaved={() => {
            setPayment(undefined);
          }}
        />
      )}
    </>
  );
}
