import { useEffect, useState } from "react";
import { Search, Phone, Trash2, CheckCircle2, Clock3, Star, Instagram } from "lucide-react";
import PageHeader from "./page-header";
import { api } from './app-shared';

export function PostSalePage({ onCountersChanged }: { onCountersChanged?: () => void }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [rows, setRows] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState<any>(),
    [removal, setRemoval] = useState<any>(),
    [removing, setRemoving] = useState(false),
    [removalError, setRemovalError] = useState(""),
    [search, setSearch] = useState("");
  const load = () =>
    api("/post-sales")
      .then(setRows)
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);
  const confirm = async () => {
    await api(`/post-sales/${pending.cycle}/${pending.type}/confirm`, {
      method: "POST",
      body: "{}",
    });
    setPending(null);
    onCountersChanged?.();
    load();
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
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setSelectionMode(false);
      setRemoval(null);
      onCountersChanged?.();
    } catch (error) {
      setRemovalError(error instanceof Error ? error.message : "Não foi possível excluir o card.");
    } finally {
      setRemoving(false);
    }
  };
  const toggleSelection = (id: number) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id]);
  };
  const visibleRows = rows.filter((row) => `${row.number} ${row.name}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
  const avatarTone = (name: string) => {
    const colors = ["rose", "violet", "blue", "amber", "teal", "pink"];
    return colors[[...name].reduce((total, char) => total + char.charCodeAt(0), 0) % colors.length];
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
  if (loading) return <div className="state">Verificando pós-venda…</div>;
  return (
    <>
      <PageHeader
        eyebrow="RELACIONAMENTO ARL"
        title="Pós-Venda & Reputação"
        description="Acompanhe cada atendimento e convide clientes a compartilhar a experiência com a ARL."
        icon={Phone}
      />
      <section className="post-sale-workspace" data-arl-post-sale-workspace="1">
        <div className="post-sale-controls">
        <label className="post-sale-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Buscar por cliente ou OS</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Buscar por cliente ou número da OS…" />
        </label>
        <button className="post-sale-select-toggle" type="button" aria-pressed={selectionMode} disabled={removing || !rows.length} onClick={() => { setSelectionMode(!selectionMode); setSelectedIds([]); }}>
          <CheckCircle2 /> {selectionMode ? "Cancelar seleção" : "Selecionar cards"}
        </button>
        </div>
        {selectedIds.length > 0 && (
          <div className="post-sale-selection" role="region" aria-label="Cards selecionados">
            <strong role="status">{selectedIds.length} {selectedIds.length === 1 ? "card selecionado" : "cards selecionados"}</strong>
            <div className="actions">
              <button type="button" disabled={removing} onClick={() => setSelectedIds([])}>Limpar seleção</button>
              <button className="primary" type="button" disabled={removing} onClick={() => { setRemovalError(""); setRemoval({ ids: [...selectedIds] }); }}>
                <Trash2 /> Excluir selecionados
              </button>
            </div>
          </div>
        )}
        {!visibleRows.length ? (
          <div className="post-sale-empty">
            <Phone />
            <b>{rows.length ? "Nenhum resultado encontrado" : "Nenhum pós-venda pendente"}</b>
            <p>
              Quando uma OS entrar no período de acompanhamento, as ações de
              WhatsApp, avaliação e Instagram aparecerão aqui. Abrir uma
              conversa nunca será registrado como envio automaticamente.
            </p>
          </div>
        ) : (
          <div className="post-sale-grid">
          {visibleRows.map((row) => (
            <article className={`post-sale-card${selectedIds.includes(row.id) ? " post-sale-card-selected" : ""}`} key={row.id}>
              <header>
                <span className={`post-sale-avatar post-sale-avatar-${avatarTone(row.name)}`}>{row.name.trim().slice(0, 1).toUpperCase()}</span>
                <div className="post-sale-card-title">
                  <b>OS {row.number}</b>
                  <strong>{row.name}</strong>
                </div>
                {selectionMode && (
                  <label className="post-sale-card-select">
                    <input type="checkbox" checked={selectedIds.includes(row.id)} disabled={removing} onChange={() => toggleSelection(row.id)} aria-label={`Marcar card da OS ${row.number}`} />
                  </label>
                )}
              </header>
              <div className={`post-sale-state ${row.available ? "post-sale-state-ready" : "post-sale-state-waiting"}`}>
                <Clock3 />
                <span>{stateLabel(row)}</span>
              </div>
              <footer>
                {action(row, "google", "Avaliação Google", Star, "google")}
                {action(row, "instagram", "Instagram", Instagram, "instagram")}
              </footer>
            </article>
          ))}
          </div>
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
              {removal.ids ? "Os cards selecionados deixarão apenas esta lista de acompanhamento. As Ordens de Serviço, documentos e histórico de mensagens continuarão preservados." : <>A OS {removal.number} de {removal.name} deixará apenas esta lista de acompanhamento. A Ordem de Serviço, documentos e histórico de mensagens continuarão preservados.</>}
            </p>
            {removal.ids && <ul className="post-sale-removal-list">{rows.filter((row) => removal.ids.includes(row.id)).map((row) => <li key={row.id}>OS {row.number} — {row.name}</li>)}</ul>}
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
