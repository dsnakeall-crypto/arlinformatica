import { useRef, useState, type FormEvent } from "react";

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
type Purchase = {
  id: number;
  payment_terms: string | null;
  payment_method: string | null;
  installments: Payable[];
  invoices: { id: number; original_name: string; bytes: number }[];
};
const methods: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  bank_transfer: "Transferência bancária",
  boleto: "Boleto",
  debit_card: "Cartão de débito",
  credit_card: "Cartão de crédito",
  cheque: "Cheque",
  other: "Outro",
};
const terms: Record<string, string> = {
  cash: "À vista",
  deferred: "A prazo",
  installments: "Parcelada",
  duplicata: "Duplicata / títulos",
};
const day = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const date = (value: string) =>
  value.slice(0, 10).split("-").reverse().join("/");
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value / 100,
  );
async function post(path: string, body: Record<string, unknown> | FormData) {
  const response = await fetch(`/api${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      "X-CSRF-TOKEN":
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
          ?.content || "",
    },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.errors
        ? String(Object.values(result.errors).flat()[0])
        : result.message,
    );
  return result;
}
export default function PurchasePayments({
  purchase,
  refresh,
}: {
  purchase: Purchase;
  refresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Payable | null>(null),
    [paidOn, setPaidOn] = useState(day),
    [method, setMethod] = useState(purchase.payment_method || "pix"),
    [reference, setReference] = useState(""),
    [reason, setReason] = useState(""),
    [voiding, setVoiding] = useState<Payable | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const invoiceKey = useRef(crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null);
  const action = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
      await refresh();
      setEditing(null);
      setVoiding(null);
      setFile(null);
      invoiceKey.current = crypto.randomUUID();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na operação.");
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (editing)
      void action(() =>
        post(`/supplier-payables/${editing.id}/pay`, {
          paid_on: paidOn,
          paid_method: method,
          payment_reference: reference,
        }),
      );
  };
  const open = purchase.installments.filter((p) => !p.paid_on && !p.voided_at);
  return (
    <section className="supplier-payment-history">
      <h3>Pagamento e vencimentos</h3>
      <p>
        {terms[purchase.payment_terms || ""] ||
          "Condição não informada nesta compra"}{" "}
        · {methods[purchase.payment_method || ""] || "Forma não informada"}
      </p>
      <div className="supplier-payment-totals">
        <span>
          Em aberto{" "}
          <b>
            {money(open.reduce((sum, p) => sum + Number(p.amount_cents), 0))}
          </b>
        </span>
        <span>
          Pago{" "}
          <b>
            {money(
              purchase.installments
                .filter((p) => p.paid_on)
                .reduce((sum, p) => sum + Number(p.amount_cents), 0),
            )}
          </b>
        </span>
      </div>
      {purchase.installments.map((p) => (
        <article className="supplier-installment-history" key={p.id}>
          <div>
            <b>
              Parcela {p.installment} · {money(p.amount_cents)}
            </b>
            <p>Vencimento: {date(p.due_on)}</p>
            <small>
              {p.voided_at
                ? `Cancelada: ${p.void_reason}`
                : p.paid_on
                  ? `Paga em ${date(p.paid_on)} · ${methods[p.paid_method || ""] || p.paid_method}`
                  : p.due_on < day()
                    ? "Vencida"
                    : p.due_on === day()
                      ? "Vence hoje"
                      : "Em aberto"}
            </small>
          </div>
          {!p.paid_on && !p.voided_at && (
            <div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditing(p);
                  setVoiding(null);
                  setPaidOn(day());
                  setMethod(purchase.payment_method || "pix");
                  setReference("");
                }}
              >
                Registrar pagamento
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setVoiding(p);
                  setEditing(null);
                  setReason("");
                }}
              >
                Cancelar título
              </button>
            </div>
          )}
        </article>
      ))}
      {!purchase.installments.length && (
        <p>
          Compra anterior sem parcelas cadastradas. Nenhuma dívida foi criada
          automaticamente.
        </p>
      )}
      {editing && (
        <form onSubmit={submit} className="supplier-form">
          <h4>Confirmar pagamento da parcela {editing.installment}</h4>
          <div className="supplier-form-grid">
            <label>
              <span>Data do pagamento *</span>
              <input
                type="date"
                required
                max={day()}
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
              />
            </label>
            <label>
              <span>Forma utilizada *</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {Object.entries(methods).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Comprovante / referência</span>
              <input
                maxLength={255}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
          </div>
          <button disabled={busy}>Confirmar pagamento</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(null)}
          >
            Voltar
          </button>
        </form>
      )}
      {voiding && (
        <form
          className="supplier-form"
          onSubmit={(e) => {
            e.preventDefault();
            void action(() =>
              post(`/supplier-payables/${voiding.id}/cancel`, { reason }),
            );
          }}
        >
          <h4>Cancelar título da parcela {voiding.installment}</h4>
          <p>
            Não cancela mercadorias nem recebimentos. Confirme a negociação com
            o fornecedor.
          </p>
          <label>
            <span>Motivo *</span>
            <input
              required
              minLength={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button disabled={busy}>Confirmar cancelamento do título</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setVoiding(null)}
          >
            Voltar
          </button>
        </form>
      )}
      <h3>Notas fiscais anexadas</h3>
      {purchase.invoices.map((invoice) => (
        <a
          className="supplier-invoice-link"
          key={invoice.id}
          href={`/api/supplier-invoices/${invoice.id}/download`}
        >
          {invoice.original_name} · {(invoice.bytes / 1024).toFixed(0)} KB ·
          Baixar
        </a>
      ))}
      {!purchase.invoices.length && <p>Nenhuma nota anexada.</p>}
      <form
        className="supplier-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (file)
            void action(() => {
              const data = new FormData();
              data.append("invoice", file);
              data.append("request_key", invoiceKey.current);
              return post(`/supplier-purchases/${purchase.id}/invoices`, data);
            });
        }}
      >
        <label>
          <span>Adicionar nota fiscal (PDF ou imagem, até 10 MB)</span>
          <input
            key={purchase.invoices.length}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              invoiceKey.current = crypto.randomUUID();
            }}
          />
        </label>
        <button disabled={busy || !file}>Anexar nota</button>
      </form>
      {error && (
        <p className="supplier-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
