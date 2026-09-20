import NewOrderClientPicker from "./new-order-client-picker";
import ClientImport from "./client-import";
import TermTextEditor from "./term-text-editor";
import { isReopenedOrder } from "./order-reopened";
import { CameraModal } from "./order-detail-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  Box,
  Camera,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Users,
  Wallet,
  Phone,
  Menu,
  X,
  Trash2,
  Pencil,
  Wrench,
  CheckCircle2,
  CircleDot,
  PackageSearch,
  Pin,
  LogOut,
  Banknote,
  CreditCard,
  Eye,
  Landmark,
  RotateCcw,
  Clock3,
  EllipsisVertical,
  Star,
  Instagram,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
  FileSignature,
} from "lucide-react";
import "../css/app.css";
import "../css/homologation.css";
import "../css/arl-ui-system.css";
import "../css/action-icons.css";
import ServicesCatalogPage, { ProductsCatalogPage } from "./services-page";
import ClientsPage from "./clients-page";
import OrderDetailPage from "./order-detail-page";
import PageHeader from "./page-header";
import ServiceProductSearch from "./service-product-search";
import {
  OrderPaymentFigures,
} from "./finance-refund-summary";
import { FinanceDate } from "./finance-date";
type Page =
  | "dashboard"
  | "desk"
  | "orders"
  | "clients"
  | "new"
  | "finance"
  | "post-sale"
  | "settings"
  | "services"
  | "products"
  | "users";
type Client = {
  id: number;
  name: string;
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
type Order = {
  id: number;
  number: string;
  client: Client;
  status: string;
  display_status?: string;
  paid_cents?: number;
  attendance_type: string;
  reported_problem: string;
  received_at: string;
  equipment_type_id: number;
  equipment_description?: string;
  equipment_details?: string | null;
  total_cents?: number;
  completed_at?: string | null;
  reopened?: boolean | number;
  interruption_reason?: string | null;
  interruption_work_done?: string | null;
};
type Catalog = {
  id: number;
  name: string;
  price_cents?: number;
  category?: string;
  warranty_enabled?: boolean;
  warranty_term?: number | null;
  warranty_unit?: string | null;
  stock_quantity?: number;
};
type Errors = Record<string, string[]>;
const emptyClient = {
  name: "",
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
const api = async (url: string, options: RequestInit = {}) => {
  const token = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  )?.content;
  const r = await fetch("/api" + url, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { "X-CSRF-TOKEN": token } : {}),
      ...options.headers,
    },
    ...options,
  });
  const json = await r
    .json()
    .catch(() => ({ message: "Resposta inválida do servidor." }));
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
const formatCompanySettings = (data: any) => ({
  ...data,
  cnpj: masks.document(data.cnpj || ""),
  phone: masks.phone(data.phone || ""),
  postal_code: masks.cep(data.postal_code || ""),
});
const serializeCompanySettings = (data: any) => ({
  ...data,
  cnpj: String(data.cnpj || "").replace(/\D/g, ""),
  phone: String(data.phone || "").replace(/\D/g, ""),
  postal_code: String(data.postal_code || "").replace(/\D/g, ""),
});
function Field({ label, name, value, onChange, error, required = false }: any) {
  return (
    <label className="field">
      <span>
        {label}
        {required && " *"}
      </span>
      <input name={name} value={value} onChange={onChange} />
      {error && <small>{error}</small>}
    </label>
  );
}
function ClientForm({ onSaved, onCancel, client }: any) {
  const [data, setData] = useState<any>(client || emptyClient);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [cepNote, setCepNote] = useState("");
  const change = (e: any) => {
    let v = e.target.value;
    if (e.target.name === "document") v = masks.document(v);
    if (e.target.name === "phone") v = masks.phone(v);
    if (e.target.name === "postal_code") v = masks.cep(v);
    setData({ ...data, [e.target.name]: v });
  };
  const lookup = async () => {
    const cep = digits(data.postal_code);
    if (cep.length !== 8) return;
    setCepNote("Consultando CEP…");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) throw Error();
      setData((d: any) => ({
        ...d,
        street: j.logradouro || d.street,
        district: j.bairro || d.district,
        city: j.localidade || d.city,
        state: j.uf || d.state,
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
  return (
  <form className="form-card" onSubmit={submit}>
      <h2>
        <Users /> {client ? "Editar cliente" : "Novo cliente"}
      </h2>
      {errors.form && <div className="alert">{errors.form[0]}</div>}
      <div className="form-grid">
        <Field
          label="Nome / Razão social"
          name="name"
          value={data.name}
          onChange={change}
          error={errors.name?.[0]}
          required
        />
        <Field
          label="CPF / CNPJ"
          name="document"
          value={data.document}
          onChange={change}
          error={errors.document?.[0]}
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
          value={data.complement}
          onChange={change}
        />
      </div>
      <div className="actions">
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary" disabled={busy}>
          {busy ? "Salvando…" : "Salvar cliente"}
        </button>
      </div>
    </form>
  );
}
function ClientHistory({ id, onClose, openOrder }: any) {
  const [data, setData] = useState<any>();
  useEffect(() => {
    api("/clients/" + id).then(setData);
  }, [id]);
  if (!data) return <div className="state">Carregando histórico…</div>;
  const c = data.client;
  return (
    <>
      <button className="arl-back-button" onClick={onClose}>← Voltar aos clientes</button>
      <div className="title">
        <div>
          <h1>{c.name}</h1>
          <p>
            {masks.document(c.document)} · {masks.phone(c.phone)}
          </p>
        </div>
      </div>
      <section className="panel client-history">
        <h2>Dados atuais</h2>
        <p>
          {c.street}, {c.number} — {c.district}, {c.city}/{c.state} · CEP{" "}
          {masks.cep(c.postal_code)}
        </p>
        <h2>Histórico de OS</h2>
        {data.orders.length ? (
          data.orders.map((o: any) => (
            <article>
              <div>
                <b>OS #{o.number}</b>
                <small>
                  {new Date(o.received_at).toLocaleString("pt-BR")} ·{" "}
                  {status[o.status]}
                </small>
              </div>
              <span>{o.result || "Em andamento"}</span>
              <span>{o.reported_problem}</span>
              <strong>
                R$ {((o.total_cents || 0) / 100).toFixed(2).replace(".", ",")}
              </strong>
              <button onClick={() => openOrder(o.id)}>Ver OS</button>
              {o.documents?.[0] && (
                <a
                  href={`/api/orders/${o.id}/final/${o.documents[0].revision}/pdf`}
                  target="_blank"
                >
                  Baixar PDF
                </a>
              )}
            </article>
          ))
        ) : (
          <p>Nenhuma OS para este cliente.</p>
        )}
      </section>
    </>
  );
}
function Clients(props: any) {
  return <ClientsPage {...props} />;
}
const status: any = {
  analysis: "Em Análise",
  waiting_part: "Aguardando Peça",
  in_service: "Em Serviço",
  completed: "Concluído",
  interrupted: "Interrompido",
  awaiting_payment: "Aguardando PGTO",
  paid: "Pago",
};
function OrderTable({
  items,
  open,
  onStatus,
  onDelete,
  onEdit,
  role,
  dashboard = false,
}: any) {
  if (dashboard) {
    return (
      <div className="order-list shared-order-list dashboard-order-list">
        <table>
          <colgroup>
            <col style={{ width: "12%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr>
              <th># OS</th>
              <th>CLIENTE</th>
              <th>DISPOSITIVO</th>
              <th>STATUS</th>
              <th>RELATO</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o: Order) => {
              const reopened = isReopenedOrder(o);
              const interrupted = o.status === "interrupted";
              const closed = o.status === "completed" || interrupted;
              const displayStatus = o.display_status || o.status;
              return (
                <tr className={`order-row${reopened ? " order-row-reopened" : ""}`} key={o.id}>
                  <td><b>#{o.number}</b></td>
                  <td>
                    <span className="order-customer">
                      <strong>{o.client.name}</strong>
                      {reopened && <span className="arl-reopened-marker" aria-label="OS reaberta">Reaberta</span>}
                      {interrupted && <span className="arl-reopened-marker arl-interrupted-marker" aria-label="OS interrompida">Interrompida</span>}
                    </span>
                  </td>
                  <td><span className="order-device" title={o.equipment_description || undefined}><Box aria-hidden="true" />{o.equipment_description || ""}</span></td>
                  <td>
                    <label className={`row-status status-${displayStatus}`}>
                      <span className="sr-only">Alterar status da OS {o.number}</span>
                      <CircleDot className="row-status-icon" aria-hidden="true" />
                      <select aria-label={`Status da OS ${o.number}`} value={displayStatus} disabled={closed} onChange={(e) => onStatus(o, e.target.value)}>
                        <option value="analysis">Em Análise</option>
                        <option value="waiting_part">Aguardando Peça</option>
                        <option value="in_service">Em Serviço</option>
                        {(role !== "Funcionário" || interrupted) && <option value="interrupted">Interrompido</option>}
                        {o.status === "completed" && <option value="completed">Concluído</option>}
                        {displayStatus === "awaiting_payment" && <option value="awaiting_payment">Aguardando PGTO</option>}
                        {displayStatus === "paid" && <option value="paid">Pago</option>}
                      </select>
                    </label>
                  </td>
                  <td><span className="order-client-report" title={o.reported_problem || undefined}>{o.reported_problem || ""}</span></td>
                  <td>
                    <span className="order-actions">
                      <a className="order-whatsapp" href={o.client.whatsapp_url} target="_blank" rel="noreferrer" aria-label={`WhatsApp da OS ${o.number}`}><img src="/arl-assets/icons/icon-whatsapp.png" alt="" /></a>
                      <a className="order-maps" href={o.client.maps_url} target="_blank" rel="noreferrer" aria-label={`Abrir endereço da OS ${o.number} no Google Maps`}><img src="/arl-assets/icons/icon-maps.png" alt="" /></a>
                      <button className="order-view" type="button" aria-label="Ver OS" title="Ver OS" onClick={() => open("orders", o.id)}><Eye aria-hidden="true" /><span className="sr-only">Ver OS</span></button>
                      {onEdit && ["Master", "Administrador"].includes(role) && !interrupted && (
                        <button className={o.status === "completed" ? "order-reopen" : "order-edit"} type="button" aria-label={o.status === "completed" ? "Reabrir como garantia" : "Editar OS"} title={o.status === "completed" ? "Reabrir como garantia" : "Editar OS"} onClick={() => onEdit(o)}>
                          {o.status === "completed" ? <RotateCcw /> : <Pencil />}
                        </button>
                      )}
                      {["Master", "Administrador"].includes(role) && (
                        <button type="button" className="arl-order-delete" aria-label={`Excluir OS ${o.number}`} title="Excluir OS" onClick={() => onDelete(o)}><Trash2 /></button>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="order-list shared-order-list orders-order-list">
      <table>
        <colgroup>
          <col style={{ width: "9%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "18%" }} />
        </colgroup>
        <thead><tr><th># OS</th><th>CLIENTE</th><th>DISPOSITIVO</th><th>STATUS</th><th>RELATO</th><th>VALOR</th><th>AÇÕES</th></tr></thead>
        <tbody>{items.map((o: Order) => {
          const reopened = isReopenedOrder(o);
          const interrupted = o.status === "interrupted";
          const displayStatus = o.display_status || o.status;
          const awaitingPayment = displayStatus === "awaiting_payment";
          const canSetPaid = awaitingPayment && ["Master", "Administrador"].includes(role);
          const closed = Boolean(o.completed_at) || interrupted;
          return (
            <tr className={`order-row${reopened ? " order-row-reopened" : ""}`} key={o.id}>
              <td><b>#{o.number}</b></td>
              <td><span className="order-customer"><strong>{o.client.name}</strong>{reopened && <span className="arl-reopened-marker" aria-label="OS reaberta">Reaberta</span>}{interrupted && <span className="arl-reopened-marker arl-interrupted-marker" aria-label="OS interrompida">Interrompida</span>}</span></td>
              <td><span className="order-device" title={o.equipment_description || undefined}><Box aria-hidden="true" />{o.equipment_description || ""}</span></td>
              <td><label className={`row-status status-${displayStatus}`}><span className="sr-only">Alterar status da OS {o.number}</span><CircleDot className="row-status-icon" aria-hidden="true" /><select aria-label={`Status da OS ${o.number}`} value={displayStatus} disabled={closed && !canSetPaid} onChange={(e) => onStatus(o, e.target.value)}>{awaitingPayment ? <><option value="awaiting_payment">Aguardando PGTO</option>{canSetPaid && <option value="paid">PAGO</option>}</> : displayStatus === "paid" ? <option value="paid">Pago</option> : <><option value="analysis">Em Análise</option><option value="waiting_part">Aguardando Peça</option><option value="in_service">Em Serviço</option>{(role !== "Funcionário" || interrupted) && <option value="interrupted">Interrompido</option>}{o.status === "completed" && <option value="completed">Concluído</option>}</>}</select></label></td>
              <td><span className="order-client-report" title={o.reported_problem || undefined}>{o.reported_problem || ""}</span></td>
              <td>{closed ? <span className="order-value"><strong>{money(o.total_cents || 0)}</strong><small>{formatOptionalDate(o.completed_at)}</small></span> : <em className="order-value-pending">A orçar</em>}</td>
              <td><span className="order-actions"><a className="order-whatsapp" href={o.client.whatsapp_url} target="_blank" rel="noreferrer" aria-label={`WhatsApp da OS ${o.number}`}><img src="/arl-assets/icons/icon-whatsapp.png" alt="" /></a><a className="order-maps" href={o.client.maps_url} target="_blank" rel="noreferrer" aria-label={`Abrir endereço da OS ${o.number} no Google Maps`}><img src="/arl-assets/icons/icon-maps.png" alt="" /></a><button className="order-view" type="button" aria-label="Ver OS" title="Ver OS" onClick={() => open("orders", o.id)}><Eye aria-hidden="true" /><span className="sr-only">Ver OS</span></button>{onEdit && ["Master", "Administrador"].includes(role) && !interrupted && <button className={o.status === "completed" ? "order-reopen" : "order-edit"} type="button" aria-label={o.status === "completed" ? "Reabrir como garantia" : "Editar OS"} title={o.status === "completed" ? "Reabrir como garantia" : "Editar OS"} onClick={() => onEdit(o)}>{o.status === "completed" ? <RotateCcw /> : <Pencil />}</button>}{["Master", "Administrador"].includes(role) && <button type="button" className="arl-order-delete" aria-label={`Excluir OS ${o.number}`} title="Excluir OS" onClick={() => onDelete(o)}><Trash2 /></button>}</span></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
function InterruptionModal({ order, onClose, onSaved }: any) {
  const [reason, setReason] = useState(""),
    [workDone, setWorkDone] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Informe o motivo da interrupção.");
      return;
    }
    if (!workDone.trim()) {
      setError('Informe o que já foi feito no equipamento. Se nada foi feito, escreva "Nada".');
      return;
    }
    setBusy(true);
    try {
      await api(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "interrupted",
          interruption_reason: reason.trim(),
          interruption_work_done: workDone.trim(),
        }),
      });
      onSaved();
    } catch (x: any) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="order-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interrupt-title"
    >
      <form onSubmit={submit}>
        <h2 id="interrupt-title">Interromper OS #{order.number}</h2>
        <p>A OS será fechada sem lançamento financeiro. Os serviços serão removidos e o total ficará zerado.</p>
        <label className="field">
          <span>Motivo *</span>
          <textarea
            aria-label="Motivo da interrupção"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </label>
        <label className="field">
          <span>O que já foi feito no equipamento? *</span>
          <textarea
            aria-label="O que já foi feito no equipamento"
            value={workDone}
            onChange={(e) => setWorkDone(e.target.value)}
            placeholder='Se nada foi feito, escreva "Nada".'
          />
        </label>
        {error && <div className="alert">{error}</div>}
        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            Confirmar interrupção
          </button>
        </div>
      </form>
    </div>
  );
}
function StatusPaymentModal({ order, onClose, onSaved }: any) {
  const [method, setMethod] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!method) {
      setError("Escolha a forma de pagamento.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "paid", payment_method: method }),
      });
      onSaved();
    } catch (x: any) {
      setError(Object.values(x.errors || {}).flat()[0] as string || x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="status-payment-title">
      <form onSubmit={submit}>
        <h2 id="status-payment-title">Registrar pagamento da OS #{order.number}</h2>
        <p>O valor total da OS, {money(order.total_cents || 0)}, será registrado como pago.</p>
        <label className="field">
          <span>Forma de pagamento *</span>
          <select aria-label="Forma de pagamento" value={method} onChange={(e) => setMethod(e.target.value)} autoFocus>
            <option value="">Selecione</option>
            <option value="cash">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="credit">Cartão de crédito</option>
            <option value="debit">Cartão de débito</option>
          </select>
        </label>
        {error && <div className="alert">{error}</div>}
        <div className="actions">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={busy}>{busy ? "Registrando…" : "Confirmar pagamento"}</button>
        </div>
      </form>
    </div>
  );
}
function Orders({ open, role }: any) {
  const [items, setItems] = useState<Order[]>([]),
    [meta, setMeta] = useState<any>({}),
    [q, setQ] = useState(""),
    [tab, setTab] = useState("progress"),
    [page, setPage] = useState(1),
    [perPage, setPerPage] = useState(50),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [interrupt, setInterrupt] = useState<Order>(),
    [payment, setPayment] = useState<Order>();
  const load = () => {
    setLoading(true);
    api(
      `/orders?q=${encodeURIComponent(q)}&tab=${tab}&page=${page}&per_page=${perPage}`,
    )
      .then((x) => {
        setItems(x.data);
        setMeta(x);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [q, tab, page, perPage]);
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
    load();
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
      load();
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
            Em Andamento
          </button>
          <button
            className={tab === "awaiting_payment" ? "active" : ""}
            onClick={() => {
              setTab("awaiting_payment");
              setPage(1);
            }}
          >
            Aguardando PGTO
          </button>
          <button
            className={tab === "finalized" ? "active" : ""}
            onClick={() => {
              setTab("finalized");
              setPage(1);
            }}
          >
            Finalizadas
          </button>
          <button
            className={tab === "interrupted" ? "active" : ""}
            onClick={() => {
              setTab("interrupted");
              setPage(1);
            }}
          >
            Interrompidas
          </button>
          <button
            className={tab === "all" ? "active" : ""}
            onClick={() => {
              setTab("all");
              setPage(1);
            }}
          >
            Todas
          </button>
        </div>
        <div className="filters">
          <label>
            <Search />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Número da OS ou nome do cliente…"
            />
          </label>
        </div>
        {error && <div className="alert">{error}</div>}
        {loading ? (
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
              <option value="50">50</option>
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
            load();
          }}
        />
      )}
      {payment && (
        <StatusPaymentModal
          order={payment}
          onClose={() => setPayment(undefined)}
          onSaved={() => {
            setPayment(undefined);
            load();
          }}
        />
      )}
    </>
  );
}

function NewOrder({ done }: any) {
  const [clients, setClients] = useState<Client[]>([]),
    [services, setServices] = useState<Catalog[]>([]),
    [orderItems, setOrderItems] = useState<any[]>([]);
  const [client, setClient] = useState(0),
    [type, setType] = useState(0),
    [attendance, setAttendance] = useState("bench"),
    [problem, setProblem] = useState(""),
    [intakeCondition, setIntakeCondition] = useState(""),
    [equipmentDescription, setEquipmentDescription] = useState(""),
    [equipmentDetails, setEquipmentDetails] = useState(""),
    [photos, setPhotos] = useState<File[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [quick, setQuick] = useState(false),
    [camera, setCamera] = useState(false);
  useEffect(() => {
    Promise.all([
      api("/clients"),
      api("/catalogs/equipment"),
      api("/catalogs/items"),
    ])
      .then(([c, e, s]) => {
        setClients(c.data);
        setServices(s);
        const manual = e.find(
          (item: Catalog) => item.name === "Informado manualmente",
        );
        if (manual) setType(manual.id);
      })
      .catch((e) => setError(e.message));
  }, []);
  const currentClient = clients.find((c) => c.id === client);
  const photoPreviews = useMemo(
    () => photos.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [photos],
  );
  useEffect(
    () => () => photoPreviews.forEach(({ url }) => URL.revokeObjectURL(url)),
    [photoPreviews],
  );
  if (quick)
    return (
      <Clients
        quick
        role="Master"
        onSelected={(c: Client) => {
          setClients((x) => [c, ...x]);
          setClient(c.id);
          setQuick(false);
        }}
      />
    );
  const addPhotos = (files: readonly File[] | null | undefined) => {
    if (!files?.length) return;
    setPhotos((current) => {
      const available = Math.max(0, 5 - current.length);
      if (files.length > available) window.alert("Cada OS aceita no máximo 5 fotos. As fotos excedentes não foram adicionadas.");
      return [...current, ...files.slice(0, available)];
    });
  };
  const addItem = (item: Catalog, quantity = 1) =>
    setOrderItems((current) => {
      const found = current.find((x) => x.catalog_id === item.id);
      return found
        ? current.map((x) =>
            x.catalog_id === item.id
              ? { ...x, quantity: Math.min(999, x.quantity + quantity) }
              : x,
          )
        : [
            ...current,
            {
              catalog_id: item.id,
              name: item.name,
              quantity,
              price_cents: item.price_cents || 0,
            },
          ];
    });
  const updateQuantity = (catalogId: number, quantity: number) =>
    setOrderItems((current) =>
      current.map((x) =>
        x.catalog_id === catalogId
          ? { ...x, quantity: Math.max(1, Math.min(999, quantity || 1)) }
          : x,
      ),
    );
  const openingTotal = orderItems.reduce(
    (sum, x) => sum + x.quantity * x.price_cents,
    0,
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!client) throw new Error("Selecione um cliente cadastrado.");
      if (!type)
        throw new Error(
          "Não foi possível carregar o tipo interno de equipamento.",
        );
      const checklist: any[] = [];
      const items = orderItems.map((x) => ({
        catalog_id: x.catalog_id,
        quantity: x.quantity,
      }));
      const order = await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          client_id: client,
          equipment_type_id: type,
          manufacturer_id: null,
          equipment_description: equipmentDescription.trim(),
          equipment_details: equipmentDetails.trim() || null,
          attendance_type: attendance,
          reported_problem: problem,
          intake_condition: intakeCondition,
          checklist,
          items,
        }),
      });
      for (const photo of photos) {
        const form = new FormData();
        form.append("photo", photo);
        await api(`/orders/${order.id}/photos`, { method: "POST", body: form });
      }
      done(order.id);
    } catch (x: any) {
      setError(
        (Object.values(x.errors || {}).flat()[0] as string) || x.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="ATENDIMENTO ARL"
        title="Abertura de Chamado / Nova OS"
        description="Registre cliente, equipamento, checklist, fotos e itens opcionais."
        icon={Plus}
      />
      <form className="os-form arl-new-order" onSubmit={submit}>
        {error && <div className="alert">{error}</div>}
        <div className="os-layout">
          <div className="os-main">
            <section>
              <h2>
                <Users />
                Dados do cliente
              </h2>
              <div className="inline">
                <NewOrderClientPicker
                  selected={currentClient}
                  onSelect={(c) => {
                    setClients((current) => [
                      ...current.filter((x) => x.id !== c.id),
                      c as Client,
                    ]);
                    setClient(c.id);
                    window.__arlSelectedClient = c;
                  }}
                />
                <button type="button" onClick={() => setQuick(true)}>
                  <Plus />
                  Cadastro rápido
                </button>
              </div>
              {currentClient && (
                <div className="selected-client-summary">
                  <b>{currentClient.name}</b>
                  <small>
                    {masks.phone(currentClient.phone)} ·{" "}
                    {masks.document(currentClient.document)}
                  </small>
                  <small>
                    {currentClient.street}, {currentClient.number} —{" "}
                    {currentClient.city}/{currentClient.state}
                  </small>
                </div>
              )}
            </section>
            <section>
              <h2>
                <Box />
                Dados do equipamento
              </h2>
              <label className="field arl-manual-equipment-field">
                <span>Equipamento *</span>
                <input
                  type="text"
                  maxLength={500}
                  required
                  autoComplete="off"
                  spellCheck={true}
                  value={equipmentDescription}
                  onChange={(e) => setEquipmentDescription(e.target.value)}
                  placeholder="Ex.: Notebook"
                />
              </label>
              <label className="field arl-manual-equipment-details-field">
                <span>Fabricante / Modelo / Acessórios</span>
                <input
                  type="text"
                  maxLength={500}
                  autoComplete="off"
                  spellCheck={true}
                  value={equipmentDetails}
                  onChange={(e) => setEquipmentDetails(e.target.value)}
                  placeholder="Ex.: Dell Inspiron 15 + carregador"
                />
              </label>
              <p className="arl-manual-equipment-help">
                Descreva o equipamento e, se necessário, complemente com fabricante, modelo e acessórios.
              </p>
              <div className="attendance">
                <button
                  type="button"
                  className={attendance === "bench" ? "chosen" : ""}
                  onClick={() => setAttendance("bench")}
                >
                  ANÁLISE NA BANCADA
                </button>
                <button
                  type="button"
                  className={attendance === "external" ? "chosen" : ""}
                  onClick={() => setAttendance("external")}
                >
                  ATENDIMENTO EXTERNO
                </button>
              </div>
              <label className="field">
                <span>Problema relatado *</span>
                <textarea
                  required
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                />
              </label>
            </section>
            <section>
              <h2>
                <ClipboardList />
                Estado físico na entrada
              </h2>
              <label className="field">
                <span>Avarias aparentes (opcional)</span>
                <textarea
                  aria-label="Estado físico do equipamento na entrada"
                  maxLength={10000}
                  spellCheck={true}
                  value={intakeCondition}
                  onChange={(e) => setIntakeCondition(e.target.value)}
                  placeholder="Ex.: riscos, trincas, peça faltando ou marcas de queda"
                />
              </label>
              <p className="field-help">
                Deixe vazio quando o equipamento chegar aparentemente sem
                avarias.
              </p>
            </section>
            <section>
              <h2>
                <Camera />
                Fotos do equipamento
              </h2>
              <label className="upload">
                <Camera />
                <span>
                  {photos.length
                    ? `${photos.length} foto${photos.length === 1 ? "" : "s"} anexada${photos.length === 1 ? "" : "s"}`
                    : "JPEG, PNG ou WebP — será otimizada para até 100 KB"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    // FileList pertence ao input e é esvaziada ao limpar o campo.
                    // Preserve os arquivos antes disso para que seleções sucessivas
                    // sejam sempre acumuladas no estado da ficha.
                    const selectedPhotos = Array.from(e.currentTarget.files ?? []);
                    e.currentTarget.value = "";
                    addPhotos(selectedPhotos);
                  }}
                />
              </label>
              <button
                type="button"
                className="arl-camera-button"
                onClick={() => setCamera(true)}
              >
                ◉ Usar câmera
              </button>
              {photoPreviews.length > 0 && (
                <div className="opening-photo-previews" aria-label="Fotos anexadas">
                  {photoPreviews.map(({ file, url }, index) => (
                    <figure key={`${file.name}-${file.lastModified}-${index}`}>
                      <img className="preview" src={url} alt={`Prévia da foto ${index + 1}`} />
                      <button
                        type="button"
                        aria-label={`Remover foto ${index + 1}`}
                        onClick={() =>
                          setPhotos((current) =>
                            current.filter((_, photoIndex) => photoIndex !== index),
                          )
                        }
                      >
                        ×
                      </button>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          </div>
          <section className="os-items-panel">
            <h2>
              <Box />
              Serviços / Itens da OS
            </h2>
            <p>
              Opcional na abertura. Preço e garantia são confirmados pelo
              servidor a partir do catálogo.
            </p>
            <ServiceProductSearch items={services as any} ariaLabel="Pesquisar Serviço / Produto na abertura" onSelect={addItem as any} />
            <div className="catalog-pills opening-catalog arl-service-catalog">
              {services
                .filter((item) => item.category !== "product")
                .map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => addItem(item)}
                  >
                    + {item.name}
                  </button>
                ))}
            </div>
            <div className="opening-items">
              {orderItems.length ? (
                orderItems.map((item) => (
                  <div className="opening-item" key={item.catalog_id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {money(item.price_cents)} cada · subtotal{" "}
                        {money(item.quantity * item.price_cents)}
                      </small>
                    </div>
                    <input
                      aria-label={`Quantidade de ${item.name}`}
                      type="number"
                      min="1"
                      max="999"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.catalog_id, +e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOrderItems((current) =>
                          current.filter(
                            (x) => x.catalog_id !== item.catalog_id,
                          ),
                        )
                      }
                    >
                      Remover
                    </button>
                  </div>
                ))
              ) : (
                <div className="opening-empty">
                  Nenhum serviço ou produto adicionado. Você pode criar a OS sem
                  itens.
                </div>
              )}
            </div>
            <div className="opening-total">
              <span>Subtotal previsto</span>
              <strong>{money(openingTotal)}</strong>
            </div>
          </section>
        </div>
        <div className="actions">
          <button className="primary" disabled={busy}>
            {busy ? "Criando OS…" : "Criar ordem de serviço"}
          </button>
        </div>
      </form>
      {camera && (
        <CameraModal
          onClose={() => setCamera(false)}
          onFile={(file) => {
            addPhotos([file]);
            setCamera(false);
          }}
        />
      )}
    </>
  );
}
function FinalizationBox({ order, reload }: any) {
  const seededItems = (order.items || [])
    .filter((x: any) => !x.finalization_id)
    .map((x: any) => {
      const w =
        typeof x.warranty_snapshot === "string"
          ? JSON.parse(x.warranty_snapshot)
          : x.warranty_snapshot;
      return {
        catalog_id: x.catalog_id,
        description: x.description,
        quantity: x.quantity,
        unit_price_cents: x.unit_price_cents,
        warranty_enabled: !!w,
        warranty_term: w?.term,
        warranty_unit: w?.unit,
        warranty_description: w?.description,
      };
    });
  const [open, setOpen] = useState(false),
    [result, setResult] = useState("repair_completed"),
    [other, setOther] = useState(""),
    [report, setReport] = useState(""),
    [discount, setDiscount] = useState("0"),
    [items, setItems] = useState<any[]>(seededItems),
    [catalog, setCatalog] = useState<any[]>([]),
    [budgets, setBudgets] = useState<any[]>([]),
    [sourceBudgetId, setSourceBudgetId] = useState<number | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      api("/catalogs/items"),
      api(`/orders/${order.id}/budgets`),
    ]).then(([c, b]) => {
      setCatalog(c);
      setBudgets(b);
    });
  }, [order.id]);
  const approved = budgets.find((b) => b.status === "approved");
  const budgetItems = approved
    ? approved.items.map((x: any) => {
        const w =
          typeof x.warranty_snapshot === "string"
            ? JSON.parse(x.warranty_snapshot)
            : x.warranty_snapshot;
        return {
          catalog_id: x.catalog_id,
          description: x.description,
          quantity: x.quantity,
          unit_price_cents: x.unit_price_cents,
          warranty_enabled: !!w,
          warranty_term: w?.term,
          warranty_unit: w?.unit,
        };
      })
    : [];
  const add = (c: any) => {
    setSourceBudgetId(null);
    setItems((x) => [
      ...x,
      {
        catalog_id: c.id,
        description: c.name,
        quantity: 1,
        unit_price_cents: c.price_cents,
        warranty_enabled: !!c.warranty_enabled,
        warranty_term: c.warranty_term,
        warranty_unit: c.warranty_unit,
      },
    ]);
  };
  const useBudget = () => {
    if (!approved) return;
    setSourceBudgetId(approved.id);
    setItems([]);
  };
  const shownItems = sourceBudgetId ? budgetItems : items;
  const subtotal = shownItems.reduce(
      (n: number, x: any) => n + x.quantity * x.unit_price_cents,
      0,
    ),
    disc = Math.round(Number(discount.replace(",", ".")) * 100),
    total = Math.max(0, subtotal - disc);
  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      await api(`/orders/${order.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({
          result,
          result_other: other,
          technical_report: report,
          discount_cents: disc,
          approved_budget_id: sourceBudgetId,
          photo_ids: order.photos.map((x: any) => x.id),
          ...(sourceBudgetId ? {} : { items }),
        }),
      });
      setOpen(false);
      reload();
    } catch (e: any) {
      setError(
        (Object.values(e.errors || {}).flat()[0] as string) || e.message,
      );
    } finally {
      setBusy(false);
    }
  };
  if (order.status === "completed")
    return (
      <section className="wide completion">
        <h2>Finalização da OS</h2>
        <b>{status[order.status]}</b>
        <p>{order.technical_report}</p>
        <strong>
          Total: R$ {(order.total_cents / 100).toFixed(2).replace(".", ",")}
        </strong>
      </section>
    );
  return (
    <section className="wide">
      <div className="section-title">
        <div>
          <h2>Finalização da OS</h2>
          <p>Concluir exige resultado, validação e snapshot histórico.</p>
        </div>
        <button
          id="finalization-action"
          className="primary"
          onClick={() => {
            setOpen(true);
            api(`/orders/${order.id}/budgets`)
              .then(setBudgets)
              .catch((e) => setError(e.message));
          }}
        >
          Concluir OS
        </button>
      </div>
      {open && (
        <div className="modal">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setOpen(false)}>
              <X />
            </button>
            <h1>FINALIZAÇÃO DA OS</h1>
            <label className="field">
              <span>Resultado do atendimento *</span>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value)}
              >
                <option value="repair_completed">Reparo realizado</option>
                <option value="irreparable">
                  Equipamento sem possibilidade de reparo
                </option>
                <option value="client_cancelled">
                  Cliente desistiu/cancelou
                </option>
                <option value="economically_unviable">
                  Reparo economicamente inviável
                </option>
                <option value="no_fault">Sem defeito constatado</option>
                <option value="other">Outro</option>
              </select>
            </label>
            {result === "other" && (
              <Field
                label="Descreva o outro resultado"
                value={other}
                onChange={(e: any) => setOther(e.target.value)}
                required
              />
            )}
            <label className="field">
              <span>
                LAUDO TÉCNICO / DESCRIÇÃO DO ATENDIMENTO{" "}
                {result !== "repair_completed" && "*"}
              </span>
              <textarea
                value={report}
                onChange={(e) => setReport(e.target.value)}
              />
            </label>
            <div className="section-title">
              <h2>Itens</h2>
              {approved && (
                <button onClick={useBudget}>
                  USAR ITENS DO ORÇAMENTO APROVADO
                </button>
              )}
            </div>
            {sourceBudgetId && (
              <div className="notice">
                Itens vinculados ao orçamento aprovado. Preço, quantidade e
                garantia serão lidos diretamente do servidor.{" "}
                <button onClick={() => setSourceBudgetId(null)}>
                  Usar itens manuais
                </button>
              </div>
            )}
            <div className="catalog-pills">
              {catalog.map((c) => (
                <button onClick={() => add(c)}>+ {c.name}</button>
              ))}
            </div>
            {shownItems.map((x: any, i: number) => (
              <div className="finish-item">
                <input
                  disabled={!!sourceBudgetId}
                  value={x.description}
                  onChange={(e) =>
                    setItems(
                      items.map((a, j) =>
                        j === i ? { ...a, description: e.target.value } : a,
                      ),
                    )
                  }
                />
                <input
                  disabled={!!sourceBudgetId}
                  type="number"
                  min="1"
                  value={x.quantity}
                  onChange={(e) =>
                    setItems(
                      items.map((a, j) =>
                        j === i ? { ...a, quantity: +e.target.value } : a,
                      ),
                    )
                  }
                />
                <input
                  disabled={!!sourceBudgetId}
                  value={(x.unit_price_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setItems(
                      items.map((a, j) =>
                        j === i
                          ? {
                              ...a,
                              unit_price_cents: Math.round(
                                +e.target.value.replace(",", ".") * 100,
                              ),
                            }
                          : a,
                      ),
                    )
                  }
                />
                <span>
                  R$ {((x.quantity * x.unit_price_cents) / 100).toFixed(2)}
                </span>
                {!sourceBudgetId && (
                  <button
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            <div className="money">
              <span>
                Subtotal <b>R$ {(subtotal / 100).toFixed(2)}</b>
              </span>
              <label>
                Desconto (R$)
                <input
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </label>
              <strong>Total R$ {(total / 100).toFixed(2)}</strong>
            </div>
            {error && <div className="alert">{error}</div>}
            <div className="actions">
              <button onClick={() => setOpen(false)}>Cancelar</button>
              <button className="primary" disabled={busy} onClick={finish}>
                {busy ? "Finalizando…" : "Salvar e concluir OS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function ReportBox({ order }: any) {
  const [list, setList] = useState<any[]>([]),
    [templates, setTemplates] = useState<any[]>([]),
    [open, setOpen] = useState(false),
    [template, setTemplate] = useState<any>(),
    [content, setContent] = useState<any>({
      customer_report: order.reported_problem,
      technical_analysis: "",
      tests_performed: "",
      components: "",
      diagnosis: "",
      conclusion: "",
      equipment_situation: "",
      responsible_technician: "",
      qualification: "",
      certification: "",
      electrical_conclusion: "",
      confirmed: false,
      photo_ids: [],
    }),
    [error, setError] = useState("");
  const load = () =>
    Promise.all([
      api(`/orders/${order.id}/reports`),
      api("/report-templates"),
    ]).then(([r, t]) => {
      setList(r);
      setTemplates(t);
      setTemplate((x: any) => x || t[0]);
    });
  useEffect(() => {
    void load();
  }, [order.id]);
  const set = (k: string, v: any) => setContent({ ...content, [k]: v });
  const issue = async () => {
    setError("");
    try {
      const draft = await api(`/orders/${order.id}/reports`, {
        method: "POST",
        body: JSON.stringify({
          template_id: template.id,
          content: { ...content, confirmed: true },
        }),
      });
      await api(`/orders/${order.id}/reports/${draft.revision}/issue`, {
        method: "POST",
        body: "{}",
      });
      setOpen(false);
      load();
    } catch (e: any) {
      setError(
        (Object.values(e.errors || {}).flat()[0] as string) || e.message,
      );
    }
  };
  return (
    <section className="wide">
      <div className="section-title">
        <h2>Laudos técnicos</h2>
        <button className="primary" onClick={() => setOpen(!open)}>
          GERAR LAUDO TÉCNICO
        </button>
      </div>
      {open && (
        <div className="report-form">
          <div className="notice">
            O conteúdo técnico deve ser revisado e confirmado pelo profissional
            responsável antes da emissão.
          </div>
          <label className="field">
            <span>Modelo</span>
            <select
              value={template?.id || ""}
              onChange={(e) =>
                setTemplate(templates.find((x) => x.id === +e.target.value))
              }
            >
              {templates
                .filter((x) => x.active)
                .map((x) => (
                  <option value={x.id}>{x.name}</option>
                ))}
            </select>
          </label>
          {[
            ["customer_report", "Relato"],
            ["technical_analysis", "Análise técnica"],
            ["tests_performed", "Testes realizados"],
            ["components", "Componentes avaliados/danificados"],
            ["diagnosis", "Diagnóstico"],
            ["conclusion", "Conclusão"],
            ["equipment_situation", "Situação do equipamento"],
            ["observations", "Observações"],
            ["responsible_technician", "Técnico responsável"],
            ["qualification", "Qualificação"],
            ["certification", "Registro/certificação (opcional)"],
          ].map(([k, l]) => (
            <label className="field">
              <span>{l}</span>
              {[
                "responsible_technician",
                "qualification",
                "certification",
                "equipment_situation",
              ].includes(k) ? (
                <input
                  value={content[k] || ""}
                  onChange={(e) => set(k, e.target.value)}
                />
              ) : (
                <textarea
                  value={content[k] || ""}
                  onChange={(e) => set(k, e.target.value)}
                />
              )}
            </label>
          ))}
          {template?.kind === "electrical" && (
            <>
              <Field
                label="Data aproximada do evento"
                value={content.event_date || ""}
                onChange={(e: any) => set("event_date", e.target.value)}
              />
              <label className="field">
                <span>Conclusão selecionada pelo técnico *</span>
                <select
                  value={content.electrical_conclusion}
                  onChange={(e) => set("electrical_conclusion", e.target.value)}
                >
                  <option value="">Selecione conscientemente</option>
                  <option value="compatible">
                    Compatível com origem elétrica
                  </option>
                  <option value="not_evidenced">
                    Sem evidência de origem elétrica
                  </option>
                  <option value="inconclusive">Inconclusiva</option>
                </select>
              </label>
            </>
          )}
          <div className="checks">
            {order.photos.map((p: any) => (
              <label>
                <input
                  type="checkbox"
                  onChange={(e) =>
                    set(
                      "photo_ids",
                      e.target.checked
                        ? [...content.photo_ids, p.id]
                        : content.photo_ids.filter((x: number) => x !== p.id),
                    )
                  }
                />{" "}
                Incluir foto {p.id}
              </label>
            ))}
          </div>
          {error && <div className="alert">{error}</div>}
          <button className="primary" onClick={issue}>
            Revisar, confirmar e emitir
          </button>
        </div>
      )}
      {list.map((r) => (
        <p>
          Laudo {r.template_name} · Revisão {r.revision} ·{" "}
          {r.status === "issued" ? "Emitido" : "Rascunho"}{" "}
          {r.status === "issued" && (
            <a
              target="_blank"
              href={`/api/orders/${order.id}/reports/${r.revision}/pdf`}
            >
              Visualizar / imprimir / baixar
            </a>
          )}
        </p>
      ))}
    </section>
  );
}
function DocumentsBox({ order }: any) {
  const [docs, setDocs] = useState<any[]>([]);
  useEffect(() => {
    api(`/orders/${order.id}/documents`).then(setDocs);
  }, [order.id, order.status]);
  return (
    <section className="wide">
      <h2>Documentos</h2>
      <div className="documents">
        <a target="_blank" href={`/api/orders/${order.id}/term`}>
          Termo de recebimento
        </a>
        {docs
          .filter((d) => d.type !== "term")
          .map((d) => {
            const href =
              d.type === "final"
                ? `/api/orders/${order.id}/final/${d.revision}/pdf`
                : d.type === "technical-report"
                  ? `/api/orders/${order.id}/reports/${d.revision}/pdf`
                  : `/api/orders/${order.id}/budgets/${d.revision}/pdf`;
            return (
              <article>
                <div>
                  <b>
                    {d.type === "final"
                      ? "PDF Final"
                      : d.type === "technical-report"
                        ? "Laudo Técnico"
                        : "Orçamento"}
                  </b>
                  <small>
                    Revisão {d.revision} ·{" "}
                    {new Date(d.issued_at).toLocaleString("pt-BR")} ·{" "}
                    {d.issued_by_name}
                  </small>
                </div>
                <a target="_blank" href={href}>
                  Visualizar
                </a>
                <a href={href} download>
                  Baixar PDF
                </a>
                <button
                  onClick={() => {
                    const w = window.open(href);
                    w?.addEventListener("load", () => w.print());
                  }}
                >
                  Imprimir
                </button>
              </article>
            );
          })}
      </div>
    </section>
  );
}
function PaymentBox({ order }: any) {
  const [summary, setSummary] = useState<any>(),
    [open, setOpen] = useState(false),
    [method, setMethod] = useState("pix"),
    [amount, setAmount] = useState("0,00"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = () =>
    api(`/orders/${order.id}/payments`).then((x: any) => {
      setSummary(x);
      setAmount(
        ((x.collectible_balance_cents || 0) / 100).toFixed(2).replace(".", ","),
      );
    });
  useEffect(() => {
    void load();
  }, [order.id, order.total_cents]);
  const total = summary?.total_cents ?? (order.total_cents || 0),
    paid = summary?.paid_cents ?? 0,
    balance = summary?.collectible_balance_cents ?? Math.max(0, total - paid);
  const entered = Math.round(Number(amount.replace(",", ".")) * 100);
  const remainingAfter = Number.isFinite(entered)
    ? Math.max(0, balance - entered)
    : balance;
  const methodLabel = (value: string) =>
    (
      ({
        pix: "Pix",
        cash: "Dinheiro",
        debit: "Débito",
        credit: "Crédito",
        transfer: "Transferência",
        other: "Outro",
      }) as Record<string, string>
    )[value] || value;
  const openPayment = () => {
    setAmount((balance / 100).toFixed(2).replace(".", ","));
    setError("");
    setOpen(true);
  };
  const save = async () => {
    const cents = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Informe um valor recebido válido.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/orders/${order.id}/payment`, {
        method: "POST",
        body: JSON.stringify({
          amount_cents: cents,
          method,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      setOpen(false);
      await load();
    } catch (e: any) {
      setError(
        (Object.values(e.errors || {}).flat()[0] as string) || e.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="wide">
      <div className="section-title">
        <div>
          <h2>Pagamento</h2>
          <p>Registro financeiro independente do status operacional.</p>
        </div>
        {summary && balance > 0 && total > 0 && (
          <button
            className="primary"
            data-arl-quick-source="payment"
            onClick={openPayment}
          >
            <Wallet />
            {paid > 0 ? "Registrar novo pagamento" : "Registrar pagamento"}
          </button>
        )}
      </div>
      {summary ? (
        <>
          <OrderPaymentFigures summary={summary} />
          {summary.payments?.map((payment: any) => (
            <article className="transaction" key={payment.id}>
              <div>
                <b>{money(payment.effective_cents)}</b>
                <small>
                  {methodLabel(payment.method)} ·{" "}
                  {new Date(payment.paid_at).toLocaleString("pt-BR")} ·{" "}
                  {payment.user_name}
                </small>
              </div>
            </article>
          ))}
        </>
      ) : (
        <p>Carregando situação do pagamento…</p>
      )}
      {open && (
        <div className="modal">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setOpen(false)}>
              <X />
            </button>
            <h1>Pagamento da OS #{order.number}</h1>
            <div className="finance-cards">
              <article>
                <small>Total</small>
                <strong>{money(total)}</strong>
              </article>
              <article>
                <small>Já pago</small>
                <strong>{money(paid)}</strong>
              </article>
              <article>
                <small>Saldo</small>
                <strong>{money(balance)}</strong>
              </article>
            </div>
            <button
              type="button"
              onClick={() =>
                setAmount((balance / 100).toFixed(2).replace(".", ","))
              }
            >
              Pagar valor total ({money(balance)})
            </button>
            <Field
              label="Valor recebido (R$)"
              value={amount}
              onChange={(e: any) => setAmount(e.target.value)}
              required
            />
            <label className="field">
              <span>Forma de pagamento *</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {[
                  ["pix", "Pix"],
                  ["cash", "Dinheiro"],
                  ["debit", "Débito"],
                  ["credit", "Crédito"],
                  ["transfer", "Transferência"],
                  ["other", "Outro"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {Number.isFinite(entered) && entered > 0 && entered < balance && (
              <div className="notice">
                Pagamento parcial: após confirmar, ainda ficarão{" "}
                <b>{money(remainingAfter)}</b> em A Receber.
              </div>
            )}
            {error && <div className="alert">{error}</div>}
            <div className="actions">
              <button onClick={() => setOpen(false)}>Cancelar</button>
              <button className="primary" disabled={busy} onClick={save}>
                {busy ? "Salvando…" : "Confirmar pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function QuickEntry({ open, onClose, onSaved }: any) {
  const [value, setValue] = useState(""),
    [description, setDescription] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/finance/quick-entry", {
        method: "POST",
        body: JSON.stringify({
          amount_cents: Math.round(Number(value.replace(",", ".")) * 100),
          description: description.trim() || null,
        }),
      });
      setValue("");
      setDescription("");
      onClose();
      onSaved?.();
    } catch (e: any) {
      setError(
        (Object.values(e.errors || {}).flat()[0] as string) || e.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal">
      <div className="modal-card quick-entry">
        <button className="modal-close" onClick={onClose}>
          <X />
        </button>
        <h1>Entrada Rápida</h1>
        <p>Entrada avulsa · serviço feito na rua, sem cliente e sem OS</p>
        <Field
          label="Descrição curta (opcional)"
          value={description}
          onChange={(e: any) => setDescription(e.target.value)}
        />
        <Field
          label="Valor recebido (R$)"
          value={value}
          onChange={(e: any) => setValue(e.target.value)}
          required
        />
        {error && <div className="alert">{error}</div>}
        <button className="primary" disabled={busy} onClick={save}>
          {busy ? "Registrando…" : "Registrar entrada avulsa"}
        </button>
      </div>
    </div>
  );
}
function ExpenseEntry({ open, onClose, onSaved, item }: any) {
  const [spentOn, setSpentOn] = useState(""),
    [category, setCategory] = useState("merchandise_purchase"),
    [description, setDescription] = useState(""),
    [value, setValue] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setSpentOn(
      item?.spent_on ||
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
        }).format(new Date()),
    );
    setCategory(item?.category || "merchandise_purchase");
    setDescription(item?.description || "");
    setValue(
      item ? (item.amount_cents / 100).toFixed(2).replace(".", ",") : "",
    );
    setError("");
  }, [open, item]);
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api(item ? `/finance/expenses/${item.id}` : "/finance/expenses", {
        method: item ? "PUT" : "POST",
        body: JSON.stringify({
          spent_on: spentOn,
          category,
          description: description.trim(),
          amount_cents: Math.round(Number(value.replace(",", ".")) * 100),
        }),
      });
      onClose();
      onSaved();
    } catch (e: any) {
      setError(
        (Object.values(e.errors || {}).flat()[0] as string) || e.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal">
      <div
        className="modal-card quick-entry"
        role="dialog"
        aria-modal="true"
        aria-label={item ? "Editar despesa" : "Nova despesa"}
      >
        <button className="modal-close" onClick={onClose}>
          <X />
        </button>
        <h1>{item ? "Editar despesa" : "Nova despesa"}</h1>
        <p>
          {item
            ? "Corrija o lançamento; a alteração ficará auditada."
            : "Registre uma saída operacional."}
        </p>
        <Field
          label="Data"
          type="date"
          value={spentOn}
          onChange={(e: any) => setSpentOn(e.target.value)}
          required
        />
        <label className="field">
          <span>Categoria *</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="merchandise_purchase">Compra de mercadoria</option>
            <option value="usage_material">Material de uso</option>
          </select>
        </label>
        <Field
          label="Descrição"
          value={description}
          onChange={(e: any) => setDescription(e.target.value)}
          required
        />
        <Field
          label="Valor (R$)"
          value={value}
          onChange={(e: any) => setValue(e.target.value)}
          required
        />
        {error && <div className="alert">{error}</div>}
        <button className="primary" disabled={busy} onClick={save}>
          {busy
            ? "Salvando…"
            : item
              ? "Salvar alterações"
              : "Registrar despesa"}
        </button>
      </div>
    </div>
  );
}
const money = (c: number = 0) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;
const expenseCategoryLabel = (category?: string | null) =>
  category === "merchandise_purchase"
    ? "Compra de mercadoria"
    : category === "usage_material"
      ? "Material de uso"
      : "Sem categoria";
const financeMethodLabel = (method?: string | null) =>
  ({ cash: "Dinheiro", pix: "Pix", debit: "Débito", credit: "Crédito", transfer: "Transferência", other: "Outro" } as Record<string, string>)[method || ""] || "Não informada";
const movementTitle = (row: any) =>
  row.kind === "refund"
    ? `Estorno da OS #${row.order_number || "—"}`
    : row.kind === "expense"
      ? "Despesa"
      : row.kind === "service_order"
        ? `Entrada de OS #${row.order_number || "—"}`
        : row.kind === "quick_entry"
          ? "Entrada rápida"
          : "Ajuste financeiro";
const formatOptionalDate = (value: unknown, fallback = "—") => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};
const brazilianDate = (date: string) => {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
};
function DailyRevenueChart({ data }: any) {
  if (!data.length) return <p>Nenhuma movimentação neste mês.</p>;
  const maximum = Math.max(
    ...data.flatMap((day: any) => [day.amount_cents, day.expense_cents, day.refund_cents]),
    1,
  );
  const ticks = [maximum, Math.round(maximum / 2), 0];
  return (
    <div className="revenue-chart" data-testid="daily-revenue-chart">
      <div className="revenue-y-axis" aria-hidden="true">
        {ticks.map((value) => (
          <span key={value}>{money(value)}</span>
        ))}
      </div>
      <div
        className="revenue-plot"
        style={{
          gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
        }}
      >
        {ticks.map((value) => (
          <i
            key={value}
            className="revenue-grid-line"
            style={{ bottom: `${(value / maximum) * 100}%` }}
          />
        ))}
        {data.map((day: any) => (
          <div
            className="revenue-column"
            key={day.date}
            data-testid="daily-revenue-column"
          >
            <strong>{money(day.amount_cents)}</strong>
            <div className="revenue-bars">
              <div
                className="revenue-bar"
                style={{
                  height: `${Math.max(4, (day.amount_cents / maximum) * 100)}%`,
                }}
                title={`${brazilianDate(day.date)} — entrada: ${money(day.amount_cents)}`}
              />
              {day.expense_cents > 0 && (
                <div
                  className="revenue-bar expense"
                  data-testid="daily-expense-bar"
                  style={{
                    height: `${Math.max(4, (day.expense_cents / maximum) * 100)}%`,
                  }}
                  title={`${brazilianDate(day.date)} — saída: ${money(day.expense_cents)}`}
                />
              )}
              {day.refund_cents > 0 && (
                <div
                  className="revenue-bar refund"
                  data-testid="daily-refund-bar"
                  style={{ height: `${Math.max(4, (day.refund_cents / maximum) * 100)}%` }}
                  title={`${brazilianDate(day.date)} — estorno: ${money(day.refund_cents)}`}
                />
              )}
            </div>
            <span>{brazilianDate(day.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function FinancePage({ role, openOrder }: any) {
  const [tab, setTab] = useState("overview"),
    [overview, setOverview] = useState<any>(),
    [daily, setDaily] = useState<any>(),
    [month, setMonth] = useState<any>(),
    [previous, setPrevious] = useState<any>(),
    [receivables, setReceivables] = useState<any>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [monthLoading, setMonthLoading] = useState(false),
    [monthError, setMonthError] = useState(""),
    [receivablesLoading, setReceivablesLoading] = useState(false),
    [receivablesError, setReceivablesError] = useState(""),
    [quick, setQuick] = useState(false),
    [expense, setExpense] = useState(false),
    [editingExpense, setEditingExpense] = useState<any>(),
    [moveFilter, setMoveFilter] = useState("all"),
    [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const loadBase = async () => {
    setLoading(true);
    try {
      const [o, d, r] = await Promise.all([
        api("/finance/overview"),
        api("/finance/daily"),
        api("/finance/receivables"),
      ]);
      setOverview(o);
      setDaily(d);
      setReceivables(r);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const loadMonth = async () => {
    setMonthLoading(true);
    setMonthError("");
    try {
      const date = new Date(`${period}-01T12:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() - 1);
      const prior = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const [current, before] = await Promise.all([
        api("/finance/month?period=" + period),
        api("/finance/month?period=" + prior),
      ]);
      setMonth(current);
      setPrevious(before);
    } catch (e: any) {
      setMonthError(e.message);
    } finally {
      setMonthLoading(false);
    }
  };
  const loadReceivables = async () => {
    setReceivablesLoading(true);
    setReceivablesError("");
    try {
      setReceivables(await api("/finance/receivables"));
    } catch (e: any) {
      setReceivablesError(e.message);
    } finally {
      setReceivablesLoading(false);
    }
  };
  useEffect(() => {
    void loadBase();
  }, []);
  useEffect(() => {
    void loadMonth();
  }, [period]);
  useEffect(() => {
    if (tab === "receivables") void loadReceivables();
  }, [tab]);
  if (loading) return <div className="state">Carregando financeiro real…</div>;
  if (error) return <div className="state error">{error}</div>;
  const canReport = role === "Master" || role === "Administrador";
  const tabs: [string, string, React.ComponentType<any>][] = [
    ["overview", "Visão Geral", LayoutDashboard],
    ["daily", "Caixa Diário", Clock3],
    ["moves", "Movimentações", ReceiptText],
    ["receivables", "A Receber", CircleDollarSign],
    ["month", "Mensal", CalendarDays],
    ...(canReport ? [["reports", "Relatórios", BarChart3] as [string, string, React.ComponentType<any>]] : []),
    ["expenses", "Despesas", Wallet],
  ];
  const issue = async () => {
    const d = await api("/finance/reports", {
      method: "POST",
      body: JSON.stringify({ period }),
    });
    window.open(d.url);
  };
  const reload = () => {
    void loadBase();
    void loadMonth();
    if (tab === "receivables") void loadReceivables();
  };
  const daysInMonth = Number(period.slice(5, 7))
    ? new Date(
        Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0),
      ).getUTCDate()
    : 0;
  const monthAmounts = new Map(Object.entries(month?.daily || {})),
    expenseAmounts = new Map(Object.entries(month?.daily_expenses || {})),
    refundAmounts = new Map(Object.entries(month?.daily_refunds || {}));
  const chartDays = Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${period}-${String(index + 1).padStart(2, "0")}`;
    return {
      date,
      amount_cents: Number(monthAmounts.get(date) || 0),
      expense_cents: Number(expenseAmounts.get(date) || 0),
      refund_cents: Number(refundAmounts.get(date) || 0),
    };
  });
  const received = month?.total_cents || 0,
    refunded = month?.refund_cents || 0,
    expenses = month?.expense_cents || 0,
    remaining = month?.net_cents ?? received - refunded - expenses,
    receivedAfterRefunds = received - refunded;
  const percentage = (value: number, total = received) =>
    total > 0 ? Math.round((value / total) * 100) : 0;
  const compare = (value: number, old: number) =>
    old === 0
      ? value === 0
        ? 0
        : 100
      : Math.round(((value - old) / old) * 100);
  const methods = [
    ["cash", "Dinheiro", Banknote],
    ["pix", "Pix", Landmark],
    ["credit", "Cartão de crédito", CreditCard],
    ["debit", "Cartão de débito", CreditCard],
    ["transfer", "Transferência", Landmark],
    ["other", "Outro", Wallet],
  ] as const;
  const openMoves = (filter: string) => {
    setMoveFilter(filter);
    setTab("moves");
  };
  const movementRows = [
    ...(month?.transactions || []).map((row: any) => ({
      ...row,
      kind: row.origin === "service_order" ? "service_order" : "quick_entry",
      date: row.occurred_at,
    })),
    ...(month?.expenses || []).map((row: any) => ({
      ...row,
      kind: "expense",
      date: row.spent_on,
    })),
    ...(month?.refunds || []).map((row: any) => ({
      ...row,
      kind: "refund",
      description: `Estorno da OS ${row.order_number}`,
      date: row.refunded_at,
    })),
  ].sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))).filter(
    (row: any) =>
      moveFilter === "all" ||
      (moveFilter === "entries"
          ? row.kind === "service_order" || row.kind === "quick_entry"
        : moveFilter === "outflows"
          ? row.kind !== "entry"
          : row.kind === moveFilter),
  );
  return (
    <>
      <PageHeader
        eyebrow="ARL INFORMÁTICA"
        title="Financeiro"
        description="Transações reais · America/Sao_Paulo"
        icon={Wallet}
        actions={
          <>
            <label className="finance-period">
              <span>Mês exibido</span>
              <input
                aria-label="Mês exibido"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </label>
            {canReport && (
              <button
                className="primary finance-action"
                onClick={() => setExpense(true)}
              >
                <Plus />
                Despesa
              </button>
            )}
            <button
              className="primary finance-action"
              onClick={() => setQuick(true)}
            >
              <Plus />
              Entrada Rápida
            </button>
          </>
        }
      />
      <section className="finance-main-hero" aria-label="Resumo financeiro do mês">
        {[
          ["Recebido no mês", received, "inflow"],
          ["Estornos", refunded, "outflow"],
          ["Despesas", expenses, "outflow"],
          ["Líquido", remaining, "net"],
        ].map(([label, value, kind]: any) => (
          <article className={kind} key={label}>
            <small>{label}</small>
            <strong>{monthLoading ? "…" : money(value)}</strong>
          </article>
        ))}
        <span>{period.split("-").reverse().join("/")}</span>
      </section>
      <div className="finance-tabs" role="tablist" aria-label="Seções do Financeiro">
        {tabs.map(([v, l, Icon]) => (
          <button
            key={v}
            className={tab === v ? "active" : ""}
            onClick={() => setTab(v)}
          >
            <Icon aria-hidden="true" />
            {l}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <>
          {monthError && (
            <div className="state error">
              Dados do mês indisponíveis: {monthError}
            </div>
          )}
          <section
            className="payment-method-section panel"
            aria-labelledby="payment-method-title"
          >
            <h2 id="payment-method-title">Formas de pagamento</h2>
            <div className="payment-method-grid">
              {methods.map(([key, label, Icon]) => {
                const method = month?.methods?.[key] || {},
                  entry = method.entry_cents || 0,
                  outflow = method.outflow_cents || 0,
                  net = method.net_cents ?? entry - outflow,
                  pct = percentage(net, remaining);
                return (
                  <article key={key}>
                    <div className={`method-icon ${key}`}>
                      <Icon />
                    </div>
                    <div>
                      <small>{label}</small>
                      <strong className="amount-positive">Entrada {money(entry)}</strong>
                      <b className="amount-negative">Saída − {money(outflow)}</b>
                      <div className="percent-track">
                        <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                      </div>
                      <span>{pct}% do líquido</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          <section
            className="origin-section panel"
            aria-labelledby="origin-title"
          >
            <h2 id="origin-title">De onde vêm as entradas</h2>
            {[
              ["Serviços/OS após estornos", month?.service_orders_net_cents || 0, "orders"],
              ["Entrada Rápida", month?.quick_entries_cents || 0, "quick"],
            ].map(([label, value, key]: any) => (
              <article key={key}>
                <div>
                  <b>{label}</b>
                  <span>
                    {money(value)} · {percentage(value, receivedAfterRefunds)}%
                  </span>
                </div>
                <div className="origin-track">
                  <i
                    className={key}
                    style={{ width: `${Math.max(0, Math.min(100, percentage(value, receivedAfterRefunds)))}%` }}
                  />
                </div>
              </article>
            ))}
          </section>
          <section
            className="finance-total-cards"
            aria-label="Totais do período"
          >
            {[
              ["Entradas brutas", received, "entries", "positive"],
              ["Estornos", refunded, "refund", "negative"],
              ["Despesas", expenses, "expense", "negative"],
            ].map(([label, value, filter]: any) => (
              <article className={filter === "entries" ? "positive" : "negative"} key={label}>
                <small>{label}</small>
                <strong>{money(value)}</strong>
                <button onClick={() => openMoves(filter)}>
                  Ver lançamentos
                </button>
              </article>
            ))}
          </section>
          <section className="panel finance-overview-movements">
            <h2>Lançamentos identificados</h2>
            {movementRows.slice(0, 8).map((t: any) => (
              <article className={`transaction movement-${t.kind}`} key={`overview-${t.kind}-${t.id}`}>
                <div>
                  <b>{movementTitle(t)}</b>
                  <small>{t.description}{t.kind === "expense" ? ` · ${expenseCategoryLabel(t.category)}` : ""}</small>
                  <small><FinanceDate value={t.date} /> · {t.user_name || "Usuário não identificado"}{t.method ? ` · ${financeMethodLabel(t.method)}` : ""}</small>
                  {t.reason && <small>Motivo: {t.reason}</small>}
                </div>
                <strong className={t.kind === "service_order" || t.kind === "quick_entry" ? "amount-positive" : "amount-negative"}>
                  {t.kind === "service_order" || t.kind === "quick_entry" ? "+ " : "− "}{money(t.effective_cents ?? t.amount_cents)}
                </strong>
              </article>
            ))}
            {!movementRows.length && <div className="state">Nenhum lançamento no mês selecionado.</div>}
          </section>
        </>
      )}
      {tab === "daily" && (
        <section className="panel finance-daily">
          <h2>Caixa Diário automático</h2>
          <strong className={daily.total_cents >= 0 ? "amount-positive" : "amount-negative"}>Total: {money(daily.total_cents)}</strong>
          {daily.transactions.length ? (
            daily.transactions.map((t: any) => (
              <article className={`transaction movement-${t.kind}`} key={`${t.kind}-${t.id}`}>
                <div>
                  <b>{movementTitle(t)}</b>
                  <small>{t.description}{t.kind === "expense" ? ` · ${expenseCategoryLabel(t.category)}` : ""}</small>
                  <small>
                    <FinanceDate value={t.occurred_at} /> · {t.user_name || "Usuário não identificado"}{t.method ? ` · ${financeMethodLabel(t.method)}` : ""}
                  </small>
                  {t.refund_reason && <small>Motivo: {t.refund_reason}</small>}
                </div>
                <strong className={t.effective_cents >= 0 ? "amount-positive" : "amount-negative"}>{t.effective_cents >= 0 ? "+ " : "− "}{money(Math.abs(t.effective_cents))}</strong>
              </article>
            ))
          ) : (
            <div className="state">Nenhuma movimentação no período.</div>
          )}
        </section>
      )}
      {tab === "moves" && (
        <section className="panel finance-movements">
          <div className="section-title">
            <div>
              <h2>Lançamentos do mês</h2>
              <p>
                {moveFilter === "entries"
                  ? "Entradas"
                  : moveFilter === "outflows"
                    ? "Saídas"
                    : "Todas as movimentações"}
              </p>
            </div>
          </div>
          <div className="finance-tabs finance-movement-filters" aria-label="Grupo de lançamentos">
            {[
              ["all", "Todos", ClipboardList],
              ["entries", "Entradas", ArrowDown],
              ["outflows", "Saídas", ArrowUp],
              ["expense", "Despesas", Wallet],
              ["refund", "Estornos", RotateCcw],
            ].map(([value, label, Icon]: any) => (
              <button
                type="button"
                key={value}
                className={moveFilter === value ? "active" : ""}
                onClick={() => setMoveFilter(value)}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          {movementRows.length ? (
            movementRows.map((t: any) => (
              <article className="transaction" key={`${t.kind}-${t.id}`}>
                <div>
                  <b>{movementTitle(t)}</b>
                  <small>
                    {t.description}{t.kind === "expense" ? ` · ${expenseCategoryLabel(t.category)}` : ""}
                  </small>
                  <small><FinanceDate value={t.date} /> · {t.user_name || "Usuário não identificado"}{t.method ? ` · ${financeMethodLabel(t.method)}` : ""}</small>
                  {t.reason && <small>Motivo: {t.reason}</small>}
                </div>
                <strong className={t.kind === "service_order" || t.kind === "quick_entry" ? "amount-positive" : "amount-negative"}>
                  {t.kind === "service_order" || t.kind === "quick_entry" ? "+ " : "− "}
                  {money(t.effective_cents ?? t.amount_cents)}
                </strong>
                {t.kind === "expense" && canReport && (
                  <button onClick={() => setEditingExpense(t)}>Editar</button>
                )}
              </article>
            ))
          ) : (
            <div className="state">Nenhum lançamento neste grupo.</div>
          )}
        </section>
      )}
      {tab === "receivables" && (
        <section className="panel finance-receivables">
          <h2>A Receber</h2>
          <p>OS concluídas que ainda possuem saldo pendente.</p>
          {receivablesLoading ? (
            <div className="state">Carregando valores em aberto…</div>
          ) : receivablesError ? (
            <div className="state error">{receivablesError}</div>
          ) : (
            receivables && (
              <>
                <div className="finance-cards">
                  <article>
                    <small>OS em aberto</small>
                    <strong>{receivables.count}</strong>
                  </article>
                  <article>
                    <small>Total a receber</small>
                    <strong>{money(receivables.total_balance_cents)}</strong>
                  </article>
                </div>
                {receivables.data.length ? (
                  receivables.data.map((r: any) => (
                    <article className="transaction" key={r.id}>
                      <div>
                        <b>
                          OS #{r.number} · {r.client_name}
                        </b>
                        <small>
                          {r.payment_status === "partial"
                            ? "Pagamento parcial"
                            : "Não pago"}{" "}
                          · Total {money(r.total_cents)} · Pago{" "}
                          {money(r.paid_cents)}
                          {r.refunded_cents > 0 &&
                            ` · Estornado ${money(r.refunded_cents)}`}
                        </small>
                      </div>
                      <strong>Falta {money(r.balance_cents)}</strong>
                      <button onClick={() => openOrder?.(r.id)}>
                        Abrir OS
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="state">Nenhuma OS com saldo pendente.</div>
                )}
              </>
            )
          )}
        </section>
      )}
      {tab === "month" && (
        <section className="panel finance-monthly">
          <div className="finance-cards">
            <article>
              <small>Faturamento</small>
              <strong>{money(received)}</strong>
            </article>
            <article>
              <small>Vindos de OS</small>
              <strong>{money(month?.service_orders_cents)}</strong>
            </article>
            <article>
              <small>Entrada Rápida</small>
              <strong>{money(month?.quick_entries_cents)}</strong>
            </article>
            <article>
              <small>OS pagas</small>
              <strong>{month?.paid_orders || 0}</strong>
            </article>
            <article>
              <small>Ticket médio</small>
              <strong>{money(month?.average_ticket_cents)}</strong>
            </article>
            <article>
              <small>Descontos</small>
              <strong>{money(month?.discount_cents)}</strong>
            </article>
          </div>
          <div className="finance-month-items">
            <h2>Serviços e produtos</h2>
            {month?.items?.length ? (
              month.items.map((i: any) => (
                <p key={i.description}>
                  {i.description}: {i.quantity} · {money(i.total_cents)}
                </p>
              ))
            ) : (
              <p>Nenhum item vinculado.</p>
            )}
          </div>
        </section>
      )}
      {tab === "reports" && (
        <>
          <section
            className="report-summary"
            aria-label="Indicadores gerenciais"
          >
            {[
              ["Recebido", received, previous?.total_cents || 0],
              ["Estornos", refunded, previous?.refund_cents || 0],
              ["Despesas", expenses, previous?.expense_cents || 0],
              [
                "Líquido",
                remaining,
                previous?.net_cents ??
                  (previous?.total_cents || 0) -
                    (previous?.refund_cents || 0) -
                    (previous?.expense_cents || 0),
              ],
            ].map(([label, value, old]: any) => (
              <article className={label === "Estornos" || label === "Despesas" || value < 0 ? "negative" : "positive"} key={label}>
                <small>{label}</small>
                <strong>
                  {money(value)}
                </strong>
                <span
                  className={compare(value, old) >= 0 ? "positive" : "negative"}
                >
                  {compare(value, old) >= 0 ? "+" : ""}
                  {compare(value, old)}% vs. período anterior
                </span>
              </article>
            ))}
          </section>
          <section className="panel revenue-panel">
            <h2>Entradas, estornos e despesas por dia</h2>
            <div className="finance-chart-subhead">
              <p>Cada natureza permanece separada na data em que ocorreu.</p>
              <button className="primary" onClick={issue}>
                Gerar PDF privado
              </button>
            </div>
            <DailyRevenueChart data={chartDays} />
          </section>
          <section className="refund-total panel">
            <small>Total em Estornos no período</small>
            <strong>{money(month?.refund_cents || 0)}</strong>
            <button onClick={() => openMoves("refund")}>Ver lançamentos</button>
          </section>
        </>
      )}
      {tab === "expenses" && (
        <section className="panel finance-expenses">
          <h2>Despesas do mês</h2>
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr></thead>
              <tbody>
                {month?.expenses?.length ? month.expenses.map((row: any) => (
                  <tr key={row.id}>
                    <td>{brazilianDate(row.spent_on)}</td>
                    <td>{expenseCategoryLabel(row.category)}</td>
                    <td>{row.description}</td>
                    <td className="amount-negative">− {money(row.amount_cents)}</td>
                  </tr>
                )) : <tr><td colSpan={4}>Nenhuma despesa no mês selecionado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <QuickEntry
        open={quick}
        onClose={() => setQuick(false)}
        onSaved={reload}
      />
      <ExpenseEntry
        open={expense || !!editingExpense}
        item={editingExpense}
        onClose={() => {
          setExpense(false);
          setEditingExpense(undefined);
        }}
        onSaved={reload}
      />
    </>
  );
}
function Dashboard({ go, desk = false, role, mobileLayout = false }: any) {
  const [items, setItems] = useState<Order[]>([]),
    [closedItems, setClosedItems] = useState<Order[]>([]),
    [completed, setCompleted] = useState(0),
    [quick, setQuick] = useState(false),
    [loading, setLoading] = useState(true),
    [interrupt, setInterrupt] = useState<Order>();
  const load = () => {
    setLoading(true);
    api("/orders/desk")
      .then(setItems)
      .finally(() => setLoading(false));
    api("/orders?tab=closed_week&per_page=100").then((x) => setClosedItems(x.data));
    api("/orders?tab=finalized&per_page=1").then((x) => setCompleted(x.total));
  };
  useEffect(load, []);
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
    load();
  };
  const remove = async (o: Order) => {
    if (!["Master", "Administrador"].includes(role)) return;
    if (
      confirm(
        `Excluir a OS #${o.number} das listagens? O histórico será preservado.`,
      )
    ) {
      await api(`/orders/${o.id}`, { method: "DELETE" });
      load();
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
            load();
          }}
        />
      )}
    </>
  );
}

function OrderView({ id, back }: any) {
  const [o, setO] = useState<any>();
  const [error, setError] = useState("");
  const load = () =>
    api("/orders/" + id)
      .then(setO)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [id]);
  if (error) return <div className="state error">{error}</div>;
  if (!o) return <div className="state">Carregando OS…</div>;
  const upload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("photo", file);
    try {
      await api(`/orders/${o.id}/photos`, { method: "POST", body: fd });
      load();
    } catch (x: any) {
      setError(x.message);
    }
  };
  return (
    <>
      <button className="arl-back-button" onClick={back}>← Voltar</button>
      <div className="title">
        <div>
          <h1>OS #{o.number}</h1>
          <p>
            {o.attendance_type === "bench"
              ? "Análise na Bancada"
              : "Atendimento Externo"}
          </p>
          <label className={`status-picker status-${o.status}`}>
            <span>Status</span>
            <select
              value={o.status}
              disabled={["completed", "interrupted"].includes(o.status)}
              onChange={async (e) => {
                if (e.target.value === "completed") {
                  document.getElementById("finalization-action")?.click();
                  return;
                }
                await api(`/orders/${o.id}/status`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: e.target.value }),
                });
                load();
              }}
            >
              {Object.entries(status).map(([v, l]) => (
                <option value={v}>{l as string}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {o.attendance_type === "external" && (
        <div
          className="contact-links external-actions"
          aria-label="Atalhos do atendimento externo"
        >
          <a
            href={o.mobile_actions?.whatsapp_url}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <a href={o.mobile_actions?.maps_url} target="_blank" rel="noreferrer">
            Maps
          </a>
          <label className="button">
            Foto
            <input
              aria-label="Foto do atendimento externo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={upload}
            />
          </label>
          <button
            id="external-status-action"
            onClick={() =>
              document
                .querySelector<HTMLSelectElement>(".status-picker select")
                ?.focus()
            }
          >
            Status
          </button>
          <button
            disabled={["completed", "interrupted"].includes(o.status)}
            onClick={() =>
              document.getElementById("finalization-action")?.click()
            }
          >
            Finalizar
          </button>
        </div>
      )}
      <div className="detail-grid">
        <section>
          <h2>Cliente</h2>
          <b>{o.client.name}</b>
          <p>
            {masks.document(o.client.document)} · {masks.phone(o.client.phone)}
          </p>
          <p>
            {o.client.street}, {o.client.number} — {o.client.city}/
            {o.client.state}
          </p>
        </section>
        <section>
          <h2>Problema relatado</h2>
          <p>{o.reported_problem}</p>
        </section>
        <section>
          <h2>Checklist</h2>
          {o.checklists.length ? (
            o.checklists.map((x: any) => (
              <p>
                • {x.label}
                {x.note && `: ${x.note}`}
              </p>
            ))
          ) : (
            <p className="ok">CHECKLIST DE ENTRADA: 100% OK</p>
          )}
        </section>
        <section>
          <h2>Fotos</h2>
          <div className="photos">
            {o.photos.length ? (
              o.photos.map((p: any) => (
                <a key={p.id} href={`/api/orders/${o.id}/photos/${p.id}`} target="_blank" rel="noreferrer"><img src={`/api/orders/${o.id}/photos/${p.id}`} alt={`Foto ${p.id} da OS`} /></a>
              ))
            ) : (
              <p>Nenhuma foto anexada.</p>
            )}
          </div>
        </section>
        {o.items?.length > 0 && (
          <section className="wide order-items-summary">
            <h2>Serviços / Itens da OS</h2>
            {o.items.map((item: any) => (
              <div className="order-item-line">
                <div>
                  <b>{item.description}</b>
                  <small>
                    {item.quantity} × {money(item.unit_price_cents)}
                  </small>
                </div>
                <strong>{money(item.subtotal_cents)}</strong>
              </div>
            ))}
          </section>
        )}
        <section className="wide">
          <h2>Histórico de status</h2>
          {o.histories.map((h: any) => (
            <p>
              {status[h.to_status]} ·{" "}
              {new Date(h.created_at).toLocaleString("pt-BR")} · {h.user?.name}
            </p>
          ))}
        </section>
        <BudgetBox order={o} />
        <PaymentBox order={o} />
        <FinalizationBox order={o} reload={load} />
        <ReportBox order={o} />
        <DocumentsBox order={o} />
      </div>
    </>
  );
}

function ReportTemplateSettings() {
  const [list, setList] = useState<any[]>([]),
    [name, setName] = useState(""),
    [kind, setKind] = useState("general"),
    [body, setBody] = useState("Modelo editável.");
  const load = () => api("/report-templates").then(setList);
  useEffect(() => {
    void load();
  }, []);
  const create = async () => {
    await api("/report-templates", {
      method: "POST",
      body: JSON.stringify({ name, kind, body }),
    });
    setName("");
    load();
  };
  return (
    <section className="form-card settings-form report-settings">
      <h2>Modelos de laudos</h2>
      <p>
        Crie, edite, duplique ou desative modelos. Modelos usados permanecem no
        histórico.
      </p>
      <div className="form-grid">
        <Field
          label="Novo modelo"
          value={name}
          onChange={(e: any) => setName(e.target.value)}
        />
        <label className="field">
          <span>Tipo</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="general">Geral</option>
            <option value="electrical">Dano elétrico</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Orientação do modelo</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <button className="primary" onClick={create}>
        Criar modelo
      </button>
      <div className="template-list">
        {list.map((t) => (
          <article>
            <div>
              <b>{t.name}</b>
              <small>
                {t.kind === "electrical" ? "Dano elétrico" : "Geral"} ·{" "}
                {t.active ? "Ativo" : "Inativo"}
              </small>
            </div>
            <button
              onClick={() => {
                const body = window.prompt(
                  "Edite a orientação do modelo:",
                  t.body,
                );
                if (body !== null)
                  api(`/report-templates/${t.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ body }),
                  }).then(load);
              }}
            >
              Editar
            </button>
            <button
              onClick={() =>
                api(`/report-templates/${t.id}/duplicate`, {
                  method: "POST",
                  body: "{}",
                }).then(load)
              }
            >
              Duplicar
            </button>
            <button
              onClick={() =>
                api(`/report-templates/${t.id}`, {
                  method: "PUT",
                  body: JSON.stringify({ active: !t.active }),
                }).then(load)
              }
            >
              {t.active ? "Desativar" : "Ativar"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
function InfrastructureSettings({ section }: { section: string }) {
  const [backups, setBackups] = useState<any>(),
    [diagnostic, setDiagnostic] = useState<any>(),
    [message, setMessage] = useState(""),
    [upload, setUpload] = useState<File>();
  const load = () => {
    api("/backups")
      .then(setBackups)
      .catch(() => {});
    api("/diagnostics")
      .then(setDiagnostic)
      .catch(() => {});
  };
  useEffect(load, []);
  if (!backups && !diagnostic) return null;
  const create = async () => {
    setMessage("Criando backup…");
    try {
      const token = document.querySelector<HTMLMetaElement>(
        'meta[name="csrf-token"]',
      )?.content;
      const response = await fetch("/api/backups/manual-download", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/zip, application/json",
          ...(token ? { "X-CSRF-TOKEN": token } : {}),
        },
      });
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: "Não foi possível gerar o backup." }));
        throw new Error(error.message || "Não foi possível gerar o backup.");
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("O arquivo de backup foi gerado vazio.");
      const disposition = response.headers.get("content-disposition") || "";
      const filename =
        disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)?.[1] ||
        `backup-arl-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = decodeURIComponent(filename);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      setMessage("Backup gerado, baixado e removido do servidor.");
      load();
    } catch (e: any) {
      setMessage(e.message);
    }
  };
  const send = async () => {
    const x = await api("/diagnostics/push-test", {
      method: "POST",
      body: "{}",
    });
    setMessage(
      x.status === "sent_to_service"
        ? "Envio aceito pelo serviço Push."
        : x.status === "no_subscription"
          ? "Nenhuma inscrição neste usuário."
          : "Web Push não configurado.",
    );
  };
  return (
    <div className="infra-grid">
      {section === "backup" && backups && (
        <section className="form-card">
          <h2>Backup e Restauração</h2>
          <p>
            Arquivos privados, banco, manifesto e SHA-256 em armazenamento não
            público.
          </p>
          <div className="actions">
            <button
              className="primary"
              disabled={message === "Criando backup…"}
              onClick={create}
            >
              CRIAR BACKUP AGORA
            </button>
            <label className="upload small">
              Selecionar backup
              <input
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => setUpload(e.target.files?.[0])}
              />
            </label>
            <button
              disabled={!upload}
              onClick={async () => {
                const fd = new FormData();
                fd.append("backup", upload!);
                await api("/backups/upload", { method: "POST", body: fd });
                setMessage("Backup validado. Confirme a restauração na lista.");
                load();
              }}
            >
              VALIDAR UPLOAD
            </button>
          </div>
          {message && <div className="notice">{message}</div>}
          <fieldset className="backup-config">
            <legend>Backup automático</legend>
            <label>
              <input
                type="checkbox"
                checked={backups.automatic.enabled}
                onChange={(e) =>
                  setBackups({
                    ...backups,
                    automatic: {
                      ...backups.automatic,
                      enabled: e.target.checked,
                    },
                  })
                }
              />{" "}
              Ligado
            </label>
            <label>
              Frequência{" "}
              <select
                value={backups.automatic.frequency}
                onChange={(e) =>
                  setBackups({
                    ...backups,
                    automatic: {
                      ...backups.automatic,
                      frequency: e.target.value,
                    },
                  })
                }
              >
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </label>
            <span>Retenção fixa: 2 arquivos mais recentes</span>
            <button
              onClick={async () => {
                await api("/backups/automatic", {
                  method: "PUT",
                  body: JSON.stringify(backups.automatic),
                });
                setMessage("Configuração automática salva e auditada.");
                load();
              }}
            >
              Salvar automação
            </button>
          </fieldset>
          <div className="backup-summary">
            <b>{backups.data.length} armazenado(s)</b>
            <span>{(backups.total_bytes / 1048576).toFixed(2)} MB</span>
            <span>
              Automático:{" "}
              {backups.automatic.enabled
                ? backups.automatic.frequency
                : "desligado"}{" "}
              · retenção {backups.automatic.retention}
            </span>
          </div>
          {backups.data.map((b: any) => (
            <article className="backup-row" key={b.id}>
              <div>
                <b>{new Date(b.created_at).toLocaleString("pt-BR")}</b>
                <small>
                  {b.kind} · {(b.bytes / 1048576).toFixed(2)} MB · {b.status} ·{" "}
                  {b.sha256.slice(0, 12)}…
                </small>
              </div>
              <a className="button" href={`/api/backups/${b.id}/download`}>
                BAIXAR
              </a>
              <button
                disabled={b.status !== "ready"}
                onClick={async () => {
                  if (
                    window.prompt("Digite RESTAURAR BACKUP para confirmar") !==
                    "RESTAURAR BACKUP"
                  )
                    return;
                  await api(`/backups/${b.id}/restore`, {
                    method: "POST",
                    body: JSON.stringify({ confirmation: "RESTAURAR BACKUP" }),
                  });
                  setMessage(
                    "Restauração concluída; backup de segurança preservado.",
                  );
                  load();
                }}
              >
                RESTAURAR
              </button>
              <button
                disabled={b.protected || b.status === "creating"}
                onClick={async () => {
                  if (!window.confirm(`Apagar o backup ${b.filename}?`)) return;
                  await api(`/backups/${b.id}`, { method: "DELETE" });
                  setMessage("Backup removido do servidor.");
                  load();
                }}
              >
                APAGAR
              </button>
            </article>
          ))}
        </section>
      )}
      {section === "system" && diagnostic && (
        <section className="form-card">
          <h2>Sistema e Diagnóstico</h2>
          <p>
            Informações reais do ambiente, sem credenciais ou chaves privadas.
          </p>
          <div className="health-list">
            {[
              [
                "Banco",
                diagnostic.database.status,
                `${diagnostic.database.driver} · ${diagnostic.database.latency_ms} ms`,
              ],
              [
                "Storage",
                diagnostic.storage.status,
                diagnostic.storage.writable ? "gravável" : "sem escrita",
              ],
              [
                "Scheduler",
                diagnostic.scheduler.status,
                diagnostic.scheduler.heartbeat_at || "não detectado",
              ],
              [
                "Backup",
                diagnostic.backup.status,
                diagnostic.backup.last_at || "nenhum backup",
              ],
              [
                "Web Push",
                diagnostic.web_push.status,
                diagnostic.web_push.configured
                  ? "configurado"
                  : "não configurado",
              ],
              [
                "HTTPS",
                diagnostic.runtime.https ? "ok" : "warning",
                diagnostic.runtime.https ? "ativo" : "inativo",
              ],
            ].map(([name, status, detail]) => (
              <div>
                <i className={status as string}>
                  {String(status).toUpperCase()}
                </i>
                <b>{name}</b>
                <span>{detail}</span>
              </div>
            ))}
          </div>
          <p>
            App {diagnostic.app.version} · commit {diagnostic.app.commit} · PHP{" "}
            {diagnostic.runtime.php} · Laravel {diagnostic.runtime.laravel}
          </p>
          <button className="primary" onClick={send}>
            ENVIAR NOTIFICAÇÃO DE TESTE
          </button>
        </section>
      )}
      {section === "system" && (
        <section className="form-card">
          <h2>Hospedagem e Migração</h2>
          <p>
            Compatível com KingHost, outro shared hosting ou VPS. Use PHP 8.2+,
            MySQL/MariaDB, HTTPS, document root em <code>/public</code> e cron
            do Laravel a cada minuto.
          </p>
          <p>
            Antes de atualizar: crie e baixe um backup. Faça o build no CI,
            ative manutenção apenas durante migrations, valide o diagnóstico e
            então encerre a manutenção.
          </p>
        </section>
      )}
    </div>
  );
}
function SettingsPage({ role }: any) {
  const [data, setData] = useState<any>();
  const [message, setMessage] = useState("");
  const [section, setSection] = useState("company");
  const [logo, setLogo] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  useEffect(() => {
    api("/settings")
      .then((settings: any) => setData(formatCompanySettings(settings)))
      .catch((e) => setMessage(e.message));
  }, []);
  if (!data) return <div className="state">Carregando configurações…</div>;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("Salvando…");
    try {
      setData(
        formatCompanySettings(
          await api("/settings", {
            method: "PUT",
            body: JSON.stringify(serializeCompanySettings(data)),
          }),
        ),
      );
      if (logo) {
        const fd = new FormData();
        fd.append("logo", logo);
        await api("/settings/logo", { method: "POST", body: fd });
      }
      if (signature) {
        const fd = new FormData();
        fd.append("signature", signature);
        await api("/settings/signature", { method: "POST", body: fd });
        setData((current: any) => ({ ...current, technical_signature_configured: true }));
        setSignature(null);
      }
      setMessage(
        "Configurações salvas com segurança. Documentos antigos permanecem preservados.",
      );
    } catch (x: any) {
      setMessage(
        (Object.values(x.errors || {}).flat()[0] as string) || x.message,
      );
    }
  };
  const change = (e: any) => {
    let value =
      e.target.type === "checkbox"
        ? e.target.checked
          ? "1"
          : "0"
        : e.target.value;
    if (e.target.name === "cnpj") value = masks.document(value);
    if (e.target.name === "phone") value = masks.phone(value);
    if (e.target.name === "postal_code") value = masks.cep(value);
    setData({ ...data, [e.target.name]: value });
  };
  const tabs = [
    ["company", "Empresa", "▣"],
    ["identity", "Identidade", "◆"],
    ["documents", "Documentos", "▧"],
    ["notifications", "Notificações", "♢"],
    ...(role === "Master"
      ? [
          ["backup", "Backup", "▦"],
          ["system", "Sistema", "⌁"],
        ]
      : []),
    ["storage", "Armazenamento", "▥"],
  ];
  const generalSave =
    ["company", "identity"].includes(section) ||
    section === "documents";
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRAÇÃO"
        title="Configurações"
        description="Identidade, documentos, garantias e infraestrutura do sistema."
        icon={Settings}
      />
      <div
        className="arl-settings-tabs"
        role="tablist"
        aria-label="Seções de Configurações"
      >
        {tabs.map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            className={`arl-settings-tab ${section === id ? "active" : ""}`}
            data-section={id}
            onClick={() => {
              setSection(id);
              setMessage("");
            }}
          >
            <span aria-hidden="true">{icon}</span>
            <b>{label}</b>
          </button>
        ))}
      </div>
      {section === "documents" && (
        <div
          className="arl-document-subtabs"
          role="tablist"
          aria-label="Seções de Orçamentos e Documentos"
        >
          {[["term", "Termo de recebimento"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected="true"
              className="arl-document-subtab active"
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {role === "Master" && section === "system" && <ClientImport />}
      {generalSave && (
        <form className="form-card settings-form" onSubmit={save}>
          {section === "company" && (
            <>
              <h2>Dados da Empresa</h2>
              <div className="company-pdf-notice" role="note">
                <b>Dados para uso interno</b>
                <p>
                  Os dados da empresa continuam cadastrados no sistema, mas não
                  são impressos nos PDFs porque o papel timbrado já traz essas
                  informações.
                </p>
              </div>
              <div className="form-grid company-fields">
                {[
                  ["Razão social", "company_name"],
                  ["Nome fantasia", "trade_name"],
                  ["CNPJ (somente números)", "cnpj"],
                  ["Telefone / WhatsApp", "phone"],
                  ["E-mail", "email"],
                  ["CEP (somente números)", "postal_code"],
                  ["Endereço", "street"],
                  ["Número", "number"],
                  ["Bairro", "district"],
                  ["Cidade", "city"],
                  ["Estado", "state"],
                ].map(([label, name]) => (
                  <Field
                    label={label}
                    name={name}
                    value={data[name] || ""}
                    onChange={change}
                  />
                ))}
              </div>
              <details className="company-secondary-fields">
                <summary>
                  Informações complementares <ChevronDown aria-hidden="true" />
                </summary>
                <div className="form-grid">
                  {[
                    ["Complemento", "complement"],
                    ["Instagram", "instagram"],
                    ["Avaliação Google", "google_review"],
                  ].map(([label, name]) => (
                    <Field
                      label={label}
                      name={name}
                      value={data[name] || ""}
                      onChange={change}
                    />
                  ))}
                </div>
              </details>
            </>
          )}
          {section === "identity" && (
            <>
              <h2>Identidade Visual</h2>
              <label className="upload">
                <Camera />
                <span>
                  {logo
                    ? logo.name
                    : "Enviar ou substituir logo (PNG, JPG ou WebP)"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setLogo(e.target.files?.[0] || null)}
                />
              </label>
              <label className="upload">
                <FileSignature />
                <span>
                  {signature
                    ? signature.name
                    : data.technical_signature_configured
                      ? "Substituir assinatura técnica"
                      : "Enviar assinatura técnica (fundo branco será removido)"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setSignature(e.target.files?.[0] || null)}
                />
              </label>
              {data.technical_signature_configured && !signature && <img className="technical-signature-preview" src="/api/settings/signature" alt="Assinatura técnica cadastrada"/>}
            </>
          )}
          {section === "documents" && (
            <>
              <h2>Documentos</h2>
              <label className="field">
                <span>Texto do termo de recebimento</span>
                <TermTextEditor value={data.term_text} onChange={change} />
              </label>
            </>
          )}
          {message && <div className="notice">{message}</div>}
          <div className="actions">
            <button type="button" onClick={() => window.print()}>
              Visualizar prévia
            </button>
            <button className="primary">Salvar configurações</button>
          </div>
        </form>
      )}
      {role === "Master" && ["backup", "system"].includes(section) && (
        <InfrastructureSettings section={section} />
      )}
      {section === "storage" && <StorageAdmin role={role} />}
      {section === "notifications" && <PushSettings />}
    </>
  );
}
function BudgetBox({ order }: any) {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [validity, setValidity] = useState(7);
  const [diagnosis, setDiagnosis] = useState(""),
    [proposal, setProposal] = useState(""),
    [description, setDescription] = useState(""),
    [quantity, setQuantity] = useState(1),
    [price, setPrice] = useState("0"),
    [warranty, setWarranty] = useState(false),
    [term, setTerm] = useState(30),
    [unit, setUnit] = useState("days");
  const load = () => api(`/orders/${order.id}/budgets`).then(setList);
  useEffect(() => {
    void load();
    api("/operational-settings")
      .then((x) => setValidity(+x.budget_validity_days || 7))
      .catch(() => {});
  }, [order.id]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await api(`/orders/${order.id}/budgets`, {
      method: "POST",
      body: JSON.stringify({
        diagnosis,
        proposal,
        validity_days: validity,
        items: [
          {
            description,
            quantity,
            unit_price_cents: Math.round(Number(price.replace(",", ".")) * 100),
            warranty_enabled: warranty,
            warranty_term: warranty ? term : null,
            warranty_unit: warranty ? unit : null,
          },
        ],
      }),
    });
    setOpen(false);
    load();
  };
  return (
    <section className="wide">
      <div className="section-title">
        <h2>Orçamentos</h2>
        <button
          className="primary"
          data-arl-quick-source="budget"
          onClick={() => setOpen(!open)}
        >
          <Plus />
          Gerar orçamento
        </button>
      </div>
      {open && (
        <form className="budget-form" onSubmit={submit}>
          <label className="field">
            <span>Diagnóstico</span>
            <textarea
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Serviço proposto</span>
            <textarea
              required
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
            />
          </label>
          <div className="form-grid">
            <Field
              label="Validade (dias)"
              value={validity}
              onChange={(e: any) => setValidity(+e.target.value)}
              required
            />
            <Field
              label="Item"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              required
            />
            <Field
              label="Quantidade"
              value={quantity}
              onChange={(e: any) => setQuantity(+e.target.value)}
              required
            />
            <Field
              label="Valor unitário"
              value={price}
              onChange={(e: any) => setPrice(e.target.value)}
              required
            />
            <label className="field">
              <span>Garantia</span>
              <label>
                <input
                  type="checkbox"
                  checked={warranty}
                  onChange={(e) => setWarranty(e.target.checked)}
                />{" "}
                Este item tem garantia
              </label>
            </label>
            {warranty && (
              <>
                <Field
                  label="Duração"
                  value={term}
                  onChange={(e: any) => setTerm(+e.target.value)}
                />
                <label className="field">
                  <span>Unidade</span>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="days">Dias</option>
                    <option value="months">Meses</option>
                    <option value="years">Anos</option>
                  </select>
                </label>
              </>
            )}
          </div>
          <button className="primary">Salvar e gerar PDF</button>
        </form>
      )}
      {list.length ? (
        list.map((b) => (
          <p>
            Revisão {b.revision} · {b.status} · R${" "}
            {(b.total_cents / 100).toFixed(2)} ·{" "}
            <a
              target="_blank"
              href={`/api/orders/${order.id}/budgets/${b.revision}/pdf`}
            >
              Abrir PDF
            </a>{" "}
            {b.status === "draft" && (
              <button
                onClick={() =>
                  api(`/orders/${order.id}/budgets/${b.revision}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "sent" }),
                  }).then(load)
                }
              >
                Marcar enviado
              </button>
            )}
            {b.status === "sent" && (
              <>
                <button
                  onClick={() =>
                    api(`/orders/${order.id}/budgets/${b.revision}/status`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: "approved" }),
                    }).then(load)
                  }
                >
                  Aprovar orçamento
                </button>
                <button
                  onClick={() =>
                    api(`/orders/${order.id}/budgets/${b.revision}/status`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: "refused" }),
                    }).then(load)
                  }
                >
                  Recusar
                </button>
              </>
            )}
          </p>
        ))
      ) : (
        <p>Nenhum orçamento criado.</p>
      )}
    </section>
  );
}
function PostSalePage() {
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
    load();
  };
  const removeCard = async () => {
    if (!removal || removing) return;
    setRemoving(true);
    try {
      await api(`/post-sales/${removal.id}`, { method: "DELETE" });
      setRows((current) => current.filter((row) => row.id !== removal.id));
      setRemoval(null);
    } catch (error) {
      setRemovalError(error instanceof Error ? error.message : "Não foi possível excluir o card.");
    } finally {
      setRemoving(false);
    }
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
        <label className="post-sale-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Buscar por cliente ou OS</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Buscar por cliente ou número da OS…" />
        </label>
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
            <article className="post-sale-card" key={row.id}>
              <header>
                <span className={`post-sale-avatar post-sale-avatar-${avatarTone(row.name)}`}>{row.name.trim().slice(0, 1).toUpperCase()}</span>
                <div className="post-sale-card-title">
                  <b>OS {row.number}</b>
                  <strong>{row.name}</strong>
                </div>
                <details className="post-sale-menu">
                  <summary aria-label={`Ações da OS ${row.number}`}><EllipsisVertical /></summary>
                  <div>
                    <button className="post-sale-delete" type="button" onClick={() => { setRemovalError(""); setRemoval({ id: row.id, number: row.number, name: row.name }); }}>
                      <Trash2 /> Excluir card
                    </button>
                  </div>
                </details>
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
            <h2 id="post-sale-delete-title">Excluir card de Pós-Venda?</h2>
            <p>
              A OS {removal.number} de {removal.name} deixará apenas esta lista de acompanhamento. A Ordem de Serviço, documentos e histórico de mensagens continuarão preservados.
            </p>
            {removalError && <p className="notice error">{removalError}</p>}
            <div className="actions">
              <button disabled={removing} onClick={() => { setRemovalError(""); setRemoval(null); }}>Cancelar</button>
              <button className="primary" disabled={removing} onClick={removeCard}>
                {removing ? "Excluindo…" : "Excluir card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function NotificationBell({ go }: any) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState<any>({ unread: 0, data: [] }),
    [push, setPush] = useState<"on" | "off" | "blocked" | "unsupported">("off");
  const syncPush = async () => {
    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPush("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPush("blocked");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    setPush((await registration.pushManager.getSubscription()) ? "on" : "off");
  };
  const load = () =>
    api("/notifications")
      .then(setData)
      .catch(() => {});
  useEffect(() => {
    load();
    void syncPush();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);
  const togglePush = async () => {
    if (push === "blocked" || push === "unsupported") return;
    const registration = await navigator.serviceWorker.ready;
    if (push === "on") {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api("/push/subscriptions", {
          method: "DELETE",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPush("off");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPush(permission === "denied" ? "blocked" : "off");
      return;
    }
    const config = await api("/push/configuration");
    if (!config.configured) return;
    const bytes = Uint8Array.from(
      atob(config.public_key.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    });
    await api("/push/subscriptions", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
    setPush("on");
  };
  const visit = async (n: any) => {
    if (!n.read_at)
      await api(`/notifications/${n.id}/read`, { method: "PATCH", body: "{}" });
    setOpen(false);
    if (n.url === "/post-sale") go("post-sale");
    else if (n.data?.service_order_id || n.url?.startsWith("/orders/"))
      go("orders", n.data?.service_order_id || +n.url.split("/").pop());
    else go("clients");
    load();
  };
  return (
    <div className="notification-wrap">
      <button
        className="bell"
        aria-label="Notificações"
        onClick={() => setOpen(!open)}
      >
        <Bell />
        {data.unread > 0 && <i>{data.unread}</i>}
      </button>
      {open && (
        <div className="notification-center">
          <div className="notification-push-toggle">
            <span>
              <b>Notificações no dispositivo</b>
              <small>
                {push === "blocked"
                  ? "Bloqueado nas configurações do dispositivo"
                  : push === "unsupported"
                    ? "Não disponível neste dispositivo"
                    : push === "on"
                      ? "Ativadas"
                      : "Desativadas"}
              </small>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={push === "on"}
              disabled={push === "blocked" || push === "unsupported"}
              onClick={() => void togglePush()}
            >
              {push === "on" ? "Ligado" : "Desligado"}
            </button>
          </div>
          <div>
            <b>Notificações</b>
            <button
              onClick={() =>
                api("/notifications/read-all", {
                  method: "PATCH",
                  body: "{}",
                }).then(load)
              }
            >
              Marcar todas como lidas
            </button>
          </div>
          {data.data.length ? (
            data.data.map((n: any) => (
              <button
                key={n.id}
                className={n.read_at ? "" : "unread"}
                onClick={() => visit(n)}
              >
                <b>{n.title}</b>
                <span>{n.description}</span>
                <small>{new Date(n.created_at).toLocaleString("pt-BR")}</small>
              </button>
            ))
          ) : (
            <p>Nenhuma notificação.</p>
          )}
        </div>
      )}
    </div>
  );
}
function PushSettings() {
  const [state, setState] = useState("Verificando…"),
    [configured, setConfigured] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator) && !("PushManager" in window)) {
      setState("Não suportadas");
      return;
    }
    setState(
      Notification.permission === "denied"
        ? "Bloqueadas pelo navegador"
        : Notification.permission === "granted"
          ? "Ativadas"
          : "Desativadas",
    );
    api("/push/configuration")
      .then((x) => setConfigured(x.configured))
      .catch(() => {});
  }, []);
  const activate = async () => {
    if (!configured) {
      setState("Desativadas — configure VAPID no servidor");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(
        permission === "denied" ? "Bloqueadas pelo navegador" : "Desativadas",
      );
      return;
    }
    const config = await api("/push/configuration");
    const registration = await navigator.serviceWorker.ready;
    const bytes = Uint8Array.from(
      atob(config.public_key.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    });
    await api("/push/subscriptions", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
    setState("Ativadas");
  };
  return (
    <section className="push-settings">
      <h2>Notificações neste dispositivo</h2>
      <p>
        Estado: <b>{state}</b>. A central interna funciona mesmo sem
        notificações do navegador.
      </p>
      <button className="primary" onClick={activate}>
        ATIVAR NOTIFICAÇÕES NESTE DISPOSITIVO
      </button>
    </section>
  );
}
function CatalogAdmin({ catalog, title }: any) {
  const [items, setItems] = useState<any[]>([]),
    [name, setName] = useState(""),
    [price, setPrice] = useState("0"),
    [category, setCategory] = useState("service"),
    [warranty, setWarranty] = useState(false),
    [term, setTerm] = useState(30),
    [unit, setUnit] = useState("days"),
    [edit, setEdit] = useState<any>();
  const service = catalog === "services";
  const load = () => api(`/catalogs/${catalog}?active=0`).then(setItems);
  useEffect(() => {
    void load();
  }, [catalog]);
  const create = async () => {
    await api(`/catalogs/${catalog}`, {
      method: "POST",
      body: JSON.stringify({
        name,
        active: true,
        ...(service
          ? {
              price_cents: Math.round(Number(price.replace(",", ".")) * 100),
              category,
              warranty_enabled: warranty,
              warranty_term: warranty ? term : null,
              warranty_unit: warranty ? unit : null,
            }
          : {}),
      }),
    });
    setName("");
    setPrice("0");
    setWarranty(false);
    setTerm(30);
    setUnit("days");
    load();
  };
  const saveEdit = async () => {
    await api(`/catalogs/${catalog}/${edit.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: edit.name,
        category: edit.category,
        price_cents: Math.round(
          Number(String(edit.price).replace(",", ".")) * 100,
        ),
        warranty_enabled: !!edit.warranty_enabled,
        warranty_term: edit.warranty_enabled ? +edit.warranty_term : null,
        warranty_unit: edit.warranty_enabled ? edit.warranty_unit : null,
      }),
    });
    setEdit(null);
    load();
  };
  const unitLabel = (u: string) =>
    u === "months" ? "meses" : u === "years" ? "anos" : "dias";
  return (
    <section className="form-card admin-list">
      <h2>{title}</h2>
      <div className="inline">
        <input
          aria-label="Nome / descrição"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome / descrição"
        />
        {service && (
          <>
            <input
              aria-label="Valor em R$"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Valor em R$"
            />
            <label className="field">
              <span>Tipo</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="service">Serviço</option>
                <option value="product">Produto</option>
              </select>
            </label>
          </>
        )}
        <button className="primary" onClick={create}>
          Adicionar
        </button>
      </div>
      {service && (
        <div className="form-grid">
          <label>
            <input
              type="checkbox"
              checked={warranty}
              onChange={(e) => setWarranty(e.target.checked)}
            />{" "}
            Garantia adicional
          </label>
          {warranty && (
            <>
              <Field
                label="Duração da garantia"
                value={term}
                onChange={(e: any) => setTerm(+e.target.value)}
              />
              <label className="field">
                <span>Unidade da garantia</span>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="days">Dias</option>
                  <option value="months">Meses</option>
                  <option value="years">Anos</option>
                </select>
              </label>
            </>
          )}
        </div>
      )}
      {items.map((x) => (
        <article>
          <div>
            <b>{x.name}</b>
            <small>
              {x.active ? "Ativo" : "Inativo"}
              {service
                ? ` · R$ ${(x.price_cents / 100).toFixed(2)} · ${x.category === "product" ? "Produto" : "Serviço"}`
                : ""}
              {service && x.warranty_enabled
                ? ` · Garantia ${x.warranty_term} ${unitLabel(x.warranty_unit)}`
                : ""}
            </small>
          </div>
          <button
            onClick={() =>
              service
                ? setEdit({
                    ...x,
                    price: (x.price_cents / 100).toFixed(2),
                    warranty_term: x.warranty_term || 30,
                    warranty_unit: x.warranty_unit || "days",
                  })
                : (() => {
                    const next = prompt("Nome", x.name);
                    if (next)
                      api(`/catalogs/${catalog}/${x.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ name: next }),
                      }).then(load);
                  })()
            }
          >
            Editar
          </button>
          <button
            onClick={() =>
              api(`/catalogs/${catalog}/${x.id}`, {
                method: "PATCH",
                body: JSON.stringify({ active: !x.active }),
              }).then(load)
            }
          >
            {x.active ? "Desativar" : "Reativar"}
          </button>
        </article>
      ))}
      {edit && (
        <div className="modal">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setEdit(null)}>
              <X />
            </button>
            <h2>Editar serviço/produto</h2>
            <Field
              label="Nome / descrição"
              value={edit.name}
              onChange={(e: any) => setEdit({ ...edit, name: e.target.value })}
            />
            <Field
              label="Valor em R$"
              value={edit.price}
              onChange={(e: any) => setEdit({ ...edit, price: e.target.value })}
            />
            <label className="field">
              <span>Tipo</span>
              <select
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              >
                <option value="service">Serviço</option>
                <option value="product">Produto</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!edit.warranty_enabled}
                onChange={(e) =>
                  setEdit({ ...edit, warranty_enabled: e.target.checked })
                }
              />{" "}
              Garantia adicional
            </label>
            {edit.warranty_enabled && (
              <>
                <Field
                  label="Duração da garantia"
                  value={edit.warranty_term}
                  onChange={(e: any) =>
                    setEdit({ ...edit, warranty_term: +e.target.value })
                  }
                />
                <label className="field">
                  <span>Unidade da garantia</span>
                  <select
                    value={edit.warranty_unit}
                    onChange={(e) =>
                      setEdit({ ...edit, warranty_unit: e.target.value })
                    }
                  >
                    <option value="days">Dias</option>
                    <option value="months">Meses</option>
                    <option value="years">Anos</option>
                  </select>
                </label>
              </>
            )}
            <div className="actions">
              <button onClick={() => setEdit(null)}>Cancelar</button>
              <button className="primary" onClick={saveEdit}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function UsersAdmin() {
  const [data, setData] = useState<any>({ users: { data: [] }, roles: [] }),
    [form, setForm] = useState<any>();
  const load = () => api("/users").then(setData);
  useEffect(() => {
    void load();
  }, []);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { ...form, role_id: +form.role_id, active: !!form.active };
    await api(form.id ? `/users/${form.id}` : "/users", {
      method: form.id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    setForm(null);
    load();
  };
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRAÇÃO"
        title="Usuários e Permissões"
        icon={Users}
        actions={
          <button
            className="primary"
            onClick={() =>
              setForm({
                name: "",
                login: "",
                email: "",
                role_id: data.roles[0]?.id,
                active: true,
                password: "",
                password_confirmation: "",
              })
            }
          >
            Novo usuário
          </button>
        }
      />
      <section className="panel admin-list">
        {data.users.data.map((u: any) => (
          <article>
            <div>
              <b>{u.name}</b>
              <small>
                {u.login} · {u.role.name} · {u.active ? "Ativo" : "Inativo"} ·
                criado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
              </small>
            </div>
            <button onClick={() => setForm({ ...u, role_id: u.role.id })}>
              Editar
            </button>
            <button
              onClick={() => {
                const p = prompt("Nova senha forte (mínimo 12 caracteres)");
                if (p)
                  api(`/users/${u.id}/password`, {
                    method: "PUT",
                    body: JSON.stringify({
                      password: p,
                      password_confirmation: p,
                    }),
                  });
              }}
            >
              Redefinir senha
            </button>
          </article>
        ))}
      </section>
      {form && (
        <div className="modal">
          <form className="modal-card users-admin-modal" onSubmit={save}>
            <h2>{form.id ? "Editar usuário" : "Novo usuário"}</h2>
            {["name", "login", "email"].map((k) => (
              <Field
                label={
                  k === "name" ? "Nome" : k === "login" ? "Login" : "E-mail"
                }
                value={form[k] || ""}
                onChange={(e: any) => setForm({ ...form, [k]: e.target.value })}
              />
            ))}
            <label className="field">
              <span>Perfil</span>
              <select
                value={form.role_id}
                onChange={(e) => setForm({ ...form, role_id: e.target.value })}
              >
                {data.roles.map((r: any) => (
                  <option value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />{" "}
              Usuário ativo
            </label>
            {!form.id && (
              <>
                <Field
                  label="Senha forte"
                  value={form.password}
                  onChange={(e: any) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                <Field
                  label="Confirmar senha"
                  value={form.password_confirmation}
                  onChange={(e: any) =>
                    setForm({ ...form, password_confirmation: e.target.value })
                  }
                />
              </>
            )}
            <div className="actions">
              <button type="button" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button className="primary">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
function StorageAdmin({ role }: any) {
  const [s, setS] = useState<any>(),
    [filter, setFilter] = useState("older_1"),
    [preview, setPreview] = useState<any>();
  const load = () => api("/storage/statistics").then(setS);
  useEffect(() => {
    void load();
  }, []);
  const human = (n: number) =>
    n >= 1073741824
      ? (n / 1073741824).toFixed(2) + " GB"
      : n >= 1048576
        ? (n / 1048576).toFixed(2) + " MB"
        : (n / 1024).toFixed(1) + " KB";
  const inspect = () =>
    api("/storage/photos/preview", {
      method: "POST",
      body: JSON.stringify({ filter }),
    }).then(setPreview);
  const purge = async () => {
    const confirmation =
      filter === "all" ? "EXCLUIR TODAS AS FOTOS" : "EXCLUIR FOTOS";
    if (prompt(`Digite ${confirmation}`) !== confirmation) return;
    await api("/storage/photos", {
      method: "DELETE",
      body: JSON.stringify({ filter, confirmation }),
    });
    setPreview(null);
    load();
  };
  if (!s) return <div className="state">Carregando armazenamento…</div>;
  return (
    <section className="form-card admin-list">
      <h2>Fotos e Armazenamento</h2>
      <div className="finance-cards">
        <article>
          <small>Fotos</small>
          <strong>{s.photo_count}</strong>
        </article>
        <article>
          <small>Espaço em fotos</small>
          <strong>{human(s.photo_bytes)}</strong>
        </article>
        <article>
          <small>Média</small>
          <strong>{human(s.average_bytes)}</strong>
        </article>
        <article>
          <small>OS com fotos</small>
          <strong>{s.orders_with_photos}</strong>
        </article>
        <article>
          <small>Arquivos privados</small>
          <strong>{human(s.private_bytes)}</strong>
        </article>
        {s.disk_free_bytes !== null && (
          <article>
            <small>Livre no servidor</small>
            <strong>{human(s.disk_free_bytes)}</strong>
          </article>
        )}
      </div>
      {role === "Master" && (
        <>
          <div className="inline">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Todas as fotos</option>
              <option value="older_1">Mais antigas que 1 ano</option>
              <option value="older_2">Mais antigas que 2 anos</option>
              <option value="older_3">Mais antigas que 3 anos</option>
            </select>
            <button onClick={inspect}>Calcular limpeza</button>
          </div>
          {preview && (
            <div className="alert">
              Serão excluídas {preview.count} fotos ({human(preview.bytes)}).{" "}
              <button onClick={purge}>Continuar com confirmação forte</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
function ChecklistAdmin() {
  const [equipment, setEquipment] = useState<any[]>([]),
    [type, setType] = useState(0),
    [items, setItems] = useState<any[]>([]),
    [label, setLabel] = useState("");
  useEffect(() => {
    api("/catalogs/equipment?active=0").then((x: any[]) => {
      setEquipment(x);
      setType(x[0]?.id || 0);
    });
  }, []);
  const load = () => {
    if (type)
      void api(`/catalogs/checklist?active=0&equipment_type_id=${type}`).then(
        setItems,
      );
  };
  useEffect(() => {
    void load();
  }, [type]);
  const create = async () => {
    await api("/catalogs/checklist/options", {
      method: "POST",
      body: JSON.stringify({
        equipment_type_id: type,
        label,
        allows_note: label.trim().toLowerCase() === "outro",
        position: items.length,
      }),
    });
    setLabel("");
    load();
  };
  return (
    <section className="form-card admin-list">
      <h2>Checklist de Entrada</h2>
      <select value={type} onChange={(e) => setType(+e.target.value)}>
        {equipment.map((x) => (
          <option value={x.id}>{x.name}</option>
        ))}
      </select>
      <div className="inline">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nova opção"
        />
        <button className="primary" onClick={create}>
          Adicionar
        </button>
      </div>
      {items.map((x) => (
        <article>
          <b>{x.label}</b>
          <button
            onClick={() =>
              api(`/catalogs/checklist/options/${x.id}`, {
                method: "PATCH",
                body: JSON.stringify({ active: !x.active }),
              }).then(load)
            }
          >
            {x.active ? "Desativar" : "Reativar"}
          </button>
        </article>
      ))}
    </section>
  );
}
function AdminCatalogs({ role }: any) {
  return (
    <>
      <StorageAdmin role={role} />
    </>
  );
}
function MobileBottomBar({ go, page }: any) {
  return (
    <nav
      className="arl-global-mobile-nav"
      aria-label="Navegação Mobile / Tablet"
    >
      <button
        type="button"
        className={page === "dashboard" ? "active" : ""}
        onClick={() => go("dashboard")}
      >
        <ClipboardList />
        <span>OS abertas</span>
      </button>
      <button
        type="button"
        className="primary-shortcut"
        onClick={() => go("new")}
      >
        <Plus />
        <span>Nova OS</span>
      </button>
      <button
        type="button"
        className={page === "clients" ? "active" : ""}
        onClick={() => go("clients")}
      >
        <Users />
        <span>Clientes</span>
      </button>
    </nav>
  );
}
function App() {
  const [layout, setLayout] = useState<"desktop" | "mobile">(() =>
    localStorage.getItem("arl-layout-mode") === "mobile" ? "mobile" : "desktop",
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("arl-sidebar-collapsed") === "true",
  );
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [navSummary, setNavSummary] = useState({
    open_orders: 0,
    available_post_sales: 0,
  });
  useEffect(() => {
    document.documentElement.dataset.layout = layout;
    localStorage.setItem("arl-layout-mode", layout);
  }, [layout]);
  useEffect(
    () =>
      localStorage.setItem("arl-sidebar-collapsed", String(sidebarCollapsed)),
    [sidebarCollapsed],
  );
  const [me, setMe] = useState<any>();
  useEffect(() => {
    api("/me")
      .then((user) => {
        setMe(user);
        setSidebarPinned(Boolean(user.sidebar_pinned));
        if (user.sidebar_pinned) setSidebarCollapsed(false);
      })
      .catch(() => {});
  }, []);
  const toggleSidebarPinned = async () => {
    const next = !sidebarPinned;
    setSidebarPinned(next);
    if (next) setSidebarCollapsed(false);
    try {
      const saved = await api("/me/sidebar", {
        method: "PATCH",
        body: JSON.stringify({ sidebar_pinned: next }),
      });
      setSidebarPinned(Boolean(saved.sidebar_pinned));
    } catch (error: any) {
      setSidebarPinned(!next);
      window.alert(error.message || "Não foi possível salvar a preferência do menu.");
    }
  };
  const orderPath = location.pathname.match(/^\/orders\/(\d+)$/),
    initialOrderId = orderPath ? Number(orderPath[1]) : undefined;
  const pathPage = (
    {
      dashboard: "dashboard",
      orders: "orders",
      clients: "clients",
      new: "new",
      finance: "finance",
      "post-sale": "post-sale",
      settings: "settings",
      services: "services",
      products: "products",
      users: "users",
    } as Record<string, Page>
  )[location.pathname.replace(/^\//, "")];
  const [orderAction, setOrderAction] = useState<
    "edit" | "reopen" | undefined
  >();
  const [page, setPage] = useState<Page>(() =>
    initialOrderId ? "orders" : pathPage || "dashboard",
  );
  const [detail, setDetail] = useState<number | undefined>(initialOrderId);
  const [clientHistoryOrigin, setClientHistoryOrigin] = useState<{
    clientId: number;
    orderId: number;
  }>();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileQuickEntry, setMobileQuickEntry] = useState(false);
  const mobileLayout = layout === "mobile";
  const canAdminister = me?.role === "Master" || me?.role === "Administrador";
  const loadNavigationSummary = () =>
    api("/navigation-summary")
      .then(setNavSummary)
      .catch(() => undefined);
  useEffect(() => {
    if (me) void loadNavigationSummary();
  }, [me, page, detail]);
  const logout = async () => {
    await fetch("/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN":
          document.querySelector<HTMLMetaElement>('meta[name=\"csrf-token\"]')
            ?.content || "",
      },
    });
    location.assign("/login");
  };
  const go = (p: Page, id?: number, action?: "edit" | "reopen") => {
    setOrderAction(action);
    if (p === "desk") p = "dashboard";
    setClientHistoryOrigin(undefined);
    setPage(p);
    setDetail(id);
    setMobileMenu(false);
    history.replaceState(
      null,
      "",
      id ? `/orders/${id}` : p === "dashboard" ? "/" : `/${p}`,
    );
  };
  useEffect(() => {
    const openOrder = (event: Event) =>
      go("orders", (event as CustomEvent<number>).detail);
    window.addEventListener("arl-open-order", openOrder);
    return () => window.removeEventListener("arl-open-order", openOrder);
  }, [mobileLayout]);
  const roleAllowed = (p: Page) =>
    p === "users"
      ? me?.role === "Master"
      : ["finance", "services", "products", "settings"].includes(p)
        ? me?.role === "Master" || me?.role === "Administrador"
        : true;
  useEffect(() => {
    if (me && !roleAllowed(page)) {
      setPage("dashboard");
      setDetail(undefined);
      if (mobileLayout) history.replaceState(null, "", "/");
    }
  }, [me, page, mobileLayout, detail]);
  const groups = [
    {
      label: "Operação",
      items: [
        ["Painel", "dashboard", LayoutDashboard],
        ["Ordens", "orders", ClipboardList],
      ],
    },
    {
      label: "Cadastros",
      items: [
        ["Clientes", "clients", Users],
        ["Serviços", "services", Box],
        ["Produtos", "products", PackageSearch],
      ],
    },
    {
      label: "Gestão",
      items: [
        ["Financeiro", "finance", Wallet],
        ["Pós-Venda", "post-sale", Phone],
      ],
    },
    {
      label: "Administração",
      items: [
        ["Usuários", "users", Users],
        ["Configurações", "settings", Settings],
      ],
    },
  ] as const;
  return (
    <div
      className={`shell layout-${layout}${sidebarCollapsed && !sidebarPinned ? " sidebar-collapsed" : ""}${sidebarPinned ? " sidebar-pinned" : ""}`}
    >
      <aside
        className={mobileMenu ? "open" : ""}
        onMouseMove={() => {
          if (!mobileLayout && !sidebarPinned && sidebarCollapsed) setSidebarCollapsed(false);
        }}
        onMouseLeave={() => {
          if (!mobileLayout && !sidebarPinned && !sidebarCollapsed) setSidebarCollapsed(true);
        }}
      >
        <button
          className="close"
          aria-label="Fechar menu"
          onClick={() => setMobileMenu(false)}
        >
          <X />
        </button>
        <div className="sidebar-brand">
          <div className="logo brand-logo">
            <img
              src="/api/settings/logo/menu"
              alt="ARL Informática"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/arl-assets/arl.svg";
              }}
            />
          </div>
        </div>
        <button
          type="button"
          className={`new-order-shortcut${page === "new" ? " active" : ""}`}
          onClick={() => go("new")}
          title="Nova OS"
        >
          <Plus />
          <span>Nova OS</span>
        </button>
        <nav aria-label="Menu principal">
          {groups.map((group) => {
            const items = group.items.filter(([, p]) => roleAllowed(p));
            return items.length ? (
              <section className="nav-group" key={group.label}>
                <h2>{group.label}</h2>
                {items.map(([name, p, Icon]) => {
                  const count =
                    p === "orders"
                      ? navSummary.open_orders
                      : p === "post-sale"
                        ? navSummary.available_post_sales
                        : undefined;
                  return (
                    <button
                      type="button"
                      key={name}
                      aria-label={name}
                      className={page === p ? "active" : ""}
                      onClick={() => go(p)}
                      title={name}
                    >
                      <span className="nav-icon">
                        <Icon />
                        {count !== undefined && (
                          <i className="nav-count">{count}</i>
                        )}
                      </span>
                      <span className="nav-label">{name}</span>
                      {count !== undefined && (
                        <span className="nav-badge">{count}</span>
                      )}
                    </button>
                  );
                })}
              </section>
            ) : null;
          })}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className={`sidebar-pin-toggle${sidebarPinned ? " active" : ""}`}
            aria-label={sidebarPinned ? "Desfixar menu lateral" : "Fixar menu lateral"}
            aria-pressed={sidebarPinned}
            title={sidebarPinned ? "Desfixar menu lateral" : "Fixar menu lateral"}
            onClick={() => void toggleSidebarPinned()}
          >
            <Pin aria-hidden="true" />
            <span>{sidebarPinned ? "Menu fixado" : "Fixar menu"}</span>
          </button>
          <div className="profile">
            <div>
              <b>{me?.name || "ARL Informática"}</b>
              <small>{me?.role || "Operação"}</small>
            </div>
            <button
              type="button"
              aria-label="Sair"
              title="Sair"
              onClick={() => void logout()}
            >
              <LogOut />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>
      <main
        data-arl-orders-react={!detail && page === "orders" ? "1" : undefined}
        data-arl-new-order-react={!detail && page === "new" ? "1" : undefined}
        data-arl-settings-react={
          !detail && page === "settings" ? "1" : undefined
        }
        data-arl-dashboard-react={
          !detail && page === "dashboard" ? "1" : undefined
        }
        data-arl-post-sale-react={
          !detail && page === "post-sale" ? "1" : undefined
        }
      >
        <header className="app-head">
          <button
            className="menu-toggle"
            aria-label="Abrir menu"
            onClick={() => setMobileMenu(true)}
          >
            <Menu />
          </button>
          <div className="mobile-logo">
            <strong>
              {mobileLayout && page === "dashboard" && !detail
                ? "OS abertas"
                : "ARL"}
            </strong>
          </div>
          {mobileLayout && canAdminister && page === "dashboard" && !detail && (
            <button
              type="button"
              className="mobile-quick-entry"
              aria-label="Abrir Entrada Rápida"
              onClick={() => setMobileQuickEntry(true)}
            >
              <Wallet />
            </button>
          )}
          <label className="device-layout">
            Layout{" "}
            <select
              aria-label="Layout neste dispositivo"
              value={layout}
              onChange={(e) =>
                setLayout(e.target.value as "desktop" | "mobile")
              }
            >
              <option value="desktop">Web / PC</option>
              <option value="mobile">Mobile / Tablet</option>
            </select>
          </label>
          <NotificationBell go={go} />
        </header>
        {detail ? (
          <OrderDetailPage
            key={`${detail}-${orderAction || "view"}`}
            initialAction={orderAction}
            id={detail}
            readOnly={mobileLayout}
            back={() => go("dashboard")}
            onOpenClientHistory={
              mobileLayout
                ? undefined
                : (clientId: number) => {
                    setClientHistoryOrigin({ clientId, orderId: detail });
                    setDetail(undefined);
                    setPage("clients");
                  }
            }
          />
        ) : page === "dashboard" ? (
          <Dashboard go={go} role={me?.role} mobileLayout={mobileLayout} />
        ) : page === "orders" ? (
          <Orders open={go} role={me?.role} />
        ) : page === "clients" ? (
          <Clients
            role={me?.role}
            initialClientId={clientHistoryOrigin?.clientId}
            onHistoryClose={
              clientHistoryOrigin
                ? () => go("orders", clientHistoryOrigin.orderId)
                : undefined
            }
            openOrder={(id: number) => go("orders", id)}
          />
        ) : page === "finance" ? (
          <FinancePage
            role={me?.role}
            openOrder={(id: number) => go("orders", id)}
          />
        ) : page === "post-sale" ? (
          <PostSalePage />
        ) : page === "services" ? (
          <ServicesCatalogPage />
        ) : page === "products" ? (
          <ProductsCatalogPage />
        ) : page === "users" ? (
          <UsersAdmin />
        ) : page === "settings" ? (
          <SettingsPage role={me?.role} />
        ) : (
          <NewOrder done={(id: number) => go("orders", id)} />
        )}
      </main>
      {mobileLayout && <MobileBottomBar go={go} page={page} />}
      <QuickEntry
        open={mobileQuickEntry}
        onClose={() => setMobileQuickEntry(false)}
      />
    </div>
  );
}
if ("serviceWorker" in navigator)
  window.addEventListener("load", () => {
    const manifest = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    );
    const workerUrl = new URL("./sw.js", manifest?.href || document.baseURI);
    navigator.serviceWorker
      .register(workerUrl, { scope: "./" })
      .catch(() => undefined);
  });
createRoot(document.getElementById("root")!).render(<App />);
