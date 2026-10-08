import { completedRequest, safeAuxiliary } from './cache-requests';

export type Page =
  | "dashboard"
  | "desk"
  | "orders"
  | "clients"
  | "new"
  | "finance"
  | "expense-control"
  | "post-sale"
  | "settings"
  | "services"
  | "suppliers"
  | "products"
  | "users";

export type Client = {
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

export type Order = {
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
  closing_reference_cents?: number | null;
  closing_marked_at?: string | null;
  closing_marked_by?: { id: number; name: string } | null;
};

export type Catalog = {
  id: number;
  name: string;
  price_cents?: number;
  free_price?: boolean;
  category?: string;
  warranty_enabled?: boolean;
  warranty_term?: number | null;
  warranty_unit?: string | null;
  stock_quantity?: number;
};

export type Errors = Record<string, string[]>;

export const emptyClient = {
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

export const requestApi = async (url: string, options: RequestInit = {}) => {
  const token = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  )?.content;
  const r = await fetch("/api" + url, {
    credentials: "same-origin",
    ...options,
    headers: (() => {
      const headers = new Headers(options.headers);
      if (!headers.has('Accept')) headers.set('Accept', 'application/json');
      if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      if (token) headers.set('X-CSRF-TOKEN', token);
      return headers;
    })(),
  });
  const json = await r
    .json()
    .catch(() => ({ message: "Resposta inválida do servidor." }));
  completedRequest(url, options, r.status);
  if (!r.ok)
    throw Object.assign(
      new Error(json.message || "Não foi possível concluir."),
      { errors: json.errors, code: json.code, open_orders: json.open_orders },
    );
  return json;
};

export const api = (url: string, options: RequestInit = {}) => safeAuxiliary(url, options, () => requestApi(url, options));

export const digits = (value: unknown) =>
  typeof value === "string" ? value.replace(/\D/g, "") : "";

export const masks = {
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

export const formatCompanySettings = (data: any) => ({
  ...data,
  cnpj: masks.document(data.cnpj || ""),
  phone: masks.phone(data.phone || ""),
  postal_code: masks.cep(data.postal_code || ""),
});

export const serializeCompanySettings = (data: any) => ({
  ...data,
  cnpj: String(data.cnpj || "").replace(/\D/g, ""),
  phone: String(data.phone || "").replace(/\D/g, ""),
  postal_code: String(data.postal_code || "").replace(/\D/g, ""),
});

export function Field({ label, name, value, onChange, error, required = false, spellCheck = false, type = "text" }: any) {
  return (
    <label className="field">
      <span>
        {label}
        {required && " *"}
      </span>
      <input type={type} name={name} value={value} onChange={onChange} spellCheck={spellCheck} />
      {error && <small>{error}</small>}
    </label>
  );
}

export const status: any = {
  analysis: "Em Análise",
  waiting_part: "Aguardando Peça",
  in_service: "Em Serviço",
  completed: "Concluído",
  interrupted: "Interrompido",
  awaiting_payment: "Aguardando PGTO",
  paid: "Pago",
};

export const money = (c: number = 0) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

export const formatBrasiliaDateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).format(new Date(value));

export const expenseCategoryLabel = (category?: string | null) =>
  category === "merchandise_purchase"
    ? "Compra de mercadoria"
    : category === "usage_material"
      ? "Material de uso"
      : "Sem categoria";

export const financeMethodLabel = (method?: string | null) =>
  ({ cash: "Dinheiro", pix: "Pix", debit: "Débito", credit: "Crédito", transfer: "Transferência", other: "Outro" } as Record<string, string>)[method || ""] || "Não informada";

export const movementTitle = (row: any) =>
  row.kind === "refund"
    ? `Estorno da OS #${row.order_number || "—"}`
    : row.kind === "expense"
      ? "Despesa"
      : row.kind === "service_order"
        ? `Entrada de OS #${row.order_number || "—"}`
        : row.kind === "quick_entry"
          ? "Entrada rápida"
          : "Ajuste financeiro";

export const formatOptionalDate = (value: unknown, fallback = "—") => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

export const brazilianDate = (date: string) => {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
};
