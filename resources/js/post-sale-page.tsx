import { useEffect, useState } from "react";
import { Search, Phone, Trash2, CheckCircle2, Clock3, Star, Instagram, ChevronLeft, ChevronRight, Layers, CheckSquare, Square } from "lucide-react";
import PageHeader from "./page-header";
import "../css/post-sale-web-list-gold-20261015.css";
import { api } from './app-shared';

const PAGE_SIZE = 30;

export function PostSalePage({ onCountersChanged }: { onCountersChanged?: () => void }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<number, { number: string; name: string }>>({});
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true),

    [pending, setPending] = useState<any>(),
    [removal, setRemoval] = useState<any>(),
    [removing, setRemoving] = useState(false),
    [removalError, setRemovalError] = useState(""),
    [search, setSearch] = useState("");
  // Páginas e busca são consultadas no banco. Não chama a rotina catchUp.
  // Cancelamento lógico evita respostas antigas de páginas/pesquisas diferentes.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), per_page: String(PAGE_SIZE) });
    if (debouncedSearch) params.set("q", debouncedSearch);
    setLoading(true);
    setLoadError("");
    void api("/post-sales?" + params.toString())
      .then((result: any) => {
        if (!active) return;
        setRows(Array.isArray(result.data) ? result.data : []);
        setTotalRows(Number(result.total) || 0);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Não foi possível consultar o Pós-Venda.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, debouncedSearch, reloadKey]);
  const reload = () => setReloadKey((current) => current + 1);
  const confirm = async () => {
    await api(`/post-sales/${pending.cycle}/${pending.type}/confirm`, {
      method: "POST",
      body: "{}",
    });
    setPending(null);
    onCountersChanged?.();
    reload();
  };
  const removeCard = async () => {
    if (!removal || removing) return;
    setRemoving(true);
    try {
      const ids: number[] = removal.ids || [removal.id];
      if (removal.ids) {
        await api("/post-sales/bulk-delete", { method: "POST", body: JSON.stringify({ ids }) });
      } else {
        await api(`/post-sales/${removal.id}`, { method: "DELETE" });
      }
      setRows((current) => current.filter((row) => !ids.includes(row.id)));
      setTotalRows((current) => Math.max(0, current - ids.length));
      setSelectedIds([]);
      setSelectedRows({});
      setSelectionMode(false);
      setRemoval(null);
      onCountersChanged?.();
      reload();
    } catch (error) {
      setRemovalError(error instanceof Error ? error.message : "Não foi possível excluir o card.");
    } finally {
      setRemoving(false);
    }
  };
  const toggleSelection = (row: any) => {
    const id = Number(row.id);
    const wasSelected = selectedIds.includes(id);
    setSelectedIds((current) => wasSelected ? current.filter((value) => value !== id) : [...current, id]);
    setSelectedRows((current) => {
      const next = { ...current };
      if (wasSelected) delete next[id];
      else next[id] = { number: row.number, name: row.name };
      return next;
    });
  };
  const visibleRows = rows; // Filtrados e limitados a 30 pelo servidor.
  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = visibleRows;
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const visibleIds: number[] = pageRows.map((row) => Number(row.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const toggleAllVisible = () => {
    setSelectedIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
    setSelectedRows((current) => {
      const next = { ...current };
      for (const row of pageRows) {
        if (allVisibleSelected) delete next[row.id];
        else next[row.id] = { number: row.number, name: row.name };
      }
      return next;
    });
  };
  const stateLabel = (row: any) => {
    if (row.available) return "Em análise humana";
    const remainingHours = Math.max(1, Math.ceil((new Date(row.eligible_at).getTime() - Date.now()) / 3_600_000));
    return `Disponível após ${remainingHours} ${remainingHours === 1 ? "hora" : "horas"}`;
  };
  const action = (row: any, type: string, label: string, Icon: any, modifier: string) => row.actions[type]?.confirmed_at ? (
    <button className={`post-sale-action post-sale-action-${modifier} sent`} aria-label={`${label} — enviado`} disabled><CheckCircle2 /> <span className="sr-only">Enviado</span></button>
  ) : (
    <a
      className={`post-sale-action post-sale-action-${modifier}`}
      href={row.whatsapp[type] || undefined}
      target="_blank"
      rel="noreferrer"
      aria-disabled={!row.available}
      onClick={(event) => {
        if (!row.available) { event.preventDefault(); return; }
        setPending({ cycle: row.id, type, label });
      }}
    aria-label={label}
    ><Icon /> <span className="sr-only">{label}</span></a>
  );
  if (loading) return <div className="state" role="status">Carregando Pós-Venda…</div>;
  if (loadError) return <div className="state" role="alert">Não foi possível carregar o Pós-Venda. <button type="button" onClick={reload}>Tentar novamente</button></div>;
  return (
    <>
      <PageHeader
        eyebrow="RELACIONAMENTO ARL"
        title="Pós-Venda & Reputação"
        description="Acompanhe cada atendimento e convide clientes a compartilhar a experiência com a ARL."
        icon={Phone}
      />
      <section className="post-sale-workspace post-sale-list-workspace" data-arl-post-sale-workspace="1">
        <div className="post-sale-controls">
        <label className="post-sale-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Buscar por cliente ou OS</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setExpandedId(null); }} type="search" placeholder="Buscar por cliente ou número da OS…" />
        </label>
        <button className="post-sale-select-toggle" type="button" aria-pressed={selectionMode} disabled={removing || !rows.length} onClick={() => { setSelectionMode(!selectionMode); setSelectedIds([]); setSelectedRows({}); }}>
          <Layers /> {selectionMode ? "Cancelar seleção" : "Selecionar listas"}
        </button>
        </div>
        {selectionMode && (
          <div className="post-sale-selection" role="region" aria-label="Registros selecionados">
            <button type="button" className="post-sale-select-all" disabled={removing || !pageRows.length} onClick={toggleAllVisible}>{allVisibleSelected ? <CheckSquare /> : <Square />}{allVisibleSelected ? "Desmarcar todos" : "Selecionar todos"} ({pageRows.length})</button>
            <strong role="status">{selectedIds.length} {selectedIds.length === 1 ? "registro selecionado" : "registros selecionados"}</strong>
            <div className="actions">
              <button type="button" disabled={removing} onClick={() => { setSelectedIds([]); setSelectedRows({}); }}>Limpar seleção</button>
              <button className="primary" type="button" disabled={removing || !selectedIds.length} onClick={() => { setRemovalError(""); setRemoval({ ids: [...selectedIds] }); }}>
                <Trash2 /> Excluir selecionados
              </button>
            </div>
          </div>
        )}
        {!visibleRows.length ? (
          <div className="post-sale-empty">
            <Phone />
            <b>{search.trim() ? "Nenhum resultado encontrado" : "Nenhum pós-venda pendente"}</b>
            <p>
              Quando uma OS entrar no período de acompanhamento, as ações de
              WhatsApp, avaliação e Instagram aparecerão aqui. Abrir uma
              conversa nunca será registrado como envio automaticamente.
            </p>
          </div>
        ) : (
          <div className="post-sale-list-table" role="table" aria-label="Acompanhamento de Pós-Venda">
            <div className="post-sale-list-header" role="row"><span role="columnheader">#</span><span role="columnheader">OS</span><span role="columnheader">CLIENTE</span><span role="columnheader">STATUS</span><span role="columnheader">AÇÕES</span></div>
            {pageRows.map((row, index) => (
              <div className={"post-sale-list-item" + (selectedIds.includes(row.id) ? " post-sale-card-selected" : "")} key={row.id}>
                <div className="post-sale-list-row" role="row">
                  <div className="post-sale-list-index" role="cell">{selectionMode ? <label><input type="checkbox" checked={selectedIds.includes(row.id)} disabled={removing} onChange={() => toggleSelection(row)} aria-label={"Marcar OS " + row.number} /></label> : <span>{firstIndex + index + 1}</span>}</div>
                  <div role="cell" className="post-sale-list-number"><i aria-hidden="true" /><b>OS {row.number}</b></div>
                  <strong role="cell" className="post-sale-list-client" title={row.name}>{row.name}</strong>
                  <div role="cell" className="post-sale-list-status"><span className={"post-sale-state " + (row.available ? "post-sale-state-ready" : "post-sale-state-waiting")}><Clock3 /><span>{stateLabel(row)}</span></span></div>
                  <div className="post-sale-list-actions" role="cell">
                    {action(row, "google", "Avaliação Google", Star, "google")}
                    {action(row, "instagram", "Instagram", Instagram, "instagram")}
                    <button type="button" className="post-sale-expand" aria-label={"Detalhes da OS " + row.number} aria-expanded={expandedId === row.id} onClick={() => setExpandedId(id => id === row.id ? null : row.id)}><ChevronRight /></button>
                  </div>
                </div>
                {expandedId === row.id && <div className="post-sale-list-details"><span><b>OS {row.number}</b> — {row.name}</span><span>{stateLabel(row)}</span><span>Confirme o envio apenas após enviar a mensagem.</span></div>}
              </div>
            ))}
          </div>        )}
        {visibleRows.length > 0 && (
          <nav className="post-sale-pagination" aria-label="Paginação do Pós-Venda">
            <span className="post-sale-pagination-range">
              Exibindo {firstIndex + 1}–{firstIndex + pageRows.length} de {totalRows}
            </span>
            <div className="post-sale-pagination-controls">
              <button type="button" aria-label="Página anterior do Pós-Venda" disabled={currentPage <= 1}
                onClick={() => { setPage(currentPage - 1); setExpandedId(null); }}><ChevronLeft /></button>
              <span role="status" aria-live="polite">Página {currentPage} de {pageCount}</span>
              <button type="button" aria-label="Próxima página do Pós-Venda" disabled={currentPage >= pageCount}
                onClick={() => { setPage(currentPage + 1); setExpandedId(null); }}><ChevronRight /></button>
            </div>
          </nav>
        )}
      </section>
      {pending && (
        <div className="modal">
          <div className="modal-card confirm-send">
            <h2>A conversa foi aberta no WhatsApp</h2>
            <p>
              Abrir o WhatsApp não confirma o envio. Somente confirme depois de
              enviar a mensagem.
            </p>
            <div className="actions">
              <button onClick={() => setPending(null)}>Ainda não enviei</button>
              <button className="primary" onClick={confirm}>
                MENSAGEM ENVIADA
              </button>
            </div>
          </div>
        </div>
      )}
      {removal && (
        <div className="modal">
          <div className="modal-card confirm-send" role="dialog" aria-modal="true" aria-labelledby="post-sale-delete-title">
            <h2 id="post-sale-delete-title">{removal.ids ? `Excluir ${removal.ids.length} ${removal.ids.length === 1 ? "card" : "cards"} de Pós-Venda?` : "Excluir card de Pós-Venda?"}</h2>
            <p>
              {removal.ids ? "Os registros selecionados deixarão apenas esta lista de acompanhamento. As Ordens de Serviço, documentos e histórico de mensagens continuarão preservados." : <>A OS {removal.number} de {removal.name} deixará apenas esta lista de acompanhamento. A Ordem de Serviço, documentos e histórico de mensagens continuarão preservados.</>}
            </p>
            {removal.ids && <ul className="post-sale-removal-list">{removal.ids.map((id: number) => <li key={id}>OS {selectedRows[id]?.number ?? id} — {selectedRows[id]?.name ?? "Registro selecionado"}</li>)}</ul>}
            {removalError && <p className="notice error">{removalError}</p>}
            <div className="actions">
              <button disabled={removing} onClick={() => { setRemovalError(""); setRemoval(null); }}>Cancelar</button>
              <button className="primary" disabled={removing} onClick={removeCard}>
                {removing ? "Excluindo…" : removal.ids ? "Excluir selecionados" : "Excluir card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
