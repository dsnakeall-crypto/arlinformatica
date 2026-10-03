import SupplierWorkspace from './supplier-workspace';
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Mail,
  PackageCheck,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import PageHeader from "./page-header";
import PurchasePayments from "./supplier-purchase-payments";
import OrderPopup from "./order-popup";
import { centsFromMoneyInput, maskMoneyInput } from "./money-input";
import "../css/suppliers.css";

type Supplier = {
  id: number;
  name: string;
  trade_name: string | null;
  document: string | null;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  landline: string | null;
  email: string | null;
  postal_code: string | null;
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  complement: string | null;
  notes: string | null;
  active: boolean;
  purchase_count?: number;
  last_purchase_on?: string | null;
};
type SupplierDraft = Omit<
  Supplier,
  "id" | "purchase_count" | "last_purchase_on"
> & { id?: number };
type Product = {
  id: number;
  name: string;
  price_cents: number;
  stock_quantity: number;
  active: boolean;
};
type Item = {
  lot?: string | null;
  id: number;
  product_id: number;
  description: string;
  quantity: number;
  received_quantity: number;
  unit_cost_cents: number;
};
type Purchase = {
  id: number;
  supplier_id: number;
  status: string;
  purchased_on: string;
  expected_on: string | null;
  reference: string | null;
  total_cents: number;
  notes: string | null;
  cancellation_reason: string | null;
  supplier_snapshot: Supplier;
  items: Item[];
  open_amount_cents?: number;
  paid_amount_cents?: number;
  payable_count?: number;
  next_due_on?: string | null;
  payment_terms: string | null;
  payment_method: string | null;
  installments: Payable[];
  invoices: { id: number; original_name: string; bytes: number }[];
  receipts: {
    id: number;
    received_on: string;
    user_name: string;
    notes: string | null;
    items: { description: string; quantity: number }[];
  }[];
};
type Detail = {
  supplier: Supplier;
  purchases: { data: Purchase[]; current_page: number; last_page: number };
  products: {
    product_id: number;
    name: string;
    received_quantity: number;
    received_value_cents: number;
    stock_quantity: number;
  }[];
};
type Payable = {
  id: number;
  installment: number;
  amount_cents: number;
  due_on: string;
  paid_on: string | null;
  paid_method: string | null;
  voided_at: string | null;
  void_reason: string | null;
};
const paymentMethods: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  bank_transfer: "Transferência bancária",
  boleto: "Boleto",
  debit_card: "Cartão de débito",
  credit_card: "Cartão de crédito",
  cheque: "Cheque",
  other: "Outro",
};
const paymentTerms: Record<string, string> = {
  cash: "À vista",
  deferred: "A prazo (parcela única)",
  installments: "Parcelada",
  duplicata: "Duplicata / títulos",
};
const phoneMask = (value: string, fixed = false) => {
  const n = value.replace(/\D/g, "").slice(0, fixed ? 10 : 11);
  if (n.length <= 2) return n;
  const cut = fixed ? 6 : 7;
  return `(${n.slice(0, 2)}) ${n.slice(2, cut)}${n.length > cut ? "-" + n.slice(cut) : ""}`;
};
const documentMask = (value: string) => {
  const n = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 14);
  if (n.length <= 11 && !/[A-Z]/.test(n))
    return n
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3}\.\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3}\.\d{3}\.\d{3})(\d)/, "$1-$2");
  return n
    .replace(/^(.{2})(.)/, "$1.$2")
    .replace(/^(.{6})(.)/, "$1.$2")
    .replace(/^(.{10})(.)/, "$1/$2")
    .replace(/^(.{15})(.)/, "$1-$2");
};
const money = (value = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value) / 100,
  );
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const date = (value?: string | null) =>
  value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
const purchaseNumber = (id: number) => `Compra #${String(id).padStart(6, "0")}`;
const statuses: Record<string, string> = {
  pending: "Aguardando recebimento",
  partially_received: "Recebido parcialmente",
  received: "Recebido",
  cancelled: "Pendente cancelado",
};
const blankSupplier = (): SupplierDraft => ({
  name: "",
  trade_name: "",
  document: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  landline: "",
  email: "",
  postal_code: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
  complement: "",
  notes: "",
  active: true,
});
async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      "X-CSRF-TOKEN":
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
          ?.content || "",
      ...options.headers,
    },
  });
  const body = await response
    .json()
    .catch(() => ({ message: "Não foi possível ler a resposta do servidor." }));
  if (!response.ok)
    throw new Error(
      String(
        body.errors
          ? Object.values(body.errors).flat()[0]
          : body.message || "Não foi possível concluir a operação.",
      ),
    );
  return body;
}
const errorMessage = (reason: unknown) =>
  reason instanceof Error
    ? reason.message
    : "Não foi possível concluir a operação.";
function Badge({ status }: { status: string }) {
  return (
    <span className={`supplier-badge ${status}`}>
      {statuses[status] || status}
    </span>
  );
}
function Pager({
  current,
  last,
  change,
}: {
  current: number;
  last: number;
  change: (page: number) => void;
}) {
  return last > 1 ? (
    <nav className="supplier-pager" aria-label="Paginação">
      <button disabled={current <= 1} onClick={() => change(current - 1)}>
        <ChevronLeft />
        Anterior
      </button>
      <span>
        Página {current} de {last}
      </span>
      <button disabled={current >= last} onClick={() => change(current + 1)}>
        Próxima
        <ChevronRight />
      </button>
    </nav>
  ) : null;
}
function SupplierForm({
  draft: initial,
  close,
  saved,
}: {
  draft: SupplierDraft;
  close: () => void;
  saved: (supplier: Supplier) => void;
}) {
  const [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [cepNote, setCepNote] = useState("");
  const [documentNote, setDocumentNote] = useState("");
  const documentRequest = useRef(0);
  const documentValue = (draft.document || "").replace(/[^a-zA-Z0-9]/g, "");
  useEffect(() => {
    documentRequest.current++;
    setDocumentNote("");
  }, [documentValue]);
  const cep = (draft.postal_code || "").replace(/\D/g, "");
  useEffect(() => {
    if (cep.length !== 8) return;
    const controller = new AbortController();
    let live = true;
    const timer = setTimeout(async () => {
      setCepNote("Consultando CEP…");
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const address = await response.json();
        if (!live) return;
        if (address.erro) {
          setCepNote("CEP não encontrado. Confira ou preencha manualmente.");
          return;
        }
        setDraft((current) => ({
          ...current,
          street: address.logradouro || current.street,
          district: address.bairro || current.district,
          city: address.localidade,
          state: address.uf,
        }));
        setCepNote("Endereço preenchido. Informe o número e confira os dados.");
      } catch {
        if (live)
          setCepNote("Consulta indisponível. Preencha o endereço manualmente.");
      }
    }, 450);
    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [cep]);
  const initialValue = useRef(JSON.stringify(initial));
  const dismiss = () => {
    if (
      !busy &&
      (JSON.stringify(draft) === initialValue.current ||
        window.confirm("Descartar as alterações do fornecedor?"))
    )
      close();
  };
  const fields = (
    key: keyof SupplierDraft,
    label: string,
    type = "text",
    required = false,
    max = 255,
  ) => (
    <label>
      <span>
        {label}
        {required && <em> *</em>}
      </span>
      <input
        type={type}
        required={required}
        maxLength={max}
        value={
          key === "document"
            ? documentMask(String(draft[key] ?? ""))
            : ["phone", "whatsapp", "landline"].includes(key)
              ? phoneMask(String(draft[key] ?? ""), key === "landline")
              : String(draft[key] ?? "")
        }
        onChange={(e) => {
          const value = e.target.value;
          setDraft({
            ...draft,
            [key]:
              key === "document"
                ? value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 14)
                : ["phone", "whatsapp", "landline", "postal_code"].includes(key)
                  ? value
                      .replace(/\D/g, "")
                      .slice(
                        0,
                        key === "postal_code"
                          ? 8
                          : key === "landline"
                            ? 10
                            : 11,
                      )
                  : value,
          });
        }}
        pattern={
          key === "phone" || key === "whatsapp"
            ? "\\([1-9][0-9]\\) 9[0-9]{4}-[0-9]{4}"
            : key === "landline"
              ? "\\([1-9][0-9]\\) [2-5][0-9]{3}-[0-9]{4}"
              : undefined
        }
      />
    </label>
  );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      saved(
        await api(initial.id ? `/suppliers/${initial.id}` : "/suppliers", {
          method: initial.id ? "PUT" : "POST",
          body: JSON.stringify(draft),
        }),
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <OrderPopup
      variant="editor"
      title={initial.id ? "Editar fornecedor" : "Novo fornecedor"}
      eyebrow="CADASTRO · FORNECEDORES"
      description="Organize os dados comerciais e os contatos do seu parceiro."
      icon={Building2}
      onClose={dismiss}
    >
      <form className="supplier-form" onSubmit={submit}>
        <div className="supplier-form-body">
          <section>
            <h3>Identificação</h3>
            <div className="supplier-form-grid">
              {fields("name", "Razão social / nome completo", "text", true)}
              {fields("trade_name", "Nome fantasia", "text", true)}
              {fields("document", "CPF / CNPJ", "text", true, 18)}
              {fields("contact_name", "Pessoa de contato")}
            </div>
          </section>
          <section>
            <p className="supplier-help">
              Os dígitos do documento são validados ao salvar. A existência e a
              situação cadastral exigem consulta à Receita.{" "}
              <a
                href="https://www.gov.br/pt-br/servicos/consultar-cadastro-de-pessoas-fisicas"
                target="_blank"
                rel="noreferrer"
              >
                Consultar CPF
              </a>{" "}
              ·{" "}
              <a
                href="https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp"
                target="_blank"
                rel="noreferrer"
              >
                Consultar CNPJ
              </a>
            </p>
            <button
              type="button"
              disabled={busy || !documentValue}
              onClick={async () => {
                const sequence = ++documentRequest.current;
                setDocumentNote("Consultando cadastro…");
                try {
                  const result = await api("/supplier-document/lookup", {
                    method: "POST",
                    body: JSON.stringify({ document: documentValue }),
                  });
                  if (sequence !== documentRequest.current) return;
                  setDocumentNote(
                    result.status === "found"
                      ? `${result.name} · Situação: ${result.registration_status}. ${result.message}`
                      : result.message,
                  );
                } catch (e) {
                  if (sequence === documentRequest.current)
                    setDocumentNote(errorMessage(e));
                }
              }}
            >
              Verificar documento
            </button>
            <p className="supplier-help" role="status">
              {documentNote}
            </p>
            <h3>Contato</h3>
            <div className="supplier-form-grid">
              {fields("phone", "Telefone celular", "tel", true, 16)}
              {fields("whatsapp", "WhatsApp", "tel", true, 16)}
              {fields("landline", "Telefone fixo (opcional)", "tel", false, 15)}
              {fields("email", "E-mail", "email")}
              <button
                type="button"
                onClick={() => setDraft({ ...draft, whatsapp: draft.phone })}
              >
                Usar celular no WhatsApp
              </button>
            </div>
          </section>
          <section>
            <h3>Endereço</h3>
            <div className="supplier-form-grid">
              {fields("postal_code", "CEP", "text", true, 9)}
              {fields("street", "Rua / avenida", "text", true)}
              {fields("number", "Número", "text", true, 30)}
              {fields("district", "Bairro", "text", true)}
              {fields("city", "Cidade", "text", true)}
              <label>
                <span>UF *</span>
                <select
                  required
                  aria-label="UF"
                  value={draft.state || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, state: e.target.value })
                  }
                >
                  <option value="">Selecione</option>
                  {"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO"
                    .split(" ")
                    .map((uf) => (
                      <option key={uf}>{uf}</option>
                    ))}
                </select>
              </label>
              {fields("complement", "Complemento")}
              <p className="supplier-help" role="status">
                {cepNote}
              </p>
            </div>
          </section>
          <label>
            <span>Observações</span>
            <textarea
              maxLength={5000}
              value={draft.notes || ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Condições comerciais, horários de atendimento ou outras informações."
            />
          </label>
          {initial.id && (
            <label className="supplier-check">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.checked })
                }
              />
              Fornecedor ativo
              <small>
                Inativar preserva compras e recebimentos anteriores.
              </small>
            </label>
          )}
          {error && (
            <div role="alert" className="supplier-error">
              {error}
            </div>
          )}
        </div>
        <footer className="arl-3d-footer">
          <button type="button" disabled={busy} onClick={dismiss}>
            Cancelar
          </button>
          <button className="arl-3d-primary" disabled={busy}>
            <Check />
            {busy ? "Salvando…" : "Salvar fornecedor"}
          </button>
        </footer>
      </form>
    </OrderPopup>
  );
}
function PurchaseForm({
  supplier,
  close,
  saved,
}: {
  supplier: Supplier;
  close: () => void;
  saved: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]),
    [query, setQuery] = useState(""),
    [rows, setRows] = useState<
      { product: Product; quantity: number; cost: string; lot?: string }[]
    >([]);
  const [purchasedOn, setPurchasedOn] = useState(today),
    [expectedOn, setExpectedOn] = useState(""),
    [reference, setReference] = useState(""),
    [notes, setNotes] = useState(""),
    [receivedNow, setReceivedNow] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [newProduct, setNewProduct] = useState(false),
    [newName, setNewName] = useState(""),
    [salePrice, setSalePrice] = useState("");
  const [terms, setTerms] = useState("cash"),
    [method, setMethod] = useState("pix"),
    [count, setCount] = useState(1),
    [firstDue, setFirstDue] = useState(today),
    [paidNow, setPaidNow] = useState(false),
    [paidOn, setPaidOn] = useState(today);
  const [customDates, setCustomDates] = useState<Record<number, string>>({}),
    [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});
  const [invoice, setInvoice] = useState<File | null>(null);
  const createdPurchase = useRef<number | null>(null);
  const [committed, setCommitted] = useState(false);
  const invoiceKey = useRef(crypto.randomUUID());
  const requestKey = useRef(crypto.randomUUID());
  useEffect(() => {
    api("/catalogs/products")
      .then(setProducts)
      .catch((reason) => setError(errorMessage(reason)));
  }, []);
  const add = (product: Product) => {
    if (!rows.some((row) => row.product.id === product.id))
      setRows([...rows, { product, quantity: 1, cost: "" }]);
    setQuery("");
  };
  const dismiss = () => {
    if (!busy && createdPurchase.current) {
      if (
        window.confirm(
          "A compra já foi registrada. Fechar sem anexar a nota? Você pode anexá-la depois na ficha.",
        )
      )
        saved();
      return;
    }
    if (
      !busy &&
      (!(rows.length || reference || notes || newName) ||
        window.confirm("Descartar esta compra ainda não registrada?"))
    )
      close();
  };
  const createProduct = async () => {
    if (busy || !newName.trim() || !salePrice.trim()) return;
    setBusy(true);
    setError("");
    try {
      const product = await api("/catalogs/products", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          price_cents: centsFromMoneyInput(salePrice),
          stock_quantity: 0,
          active: true,
          warranty_enabled: false,
        }),
      });
      setProducts([...products, product]);
      add(product);
      setNewProduct(false);
      setNewName("");
      setSalePrice("");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!rows.length) {
      setError("Adicione pelo menos um produto à compra.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const purchase = await api(`/suppliers/${supplier.id}/purchases`, {
        method: "POST",
        body: JSON.stringify({
          request_key: requestKey.current,
          purchased_on: purchasedOn,
          expected_on: expectedOn || null,
          reference,
          notes,
          received_now: receivedNow,
          payment_terms: terms,
          payment_method: method,
          installments: Array.from({ length: count }, (_, i) => ({
            due_on: customDates[i] || dueDate(i),
            amount_cents:
              customAmounts[i] !== undefined
                ? centsFromMoneyInput(customAmounts[i])
                : Math.floor(total / count) +
                  (i === count - 1 ? total % count : 0),
            paid_on: paidNow ? paidOn : null,
          })),
          items: rows.map((row) => ({
            product_id: row.product.id,
            quantity: row.quantity,
            unit_cost_cents: centsFromMoneyInput(row.cost),
            lot: row.lot || null,
          })),
        }),
      });
      createdPurchase.current = purchase.id;
      setCommitted(true);
      if (invoice) {
        const form = new FormData();
        form.append("invoice", invoice);
        form.append("request_key", invoiceKey.current);
        await api(`/supplier-purchases/${purchase.id}/invoices`, {
          method: "POST",
          body: form,
        });
      }
      saved();
    } catch (reason) {
      setError(
        (createdPurchase.current
          ? "Compra registrada. Falha no anexo; tente anexar novamente sem duplicar a compra. "
          : "") + errorMessage(reason),
      );
    } finally {
      setBusy(false);
    }
  };
  const dueDate = (index: number) => {
    const d = new Date(`${firstDue}T12:00:00`);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + index);
    d.setDate(
      Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()),
    );
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const total = rows.reduce(
    (sum, row) => sum + row.quantity * centsFromMoneyInput(row.cost),
    0,
  );
  return (
    <OrderPopup
      variant="editor"
      title="Registrar compra"
      eyebrow="COMPRAS · FORNECEDORES"
      description={supplier.trade_name || supplier.name}
      icon={ShoppingCart}
      onClose={dismiss}
    >
      <form className="supplier-form supplier-purchase-form" onSubmit={submit}>
        <div className="supplier-form-body">
          <fieldset className="supplier-purchase-fields" disabled={committed}>
            <div className="supplier-form-grid">
              <label>
                <span>Data da compra *</span>
                <input
                  type="date"
                  required
                  max={today()}
                  value={purchasedOn}
                  onChange={(e) => setPurchasedOn(e.target.value)}
                />
              </label>
              <label>
                <span>Nota / referência</span>
                <input
                  maxLength={100}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Opcional"
                />
              </label>
            </div>
            <section>
              <div className="supplier-section-top">
                <div>
                  <h3>Produtos da compra</h3>
                  <p>Selecione o produto e informe o custo de aquisição.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewProduct(!newProduct)}
                >
                  <Plus />
                  Cadastrar produto
                </button>
              </div>
              {newProduct && (
                <div className="supplier-quick-product">
                  <label>
                    <span>Nome do novo produto</span>
                    <input
                      maxLength={255}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Preço de venda (R$)</span>
                    <input
                      inputMode="decimal"
                      value={salePrice}
                      onChange={(e) =>
                        setSalePrice(maskMoneyInput(e.target.value))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || !newName.trim() || !salePrice}
                    onClick={() => void createProduct()}
                  >
                    Criar e adicionar
                  </button>
                  <small>
                    O cadastro começa sem estoque; a quantidade entra no
                    recebimento.
                  </small>
                </div>
              )}
              <label className="supplier-search">
                <Search />
                <input
                  aria-label="Buscar produto para a compra"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar produto do catálogo…"
                />
              </label>
              {query.trim() && (
                <div className="supplier-product-results">
                  {products
                    .filter(
                      (product) =>
                        !rows.some((row) => row.product.id === product.id) &&
                        product.name
                          .toLocaleLowerCase("pt-BR")
                          .includes(query.toLocaleLowerCase("pt-BR")),
                    )
                    .slice(0, 15)
                    .map((product) => (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => add(product)}
                      >
                        <PackagePlus />
                        <span>
                          {product.name}
                          <small>
                            Estoque atual: {product.stock_quantity} · Venda:{" "}
                            {money(product.price_cents)}
                          </small>
                        </span>
                        <Plus />
                      </button>
                    ))}
                  {!products.some(
                    (product) =>
                      !rows.some((row) => row.product.id === product.id) &&
                      product.name
                        .toLocaleLowerCase("pt-BR")
                        .includes(query.toLocaleLowerCase("pt-BR")),
                  ) && (
                    <p>
                      Nenhum produto encontrado. Você pode cadastrá-lo acima.
                    </p>
                  )}
                </div>
              )}
              <div className="supplier-purchase-lines">
                {rows.length ? (
                  rows.map((row, index) => (
                    <div
                      className="supplier-purchase-line"
                      key={row.product.id}
                    >
                      <strong>
                        {row.product.name}
                        <small>
                          Venda cadastrada: {money(row.product.price_cents)}
                        </small>
                      </strong>
                      <label>
                        <span>Quantidade</span>
                        <input
                          aria-label={`Quantidade de ${row.product.name}`}
                          type="number"
                          min={1}
                          max={999999}
                          step={1}
                          required
                          value={row.quantity}
                          onChange={(e) =>
                            setRows(
                              rows.map((r, i) =>
                                i === index
                                  ? { ...r, quantity: Number(e.target.value) }
                                  : r,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Custo unitário (R$)</span>
                        <input
                          aria-label={`Custo de ${row.product.name}`}
                          inputMode="decimal"
                          required
                          value={row.cost}
                          onChange={(e) =>
                            setRows(
                              rows.map((r, i) =>
                                i === index
                                  ? {
                                      ...r,
                                      cost: maskMoneyInput(e.target.value),
                                    }
                                  : r,
                              ),
                            )
                          }
                        />
                      </label>
                      <label><span>Lote (opcional)</span><input maxLength={80} aria-label={`Lote de ${row.product.name}`} value={row.lot || ''} onChange={e => setRows(rows.map((r, i) => i === index ? {...r, lot: e.target.value} : r))} /></label>
                      <b>
                        {money(row.quantity * centsFromMoneyInput(row.cost))}
                      </b>
                      <button
                        type="button"
                        aria-label={`Remover ${row.product.name}`}
                        onClick={() =>
                          setRows(rows.filter((_, i) => i !== index))
                        }
                      >
                        <X />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="supplier-empty-small">
                    Os produtos adicionados aparecerão aqui.
                  </p>
                )}
              </div>
            </section>
            <section>
              <label className="supplier-check">
                <input
                  type="checkbox"
                  checked={receivedNow}
                  onChange={(e) => setReceivedNow(e.target.checked)}
                />
                Mercadoria recebida agora
              </label>
              <p>
                {receivedNow
                  ? "Ao confirmar, as quantidades serão somadas ao estoque."
                  : "A compra ficará pendente. O estoque só será somado ao registrar o recebimento."}
              </p>
              {!receivedNow && (
                <label>
                  <span>Previsão de entrega</span>
                  <input
                    type="date"
                    min={purchasedOn}
                    value={expectedOn}
                    onChange={(e) => setExpectedOn(e.target.value)}
                  />
                </label>
              )}
            </section>
            <section className="supplier-payment-plan">
              <h3>Pagamento ao fornecedor</h3>
              <div className="supplier-form-grid">
                <label>
                  <span>Condição de pagamento *</span>
                  <select
                    value={terms}
                    onChange={(e) => {
                      setTerms(e.target.value);
                      setCount(1);
                      setCustomAmounts({});
                      setCustomDates({});
                    }}
                  >
                    {Object.entries(paymentTerms).map(([key, label]) => (
                      <option value={key} key={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Forma de pagamento *</span>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    {Object.entries(paymentMethods).map(([key, label]) => (
                      <option value={key} key={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Primeiro vencimento *</span>
                  <input
                    type="date"
                    required
                    min={purchasedOn}
                    value={firstDue}
                    onChange={(e) => {
                      setFirstDue(e.target.value);
                      setCustomDates({});
                    }}
                  />
                </label>
                <label>
                  <span>Número de parcelas *</span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    disabled={["cash", "deferred"].includes(terms)}
                    value={count}
                    onChange={(e) => {
                      setCount(
                        Math.max(1, Math.min(60, Number(e.target.value))),
                      );
                      setCustomAmounts({});
                      setCustomDates({});
                    }}
                  />
                </label>
              </div>
              <p className="supplier-help">
                Vencimentos mensais sugeridos; ajuste cada parcela. No cartão de
                crédito, informe o vencimento da fatura. Duplicata é um título;
                escolha também como será paga.
              </p>
              {Array.from({ length: count }, (_, i) => (
                <div className="supplier-installment-row" key={i}>
                  <b>
                    Parcela {i + 1}/{count}
                  </b>
                  <label>
                    <span>Vencimento {i + 1}</span>
                    <input
                      type="date"
                      required
                      min={purchasedOn}
                      value={customDates[i] || dueDate(i)}
                      onChange={(e) =>
                        setCustomDates({ ...customDates, [i]: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Valor da parcela {i + 1} (R$)</span>
                    <input
                      inputMode="decimal"
                      value={
                        customAmounts[i] ??
                        money(
                          Math.floor(total / count) +
                            (i === count - 1 ? total % count : 0),
                        ).replace(/[^0-9,.]/g, "")
                      }
                      onChange={(e) =>
                        setCustomAmounts({
                          ...customAmounts,
                          [i]: maskMoneyInput(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              ))}
              <label className="supplier-check">
                <input
                  type="checkbox"
                  checked={paidNow}
                  onChange={(e) => setPaidNow(e.target.checked)}
                />
                Compra já paga integralmente
              </label>
              {paidNow && (
                <label>
                  <span>Data do pagamento *</span>
                  <input
                    type="date"
                    required
                    min={purchasedOn}
                    max={today()}
                    value={paidOn}
                    onChange={(e) => setPaidOn(e.target.value)}
                  />
                </label>
              )}
            </section>
            <label>
              <span>Observações da compra</span>
              <textarea
                maxLength={5000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <div className="supplier-purchase-total">
              <span>Total da compra</span>
              <strong>{money(total)}</strong>
            </div>
            <p className="supplier-help">
              O controle de vencimentos fica nesta compra e gera lembretes no
              sino. Não lança despesas automaticamente no Financeiro, evitando
              duplicar lançamentos manuais.
            </p>
          </fieldset>
          <section>
            <h3>Nota fiscal da compra</h3>
            <label>
              <span>Anexar imagem ou PDF da nota fiscal</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.size > 10 * 1024 * 1024) {
                    setError("A nota deve ter no máximo 10 MB.");
                    e.target.value = "";
                    return;
                  }
                  setInvoice(file);
                  invoiceKey.current = crypto.randomUUID();
                }}
              />
            </label>
            <p className="supplier-help">
              PDF, JPG, PNG ou WebP · até 10 MB. Anexo privado, disponível no
              histórico da compra.
            </p>
          </section>
          {error && (
            <div className="supplier-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <footer className="arl-3d-footer">
          <button type="button" disabled={busy} onClick={dismiss}>
            Cancelar
          </button>
          <button className="arl-3d-primary" disabled={busy || !rows.length}>
            <Check />
            {busy
              ? "Registrando…"
              : committed
                ? "Reenviar anexo"
                : receivedNow
                  ? "Registrar e receber"
                  : "Registrar compra"}
          </button>
        </footer>
      </form>
    </OrderPopup>
  );
}
function ReceiptForm({
  purchase,
  close,
  saved,
}: {
  purchase: Purchase;
  close: () => void;
  saved: () => void;
}) {
  const pending = purchase.items.filter(
    (item) => item.received_quantity < item.quantity,
  );
  const [quantities, setQuantities] = useState<Record<number, number>>(
      Object.fromEntries(
        pending.map((item) => [
          item.id,
          item.quantity - item.received_quantity,
        ]),
      ),
    ),
    [receivedOn, setReceivedOn] = useState(today),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const requestKey = useRef(crypto.randomUUID());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const items = pending
      .filter((item) => quantities[item.id] > 0)
      .map((item) => ({ item_id: item.id, quantity: quantities[item.id] }));
    if (!items.length)
      return setError("Informe pelo menos uma unidade recebida.");
    setBusy(true);
    setError("");
    try {
      await api(`/supplier-purchases/${purchase.id}/receipts`, {
        method: "POST",
        body: JSON.stringify({
          request_key: requestKey.current,
          received_on: receivedOn,
          notes,
          items,
        }),
      });
      saved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <OrderPopup
      variant="editor"
      title="Receber mercadoria"
      eyebrow={purchaseNumber(purchase.id)}
      description="Confira as unidades entregues. Recebimentos parciais são permitidos."
      icon={PackageCheck}
      onClose={() => {
        if (!busy) close();
      }}
    >
      <form className="supplier-form" onSubmit={submit}>
        <div className="supplier-form-body">
          <label>
            <span>Data do recebimento *</span>
            <input
              type="date"
              required
              min={purchase.purchased_on}
              max={today()}
              value={receivedOn}
              onChange={(e) => setReceivedOn(e.target.value)}
            />
          </label>
          {pending.map((item) => (
            <div className="supplier-receipt-line" key={item.id}>
              <div>
                <b>{item.description}</b>
                <small>
                  Comprado: {item.quantity} · Recebido: {item.received_quantity}{" "}
                  · Pendente: {item.quantity - item.received_quantity}
                </small>
              </div>
              <label>
                <span>Receber agora</span>
                <input
                  aria-label={`Receber ${item.description}`}
                  type="number"
                  required
                  min={0}
                  max={item.quantity - item.received_quantity}
                  step={1}
                  value={quantities[item.id]}
                  onChange={(e) =>
                    setQuantities({
                      ...quantities,
                      [item.id]: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
          ))}
          <label>
            <span>Observação do recebimento</span>
            <textarea
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {error && (
            <div role="alert" className="supplier-error">
              {error}
            </div>
          )}
        </div>
        <footer className="arl-3d-footer">
          <button type="button" disabled={busy} onClick={close}>
            Voltar
          </button>
          <button className="arl-3d-primary" disabled={busy}>
            <PackageCheck />
            {busy ? "Recebendo…" : "Confirmar recebimento"}
          </button>
        </footer>
      </form>
    </OrderPopup>
  );
}
function CancelPurchase({
  purchase,
  close,
  saved,
}: {
  purchase: Purchase;
  close: () => void;
  saved: () => void;
}) {
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <OrderPopup
      variant="editor"
      title="Cancelar saldo pendente"
      eyebrow={purchaseNumber(purchase.id)}
      description="Os produtos já recebidos e seu histórico serão preservados."
      icon={ClipboardList}
      onClose={() => {
        if (!busy) close();
      }}
    >
      <form
        className="supplier-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            await api(`/supplier-purchases/${purchase.id}/cancel`, {
              method: "POST",
              body: JSON.stringify({ reason }),
            });
            saved();
          } catch (caught) {
            setError(errorMessage(caught));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="supplier-form-body">
          <label>
            <span>Motivo do cancelamento *</span>
            <textarea
              required
              minLength={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {error && (
            <div role="alert" className="supplier-error">
              {error}
            </div>
          )}
        </div>
        <footer className="arl-3d-footer">
          <button type="button" disabled={busy} onClick={close}>
            Voltar
          </button>
          <button className="arl-3d-primary" disabled={busy}>
            Confirmar cancelamento
          </button>
        </footer>
      </form>
    </OrderPopup>
  );
}
export default function SuppliersPage() {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("active"),
    [page, setPage] = useState(1),
    [list, setList] = useState<{
      data: Supplier[];
      last_page: number;
      summary: {
        total: number;
        active: number;
        pending_purchases: number;
        received_value_cents: number;
      };
    } | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<number | null>(() => {
      const n = Number(
        new URLSearchParams(window.location.search).get("supplier"),
      );
      return n > 0 ? n : null;
    }),
    [detail, setDetail] = useState<Detail | null>(null),
    [historyPage, setHistoryPage] = useState(1),
    [tab, setTab] = useState("purchases"),
    [editor, setEditor] = useState<SupplierDraft | null>(null),
    [buy, setBuy] = useState(false),
    [purchase, setPurchase] = useState<Purchase | null>(null),
    [receive, setReceive] = useState(false),
    [cancel, setCancel] = useState(false),
    [purchaseLoading, setPurchaseLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api(
        `/suppliers?q=${encodeURIComponent(query)}&status=${status}&page=${page}`,
      )
        .then((data) => {
          if (active) setList(data);
        })
        .catch((reason) => {
          if (active) setError(errorMessage(reason));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, status, page, revision]);
  useEffect(() => {
    if (selected === null) return;
    let active = true;
    setDetail(null);
    api(`/suppliers/${selected}?page=${historyPage}`)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [selected, historyPage, revision]);
  const refresh = (text: string) => {
    setRevision((v) => v + 1);
    setMessage(text);
    setError("");
  };
  const openSupplier = (id: number) => {
    setDetail(null);
    setSelected(id);
    setHistoryPage(1);
    setTab("purchases");
    setPurchase(null);
    setError("");
    setMessage("");
  };
  const openPurchase = async (id: number) => {
    setPurchaseLoading(true);
    setError("");
    try {
      setPurchase(await api(`/supplier-purchases/${id}`));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPurchaseLoading(false);
    }
  };
  const initialPurchase = useRef(
    Number(new URLSearchParams(window.location.search).get("purchase")),
  );
  useEffect(() => {
    if (detail && initialPurchase.current > 0) {
      const id = initialPurchase.current;
      initialPurchase.current = 0;
      void api(`/supplier-purchases/${id}`)
        .then(setPurchase)
        .catch((reason) => setError(errorMessage(reason)));
    }
  }, [detail]);
  const received = async () => {
    setReceive(false);
    setCancel(false);
    refresh("Compra atualizada. Estoque e histórico conferidos.");
    if (purchase) await openPurchase(purchase.id);
  };
  const supplier = detail?.supplier;
  const phone =
    (supplier?.whatsapp || supplier?.phone)?.replace(/\D/g, "") || "";
  const whatsapp = phone
    ? `https://wa.me/${phone.startsWith("55") && phone.length > 11 ? phone : "55" + phone}`
    : "";
  const summary = list?.summary;
  return (
    <div className="supplier-page" data-suppliers-page="1">
      <PageHeader
        eyebrow="COMPRAS E RELACIONAMENTO"
        title="Fornecedores"
        description="Parceiros, compras e recebimentos organizados em um só lugar."
        icon={Truck}
        actions={
          <button
            className="supplier-primary"
            onClick={() => setEditor(blankSupplier())}
          >
            <Plus />
            Novo fornecedor
          </button>
        }
      />
      {message && (
        <div className="supplier-success" role="status">
          <Check />
          {message}
          <button aria-label="Fechar aviso" onClick={() => setMessage("")}>
            <X />
          </button>
        </div>
      )}
      {error && (
        <div className="supplier-error" role="alert">
          {error}
          <button
            onClick={() => {
              setError("");
              setRevision((v) => v + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {selected === null ? (
        <>
          <div className="supplier-stats">
            <article>
              <Building2 />
              <div>
                <small>Fornecedores ativos</small>
                <b>{summary?.active ?? "—"}</b>
                <span>{summary?.total ?? "—"} cadastrados</span>
              </div>
            </article>
            <article>
              <Clock3 />
              <div>
                <small>Compras pendentes</small>
                <b>{summary?.pending_purchases ?? "—"}</b>
                <span>Aguardando recebimento</span>
              </div>
            </article>
            <article>
              <PackageCheck />
              <div>
                <small>Valor recebido em produtos</small>
                <b>{summary ? money(summary.received_value_cents) : "—"}</b>
                <span>Custo das mercadorias recebidas</span>
              </div>
            </article>
          </div>
          <section className="supplier-panel">
            <div className="supplier-toolbar">
              <label className="supplier-search">
                <Search />
                <input
                  aria-label="Buscar fornecedor"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por nome, documento ou contato…"
                />
              </label>
              <label>
                <span className="supplier-sr-only">Situação do fornecedor</span>
                <select
                  aria-label="Situação do fornecedor"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                  <option value="all">Todos</option>
                </select>
              </label>
            </div>
            {loading ? (
              <p className="supplier-empty" role="status">
                Carregando fornecedores…
              </p>
            ) : list?.data.length ? (
              <div className="supplier-directory">
                {list.data.map((row) => (
                  <button
                    className="supplier-directory-row"
                    key={row.id}
                    onClick={() => openSupplier(row.id)}
                  >
                    <span className="supplier-avatar">
                      {row.name.slice(0, 2).toLocaleUpperCase("pt-BR")}
                    </span>
                    <span className="supplier-row-name">
                      <b>{row.trade_name || row.name}</b>
                      <small>
                        {row.trade_name
                          ? row.name
                          : row.document || "Documento não informado"}
                      </small>
                    </span>
                    <span className="supplier-row-contact">
                      <b>{row.contact_name || "Contato não informado"}</b>
                      <small>
                        {row.phone || row.email || "Sem contato cadastrado"}
                      </small>
                    </span>
                    <span className="supplier-row-purchases">
                      <b>{row.purchase_count || 0} compras</b>
                      <small>Última: {date(row.last_purchase_on)}</small>
                    </span>
                    <span
                      className={`supplier-badge ${row.active ? "received" : "cancelled"}`}
                    >
                      {row.active ? "Ativo" : "Inativo"}
                    </span>
                    <ChevronRight />
                  </button>
                ))}
              </div>
            ) : (
              <div className="supplier-empty">
                <Building2 />
                <h2>
                  {query || status === "inactive"
                    ? "Nenhum fornecedor encontrado"
                    : "Seu próximo parceiro começa aqui"}
                </h2>
                <p>
                  {query || status === "inactive"
                    ? "Ajuste a busca ou o filtro para ver outros fornecedores."
                    : "Cadastre um fornecedor para organizar suas compras e acompanhar as entregas."}
                </p>
                {!query && status !== "inactive" && (
                  <button
                    className="supplier-primary"
                    onClick={() => setEditor(blankSupplier())}
                  >
                    <Plus />
                    Cadastrar fornecedor
                  </button>
                )}
              </div>
            )}
            <Pager
              current={page}
              last={list?.last_page || 1}
              change={setPage}
            />
          </section>
        </>
      ) : (
        <>
          <button
            className="supplier-back"
            onClick={() => {
              setSelected(null);
              setPurchase(null);
            }}
          >
            <ArrowLeft />
            Todos os fornecedores
          </button>
          {!supplier ? (
            <div className="supplier-empty" role="status">
              Carregando ficha do fornecedor…
            </div>
          ) : (
            <>
              <section className="supplier-panel supplier-profile">
                <div className="supplier-profile-top">
                  <span className="supplier-avatar large">
                    <Building2 />
                  </span>
                  <div>
                    <span
                      className={`supplier-badge ${supplier.active ? "received" : "cancelled"}`}
                    >
                      {supplier.active
                        ? "Fornecedor ativo"
                        : "Fornecedor inativo"}
                    </span>
                    <h2>{supplier.trade_name || supplier.name}</h2>
                    <p>
                      {supplier.trade_name ? supplier.name + " · " : ""}
                      {supplier.document || "CPF / CNPJ não informado"}
                    </p>
                  </div>
                  <div className="supplier-profile-actions">
                    <button onClick={() => setEditor(supplier)}>
                      <Pencil />
                      Editar cadastro
                    </button>
                    <button
                      className="supplier-primary"
                      disabled={!supplier.active}
                      onClick={() => setBuy(true)}
                    >
                      <ShoppingCart />
                      Registrar compra
                    </button>
                  </div>
                </div>
                <div className="supplier-profile-info">
                  <div>
                    <small>Contato comercial</small>
                    <b>{supplier.contact_name || "Não informado"}</b>
                    {whatsapp && (
                      <a href={whatsapp} target="_blank" rel="noreferrer">
                        <Phone />
                        WhatsApp:{" "}
                        {phoneMask(supplier.whatsapp || supplier.phone || "")}
                      </a>
                    )}
                    {supplier.phone && (
                      <a href={`tel:+55${supplier.phone}`}>
                        <Phone />
                        Celular: {phoneMask(supplier.phone)}
                      </a>
                    )}
                    {supplier.landline && (
                      <a href={`tel:+55${supplier.landline}`}>
                        <Phone />
                        Fixo: {phoneMask(supplier.landline, true)}
                      </a>
                    )}
                    {supplier.email && (
                      <a href={`mailto:${supplier.email}`}>
                        <Mail />
                        {supplier.email}
                      </a>
                    )}
                  </div>
                  <div>
                    <small>Endereço</small>
                    <b>
                      {[supplier.street, supplier.number]
                        .filter(Boolean)
                        .join(", ") || "Não informado"}
                    </b>
                    <span>
                      {[supplier.district, supplier.city, supplier.state]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {supplier.complement && <span>{supplier.complement}</span>}
                    {supplier.postal_code && (
                      <span>CEP {supplier.postal_code}</span>
                    )}
                  </div>
                  <div>
                    <small>Observações</small>
                    <span className="supplier-notes">
                      {supplier.notes || "Nenhuma observação cadastrada."}
                    </span>
                  </div>
                </div>
              </section>
              <div
                className="supplier-tabs"
                role="tablist"
                aria-label="Ficha do fornecedor"
              >
                <button
                  role="tab"
                  aria-selected={tab === "purchases"}
                  onClick={() => setTab("purchases")}
                >
                  <ShoppingCart />
                  Compras e recebimentos
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "products"}
                  onClick={() => setTab("products")}
                >
                  <PackagePlus />
                  Produtos adquiridos
                </button>
                {[["overview", "Visão geral"], ["commercial", "Dados comerciais"], ["offerings", "Produtos fornecidos"], ["finance", "Financeiro"], ["documents", "Documentos"], ["returns", "Devoluções"], ["history", "Ocorrências"], ["reports", "Relatórios"]].map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setPurchase(null); }}>{label}</button>)}
              </div>
              {!["purchases", "products"].includes(tab) && <SupplierWorkspace key={selected + '-' + tab + '-' + revision} id={supplier.id} tab={tab} onPurchase={id => void openPurchase(id)} onChange={() => refresh("Fornecedor atualizado.")} />}
              {tab === "purchases" ? (
                <section className="supplier-panel">
                  <div className="supplier-section-top">
                    <div>
                      <h2>Histórico de compras</h2>
                      <p>
                        Abra uma compra para conferir os itens e registrar sua
                        entrega.
                      </p>
                    </div>
                  </div>
                  {detail.purchases.data.length ? (
                    <div className="supplier-purchase-list">
                      {detail.purchases.data.map((row) => (
                        <button
                          key={row.id}
                          onClick={() => void openPurchase(row.id)}
                        >
                          <span>
                            <b>{purchaseNumber(row.id)}</b>
                            <small>
                              {date(row.purchased_on)}
                              {row.reference && ` · ${row.reference}`}
                            </small>
                          </span>
                          <Badge status={row.status} />
                          <span className="supplier-purchase-payment-status">
                            <small>
                              {paymentTerms[row.payment_terms || ""] ||
                                "Condição não informada"}{" "}
                              ·{" "}
                              {paymentMethods[row.payment_method || ""] || "—"}
                            </small>
                            <small>
                              {Number(row.payable_count) > 0
                                ? Number(row.open_amount_cents) > 0
                                  ? `Em aberto: ${money(row.open_amount_cents)} · vence ${date(row.next_due_on)}`
                                  : Number(row.paid_amount_cents) >=
                                      Number(row.total_cents)
                                    ? "Paga integralmente"
                                    : "Títulos encerrados (confira histórico)"
                                : "Pagamento não cadastrado"}
                            </small>
                          </span>
                          <strong>{money(row.total_cents)}</strong>
                          <ChevronRight />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="supplier-empty">
                      <ShoppingCart />
                      <h3>Nenhuma compra registrada</h3>
                      <p>Registre a primeira compra deste fornecedor.</p>
                    </div>
                  )}
                  <Pager
                    current={detail.purchases.current_page}
                    last={detail.purchases.last_page}
                    change={setHistoryPage}
                  />
                </section>
              ) : tab === "products" ? (
                <section className="supplier-panel">
                  <div className="supplier-section-top">
                    <div>
                      <h2>Produtos adquiridos</h2>
                      <p>
                        Histórico do fornecedor. O saldo atual inclui todas as
                        origens do produto.
                      </p>
                    </div>
                  </div>
                  {detail.products.length ? (
                    <div className="supplier-product-history">
                      {detail.products.map((product) => (
                        <article key={product.product_id}>
                          <PackagePlus />
                          <div>
                            <b>{product.name}</b>
                            <small>
                              {product.received_quantity} unidades recebidas
                              deste fornecedor
                            </small>
                          </div>
                          <span>
                            Custo recebido
                            <strong>
                              {money(product.received_value_cents)}
                            </strong>
                          </span>
                          <span>
                            Estoque atual
                            <strong>{product.stock_quantity}</strong>
                          </span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="supplier-empty">
                      Nenhum produto vinculado a compras deste fornecedor.
                    </p>
                  )}
                </section>
              ) : null}
              {purchaseLoading && <p role="status">Carregando compra…</p>}
              {purchase && (
                <section
                  className="supplier-panel supplier-purchase-detail"
                  aria-label={purchaseNumber(purchase.id)}
                >
                  <div className="supplier-section-top">
                    <div>
                      <span className="arl-eyebrow">DETALHES DA COMPRA</span>
                      <h2>{purchaseNumber(purchase.id)}</h2>
                      <p>
                        {purchase.supplier_snapshot.name} ·{" "}
                        {date(purchase.purchased_on)}
                        {purchase.reference && ` · ${purchase.reference}`}
                      </p>
                    </div>
                    <button
                      aria-label="Fechar detalhes da compra"
                      onClick={() => setPurchase(null)}
                    >
                      <X />
                    </button>
                  </div>
                  <div className="supplier-purchase-detail-top">
                    <Badge status={purchase.status} />
                    <span>Previsão: {date(purchase.expected_on)}</span>
                    <strong>Total: {money(purchase.total_cents)}</strong>
                  </div>
                  <div className="supplier-detail-items">
                    {purchase.items.map((item) => (
                      <article key={item.id}>
                        <b>{item.description}</b>
                        <span>Comprado: {item.quantity}</span>
                        <span>Recebido: {item.received_quantity}</span>
                        <span>
                          Custo unitário: {money(item.unit_cost_cents)}{item.lot && ` · lote ${item.lot}`}
                        </span>
                      </article>
                    ))}
                  </div>
                  {purchase.notes && (
                    <p className="supplier-notes">{purchase.notes}</p>
                  )}
                  {purchase.cancellation_reason && (
                    <p>Cancelamento: {purchase.cancellation_reason}</p>
                  )}
                  {["pending", "partially_received"].includes(
                    purchase.status,
                  ) && (
                    <div className="supplier-receive-actions">
                      <button
                        className="supplier-primary"
                        onClick={() => setReceive(true)}
                      >
                        <PackageCheck />
                        Receber mercadoria
                      </button>
                      <button onClick={() => setCancel(true)}>
                        Cancelar saldo pendente
                      </button>
                    </div>
                  )}
                  <PurchasePayments
                    purchase={purchase}
                    refresh={async () => {
                      await openPurchase(purchase.id);
                      if (selected)
                        setDetail(
                          await api(
                            `/suppliers/${selected}?page=${historyPage}`,
                          ),
                        );
                    }}
                  />
                  <h3>Recebimentos registrados</h3>
                  {purchase.receipts.length ? (
                    purchase.receipts.map((receipt) => (
                      <article
                        className="supplier-receipt-history"
                        key={receipt.id}
                      >
                        <PackageCheck />
                        <div>
                          <b>
                            {date(receipt.received_on)} · {receipt.user_name}
                          </b>
                          <p>
                            {receipt.items
                              .map(
                                (item) =>
                                  `${item.quantity} × ${item.description}`,
                              )
                              .join(" · ")}
                          </p>
                          {receipt.notes && <small>{receipt.notes}</small>}
                        </div>
                      </article>
                    ))
                  ) : (
                    <p>
                      Nenhuma entrega registrada. Esta compra ainda não alterou
                      o estoque.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}
      {editor && (
        <SupplierForm
          draft={editor}
          close={() => setEditor(null)}
          saved={(row) => {
            setEditor(null);
            openSupplier(row.id);
            refresh("Fornecedor salvo com sucesso.");
          }}
        />
      )}
      {buy && supplier && (
        <PurchaseForm
          supplier={supplier}
          close={() => setBuy(false)}
          saved={() => {
            setBuy(false);
            refresh("Compra registrada com sucesso.");
          }}
        />
      )}
      {receive && purchase && (
        <ReceiptForm
          purchase={purchase}
          close={() => setReceive(false)}
          saved={() => void received()}
        />
      )}
      {cancel && purchase && (
        <CancelPurchase
          purchase={purchase}
          close={() => setCancel(false)}
          saved={() => void received()}
        />
      )}
    </div>
  );
}
