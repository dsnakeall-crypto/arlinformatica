import { appConfirm, appAlert } from "./app-native-dialog";
import React, { FormEvent, useEffect, useRef, useState } from "react";
import { CACHE_POLICIES, sessionCache } from './session-memory-cache';
import { completedRequest } from './cache-requests';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  FileText,
  MapPin,
  Phone,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import "../css/clients-page.css";
import "../css/clients-history-gold-20261015.css";
import PageHeader from "./page-header";

type Client = {
  id: number;
  name: string;
  nickname?: string | null;
  document: string;
  phone: string;
  postal_code: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  complement?: string;
  whatsapp_url?: string;
  maps_url?: string;
};
type Errors = Record<string, string[]>;
type Props = {
  quick?: boolean;
  mobile?: boolean;
  onSelected?: (client: Client) => void;
  openOrder?: (id: number) => void;
  onNewOrderForClient?: (client: Client) => void;
  role?: string;
  initialClientId?: number;
  onHistoryClose?: () => void;
};
type OrderItem = {
  id?: number;
  description: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
};
type ClientOrder = {
  id: number;
  number: string;
  status: string;
  received_at: string;
  equipment_description?: string | null;
  reported_problem: string;
  result?: string | null;
  discount_cents?: number;
  total_cents?: number;
  items?: OrderItem[];
  documents?: Array<{ revision: number; type: string }>;
  budgets?: Array<{
    id: number;
    revision: number;
    status: string;
    total_cents: number;
  }>;
};

const ICONS = {
  whatsapp: "/arl-assets/icons/icon-whatsapp.png",
  maps: "/arl-assets/icons/icon-maps.png",
  editar: "/arl-assets/icons/icon-editar.png",
  lixeira: "/arl-assets/icons/icon-lixeira.png",
} as const;
const emptyClient = {
  name: "",
  nickname: "",
  document: "",
  phone: "",
  postal_code: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
  complement: "",
};
const status: Record<string, string> = {
  analysis: "Em Análise",
  waiting_part: "Aguardando Peça",
  in_service: "Em Serviço",
  completed: "Concluído",
  interrupted: "Interrompido",
};
const csrf = () =>
  document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
  "";
const api = async (url: string, options: RequestInit = {}) => {
  const r = await fetch("/api" + url, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(csrf() ? { "X-CSRF-TOKEN": csrf() } : {}),
      ...options.headers,
    },
  });
  const json = await r
    .json()
    .catch(() => ({ message: "Resposta inválida do servidor." }));
  completedRequest(url, options, r.status);
  if (!r.ok)
    throw Object.assign(
      new Error(json.message || "Não foi possível concluir."),
      { errors: json.errors },
    );
  return json;
};
const digits = (value: unknown) =>
  typeof value === "string" ? value.replace(/\D/g, "") : "";
const masks = {
  document: (v: unknown) => {
    const n = digits(v).slice(0, 14);
    return n.length <= 11
      ? n
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      : n
          .replace(/(\d{2})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1/$2")
          .replace(/(\d{4})(\d)/, "$1-$2");
  },
  phone: (v: unknown) =>
    digits(v)
      .slice(0, 11)
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2"),
  cep: (v: unknown) =>
    digits(v)
      .slice(0, 8)
      .replace(/(\d{5})(\d)/, "$1-$2"),
};
const money = (cents = 0) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  required = false,
}: any) {
  return (
    <label className="field">
      <span>
        {label}
        {required && " *"}
      </span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
      />
      {error && <small>{error}</small>}
    </label>
  );
}
function ActionIcon({
  kind,
}: {
  kind: keyof typeof ICONS | "visualizar" | "nova-os";
}) {
  return kind === "visualizar" ? (
    <img className="clients-action-icon clients-action-eye" src="/arl-assets/icons/icon-web-eye-compact-2x.png" alt="" aria-hidden="true" decoding="async" />
  ) : kind === "nova-os" ? (
    <ClipboardPlus className="clients-action-eye" aria-hidden="true" />
  ) : (
    <img
      className="clients-action-icon"
      src={ICONS[kind]}
      alt=""
      aria-hidden="true"
    />
  );
}

function ClientModal({
  client,
  onSaved,
  onCancel,
}: {
  client?: Client | null;
  onSaved: (client: Client) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<any>(client ? { ...client } : emptyClient),
    [errors, setErrors] = useState<Errors>({}),
    [busy, setBusy] = useState(false),
    [cepNote, setCepNote] = useState(""),
    [documentNote, setDocumentNote] = useState("");
  const clearDocumentError = () =>
    setErrors((current) => {
      const next = { ...current };
      delete next.document;
      return next;
    });
  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (e.target.name === "document") {
      v = masks.document(v);
      setDocumentNote("");
      clearDocumentError();
    }
    if (e.target.name === "phone") v = masks.phone(v);
    if (e.target.name === "postal_code") v = masks.cep(v);
    setData((current: any) => ({ ...current, [e.target.name]: v }));
  };
  const checkDocument = async () => {
    const document = digits(data.document);
    if (document.length !== 11 && document.length !== 14) return;
    try {
      const result = await api(
        `/clients/document-status?document=${encodeURIComponent(document)}${client ? `&ignore=${client.id}` : ""}`,
      );
      setDocumentNote(result.message || "");
    } catch {
      setDocumentNote("");
    }
  };
  const lookup = async () => {
    const cep = digits(data.postal_code);
    if (cep.length !== 8) return;
    setCepNote("Consultando CEP…");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) throw Error();
      setData((current: any) => ({
        ...current,
        street: j.logradouro || current.street,
        district: j.bairro || current.district,
        city: j.localidade || current.city,
        state: j.uf || current.state,
      }));
      setCepNote("Endereço preenchido. Você pode corrigir os campos.");
    } catch {
      setCepNote("ViaCEP indisponível. Preencha o endereço manualmente.");
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const saved = await api(client ? `/clients/${client.id}` : "/clients", {
        method: client ? "PUT" : "POST",
        body: JSON.stringify({
          ...data,
          document: digits(data.document),
          postal_code: digits(data.postal_code),
        }),
      });
      onSaved(saved);
    } catch (x: any) {
      setErrors(x.errors || { form: [x.message] });
    } finally {
      setBusy(false);
    }
  };
  const title = client ? "Editar cliente" : "Novo cliente";
  return (
    <div
      className="clients-modal"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <section
        className="clients-modal-card"
        data-testid="client-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          className="clients-modal-close"
          type="button"
          aria-label="Fechar"
          onClick={onCancel}
        >
          <X />
        </button>
        <form
          className="form-card clients-modal-form"
          data-testid="client-form"
          onSubmit={submit}
        >
          <h2>
            <Users /> {title}
          </h2>
          {errors.form && <div className="alert">{errors.form[0]}</div>}
          <div className="clients-modal-grid">
            <Field
              label="Nome / Razão social"
              name="name"
              value={data.name}
              onChange={change}
              error={errors.name?.[0]}
              required
            />
            <Field
              label="Apelido / Referência"
              name="nickname"
              value={data.nickname || ""}
              onChange={change}
              error={errors.nickname?.[0]}
            />
            <Field
              label="CPF / CNPJ"
              name="document"
              value={data.document}
              onChange={change}
              onBlur={checkDocument}
              error={errors.document?.[0] || documentNote}
              required
            />
            <Field
              label="Telefone"
              name="phone"
              value={data.phone}
              onChange={change}
              error={errors.phone?.[0]}
              required
            />
            <label className="field">
              <span>CEP</span>
              <input
                name="postal_code"
                value={data.postal_code}
                onChange={change}
                onBlur={lookup}
                aria-invalid={Boolean(errors.postal_code?.[0])}
              />
              <small>{errors.postal_code?.[0] || cepNote}</small>
            </label>
            <Field
              label="Endereço"
              name="street"
              value={data.street}
              onChange={change}
              error={errors.street?.[0]}
              required
            />
            <Field
              label="Número"
              name="number"
              value={data.number}
              onChange={change}
              error={errors.number?.[0]}
            />
            <Field
              label="Bairro"
              name="district"
              value={data.district}
              onChange={change}
              error={errors.district?.[0]}
            />
            <Field
              label="Cidade"
              name="city"
              value={data.city}
              onChange={change}
              error={errors.city?.[0]}
            />
            <Field
              label="Estado"
              name="state"
              value={data.state}
              onChange={change}
              error={errors.state?.[0]}
            />
            <Field
              label="Complemento"
              name="complement"
              value={data.complement || ""}
              onChange={change}
            />
          </div>
          <div className="clients-modal-actions">
            <button type="button" onClick={onCancel}>
              Cancelar
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar cliente"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ClientHistory({
  id,
  onClose,
  openOrder,
  backToOrder = false,
}: {
  id: number;
  onClose: () => void;
  openOrder?: (id: number) => void;
  backToOrder?: boolean;
}) {
  const [data, setData] = useState<{
      client: Client;
      orders: ClientOrder[];
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/clients/" + id)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);
  if (error) return <div className="state error">{error}</div>;
  if (!data) return <div className="state">Carregando histórico…</div>;
  const c = data.client;
  return (
    <section
      className="clients-react-page clients-history-page"
      data-arl-clients-react="1"
    >
      <button type="button" className="clients-back" aria-label={backToOrder ? "Voltar para a OS" : "Voltar aos clientes"} onClick={onClose}>
        <span className="clients-back-original"><ArrowLeft />{backToOrder ? "Voltar para a OS" : "Voltar aos clientes"}</span>
        <span className="clients-back-reference" aria-hidden="true">← Voltar</span>
      </button>
      <header className="clients-history-title">
        <span className="clients-eyebrow">ARL INFORMÁTICA</span>
        <h1>{c.name}</h1>
        <p>
          Cliente Nº {c.id} · {masks.document(c.document)} ·{" "}
          {masks.phone(c.phone)}
        </p>
      </header>
      <section className="panel clients-history-data">
        <h2>Dados atuais</h2>
        <p>
          {c.street}, {c.number} — {c.district}, {c.city}/{c.state} · CEP{" "}
          {masks.cep(c.postal_code)}
          {c.complement ? ` · ${c.complement}` : ""}
        </p>
      </section>
      <section className="client-history">
        <div className="clients-history-head">
          <div>
            <h2>Histórico de serviços</h2>
            <p>
              {data.orders.length}{" "}
              {data.orders.length === 1
                ? "ordem registrada"
                : "ordens registradas"}
              , ordenadas pela data de abertura.
            </p>
          </div>
        </div>
        {data.orders.length ? (
          <div className="clients-history-grid">
            {data.orders.map((o) => {
              const currentFinal = (o.documents ?? [])
                .filter((d: any) => d.type === "final")
                .sort((a: any, b: any) => b.revision - a.revision)[0];
              const records = (o.documents ?? [])
                .filter((d: any) => d.type === "final-record")
                .sort((a: any, b: any) => b.revision - a.revision);
              const budgets = o.budgets ?? [];
              return (
                <article className="clients-history-order" key={o.id}>
                  <div className="clients-history-order-main">
                    <b>OS #{o.number}</b>
                    <small>
                      {new Date(o.received_at).toLocaleDateString("pt-BR")} ·{" "}
                      {status[o.status] || o.status}
                    </small>
                    <p className="clients-history-equipment">
                      <b>Equipamento:</b>{" "}
                      {o.equipment_description || "Não informado"}
                    </p>
                  </div>
                  <div className="clients-history-order-actions">
                    <strong>Total: {money(o.total_cents || 0)}</strong>
                    <div className="clients-history-pdfs">
                      {currentFinal && (
                        <a
                          className="clients-history-final"
                          href={`/api/orders/${o.id}/final/${currentFinal.revision}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText aria-hidden="true" />
                          Baixar A4 final · Rev. {currentFinal.revision}
                        </a>
                      )}
                      {records.map((record: any) => (
                        <a
                          className="clients-history-final-record"
                          key={`final-record-${record.revision}`}
                          href={`/api/orders/${o.id}/final-record/${record.revision}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText aria-hidden="true" />
                          Registro da Rev. {record.revision} (substituída)
                        </a>
                      ))}
                      {budgets.map((budget: any) => (
                        <a
                          key={`budget-${budget.id}`}
                          href={`/api/orders/${o.id}/budgets/${budget.revision}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText aria-hidden="true" />
                          Baixar orçamento · Rev. {budget.revision}
                        </a>
                      ))}
                    </div>
                    {openOrder && (
                      <button onClick={() => openOrder(o.id)}>Ver</button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="state">Nenhuma OS para este cliente.</div>
        )}
      </section>
    </section>
  );
}

export default function ClientsPage({
  quick = false,
  mobile = false,
  onSelected,
  openOrder,
  onNewOrderForClient,
  role,
  initialClientId,
  onHistoryClose,
}: Props) {
  const mobileList = mobile && !quick;
  const [initial] = useState(() => {
    const view = !quick ? sessionCache.read<{ q: string; sort: 'name' | 'id'; page: number; perPage: number }>('clients-view')?.value : undefined;
    const params = { q: view?.q?.trim() ?? '', sort: mobileList ? 'name' : (view?.sort ?? 'name'),
      page: view?.page ?? 1, per_page: mobileList ? 10 : (view?.perPage ?? 12), name_only: mobileList ? 1 : 0 };
    return { view, list: sessionCache.read<{ data: Client[]; total: number }>('clients', params) };
  });
  const [items, setItems] = useState<Client[]>(initial.list?.value.data ?? []),
    [total, setTotal] = useState(initial.list?.value.total ?? 0),
    [q, setQ] = useState(initial.view?.q ?? ""),
    [query, setQuery] = useState(initial.view?.q ?? ""),
    [sort, setSort] = useState<"name" | "id">(initial.view?.sort ?? "name"),
    [page, setPage] = useState(initial.view?.page ?? 1),
    [perPage, setPerPage] = useState(initial.view?.perPage ?? 12),
    [loading, setLoading] = useState(!initial.list?.fresh),
    [hasData, setHasData] = useState(Boolean(initial.list)),
    [error, setError] = useState(""),
    [modal, setModal] = useState<Client | null | true>(quick ? true : null),
    [detail, setDetail] = useState<number | undefined>(initialClientId);
  const canManage = !quick && (role === "Master" || role === "Administrador");
  const effectivePerPage = mobileList ? 10 : perPage;
  const activeRequest = useRef<AbortController | null>(null);
  const priorSearchInput = useRef(q);
  useEffect(() => {
    // Não voltar artificialmente à página 1 ao reabrir Clientes.
    // Só reiniciar a paginação depois de o usuário realmente pesquisar.
    if (q === priorSearchInput.current) return;
    priorSearchInput.current = q;
    const timer = setTimeout(() => { setQuery(q); setPage(1); }, 150);
    return () => clearTimeout(timer);
  }, [q]);
  const load = (force = false) => {
    if (!sessionCache.ready) return;
    activeRequest.current?.abort();
    // A API entrega apenas a página necessária. Nunca transferir o catálogo
    // completo para mostrar 10–100 cartões; isso degrada com milhares de clientes.
    const params = { q: query.trim(), sort: mobileList ? 'name' : sort,
      page, per_page: effectivePerPage, name_only: mobileList ? 1 : 0 };
    const cached = sessionCache.read<{ data: Client[]; total: number }>('clients', params);
    if (cached) { setItems(cached.value.data); setTotal(cached.value.total); setHasData(true); }
    if (cached?.fresh && !force) { setLoading(false); return; }
    const controller = new AbortController(); activeRequest.current = controller;
    const ticket = sessionCache.begin('clients', params);
    setLoading(true);
    setError("");
    const path = '/clients?' + new URLSearchParams({
      q: params.q, sort: params.sort, page: String(page), per_page: String(effectivePerPage),
      ...(mobileList ? { name_only: '1' } : {}),
    }).toString();
    api(path, { signal: controller.signal })
      .then((x) => {
        if (controller.signal.aborted || !sessionCache.write(ticket, x, CACHE_POLICIES.clients)) return;
        setItems(x.data || []); setTotal(Number(x.total) || 0); setHasData(true);
      })
      .catch((e) => { if (!controller.signal.aborted && sessionCache.accepts(ticket)) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted && sessionCache.accepts(ticket)) setLoading(false); });
  };
  useEffect(() => {
    const params = { q: query.trim(), sort: mobileList ? 'name' : sort,
      page, per_page: effectivePerPage, name_only: mobileList ? 1 : 0 };
    void load();
    const unsubscribe = sessionCache.subscribe(event => {
      if (event.type === 'revoke' && event.resources.includes('clients')) { activeRequest.current?.abort(); setItems([]); setTotal(0); setHasData(false); setLoading(false); setError('Acesso aos clientes recusado.'); }
      else if (event.type === 'invalidate' && event.resources.includes('clients')) load(true);
      else if (event.type === 'session' && sessionCache.ready) load();
    });
    const scope = sessionCache.sessionKey;
    return () => {
      if (sessionCache.sessionKey === scope) sessionCache.touch('clients', params);
      activeRequest.current?.abort(); unsubscribe();
    };
  }, [query, sort, page, effectivePerPage, mobileList]);
  useEffect(() => {
    if (quick) return;
    const ticket = sessionCache.begin('clients-view');
    const save = () => { sessionCache.write(ticket, { q, sort, page, perPage }, CACHE_POLICIES.view); };
    save(); return save;
  }, [q, sort, page, perPage, quick]);
  // A lista e a contagem já vêm paginadas e filtradas pelo servidor.
  // Manter a mesma estrutura JSX e os mesmos controles aprovados.
  const pageCount = Math.max(1, Math.ceil(total / effectivePerPage));
  const visibleItems = items;
  useEffect(() => {
    if (hasData && page > pageCount) setPage(pageCount);
  }, [page, pageCount, hasData]);
  const onSaved = (saved: Client) => {
    // A API invalida o cache de Clientes após salvar. O efeito recarrega
    // a página correta, sem forçar uma linha fora da ordenação/paginação.
    setModal(null);
    onSelected?.(saved);
  };
  const remove = async (c: Client) => {
    if (
      !await appConfirm(
        `Excluir ${c.name} da lista de clientes?\n\nAs OS e documentos históricos serão preservados.`,
      )
    )
      return;
    try {
      await api(`/clients/${c.id}`, { method: "DELETE" });
      // O DELETE invalida as páginas do cache; refletir imediatamente a remoção
      // enquanto a página atualizada chega do servidor.
      setItems((current) => current.filter((item) => item.id !== c.id));
      setTotal((current) => Math.max(0, current - 1));
    } catch (e: any) {
      void appAlert(e.message || "Não foi possível excluir o cliente.");
    }
  };
  if (detail)
    return (
      <ClientHistory
        id={detail}
        onClose={onHistoryClose || (() => setDetail(undefined))}
        openOrder={openOrder}
        backToOrder={Boolean(onHistoryClose)}
      />
    );
  return (
    <section className={'clients-react-page' + (mobileList ? ' clients-mobile-simple' : '')} data-arl-clients-react="1">
      <PageHeader
        eyebrow="ARL INFORMÁTICA"
        title="Gestão de Clientes"
        description="Gerencie seus clientes com busca instantânea, histórico e cadastro rápido."
        icon={Users}
        counter={`${total} ${total === 1 ? "cliente encontrado" : "clientes encontrados"}`}
        actions={
          <button className="primary" onClick={() => setModal(true)}>
            <Plus />
            Novo cliente
          </button>
        }
      />
      <section className="panel clients-list-panel">
        <div className="clients-search-head">
          <div>
            <h2>
              <Search />
              Buscar clientes
            </h2>
            <p>{mobileList ? 'Pesquise pelo nome do cliente.' : 'Pesquise por nome, apelido, telefone ou CPF/CNPJ'}</p>
          </div>
        </div>
        <div className="clients-toolbar">
          <label className="clients-search">
            <Search />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={mobileList ? 'Nome do cliente…' : 'Nome, apelido, telefone ou CPF/CNPJ…'}
              aria-label="Buscar clientes"
            />
          </label>
          <div className="clients-pagination">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft />
            </button>
            <span aria-live="polite">
              Página {page} de {pageCount}
            </span>
            <button
              type="button"
              aria-label="Próxima página"
              disabled={page === pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
            >
              <ChevronRight />
            </button>
          </div>
          {!mobileList && <label className="clients-page-size">
            Por página
            <select
              aria-label="Clientes por página"
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            >
              <option value="12">12</option>
              <option value="30">30</option>
              <option value="100">100</option>
            </select>
          </label>}
          {!mobileList && <label className="clients-sort">
            Ordenar
            <select
              aria-label="Ordenar clientes"
              value={sort}
              onChange={(e) => { setSort(e.target.value as "name" | "id"); setPage(1); }}
            >
              <option value="name">Alfabética</option>
              <option value="id">Por ID de cadastro</option>
            </select>
          </label>}
        </div>
        {loading && hasData && <small role="status">Atualizando clientes…</small>}
        {error && hasData && <div role="alert" className="state error">{error}</div>}
        {loading && !hasData ? (
          <div className="state">Carregando clientes…</div>
        ) : error && !hasData ? (
          <div className="state error">{error}</div>
        ) : !visibleItems.length ? (
          <div className="state">Nenhum cliente encontrado.</div>
        ) : (
          <div className="clients-table-region">
          {!quick && <div className="clients-column-head" aria-hidden="true"><span>CLIENTE</span><span>DOCUMENTO</span><span>TELEFONE</span><span>ENDEREÇO</span><span>AÇÕES</span></div>}
          <div className="client-list">
            {visibleItems.map((c) => (
              <article className="clients-row" key={c.id}>
                <div className="clients-id">
                  <b>#{c.id}</b>
                </div>
                <div className="clients-main">
                  <b>{c.name}</b>
                  {c.nickname && (
                    <small className="clients-nickname">{c.nickname}</small>
                  )}
                </div>
                <div className="clients-document">{masks.document(c.document)}</div>
                <span className="clients-separator" aria-hidden="true" />
                <span className="clients-phone">
                  <Phone aria-hidden="true" />
                  {masks.phone(c.phone)}
                </span>
                <span className="clients-separator" aria-hidden="true" />
                <div className="clients-address">
                  <MapPin aria-hidden="true" />
                  <span>
                    {c.street}, {c.number} · {c.district}
                  </span>
                  <small>
                    {c.city} - {c.state} · CEP {masks.cep(c.postal_code)}
                    {c.complement ? ` · ${c.complement}` : ""}
                  </small>
                </div>
                <span className="clients-separator" aria-hidden="true" />
                <div className="contact-links clients-actions">
                  <a
                    href={c.whatsapp_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp"
                    title="Abrir WhatsApp"
                  >
                    <ActionIcon kind="whatsapp" />
                  </a>
                  <a
                    href={c.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Maps"
                    title="Abrir Google Maps"
                  >
                    <ActionIcon kind="maps" />
                  </a>
                  {!mobileList && !quick && onNewOrderForClient && (
                    <button
                      aria-label="Nova OS para este cliente"
                      title="Nova OS para este cliente"
                      onClick={() => onNewOrderForClient(c)}
                    >
                      <ActionIcon kind="nova-os" />
                    </button>
                  )}
                  {quick && onSelected && (
                    <button
                      className="clients-select"
                      onClick={() => onSelected(c)}
                    >
                      Selecionar
                    </button>
                  )}
                  <button
                    aria-label="Visualizar"
                    title="Visualizar cliente"
                    onClick={() => setDetail(c.id)}
                  >
                    <ActionIcon kind="visualizar" />
                  </button>
                  {canManage && (
                    <>
                      <button
                        aria-label="Editar"
                        title="Editar cliente"
                        onClick={() => setModal(c)}
                      >
                        <ActionIcon kind="editar" />
                      </button>
                      {!mobileList && <button
                        aria-label={`Excluir cliente ${c.name}`}
                        title="Excluir cliente"
                        onClick={() => void remove(c)}
                      >
                        <ActionIcon kind="lixeira" />
                      </button>}
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
          </div>
        )}
        {!mobileList && !quick && <div className="clients-bottom-pagination"><span>Mostrando {visibleItems.length ? (page-1)*perPage+1 : 0}–{Math.min(page*perPage,total)} de {total} clientes</span><label>Por página <select aria-label="Clientes por página (rodapé)" value={perPage} onChange={(e)=>{setPerPage(Number(e.target.value));setPage(1);}}><option value="12">12</option><option value="30">30</option><option value="100">100</option></select></label><button type="button" disabled={page===1} onClick={()=>setPage(current=>Math.max(1,current-1))}>Anterior</button><button type="button" disabled={page===pageCount} onClick={()=>setPage(current=>Math.min(pageCount,current+1))}>Próxima</button></div>}
      </section>
      {modal && (
        <ClientModal
          client={modal === true ? null : modal}
          onSaved={onSaved}
          onCancel={() => setModal(null)}
        />
      )}
    </section>
  );
}
