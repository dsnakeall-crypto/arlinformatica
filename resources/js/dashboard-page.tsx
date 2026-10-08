import { useEffect, useRef, useState } from "react";
import { CACHE_POLICIES, sessionCache } from './session-memory-cache';
import { orderListPresentation } from './cache-requests';
import PageHeader from "./page-header";
import { ClipboardList, LayoutDashboard, Plus, Search, Wallet, Wrench, CheckCircle2, PackageSearch } from "lucide-react";
import { Order, api, status } from './app-shared';
import { OrderTable, InterruptionModal } from './order-list-components';
import { QuickEntry } from './lazy-pages';

export function Dashboard({ go, desk = false, role, mobileLayout = false, onCountersChanged }: any) {
  const [initial] = useState(() => sessionCache.read<{ items: Order[]; closedItems: Order[]; completed: number }>('dashboard'));
  const [items, setItems] = useState<Order[]>(initial?.value.items ?? []),
    [closedItems, setClosedItems] = useState<Order[]>(initial?.value.closedItems ?? []),
    [completed, setCompleted] = useState(initial?.value.completed ?? 0),
    [quick, setQuick] = useState(false),
    [loading, setLoading] = useState(!initial),
    [loadError, setLoadError] = useState(''),
    [interrupt, setInterrupt] = useState<Order>();
  const dashboardRequest = useRef<AbortController | null>(null);
  const load = (force = false) => {
    if (!sessionCache.ready) return;
    dashboardRequest.current?.abort();
    const cached = sessionCache.read<{ items: Order[]; closedItems: Order[]; completed: number }>('dashboard');
    if (cached) { setItems(cached.value.items); setClosedItems(cached.value.closedItems); setCompleted(cached.value.completed); setLoading(false); }
    if (cached?.fresh && !force) return;
    const controller = new AbortController();
    dashboardRequest.current = controller;
    const ticket = sessionCache.begin('dashboard');
    if (!cached) setLoading(true);
    void Promise.all([
      api('/orders/desk', { signal: controller.signal }),
      api('/orders?tab=closed_week&per_page=100', { signal: controller.signal }),
    ]).then(([open, closed]) => {
      const value = { items: orderListPresentation({ data: open }).data as Order[], closedItems: orderListPresentation(closed).data as Order[], completed: closed.total };
      if (controller.signal.aborted || !sessionCache.write(ticket, value, CACHE_POLICIES.orders)) return;
      setItems(open); setClosedItems(closed.data); setCompleted(closed.total); setLoadError('');
    }).catch(error => { if (!controller.signal.aborted && sessionCache.accepts(ticket)) setLoadError(error.message); })
      .finally(() => { if (!controller.signal.aborted && sessionCache.accepts(ticket)) setLoading(false); });
  };
  useEffect(() => {
    load();
    const unsubscribe = sessionCache.subscribe(event => {
      if (event.type === 'revoke' && event.resources.includes('dashboard')) { dashboardRequest.current?.abort(); setItems([]); setClosedItems([]); setCompleted(0); setLoading(false); }
      else if (event.type === 'invalidate' && event.resources.includes('dashboard')) load(true);
      else if (event.type === 'session' && sessionCache.ready) load();
    });
    const scope = sessionCache.sessionKey;
    return () => { if (sessionCache.sessionKey === scope) sessionCache.touch('dashboard'); dashboardRequest.current?.abort(); unsubscribe(); };
  }, []);
  if (desk)
    return (
      <>
        <PageHeader
          eyebrow="OPERAÇÃO ARL"
          title="Mesa de Chamados"
          description="Todas as OS abertas, sem limite de paginação, organizadas pelos status operacionais."
          icon={ClipboardList}
        />
        {loading ? (
          <div className="state">Carregando mesa completa…</div>
        ) : (
          <div className="desk">
            {["analysis", "waiting_part", "in_service"].map((st) => (
              <section key={st}>
                <h2>{status[st]}</h2>
                {items
                  .filter((o) => o.status === st)
                  .map((o) => (
                    <button key={o.id} onClick={() => go("orders", o.id)}>
                      <b>
                        #{o.number} · {o.client.name}
                      </b>
                      {o.client.nickname && <small className="arl-client-nickname">{o.client.nickname}</small>}
                      <small>{o.reported_problem}</small>
                    </button>
                  ))}
              </section>
            ))}
          </div>
        )}
      </>
    );
  const counts = (st: string) => items.filter((o) => o.status === st).length;
  const changeStatus = async (o: Order, next: string) => {
    if (next === "interrupted") {
      setInterrupt(o);
      return;
    }
    await api(`/orders/${o.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    onCountersChanged?.();
  };
  const remove = async (o: Order) => {
    if (!["Master", "Administrador"].includes(role)) return;
    if (
      confirm(
        `Excluir a OS #${o.number} das listagens? O histórico será preservado.`,
      )
    ) {
      await api(`/orders/${o.id}`, { method: "DELETE" });
      onCountersChanged?.();
    }
  };
  return (
    <>
      {!mobileLayout && (
        <PageHeader
          eyebrow="BEM-VINDO À ARL"
          title="Painel"
          description="Resumo dos chamados e atividades de hoje."
          icon={LayoutDashboard}
          actions={
            <>
              <button className="primary" onClick={() => go("new")}>
                <Plus />
                Nova OS
              </button>
              {["Master", "Administrador"].includes(role) && (
                <button
                  className="primary desktop-quick-entry arl-dark-action"
                  onClick={() => setQuick(true)}
                >
                  <Wallet />
                  Entrada Rápida
                </button>
              )}
            </>
          }
        />
      )}
      <div className="dashboard-cards status-cards">
        <article>
          <span>
            <Search />
          </span>
          <strong>{counts("analysis")}</strong>
          <small>Em Análise</small>
        </article>
        <article>
          <span>
            <PackageSearch />
          </span>
          <strong>{counts("waiting_part")}</strong>
          <small>Aguardando Peça</small>
        </article>
        <article>
          <span>
            <Wrench />
          </span>
          <strong>{counts("in_service")}</strong>
          <small>Em Serviço</small>
        </article>
        <article>
          <span>
            <CheckCircle2 />
          </span>
          <strong>{completed}</strong>
          <small>Concluídos</small>
        </article>
      </div>
      <section className="panel dashboard-orders">
        {loadError && <p role="alert">{loadError}</p>}
        <div className="dashboard-list-head">
          <div>
            <h2>Ordens em andamento</h2>
            <p>Atualize o status diretamente na linha.</p>
          </div>
        </div>
        {loading ? (
          <div className="state">Carregando painel…</div>
        ) : (
          <OrderTable
            items={items}
            open={go}
            dashboard
            onStatus={changeStatus}
            onDelete={remove}
            role={role}
          />
        )}
      </section>
      {closedItems.length > 0 && (
        <>
          <div className="dashboard-section-divider" aria-hidden="true" />
          <section className="panel dashboard-orders dashboard-closed-orders">
            <div className="dashboard-list-head">
              <div>
                <h2>Fechadas recentemente</h2>
                <p>OS concluídas e interrompidas desta semana.</p>
              </div>
              <button type="button" onClick={() => go("orders", undefined, undefined, "finalized")}>
                Ver finalizadas
              </button>
            </div>
            <OrderTable
              items={closedItems}
              open={go}
              dashboard
              onStatus={changeStatus}
              onDelete={remove}
              role={role}
            />
          </section>
        </>
      )}
      <QuickEntry open={quick} onClose={() => setQuick(false)} />
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
    </>
  );
}
