import './appearance';
import '../css/sidebar-new-order.css';
import '../css/open-orders-warning.css';
import "./session-security";
import "../css/session-security.css";
import "../css/app.css";
import "../css/homologation.css";
import "../css/desktop-adaptive.css";
import "../css/arl-ui-system.css";
import "../css/action-icons.css";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bell, Box, ClipboardList, LayoutDashboard, Plus, Settings, Users, Wallet, Phone, Menu, X, PackageSearch, Pin, LogOut, CircleDollarSign, Truck } from "lucide-react";
import { centsFromMoneyInput, maskMoneyInput, moneyInputFromCents } from "./money-input";
import { OrderPaymentFigures } from "./finance-refund-summary";
import { connectCacheTabs, clearSessionCache } from './cache-requests';
import { sessionCache } from './session-memory-cache';
import CacheBoundary from './cache-boundary';
import { createRoot } from "react-dom/client";
import { emptyClient, Errors, masks, digits, api, Field, status, money, Page, Client } from './app-shared';
import { ClientsPage, ExpenseControlPage, OrderDetailPage, Dashboard, Orders, FinancePage, PostSalePage, ServicesCatalogPage, ProductsCatalogPage, SuppliersPage, SettingsPage, NewOrder, QuickEntry } from './lazy-pages';
import { StorageAdmin } from './settings-page';

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
              {o.documents
                ?.filter((document: any) => document.type === "final")
                .sort((a: any, b: any) => b.revision - a.revision)
                .slice(0, 1)
                .map((document: any) => (
                  <a key={`final-${document.revision}`} href={`/api/orders/${o.id}/final/${document.revision}/pdf`} target="_blank" rel="noreferrer">
                    Baixar A4 final · Rev. {document.revision}
                  </a>
                ))}
              {o.documents
                ?.filter((document: any) => document.type === "final-record")
                .sort((a: any, b: any) => b.revision - a.revision)
                .map((document: any) => (
                  <a key={`final-record-${document.revision}`} href={`/api/orders/${o.id}/final-record/${document.revision}/pdf`} target="_blank" rel="noreferrer">
                    Registro da Rev. {document.revision} (substituída)
                  </a>
                ))}
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
        free_price: !!c.free_price,
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
    disc = centsFromMoneyInput(discount),
    total = Math.max(0, subtotal - disc);
  const openFinalization = () => {
    const reportField = document.querySelector<HTMLTextAreaElement>(
      ".arl-od-report textarea",
    );
    const currentReport = (reportField?.value || order.final_report || "").trim();
    if (!currentReport) {
      setError("Preencha o Laudo Final antes de concluir a OS.");
      reportField?.focus();
      reportField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setReport(currentReport);
    setError("");
    setOpen(true);
    api(`/orders/${order.id}/budgets`)
      .then(setBudgets)
      .catch((e) => setError(e.message));
  };
  const finish = async () => {
    if (!report.trim()) {
      setError("Preencha o Laudo Final antes de concluir a OS.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/orders/${order.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({
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
          onClick={openFinalization}
        >
          Concluir OS
        </button>
      </div>
      {!open && error && <div className="alert">{error}</div>}
      {open && (
        <div className="modal">
          <div className="modal-card arl-finalization">
            <button className="modal-close" onClick={() => setOpen(false)}>
              <X />
            </button>
            <h1>FINALIZAÇÃO DA OS</h1>
            {order.closing_reference_cents != null && <div className="notice arl-closing-reminder">Valor combinado em campo: <strong>{money(order.closing_reference_cents)}</strong></div>}
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
                  inputMode="decimal"
                  value={moneyInputFromCents(x.unit_price_cents)}
                  onChange={(e) =>
                    setItems(
                      items.map((a, j) =>
                        j === i
                          ? {
                              ...a,
                              unit_price_cents: centsFromMoneyInput(e.target.value),
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
                  onChange={(e) => setDiscount(maskMoneyInput(e.target.value))}
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
                  spellCheck={true}
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
  const currentFinalRevision = Math.max(0, ...docs.filter((document) => document.type === "final").map((document) => document.revision));
  return (
    <section className="wide">
      <h2>Documentos</h2>
      <div className="documents">
        <a target="_blank" href={`/api/orders/${order.id}/term`}>
          Termo de recebimento
        </a>
        {docs
          .filter((d) => d.type !== "term" && (d.type !== "final" || d.revision === currentFinalRevision))
          .map((d) => {
            const href =
              d.type === "final"
                ? `/api/orders/${order.id}/final/${d.revision}/pdf`
                : d.type === "final-record"
                  ? `/api/orders/${order.id}/final-record/${d.revision}/pdf`
                : d.type === "technical-report"
                  ? `/api/orders/${order.id}/reports/${d.revision}/pdf`
                  : `/api/orders/${order.id}/budgets/${d.revision}/pdf`;
            return (
              <article>
                <div>
                  <b>
                    {d.type === "final"
                      ? "PDF Final"
                      : d.type === "final-record"
                        ? `Registro da Rev. ${d.revision} (substituída)`
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
        moneyInputFromCents(x.collectible_balance_cents || 0),
      );
    });
  useEffect(() => {
    void load();
  }, [order.id, order.total_cents]);
  const total = summary?.total_cents ?? (order.total_cents || 0),
    paid = summary?.paid_cents ?? 0,
    balance = summary?.collectible_balance_cents ?? Math.max(0, total - paid);
  const entered = centsFromMoneyInput(amount);
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
    setAmount(moneyInputFromCents(balance));
    setError("");
    setOpen(true);
  };
  const save = async () => {
    const cents = centsFromMoneyInput(amount);
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
              onChange={(e: any) => setAmount(maskMoneyInput(e.target.value))}
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
          {o.client.nickname && <small className="arl-client-nickname">{o.client.nickname}</small>}
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
        <textarea spellCheck={true} value={body} onChange={(e) => setBody(e.target.value)} />
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

function BudgetBox({ order }: any) {
  const statusName: Record<string, string> = { draft: "Rascunho", sent: "Enviado", approved: "Aprovado", refused: "Recusado" };
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [validity, setValidity] = useState(7);
  const [diagnosis, setDiagnosis] = useState(""),
    [proposal, setProposal] = useState(""),
    [description, setDescription] = useState(""),
    [quantity, setQuantity] = useState(1),
    [price, setPrice] = useState("0,00"),
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
            unit_price_cents: centsFromMoneyInput(price),
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
              spellCheck={true}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Serviço proposto</span>
            <textarea
              required
              spellCheck={true}
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
              onChange={(e: any) => setPrice(maskMoneyInput(e.target.value))}
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
            Revisão {b.revision} · {statusName[b.status] || b.status} · {money(b.total_cents)} ·{" "}
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

function NotificationBell({ go }: any) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState<any>({ unread: 0, data: [] }),
    [push, setPush] = useState<"on" | "off" | "blocked" | "unsupported">("off");
  const notificationRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
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
    if (n.type === "supplier_due" && /^\/suppliers\?supplier=\d+&purchase=\d+$/.test(n.url || "")) {
      window.location.assign(n.url);
      return;
    }
    if (n.url === "/post-sale") go("post-sale");
    else if (n.data?.service_order_id || n.url?.startsWith("/orders/"))
      go("orders", n.data?.service_order_id || +n.url.split("/").pop());
    else go("clients");
    load();
  };
  return (
    <div className="notification-wrap" ref={notificationRef}>
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

function CatalogAdmin({ catalog, title }: any) {
  const [items, setItems] = useState<any[]>([]),
    [name, setName] = useState(""),
    [price, setPrice] = useState("0,00"),
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
              price_cents: centsFromMoneyInput(price),
              category,
              warranty_enabled: warranty,
              warranty_term: warranty ? term : null,
              warranty_unit: warranty ? unit : null,
            }
          : {}),
      }),
    });
    setName("");
    setPrice("0,00");
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
        price_cents: centsFromMoneyInput(String(edit.price)),
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
              onChange={(e) => setPrice(maskMoneyInput(e.target.value))}
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

function MobileBottomBar({ go, page, canExpenses }: any) {
  return <nav className={"arl-global-mobile-nav arl-mobile-icon-nav" + (canExpenses ? " has-expenses" : "")} aria-label="Navegação Mobile / Tablet">
    <button type="button" aria-label="OS abertas" title="OS abertas" className={page === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}><ClipboardList /></button>
    <button type="button" aria-label="Nova OS" title="Nova OS" className="primary-shortcut" onClick={() => go("new")}><Plus /></button>
    <button type="button" aria-label="Clientes" title="Clientes" className={page === "clients" ? "active" : ""} onClick={() => go("clients")}><Users /></button>
    {canExpenses && <button type="button" aria-label="Controle de Gasto" title="Controle de Gasto" className={page === "expense-control" ? "active" : ""} onClick={() => go("expense-control")}><Wallet /></button>}
  </nav>;
}

function App() {
  const [layout, setLayout] = useState<"desktop" | "mobile">(() => {
    const saved = localStorage.getItem("arl-layout-mode");
    if (saved === "desktop" || saved === "mobile") return saved;
    return window.matchMedia("(max-width: 1024px)").matches ? "mobile" : "desktop";
  });
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [navSummary, setNavSummary] = useState({
    open_orders: 0,
    available_post_sales: 0,
  });
  useEffect(() => {
    document.documentElement.dataset.layout = layout;
    localStorage.setItem("arl-layout-mode", layout);
  }, [layout]);
  useEffect(() => {
    const enableNativeSpellcheck = (root: ParentNode) => {
      if (root instanceof HTMLTextAreaElement) root.spellcheck = true;
      root.querySelectorAll<HTMLTextAreaElement>("textarea").forEach((field) => {
        field.spellcheck = true;
      });
    };
    enableNativeSpellcheck(document);
    const observer = new MutationObserver((entries) => {
      entries.forEach((entry) => entry.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) enableNativeSpellcheck(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  const [me, setMe] = useState<any>();
  useEffect(() => {
    let active = true, sequence = 0;
    const disconnect = connectCacheTabs();
    const verify = async () => {
      const request = ++sequence;
      sessionCache.pause();
      try {
        // Identity and CSRF are confirmed in one private response, rather than two serial round trips.
        const { csrf_token: csrfToken, ...user } = await api('/me', { cache: 'no-store' });
        if (!active || sequence !== request) return;
        const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
        if (meta && typeof csrfToken === 'string') {
          if (meta.content !== csrfToken) clearSessionCache(false);
          meta.content = csrfToken;
        }
        sessionCache.confirm(user.id, user.role, 'tab-local');
        setMe(user); setSidebarPinned(Boolean(user.sidebar_pinned));
      } catch { if (active && sequence === request) clearSessionCache(); }
    };
    const visibility = () => { if (document.hidden) { sequence++; sessionCache.pause(); } else void verify(); };
    const expired = () => { sequence++; clearSessionCache(); };
    const verified = () => { void verify(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('arl-cache-session-expired', expired);
    window.addEventListener('arl-cache-verify', verified);
    void verify();
    return () => {
      active = false; sequence++; disconnect(); sessionCache.clear();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('arl-cache-session-expired', expired);
      window.removeEventListener('arl-cache-verify', verified);
    };
  }, []);
  const toggleSidebarPinned = async () => {
    const next = !sidebarPinned;
    setSidebarPinned(next);
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
      "expense-control": "expense-control",
      "post-sale": "post-sale",
      settings: "settings",
      services: "services",
      products: "products",
      suppliers: "suppliers",
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
  const [ordersTab, setOrdersTab] = useState<string | undefined>(() =>
    new URLSearchParams(location.search).get("tab") === "finalized"
      ? "finalized"
      : undefined,
  );
  const [clientHistoryOrigin, setClientHistoryOrigin] = useState<{
    clientId: number;
    orderId: number;
  }>();
  const [newOrderClient, setNewOrderClient] = useState<Client>();
  const [openingFallback, setOpeningFallback] = useState<{ id: number; url: string }>();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileQuickEntry, setMobileQuickEntry] = useState(false);
  const [mobileLogoutConfirm, setMobileLogoutConfirm] = useState(false);
  const [mobileLogoutBusy, setMobileLogoutBusy] = useState(false);
  const mobileLayout = layout === "mobile";
  useEffect(() => {
    if (mobileLayout) setMobileMenu(false);
  }, [mobileLayout]);
  const canAdminister = me?.role === "Master" || me?.role === "Administrador";
  const navigationRefresh = useRef<{ accountId?: number; last: number | null; sequence: number }>({ last: null, sequence: 0 });
  const loadNavigationSummary = (force = false) => {
    if (!me || me.role === "Controle de Gasto") return;
    const state = navigationRefresh.current;
    if (state.accountId !== me.id) {
      state.accountId = me.id;
      state.last = null;
      state.sequence++;
      setNavSummary({ open_orders: 0, available_post_sales: 0 });
    }
    const now = Date.now();
    if (!force && state.last !== null && now - state.last < 30_000) return;
    state.last = now;
    const sequence = ++state.sequence;
    return api("/navigation-summary")
      .then((summary) => { if (navigationRefresh.current.sequence === sequence) setNavSummary(summary); })
      .catch(() => { if (navigationRefresh.current.sequence === sequence) state.last = null; });
  };
  const countersChanged = () => { void loadNavigationSummary(true); };
  useEffect(() => {
    if (me && me.role !== "Controle de Gasto") void loadNavigationSummary();
  }, [me, page, detail]);
  const logout = async () => {
    clearSessionCache();
    navigationRefresh.current.sequence++;
    navigationRefresh.current.last = null;
    await fetch("/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN":
          document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content || "",
      },
    });
    location.assign("/login");
  };
  const go = (p: Page, id?: number, action?: "edit" | "reopen", ordersInitialTab?: string) => {
    setOrderAction(action);
    if (p === "desk") p = "dashboard";
    if (p === "orders" && !id) setOrdersTab(ordersInitialTab);
    if (p !== "new") setNewOrderClient(undefined);
    setClientHistoryOrigin(undefined);
    setPage(p);
    setDetail(id);
    setMobileMenu(false);
    history.replaceState(
      null,
      "",
      id
        ? `/orders/${id}`
        : p === "dashboard"
          ? "/"
          : p === "orders" && ordersInitialTab
            ? `/orders?tab=${ordersInitialTab}`
            : `/${p}`,
    );
  };
  useEffect(() => {
    const openOrder = (event: Event) =>
      go("orders", (event as CustomEvent<number>).detail);
    window.addEventListener("arl-open-order", openOrder);
    return () => window.removeEventListener("arl-open-order", openOrder);
  }, [mobileLayout]);
  const expenseOnly = me?.role === "Controle de Gasto";
  const roleAllowed = (p: Page) =>
    expenseOnly ? p === "expense-control"
    : me?.role === "Usuário local" ? ["dashboard", "orders", "clients", "new"].includes(p)
    : p === "expense-control" ? canAdminister
    : p === "users"
      ? me?.role === "Master"
      : ["finance", "services", "products", "suppliers", "settings"].includes(p)
        ? me?.role === "Master" || me?.role === "Administrador"
        : true;
  useEffect(() => {
    if (me && !roleAllowed(page)) {
      setPage(expenseOnly ? "expense-control" : "dashboard");
      setDetail(undefined);
      history.replaceState(null, "", expenseOnly ? "/expense-control" : "/");
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
        ["Fornecedores", "suppliers", Truck],
      ],
    },
    {
      label: "Gestão",
      items: [
        ["Financeiro", "finance", Wallet],
        ["Controle de Gasto", "expense-control", CircleDollarSign],
        ["Pós-Venda", "post-sale", Phone],
      ],
    },
    {
      label: "Administração",
      items: [
        ["Configurações", "settings", Settings],
      ],
    },
  ] as const;
  return (
    <div
      className={`shell layout-${layout}${!mobileLayout && !sidebarPinned ? " sidebar-collapsed" : ""}${sidebarPinned ? " sidebar-pinned" : ""}`}
    >
      <aside
        className={mobileMenu ? "open" : ""}
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
        {!expenseOnly && <button
          type="button"
          className={`new-order-shortcut${page === "new" ? " active" : ""}`}
          onClick={() => go("new")}
          title="Nova OS"
        >
          <Plus />
          <span>Nova OS</span>
        </button>}
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
                      className={page === p || (p === "settings" && page === "users") ? "active" : ""}
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
            <span>{sidebarPinned ? "Fixado" : "Fixar"}</span>
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
        data-arl-expense-control-react={page === "expense-control" || expenseOnly ? "1" : undefined}
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
          {!mobileLayout && (
            <button
              className="menu-toggle"
              aria-label="Abrir menu"
              onClick={() => setMobileMenu(true)}
            >
              <Menu />
            </button>
          )}
          <div className="mobile-logo">
            <strong>
              {mobileLayout && page === "dashboard" && !detail
                ? "OS abertas"
                : "ARL"}
            </strong>
          </div>
          {mobileLayout && (
            <div className="mobile-header-actions">
              {canAdminister && page === "dashboard" && !detail && (
                <button
                  type="button"
                  className="mobile-quick-entry"
                  aria-label="Abrir Entrada Rápida"
                  onClick={() => setMobileQuickEntry(true)}
                >
                  <Wallet />
                </button>
              )}
              <button
                type="button"
                className="mobile-logout"
                aria-label="Sair da conta"
                onClick={() => setMobileLogoutConfirm(true)}
              >
                <LogOut />
              </button>
            </div>
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
          {!expenseOnly && <NotificationBell go={go} />}
        </header>
        {detail && openingFallback?.id === detail && <div className="notice" role="status">A OS foi criada. O navegador não abriu o WhatsApp. <a href={openingFallback.url} target="_blank" rel="noreferrer" onClick={() => setOpeningFallback(undefined)}>Abrir mensagem de abertura no WhatsApp</a> <button type="button" onClick={() => setOpeningFallback(undefined)}>Dispensar</button></div>}
        {!me ? <p role="status">Carregando sessão…</p> : expenseOnly || page === "expense-control" ? (
          <ExpenseControlPage mobile={mobileLayout} />
        ) : detail ? (
          <OrderDetailPage
            onCountersChanged={countersChanged}
            authenticatedRole={me.role || ""}
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
          <CacheBoundary><Dashboard go={go} role={me?.role} mobileLayout={mobileLayout} onCountersChanged={countersChanged} /></CacheBoundary>
        ) : page === "orders" ? (
          <CacheBoundary><Orders open={go} role={me?.role} initialTab={ordersTab} onCountersChanged={countersChanged} /></CacheBoundary>
        ) : page === "clients" ? (
          <CacheBoundary><Clients
            role={me?.role}
            initialClientId={clientHistoryOrigin?.clientId}
            onHistoryClose={
              clientHistoryOrigin
                ? () => go("orders", clientHistoryOrigin.orderId)
                : undefined
            }
            openOrder={(id: number) => go("orders", id)}
            onNewOrderForClient={(client: Client) => {
              setNewOrderClient(client);
              go("new");
            }}
          /></CacheBoundary>
        ) : page === "finance" ? (
          <FinancePage
            role={me?.role}
            openOrder={(id: number) => go("orders", id)}
          />
        ) : page === "post-sale" ? (
          <PostSalePage onCountersChanged={countersChanged} />
        ) : page === "services" ? (
          <ServicesCatalogPage />
        ) : page === "products" ? (
          <ProductsCatalogPage />
        ) : page === "suppliers" ? (
          <SuppliersPage />
        ) : page === "users" ? (
          <SettingsPage role={me?.role} initialSection="users" />
        ) : page === "settings" ? (
          <SettingsPage role={me?.role} />
        ) : (
          <NewOrder initialClient={newOrderClient} done={(id: number, fallback?: string) => { setOpeningFallback(fallback ? { id, url: fallback } : undefined); countersChanged(); go("orders", id); }} />
        )}
      </main>
      {mobileLayout && !expenseOnly && <MobileBottomBar go={go} page={page} canExpenses={canAdminister} />}
      <QuickEntry
        open={mobileQuickEntry}
        onClose={() => setMobileQuickEntry(false)}
      />
      {mobileLogoutConfirm && (
        <div className="modal">
          <section className="modal-card mobile-logout-confirm" role="dialog" aria-modal="true" aria-label="Confirmar saída">
            <h1>Deseja realmente sair?</h1>
            <p>Sua sessão será encerrada neste dispositivo.</p>
            <div className="actions">
              <button type="button" disabled={mobileLogoutBusy} onClick={() => setMobileLogoutConfirm(false)}>Cancelar</button>
              <button type="button" className="primary" disabled={mobileLogoutBusy} onClick={() => { setMobileLogoutBusy(true); void logout(); }}>
                {mobileLogoutBusy ? "Saindo…" : "Sair"}
              </button>
            </div>
          </section>
        </div>
      )}
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
