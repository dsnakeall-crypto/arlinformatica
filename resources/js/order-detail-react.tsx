import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  FileText,
  History,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import ServiceProductSearch, {
  type ServiceProductCatalogItem,
} from "./service-product-search";
import OrderAuditHistory from "./order-audit-history";
import "../css/order-detail-layout.css";
import { OrderPaymentFigures } from "./finance-refund-summary";
import { isReopenedOrder } from "./order-reopened";
import TextImprovement from "./text-improvement";
import { centsFromMoneyInput, maskMoneyInput, moneyInputFromCents } from "./money-input";

type Props = {
  reopenOnLoad?: boolean;
  id: number;
  back: () => void;
  onEdit?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onOpenClientHistory?: (clientId: number) => void;
};
type ApiError = Error & { errors?: Record<string, string[]> };
type PaymentSummary = {
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  collectible_balance_cents: number;
  status: "unpaid" | "partial" | "paid";
  payments: any[];
  refunded_cents: number;
  refundable_cents: number;
  refunds: any[];
};

// Registro preservado para futura reativação; a navegação de PDFs permanece no botão PDF's.
const SHOW_ORDER_RECORD = false;

const csrf = () =>
  document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
  "";
const api = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(`/api${url}`, {
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
  const body = await response
    .json()
    .catch(() => ({ message: "Resposta inválida do servidor." }));
  if (!response.ok)
    throw Object.assign(
      new Error(body.message || "Não foi possível concluir."),
      { errors: body.errors },
    ) as ApiError;
  return body;
};

const digits = (value: unknown) =>
  typeof value === "string" ? value.replace(/\D/g, "") : "";
const whatsappText = (message: string) => encodeURIComponent(message);
const masks = {
  document: (value: unknown) => {
    const n = digits(value).slice(0, 14);
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
  phone: (value: unknown) =>
    digits(value)
      .slice(0, 11)
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2"),
};

const money = (cents = 0) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
const formatOptionalDate = (value: unknown, fallback = "—") => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};
const statusLabel: Record<string, string> = {
  analysis: "Em Análise",
  waiting_part: "Aguardando Peça",
  in_service: "Em Serviço",
  completed: "Finalizado",
  interrupted: "Interrompido",
  awaiting_payment: "Aguardando PGTO",
  paid: "Pago",
};
const paymentMethodLabel = (value: string) =>
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

function TextField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  name,
}: any) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
      />
    </label>
  );
}

export function CameraModal({
  onClose,
  onFile,
}: {
  onClose: () => void;
  onFile: (file: File) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      .then((media) => {
        if (!active) return media.getTracks().forEach((track) => track.stop());
        stream.current = media;
        if (video.current) video.current.srcObject = media;
      })
      .catch((reason) =>
        setError(reason?.message || "Não foi possível acessar a câmera."),
      );
    return () => {
      active = false;
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  const shot = () => {
    const source = video.current;
    if (!source?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    canvas.getContext("2d")?.drawImage(source, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onFile(
          new File([blob], `camera-${Date.now()}.webp`, { type: "image/webp" }),
        );
      },
      "image/webp",
      0.86,
    );
  };
  return (
    <div
      className="arl-camera-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Capturar foto"
    >
      <div className="arl-camera-card">
        <button className="arl-camera-close" type="button" onClick={onClose}>
          ×
        </button>
        <h2>Capturar foto</h2>
        <p>A imagem será anexada diretamente à ordem de serviço.</p>
        <video ref={video} autoPlay playsInline muted />
        <div className="arl-camera-error">{error}</div>
        <div className="arl-camera-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" onClick={shot}>
            ◉ Tirar foto
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoChoice({
  onClose,
  onUpload,
  onCamera,
}: {
  onClose: () => void;
  onUpload: () => void;
  onCamera: () => void;
}) {
  return (
    <div
      className="arl-photo-choice"
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar foto"
    >
      <div>
        <h3>Adicionar foto</h3>
        <button type="button" className="primary" onClick={onUpload}>
          Enviar arquivo
        </button>
        <button type="button" onClick={onCamera}>
          Usar câmera / webcam
        </button>
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function EditOrderModal({ order, onClose, onSaved }: any) {
  const [attendance, setAttendance] = useState(order.attendance_type);
  const [problem, setProblem] = useState(order.reported_problem);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void api(`/catalogs/checklist?equipment_type_id=${order.equipment_type_id}`)
      .then((rows: any[]) => {
        setTemplates(rows);
        const names = new Set(
          (order.checklists || []).map((row: any) => row.label),
        );
        setSelected(
          new Set(
            rows.filter((row) => names.has(row.label)).map((row) => row.id),
          ),
        );
      })
      .catch((reason) => setError(reason.message));
  }, [order]);
  const toggle = (id: number, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await api(`/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          attendance_type: attendance,
          reported_problem: problem.trim(),
          checklist: Array.from(selected).map((template_id) => ({
            template_id,
          })),
        }),
      });
      onSaved(updated);
    } catch (reason: any) {
      setError(
        (Object.values(reason.errors || {}).flat()[0] as string) ||
          reason.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="arl-od-modal">
      <section
        className="arl-od-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Editar OS #${order.number}`}
      >
        <h2>Editar OS #{order.number}</h2>
        <p>
          Corrija o relato e o checklist da OS ativa. Pagamentos são corrigidos
          separadamente e ficam auditados.
        </p>
        <label>
          Atendimento
          <select
            value={attendance}
            onChange={(e) => setAttendance(e.target.value)}
          >
            <option value="bench">Bancada</option>
            <option value="external">Externo</option>
          </select>
        </label>
        <label>
          Problema relatado
          <textarea
            spellCheck={true}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
          />
          <TextImprovement value={problem} onUse={setProblem} />
        </label>
        <label>Checklist selecionado</label>
        <div className="arl-od-checks">
          {templates.length ? (
            templates.map((row) => (
              <label key={row.id}>
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={(e) => toggle(row.id, e.target.checked)}
                />
                {row.label}
              </label>
            ))
          ) : (
            <span>Nenhuma opção para este equipamento.</span>
          )}
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="arl-od-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={save}
          >
            {busy ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ImmutableModal({ order, onClose }: any) {
  const preservedState = order.archived
    ? "paga e arquivada"
    : order.status === "interrupted"
      ? "interrompida e fechada"
      : "finalizada";
  return (
    <div className="arl-od-modal">
      <section
        className="arl-od-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Editar OS #${order.number}`}
      >
        <h2>OS #{order.number} preservada</h2>
        <p>
          Esta OS está {preservedState} e o conteúdo histórico não pode ser
          alterado.{" "}
          {order.status === "interrupted"
            ? "Uma OS interrompida não pode ser reaberta; um novo atendimento exige uma nova OS."
            : "A reabertura preserva o histórico da finalização anterior."}
        </p>
        <div className="arl-od-actions">
          <button type="button" className="primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </section>
    </div>
  );
}

function InterruptionModal({ order, onClose, onSaved }: any) {
  const [reason, setReason] = useState(
    order.status === "interrupted"
      ? order.interruption_reason || order.technical_report || ""
      : "",
  );
  const [workDone, setWorkDone] = useState(
    order.status === "interrupted" ? order.interruption_work_done || "" : "",
  );
  const [error, setError] = useState("");
  const save = async () => {
    if (!reason.trim()) {
      setError("Informe o motivo da interrupção.");
      return;
    }
    if (!workDone.trim()) {
      setError(
        'Informe o que já foi feito no equipamento. Se nada foi feito, escreva "Nada".',
      );
      return;
    }
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
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <div className="arl-status-modal">
      <section
        className="arl-status-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Interromper OS"
      >
        <h2>Interromper OS</h2>
        <p className="arl-status-modal-note">
          A OS será fechada sem lançamento financeiro. Os serviços serão
          removidos e o total ficará zerado.
        </p>
        <label>
          Motivo da interrupção
          <textarea
            spellCheck={true}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: cliente pediu pausa, aguardando decisão, atendimento suspenso..."
          />
        </label>
        <label>
          O que já foi feito no equipamento? *
          <textarea
            spellCheck={true}
            aria-label="O que já foi feito no equipamento"
            value={workDone}
            onChange={(e) => setWorkDone(e.target.value)}
            placeholder='Se nada foi feito, escreva "Nada".'
          />
        </label>
        <div className="arl-status-modal-error">{error}</div>
        <div className="arl-status-modal-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary" onClick={save}>
            Salvar interrupção
          </button>
        </div>
      </section>
    </div>
  );
}

function ServicesPanel({ order, reload, pendingSaveRef, onDirtyChange }: any) {
  const [catalog, setCatalog] = useState<ServiceProductCatalogItem[]>([]);
  const [items, setItems] = useState<any[]>(() =>
    (order.items || [])
      .filter((row: any) => !row.finalization_id && row.catalog_id)
      .map((row: any) => ({
        catalog_id: Number(row.catalog_id),
        description: row.description,
        quantity: Number(row.quantity),
        unit_price_cents: Number(row.unit_price_cents),
      })),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    void api("/catalogs/items").then((rows) =>
      setCatalog(
        Array.isArray(rows)
          ? rows.filter((row: any) => row.active !== false)
          : [],
      ),
    );
  }, [order.id]);
  useEffect(() => {
    setItems(
      (order.items || [])
        .filter((row: any) => !row.finalization_id && row.catalog_id)
        .map((row: any) => ({
          catalog_id: Number(row.catalog_id),
          description: row.description,
          quantity: Number(row.quantity),
          unit_price_cents: Number(row.unit_price_cents),
        })),
    );
    setDirty(false);
    onDirtyChange?.(false);
  }, [order.items]);
  useEffect(
    () => () => {
      pendingSaveRef.current = null;
      onDirtyChange?.(false);
    },
    [order.id, pendingSaveRef],
  );
  if (order.archived || ["completed", "interrupted"].includes(order.status))
    return null;
  const changeItems = (updater: (current: any[]) => any[]) => {
    setMessage("");
    setItems(updater);
    setDirty(true);
    onDirtyChange?.(true);
  };
  const add = (entry: ServiceProductCatalogItem, quantity = 1) =>
    changeItems((current) => {
      const found = current.find((row) => row.catalog_id === Number(entry.id));
      return found
        ? current.map((row) =>
            row.catalog_id === Number(entry.id)
              ? { ...row, quantity: Math.min(999, row.quantity + quantity) }
              : row,
          )
        : [
            ...current,
            {
              catalog_id: Number(entry.id),
              description: entry.name,
              quantity,
              unit_price_cents: Number(entry.price_cents),
            },
          ];
    });
  const persist = async (notify = false) => {
    if (!dirty) {
      if (notify) setMessage("Serviços já estão salvos.");
      return order;
    }
    setBusy(true);
    if (notify) setMessage("");
    try {
      const updated = await api(`/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          items: items.map((row) => ({
            catalog_id: row.catalog_id,
            quantity: row.quantity,
          })),
        }),
      });
      setDirty(false);
      onDirtyChange?.(false);
      if (notify) setMessage("Serviços salvos.");
      await reload();
      return updated;
    } catch (e: any) {
      if (notify) setMessage(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  pendingSaveRef.current = () => persist(false);
  const save = async () => {
    try {
      await persist(true);
    } catch {
      /* mensagem já exibida */
    }
  };
  return (
    <section className="wide arl-od-services">
      <h2>Serviços / Produtos</h2>
      <p>
        Independente do orçamento: registre o que realmente foi feito e a
        quantidade.
      </p>
      <ServiceProductSearch
        items={catalog}
        ariaLabel="Pesquisar Serviço / Produto"
        onSelect={add}
      />
      <div className="arl-od-lines">
        {items.length ? (
          items.map((row, index) => (
            <div className="arl-od-line" key={`${row.catalog_id}-${index}`}>
              <b>{row.description}</b>
              <input
                aria-label={`Quantidade de ${row.description}`}
                type="number"
                min="1"
                max="999"
                value={row.quantity}
                onChange={(e) =>
                  changeItems((current) =>
                    current.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            quantity: Math.max(
                              1,
                              Math.min(999, Number(e.target.value) || 1),
                            ),
                          }
                        : item,
                    ),
                  )
                }
              />
              <span>{money(row.quantity * row.unit_price_cents)}</span>
              <button
                type="button"
                aria-label={`Remover ${row.description}`}
                onClick={() =>
                  changeItems((current) =>
                    current.filter((_, i) => i !== index),
                  )
                }
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <p>Nenhum serviço adicionado.</p>
        )}
      </div>
      <div className="arl-od-foot">
        <span>{message}</span>
        <strong>
          Subtotal:{" "}
          {money(
            items.reduce(
              (sum, row) => sum + row.quantity * row.unit_price_cents,
              0,
            ),
          )}
        </strong>
        <button
          type="button"
          className="primary arl-od-save"
          disabled={busy}
          onClick={save}
        >
          {busy ? "Salvando…" : "Salvar serviços"}
        </button>
      </div>
    </section>
  );
}

function FinalReportPanel({
  order,
  value,
  setValue,
  reload,
  onDirtyChange,
}: any) {
  const [message, setMessage] = useState("");
  const readOnly = Boolean(
    order.archived || ["completed", "interrupted"].includes(order.status),
  );
  const save = async () => {
    setMessage("");
    try {
      await api(`/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({ final_report: value.trim() || null }),
      });
      onDirtyChange?.(false);
      setMessage("Salvo.");
      await reload();
    } catch (e: any) {
      setMessage(e.message);
    }
  };
  return (
    <section className="wide arl-od-report">
      <h2>Laudo Final</h2>
      <p>
        O que foi feito, pontos de atenção e recomendações. Este texto sai no
        PDF final.
      </p>
      <textarea
        spellCheck={true}
        readOnly={readOnly}
        placeholder="Descreva o serviço executado e observações..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onDirtyChange?.(true);
        }}
      />
      {!readOnly && (
        <TextImprovement
          value={value}
          onUse={(text) => {
            setValue(text);
            onDirtyChange?.(true);
          }}
        />
      )}
      {!readOnly && (
        <div className="arl-od-report-actions">
          <small>{message}</small>
          <button type="button" className="primary arl-od-save" onClick={save}>
            Salvar Laudo Final
          </button>
        </div>
      )}
    </section>
  );
}

function BudgetBox({ order, role, openSignal = 0 }: any) {
  const statusName: Record<string, string> = {
    draft: "Rascunho",
    sent: "Enviado",
    approved: "Aprovado",
    refused: "Recusado",
  };
  const isFinalized = ["completed", "interrupted"].includes(order.status);
  const [list, setList] = useState<any[]>([]),
    [open, setOpen] = useState(false),
    [validity, setValidity] = useState(7),
    [catalog, setCatalog] = useState<ServiceProductCatalogItem[]>([]),
    [items, setItems] = useState<any[]>([]),
    [error, setError] = useState("");
  const [diagnosis, setDiagnosis] = useState(""),
    [proposal, setProposal] = useState(""),
    [observation, setObservation] = useState("");
  const load = () => api(`/orders/${order.id}/budgets`).then(setList);
  useEffect(() => {
    void load();
    void Promise.all([api("/operational-settings"), api("/catalogs/items")])
      .then(([settings, services]) => {
        setValidity(+settings.budget_validity_days || 7);
        setCatalog(services);
      })
      .catch(() => undefined);
  }, [order.id]);
  useEffect(() => {
    if (openSignal && !isFinalized) setOpen(true);
  }, [openSignal, isFinalized]);
  const add = (entry: ServiceProductCatalogItem, quantity = 1) =>
    setItems((current) => {
      const found = current.find((row) => row.catalog_id === entry.id);
      return found
        ? current.map((row) =>
            row === found
              ? { ...row, quantity: Math.min(999, row.quantity + quantity) }
              : row,
          )
        : [
            ...current,
            {
              catalog_id: entry.id,
              description: entry.name,
              quantity,
              unit_price_cents: entry.price_cents,
              warranty_enabled: !!entry.warranty_enabled,
              warranty_term: entry.warranty_term,
              warranty_unit: entry.warranty_unit,
            },
          ];
    });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!items.length) {
      setError("Adicione ao menos um serviço ou produto do catálogo.");
      return;
    }
    try {
      await api(`/orders/${order.id}/budgets`, {
        method: "POST",
        body: JSON.stringify({
          diagnosis,
          proposal,
          observation,
          validity_days: validity,
          items,
        }),
      });
      setOpen(false);
      setItems([]);
      setDiagnosis("");
      setProposal("");
      setObservation("");
      await load();
    } catch (e: any) {
      setError(
        (Object.values(e.errors || {}).flat()[0] as string) || e.message,
      );
    }
  };
  const remove = async (budget: any) => {
    if (
      !window.confirm(
        `Excluir o orçamento Revisão ${budget.revision}? O PDF já emitido continuará preservado.`,
      )
    )
      return;
    setError("");
    try {
      await api(`/orders/${order.id}/budgets/${budget.revision}`, {
        method: "DELETE",
      });
      setList((current) => current.filter((entry) => entry.id !== budget.id));
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <section className="wide">
      <div className="section-title">
        <h2>Orçamentos</h2>
        {!isFinalized && (
          <button
            className="primary"
            data-arl-quick-source="budget"
            onClick={() => setOpen(true)}
          >
            <Plus />
            Gerar orçamento
          </button>
        )}
      </div>
      {open && (
        <div className="modal">
          <form
            className="modal-card budget-form"
            role="dialog"
            aria-modal="true"
            aria-label="Gerar orçamento"
            onSubmit={submit}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Fechar orçamento"
              onClick={() => setOpen(false)}
            >
              <X />
            </button>
            <h1>Gerar orçamento</h1>
            <label className="field">
              <span>Diagnóstico</span>
              <textarea
                spellCheck={true}
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Serviço proposto</span>
              <textarea
                spellCheck={true}
                required
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
              />
            </label>
            <TextField
              label="Validade (dias)"
              value={validity}
              onChange={(e: any) => setValidity(+e.target.value)}
              required
            />
            <ServiceProductSearch
              items={catalog}
              ariaLabel="Buscar serviço ou produto para o orçamento"
              onSelect={add}
              context="budget"
              browseButtonLabel="Adicionar serviços"
            />
            <div className="arl-od-lines">
              {items.map((row, index) => (
                <div className="finish-item" key={`${row.catalog_id}-${index}`}>
                  <b>{row.description}</b>
                  <input
                    aria-label={`Quantidade de ${row.description}`}
                    type="number"
                    min="1"
                    max="999"
                    value={row.quantity}
                    onChange={(e) =>
                      setItems(
                        items.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                quantity: Math.max(1, +e.target.value || 1),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Valor unitário de ${row.description}`}
                    value={moneyInputFromCents(row.unit_price_cents)}
                    onChange={(e) =>
                      setItems(
                        items.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                unit_price_cents: centsFromMoneyInput(e.target.value),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  <span>{money(row.quantity * row.unit_price_cents)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setItems(items.filter((_, i) => i !== index))
                    }
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <label className="field">
              <span>Observação (opcional)</span>
              <textarea
                spellCheck={true}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />
            </label>
            <strong>
              Total:{" "}
              {money(
                items.reduce(
                  (sum, row) => sum + row.quantity * row.unit_price_cents,
                  0,
                ),
              )}
            </strong>
            {error && <div className="alert">{error}</div>}
            <div className="actions">
              <button type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="primary">Salvar e gerar PDF</button>
            </div>
          </form>
        </div>
      )}
      {error && !open && <div className="alert">{error}</div>}
      {list.length ? (
        list.map((budget) => (
          <p className="arl-budget-row" key={budget.id}>
            Revisão {budget.revision} ·{" "}
            {statusName[budget.status] || budget.status} ·{" "}
            {money(budget.total_cents)} ·{" "}
            <a
              target="_blank"
              rel="noreferrer"
              href={`/api/orders/${order.id}/budgets/${budget.revision}/pdf`}
            >
              Abrir PDF
            </a>{" "}
            {!isFinalized && budget.status === "draft" && (
              <button
                onClick={() =>
                  api(`/orders/${order.id}/budgets/${budget.revision}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "sent" }),
                  }).then(load)
                }
              >
                Marcar enviado
              </button>
            )}
            {!isFinalized && budget.status === "sent" && (
              <>
                <button
                  onClick={() =>
                    api(
                      `/orders/${order.id}/budgets/${budget.revision}/status`,
                      {
                        method: "PATCH",
                        body: JSON.stringify({ status: "approved" }),
                      },
                    ).then(load)
                  }
                >
                  Aprovar orçamento
                </button>
                <button
                  onClick={() =>
                    api(
                      `/orders/${order.id}/budgets/${budget.revision}/status`,
                      {
                        method: "PATCH",
                        body: JSON.stringify({ status: "refused" }),
                      },
                    ).then(load)
                  }
                >
                  Recusar
                </button>
              </>
            )}
            {!isFinalized &&
              ["Master", "Administrador"].includes(role) &&
              !budget.used_in_finalization && (
                <button type="button" onClick={() => void remove(budget)}>
                  Excluir orçamento
                </button>
              )}
          </p>
        ))
      ) : (
        <p>Nenhum orçamento criado.</p>
      )}
    </section>
  );
}

function PaymentCorrection({ order, payment, onClose, onSaved }: any) {
  const [value, setValue] = useState(
    moneyInputFromCents(payment.effective_cents),
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    const cents = centsFromMoneyInput(value);
    if (!Number.isFinite(cents) || cents < 0 || reason.trim().length < 3) {
      setError("Informe valor e motivo válidos.");
      return;
    }
    try {
      await api(`/finance/transactions/${payment.transaction_id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ new_cents: cents, reason: reason.trim() }),
      });
      onSaved();
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <div className="arl-od-modal">
      <section
        className="arl-od-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Corrigir pagamento da OS #${order.number}`}
      >
        <h2>Corrigir pagamento da OS #{order.number}</h2>
        <p>A correção mantém o lançamento original e fica auditada.</p>
        <label>
          Novo valor (R$)
          <input value={value} onChange={(e) => setValue(maskMoneyInput(e.target.value))} />
        </label>
        <label>
          Motivo
          <textarea
            spellCheck={true}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {error && <div className="alert">{error}</div>}
        <div className="arl-od-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary" onClick={save}>
            Salvar correção
          </button>
        </div>
      </section>
    </div>
  );
}

function RefundModal({ order, maximum, onClose, onSaved }: any) {
  const [value, setValue] = useState(
      moneyInputFromCents(maximum),
    ),
    [reason, setReason] = useState(""),
    [method, setMethod] = useState("pix"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const save = async () => {
    const cents = centsFromMoneyInput(value);
    setBusy(true);
    setError("");
    try {
      await api(`/orders/${order.id}/refunds`, {
        method: "POST",
        body: JSON.stringify({
          amount_cents: cents,
          reason: reason.trim(),
          method,
        }),
      });
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
    <div className="arl-od-modal">
      <section
        className="arl-od-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Registrar estorno da OS #${order.number}`}
      >
        <h2>Registrar estorno</h2>
        <p>
          O valor original da OS será preservado. A devolução será uma saída
          financeira na data de hoje.
        </p>
        <TextField
          label="Valor devolvido (R$)"
          value={value}
          onChange={(e: any) => setValue(maskMoneyInput(e.target.value))}
          required
        />
        <label>
          Motivo obrigatório
          <textarea
            spellCheck={true}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <label>
          Forma de devolução
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {[
              ["pix", "Pix"],
              ["cash", "Dinheiro"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="notice">
          Disponível para estorno: <b>{money(maximum)}</b>
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="arl-od-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={save}
          >
            {busy ? "Registrando…" : "Confirmar estorno"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PaymentBox({ order, role, openSignal = 0, onSummary }: any) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null),
    [open, setOpen] = useState(false),
    [method, setMethod] = useState("pix"),
    [amount, setAmount] = useState("0,00"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [correcting, setCorrecting] = useState<any>(),
    [refunding, setRefunding] = useState(false);
  const load = async () => {
    const next = (await api(`/orders/${order.id}/payments`)) as PaymentSummary;
    setSummary(next);
    setAmount(
      moneyInputFromCents(next.collectible_balance_cents || 0),
    );
    onSummary?.(next);
  };
  useEffect(() => {
    void load();
  }, [order.id, order.total_cents]);
  useEffect(() => {
    if (
      openSignal &&
      summary &&
      summary.collectible_balance_cents > 0 &&
      summary.total_cents > 0
    ) {
      setAmount(
        moneyInputFromCents(summary.collectible_balance_cents),
      );
      setError("");
      setOpen(true);
    }
  }, [openSignal]);
  if (order.status === "interrupted")
    return (
      <section className="wide arl-payment-empty">
        <h2>Pagamento</h2>
        <p>
          OS interrompida não gera pagamento, A Receber ou lançamento no Caixa.
        </p>
      </section>
    );
  if (!summary)
    return (
      <section className="wide">
        <h2>Pagamento</h2>
        <p>Carregando situação do pagamento…</p>
      </section>
    );
  const {
    total_cents: total,
    paid_cents: paid,
    collectible_balance_cents: balance,
  } = summary;
  const entered = centsFromMoneyInput(amount),
    remainingAfter = Number.isFinite(entered)
      ? Math.max(0, balance - entered)
      : balance;
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
  const compact = summary.status !== "unpaid" || summary.payments.length > 0;
  return (
    <section
      className={`wide ${compact ? "arl-payment-compact" : "arl-payment-empty"}`}
    >
      <div className="section-title">
        <div>
          <h2>Pagamento</h2>
          <p>Registro financeiro independente do status operacional.</p>
        </div>
        <div className="actions">
          {order.status === "completed" && summary.refundable_cents > 0 && (
            <button type="button" onClick={() => setRefunding(true)}>
              Registrar estorno
            </button>
          )}
          {balance > 0 && total > 0 && (
            <button
              className="primary"
              data-arl-quick-source="payment"
              onClick={() => {
                setAmount((balance / 100).toFixed(2).replace(".", ","));
                setError("");
                setOpen(true);
              }}
            >
              <Wallet />
              {paid > 0 ? "Registrar novo pagamento" : "Registrar pagamento"}
            </button>
          )}
        </div>
      </div>
      <OrderPaymentFigures summary={summary} />
      {summary.payments.map((payment) => (
        <article className="transaction" key={payment.id}>
          <div>
            <b>{money(payment.effective_cents)}</b>
            <small>
              {paymentMethodLabel(payment.method)} ·{" "}
              {new Date(payment.paid_at).toLocaleString("pt-BR")} ·{" "}
              {payment.user_name}
            </small>
          </div>
          {["Master", "Administrador"].includes(role) && (
            <button
              type="button"
              className="arl-pay-edit"
              title="Corrigir valor pago"
              aria-label="Corrigir valor pago"
              onClick={() => setCorrecting(payment)}
            >
              <Pencil />
            </button>
          )}
        </article>
      ))}
      {summary.refunds?.map((refund) => (
        <article className="transaction arl-refund" key={`refund-${refund.id}`}>
          <div>
            <b>Estorno − {money(refund.amount_cents)}</b>
            <small>
              {paymentMethodLabel(refund.method)} ·{" "}
              {new Date(refund.refunded_at).toLocaleString("pt-BR")} ·{" "}
              {refund.user_name}
            </small>
            <small>Motivo: {refund.reason}</small>
          </div>
        </article>
      ))}
      {open && (
        <div className="modal">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={`Pagamento da OS #${order.number}`}
          >
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
            <TextField
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
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
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
      {refunding && (
        <RefundModal
          order={order}
          maximum={summary.refundable_cents}
          onClose={() => setRefunding(false)}
          onSaved={async () => {
            setRefunding(false);
            await load();
          }}
        />
      )}
      {correcting && (
        <PaymentCorrection
          order={order}
          payment={correcting}
          onClose={() => setCorrecting(null)}
          onSaved={async () => {
            setCorrecting(null);
            await load();
          }}
        />
      )}
    </section>
  );
}

function FinalizationBox({
  order,
  reload,
  openSignal = 0,
  finalReport,
  setFinalReport,
  persistPendingChanges,
  onFinalReportDirty,
}: any) {
  const seeded = (sourceOrder = order) =>
    (sourceOrder.items || [])
      .filter((row: any) => !row.finalization_id)
      .map((row: any) => {
        let warranty = row.warranty_snapshot;
        if (typeof warranty === "string")
          try {
            warranty = JSON.parse(warranty);
          } catch {
            warranty = null;
          }
        return {
          catalog_id: row.catalog_id,
          description: row.description,
          quantity: row.quantity,
          unit_price_cents: row.unit_price_cents,
          warranty_enabled: !!warranty,
          warranty_term: warranty?.term,
          warranty_unit: warranty?.unit,
          warranty_description: warranty?.description,
        };
      });
  const [open, setOpen] = useState(false),
    [discount, setDiscount] = useState("0"),
    [items, setItems] = useState<any[]>(seeded),
    [catalog, setCatalog] = useState<any[]>([]),
    [budgets, setBudgets] = useState<any[]>([]),
    [sourceBudgetId, setSourceBudgetId] = useState<number | null>(null),
    [showItemWarranties, setShowItemWarranties] = useState(false),
    [isPaid, setIsPaid] = useState(false),
    [paymentMethod, setPaymentMethod] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const loadLists = () =>
    Promise.all([
      api("/catalogs/items"),
      api(`/orders/${order.id}/budgets`),
    ]).then(([services, budgetRows]) => {
      setCatalog(services);
      setBudgets(budgetRows);
    });
  const openFinalization = async () => {
    setBusy(true);
    setError("");
    try {
      const persistedOrder = await persistPendingChanges();
      setItems(seeded(persistedOrder || order));
      setShowItemWarranties(false);
      setIsPaid(false);
      setPaymentMethod("");
      await loadLists();
      setOpen(true);
    } catch (e: any) {
      setError(
        (Object.values(e.errors || {}).flat()[0] as string) || e.message,
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void loadLists();
  }, [order.id]);
  useEffect(() => {
    setItems(seeded());
  }, [order.items]);
  useEffect(() => {
    if (openSignal) void openFinalization();
  }, [openSignal]);
  if (order.status === "completed")
    return (
      <section className="wide completion">
        <h2>Finalização da OS</h2>
        <b>Finalizado</b>
        <p>{order.technical_report}</p>
        <strong>Total: {money(order.total_cents)}</strong>
      </section>
    );
  if (order.status === "interrupted") return null;
  const approved = budgets.find((row) => row.status === "approved");
  const budgetItems = approved
    ? approved.items.map((row: any) => {
        let warranty = row.warranty_snapshot;
        if (typeof warranty === "string")
          try {
            warranty = JSON.parse(warranty);
          } catch {
            warranty = null;
          }
        return {
          catalog_id: row.catalog_id,
          description: row.description,
          quantity: row.quantity,
          unit_price_cents: row.unit_price_cents,
          warranty_enabled: !!warranty,
          warranty_term: warranty?.term,
          warranty_unit: warranty?.unit,
        };
      })
    : [];
  const shownItems = sourceBudgetId ? budgetItems : items,
    subtotal = shownItems.reduce(
      (sum: number, row: any) => sum + row.quantity * row.unit_price_cents,
      0,
    ),
    disc = centsFromMoneyInput(discount),
    total = Math.max(0, subtotal - disc);
  const closingMismatch =
    order.closing_reference_cents != null &&
    order.closing_reference_cents !== total;
  const updateClosingReference = async () => {
    if (!window.confirm(`Atualizar o valor combinado para ${money(total)}?`))
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/orders/${order.id}/closing-reference`, {
        method: "PATCH",
        body: JSON.stringify({ amount_cents: total }),
      });
      await reload();
    } catch (reason: any) {
      setError(reason.message || "Não foi possível atualizar o valor combinado.");
    } finally {
      setBusy(false);
    }
  };
  const add = (entry: ServiceProductCatalogItem, quantity = 1) => {
    setSourceBudgetId(null);
    setItems((current) => {
      const found = current.find((row) => row.catalog_id === entry.id);
      return found
        ? current.map((row) =>
            row === found
              ? { ...row, quantity: Math.min(999, row.quantity + quantity) }
              : row,
          )
        : [
            ...current,
            {
              catalog_id: entry.id,
              description: entry.name,
              quantity,
              unit_price_cents: entry.price_cents,
              warranty_enabled: !!entry.warranty_enabled,
              warranty_term: entry.warranty_term,
              warranty_unit: entry.warranty_unit,
            },
          ];
    });
  };
  const finish = async () => {
    if (!finalReport.trim()) {
      setError("Preencha o laudo para concluir a OS.");
      return;
    }
    if (isPaid && !paymentMethod) {
      setError("Escolha a forma de pagamento.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await persistPendingChanges();
      const payload: any = {
        technical_report: finalReport.trim(),
        discount_cents: disc,
        approved_budget_id: sourceBudgetId,
        photo_ids: (order.photos || []).map((row: any) => row.id),
        show_item_warranties: showItemWarranties,
        is_paid: isPaid,
        payment_method: isPaid ? paymentMethod : null,
      };
      if (!sourceBudgetId) payload.items = items;
      await api(`/orders/${order.id}/finalize`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setOpen(false);
      await reload();
    } catch (e: any) {
      setError(
        (Object.values(e.errors || {}).flat()[0] as string) || e.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!open && error && (
        <div className="alert arl-finalization-error">{error}</div>
      )}
      {open && (
        <div className="modal">
          <div
            className="modal-card arl-finalization"
            role="dialog"
            aria-modal="true"
            aria-label="FINALIZAÇÃO DA OS"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Fechar finalização"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
            <h1>FINALIZAÇÃO DA OS</h1>
            {order.closing_reference_cents != null && !closingMismatch && (
              <div className="notice arl-closing-reminder">
                Valor combinado em campo:{" "}
                <strong>{money(order.closing_reference_cents)}</strong>
              </div>
            )}
            {closingMismatch && (
              <div className="alert arl-closing-reminder">
                O total está diferente do valor combinado em campo ({money(order.closing_reference_cents)}).{" "}
                <button type="button" disabled={busy || total <= 0} onClick={() => void updateClosingReference()}>
                  Atualizar valor combinado
                </button>
              </div>
            )}
            <label className="field">
              <span>LAUDO TÉCNICO / DESCRIÇÃO DO ATENDIMENTO</span>
              <textarea
                spellCheck={true}
                value={finalReport}
                onChange={(e) => {
                  setFinalReport(e.target.value);
                  onFinalReportDirty?.(true);
                }}
              />
              <TextImprovement
                value={finalReport}
                onUse={(text) => {
                  setFinalReport(text);
                  onFinalReportDirty?.(true);
                }}
              />
            </label>
            <div className="section-title">
              <h2>Serviços da OS</h2>
              {approved && (
                <button
                  type="button"
                  onClick={() => setSourceBudgetId(approved.id)}
                >
                  USAR ITENS DO ORÇAMENTO APROVADO
                </button>
              )}
            </div>
            <div className="notice arl-final-note">
              A finalização pode usar os serviços cadastrados na OS ou os itens
              de um orçamento aprovado selecionado.
            </div>
            {sourceBudgetId && (
              <div className="notice">
                Itens vinculados ao orçamento aprovado. Preço, quantidade e
                garantia serão lidos diretamente do servidor.{" "}
                <button type="button" onClick={() => setSourceBudgetId(null)}>
                  Usar itens manuais
                </button>
              </div>
            )}
            {!sourceBudgetId && (
              <ServiceProductSearch
                items={catalog}
                ariaLabel="Pesquisar Serviço / Produto na finalização"
                onSelect={add}
                showBrowseAll
              />
            )}
            <div className="arl-finalization-items">
              {shownItems.map((row: any, index: number) => (
                <div
                  className="finish-item"
                  data-finalization-item="true"
                  key={`${row.catalog_id}-${index}`}
                >
                  <input
                    aria-label={`Descrição do item ${index + 1}`}
                    spellCheck={true}
                    disabled={!!sourceBudgetId}
                    value={row.description}
                    onChange={(e) =>
                      setItems(
                        items.map((item, i) =>
                          i === index
                            ? { ...item, description: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Quantidade de ${row.description}`}
                    disabled={!!sourceBudgetId}
                    type="number"
                    min="1"
                    max="999"
                    value={row.quantity}
                    onChange={(e) =>
                      setItems(
                        items.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                quantity: Math.max(
                                  1,
                                  Math.min(999, Number(e.target.value) || 1),
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Valor unitário de ${row.description}`}
                    disabled={!!sourceBudgetId}
                    inputMode="decimal"
                    value={moneyInputFromCents(row.unit_price_cents)}
                    onChange={(e) =>
                      setItems(
                        items.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                unit_price_cents: centsFromMoneyInput(e.target.value),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  <span>{money(row.quantity * row.unit_price_cents)}</span>
                  {!sourceBudgetId && (
                    <button
                      type="button"
                      className="arl-finalization-remove"
                      aria-label={`Remover ${row.description}`}
                      onClick={() =>
                        setItems(items.filter((_, i) => i !== index))
                      }
                    >
                      <X aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="arl-finalization-options">
              <label className="arl-finalization-warranty-toggle">
                <input
                  type="checkbox"
                  checked={showItemWarranties}
                  onChange={(event) =>
                    setShowItemWarranties(event.target.checked)
                  }
                />
                <span>Mostrar Garantia Serviço/Produto</span>
              </label>
              <label className="arl-finalization-payment-toggle">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(event) => {
                    setIsPaid(event.target.checked);
                    if (!event.target.checked) setPaymentMethod("");
                  }}
                />
                <span>OS já foi paga</span>
              </label>
              {isPaid && (
                <label className="field arl-finalization-payment-method">
                  <span>Forma de pagamento *</span>
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="cash">Dinheiro</option>
                    <option value="pix">Pix</option>
                    <option value="credit">Cartão de crédito</option>
                    <option value="debit">Cartão de débito</option>
                  </select>
                </label>
              )}
            </div>
            <div className="money">
              <span>
                Subtotal <b>{money(subtotal)}</b>
              </span>
              <label>
                Desconto (R$)
                <input
                  value={discount}
                  onChange={(e) => setDiscount(maskMoneyInput(e.target.value))}
                />
              </label>
              <strong>Total {money(total)}</strong>
            </div>
            {error && <div className="alert">{error}</div>}
            <div className="actions">
              <button type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                disabled={busy || closingMismatch}
                onClick={finish}
              >
                {busy ? "Finalizando…" : "Salvar e concluir OS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
    ]).then(([reports, rows]) => {
      setList(reports);
      setTemplates(rows);
      setTemplate((current: any) => current || rows[0]);
    });
  useEffect(() => {
    void load();
  }, [order.id]);
  const set = (key: string, value: any) =>
    setContent((current: any) => ({ ...current, [key]: value }));
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
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <section className="wide arl-old-report">
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
                setTemplate(templates.find((row) => row.id === +e.target.value))
              }
            >
              {templates
                .filter((row) => row.active)
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
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
          ].map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              {[
                "responsible_technician",
                "qualification",
                "certification",
                "equipment_situation",
              ].includes(key) ? (
                <input
                  value={content[key] || ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              ) : (
                <textarea
                  spellCheck={true}
                  value={content[key] || ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              )}
            </label>
          ))}
          {error && <div className="alert">{error}</div>}
          <button className="primary" onClick={issue}>
            Revisar, confirmar e emitir
          </button>
        </div>
      )}
      {list.map((row) => (
        <p key={row.id}>
          Laudo {row.template_name} · Revisão {row.revision} ·{" "}
          {row.status === "issued" ? "Emitido" : "Rascunho"}{" "}
          {row.status === "issued" && (
            <a
              target="_blank"
              rel="noreferrer"
              href={`/api/orders/${order.id}/reports/${row.revision}/pdf`}
            >
              Visualizar / imprimir / baixar
            </a>
          )}
        </p>
      ))}
    </section>
  );
}

function DocumentsBox({ order, embedded = false }: any) {
  const [docs, setDocs] = useState<any[]>([]);
  useEffect(() => {
    void api(`/orders/${order.id}/documents`).then(setDocs);
  }, [order.id, order.status]);
  const currentFinal = docs
    .filter((row) => row.type === "final")
    .sort((a, b) => b.revision - a.revision)[0];
  const visibleDocs = docs.filter(
    (row) => row.type !== "term" && row.type !== "final",
  );
  if (currentFinal) visibleDocs.unshift(currentFinal);
  const content = (
    <div className="documents">
      <a target="_blank" rel="noreferrer" href={`/api/orders/${order.id}/term`}>
        Termo de recebimento
      </a>
      {visibleDocs.map((row) => {
        const finalRecord = row.type === "final-record";
        const href =
          row.type === "final"
            ? `/api/orders/${order.id}/final/${row.revision}/pdf`
            : finalRecord
              ? `/api/orders/${order.id}/final-record/${row.revision}/pdf`
              : row.type === "technical-report"
                ? `/api/orders/${order.id}/reports/${row.revision}/pdf`
                : `/api/orders/${order.id}/budgets/${row.revision}/pdf`;
        const title =
          row.type === "final"
            ? "PDF Final"
            : finalRecord
              ? `Registro da Rev. ${row.revision} (substituída)`
              : row.type === "technical-report"
                ? "Laudo Técnico"
                : "Orçamento";
        return (
          <article
            className={finalRecord ? "arl-final-record-document" : undefined}
            key={row.id}
          >
            <div>
              <b>{title}</b>
              <small>
                Revisão {row.revision} ·{" "}
                {new Date(row.issued_at).toLocaleString("pt-BR")} ·{" "}
                {row.issued_by_name}
              </small>
            </div>
            <a target="_blank" rel="noreferrer" href={href}>
              Visualizar
            </a>
            <a href={href} download>
              Baixar PDF
            </a>
            <button
              onClick={() => {
                const popup = window.open(href);
                popup?.addEventListener("load", () => popup.print());
              }}
            >
              Imprimir
            </button>
          </article>
        );
      })}
    </div>
  );
  return embedded ? (
    <div className="arl-record-documents">{content}</div>
  ) : (
    <section className="wide">
      <h2>Documentos</h2>
      {content}
    </section>
  );
}

function finalWhatsappMessage(order: any, pdfUrl: string) {
  return [
    `Olá, ${order.client?.name || "cliente"}`,
    "",
    `Seu equipamento está pronto (${order.number}).`,
    "",
    "Detalhes do Serviço no link abaixo",
    pdfUrl,
    "",
    "",
    `- Valor: ${money(order.total_cents || 0)}`,
    "",
    "Formas de Pagamento: ",
    "",
    "- PIX (Chave): 35988285777 ",
    "- Cartão (com taxas) ",
    "- Dinheiro (favor trazer trocado)",
    "",
    "A retirada ou entrega será liberada imediatamente após a confirmação do pagamento.",
    "",
    "Agradecemos pela preferência!",
  ].join("\n");
}

function FinalShareCard({
  order,
  onLinkCreated,
}: {
  order: any;
  onLinkCreated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [shareError, setShareError] = useState("");
  const prepare = async (kind: "pdf" | "whatsapp") => {
    const target = window.open("about:blank", "_blank");
    setBusy(true);
    setShareError("");
    try {
      const freshShare = await api(`/orders/${order.id}/final-share`);
      onLinkCreated?.();
      const destination =
        kind === "pdf"
          ? freshShare.url
          : (() => {
              const phone = digits(order.client?.phone || "");
              const full = phone.startsWith("55") ? phone : `55${phone}`;
              if (!full)
                throw new Error("O cliente não possui telefone para WhatsApp.");
              return `https://wa.me/${full}?text=${whatsappText(finalWhatsappMessage(order, freshShare.url))}`;
            })();
      if (target) target.location.href = destination;
      else window.location.href = destination;
    } catch (reason: any) {
      target?.close();
      setShareError(reason.message || "Não foi possível gerar o link do PDF.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="arl-final-share-host">
      <section
        className="arl-final-share-card"
        role="status"
        aria-label="Compartilhar fechamento da OS"
      >
        <h2>OS #{order.number} finalizada</h2>
        <p>
          O PDF Final está pronto. Um link novo, válido por 30 dias, será criado
          somente quando você escolher uma ação.
        </p>
        {shareError && <p className="alert">{shareError}</p>}
        <div className="arl-final-share-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => void prepare("pdf")}
          >
            Abrir PDF
          </button>
          <button
            type="button"
            className="whatsapp"
            disabled={busy}
            onClick={() => void prepare("whatsapp")}
          >
            Enviar link ao cliente
          </button>
        </div>
      </section>
    </div>
  );
}

export default function OrderDetailPage({
  id,
  back,
  readOnly = false,
  reopenOnLoad = false,
  onEdit,
  onDirtyChange,
  onOpenClientHistory,
}: Props & { readOnly?: boolean }) {
  const [order, setOrder] = useState<any>(),
    [role, setRole] = useState<string | null>(null),
    [error, setError] = useState(""),
    [editOpen, setEditOpen] = useState(false),
    [reopenOpen, setReopenOpen] = useState(false),
    [reopenNote, setReopenNote] = useState(""),
    [closingOpen, setClosingOpen] = useState(false),
    [closingValue, setClosingValue] = useState(""),
    [closingBusy, setClosingBusy] = useState(false),
    [closingError, setClosingError] = useState(""),
    [budgetSignal, setBudgetSignal] = useState(0),
    [paymentSignal, setPaymentSignal] = useState(0),
    [finalSignal, setFinalSignal] = useState(0),
    [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null),
    [finalReport, setFinalReport] = useState(""),
    [servicesDirty, setServicesDirty] = useState(false),
    [finalReportDirty, setFinalReportDirty] = useState(false),
    [photoChoice, setPhotoChoice] = useState(false),
    [camera, setCamera] = useState(false),
    [pdfActionsOpen, setPdfActionsOpen] = useState(false),
    [finalLinkStatus, setFinalLinkStatus] = useState<any>(null),
    [finalLinkBusy, setFinalLinkBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    pendingServicesSave = useRef<null | (() => Promise<any>)>(null),
    pdfActionsRef = useRef<HTMLDivElement>(null),
    mobilePdfActionsRef = useRef<HTMLDetailsElement>(null);
  const load = async () => {
    try {
      const next = await api(`/orders/${id}`);
      setOrder(next);
      if (!finalReportDirty)
        setFinalReport(
          next.final_report ||
            (next.status === "completed" ? next.technical_report || "" : ""),
        );
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    setRole(null);
    void Promise.all([
      load(),
      api("/me")
        .then((me) => setRole(me.role || ""))
        .catch((reason) => setError(reason.message)),
    ]);
  }, [id]);
  useEffect(() => {
    onDirtyChange?.(servicesDirty || finalReportDirty);
  }, [servicesDirty, finalReportDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [id, onDirtyChange]);
  useEffect(() => {
    if (
      reopenOnLoad &&
      order?.status === "completed" &&
      ["Master", "Administrador"].includes(role || "")
    )
      setReopenOpen(true);
  }, [reopenOnLoad, order?.id, order?.status, role]);
  const loadFinalLinkStatus = async () => {
    if (order?.status !== "completed") return setFinalLinkStatus(null);
    try {
      setFinalLinkStatus(await api(`/orders/${order.id}/final-share/status`));
    } catch {
      setFinalLinkStatus(null);
    }
  };
  useEffect(() => {
    void loadFinalLinkStatus();
  }, [order?.id, order?.status]);
  useEffect(() => {
    if (!pdfActionsOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!pdfActionsRef.current?.contains(event.target as Node))
        setPdfActionsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPdfActionsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [pdfActionsOpen]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const menu = mobilePdfActionsRef.current;
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobilePdfActionsRef.current?.open)
        mobilePdfActionsRef.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (error) return <div className="state error">{error}</div>;
  if (!order || role === null)
    return <div className="state">Carregando OS…</div>;
  const operational = ["analysis", "waiting_part", "in_service"].includes(
    order.status,
  );
  const immutable = !operational;
  const interrupted = order.status === "interrupted";
  const reopened = isReopenedOrder(order);
  const persistPendingChanges = async () => {
    let persistedOrder = order;
    if (finalReportDirty) {
      persistedOrder = await api(`/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({ final_report: finalReport.trim() || null }),
      });
      setFinalReportDirty(false);
    }
    if (servicesDirty && pendingServicesSave.current) {
      persistedOrder = (await pendingServicesSave.current()) || persistedOrder;
    }
    return persistedOrder;
  };
  const uploadFiles = async (files?: readonly File[] | null) => {
    if (!files?.length) return;
    const available = Math.max(0, 5 - (order.photos?.length || 0));
    if (files.length > available)
      window.alert(
        "Cada OS aceita no máximo 5 fotos. As fotos excedentes não serão enviadas.",
      );
    if (available === 0) return;
    try {
      for (const file of files.slice(0, available)) {
        const form = new FormData();
        form.append("photo", file);
        await api(`/orders/${order.id}/photos`, { method: "POST", body: form });
      }
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const canAdminister = ["Master", "Administrador"].includes(role);
  const openClosingReference = () => {
    setClosingValue(
      order.closing_reference_cents != null
        ? moneyInputFromCents(order.closing_reference_cents)
        : "0,00",
    );
    setClosingError("");
    setClosingOpen(true);
  };
  const saveClosingReference = async () => {
    const amount = centsFromMoneyInput(closingValue);
    if (!Number.isFinite(amount) || amount <= 0)
      return setClosingError("Informe um valor combinado maior que zero.");
    setClosingBusy(true);
    setClosingError("");
    try {
      await api(`/orders/${order.id}/closing-reference`, {
        method: "PATCH",
        body: JSON.stringify({ amount_cents: amount }),
      });
      setClosingOpen(false);
      await load();
    } catch (reason: any) {
      setClosingError(reason.message || "Não foi possível marcar a OS.");
    } finally {
      setClosingBusy(false);
    }
  };
  const clearClosingReference = async () => {
    setClosingBusy(true);
    setClosingError("");
    try {
      await api(`/orders/${order.id}/closing-reference`, { method: "DELETE" });
      setClosingOpen(false);
      await load();
    } catch (reason: any) {
      setClosingError(reason.message || "Não foi possível desmarcar a OS.");
    } finally {
      setClosingBusy(false);
    }
  };
  const closingMarker =
    order.closing_reference_cents != null ? (
      <span className="arl-closing-marker arl-order-closing-marker">
        ⚑ Fechar · {money(order.closing_reference_cents)}
        {order.closing_marked_by?.name && order.closing_marked_at
          ? ` — marcado por ${order.closing_marked_by.name} em ${new Date(order.closing_marked_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
          : ""}
      </span>
    ) : null;
  const closingDialog = closingOpen ? (
    <div className="modal">
      <section
        className="modal-card arl-closing-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Precisa fechar"
      >
        <h2>Precisa fechar</h2>
        <p>
          Registre somente o valor combinado em campo. Isso não altera itens,
          total ou financeiro.
        </p>
        <label className="field">
          <span>Valor combinado (R$) *</span>
          <input
            autoFocus
            inputMode="decimal"
            value={closingValue}
            onChange={(event) => setClosingValue(maskMoneyInput(event.target.value))}
          />
        </label>
        {closingError && <div className="alert">{closingError}</div>}
        <div className="actions">
          <button
            type="button"
            disabled={closingBusy}
            onClick={() => setClosingOpen(false)}
          >
            Cancelar
          </button>
          {order.closing_reference_cents != null && (
            <button
              type="button"
              disabled={closingBusy}
              onClick={() => void clearClosingReference()}
            >
              Desmarcar
            </button>
          )}
          <button
            type="button"
            className="primary"
            disabled={closingBusy}
            onClick={() => void saveClosingReference()}
          >
            {closingBusy ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </section>
    </div>
  ) : null;
  const deletePhoto = async (photo: any) => {
    if (
      !canAdminister ||
      !window.confirm(
        "Excluir esta foto do equipamento? PDFs já emitidos não serão alterados.",
      )
    )
      return;
    try {
      await api(`/photos/${photo.id}`, { method: "DELETE" });
      setOrder((current: any) => ({
        ...current,
        photos: (current.photos || []).filter(
          (item: any) => item.id !== photo.id,
        ),
      }));
    } catch (reason: any) {
      setError(reason.message);
    }
  };
  const editOrder = () => (onEdit ? onEdit() : setEditOpen(true));
  const shareFinalReport = async () => {
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow)
      return window.alert(
        "Permita a abertura de novas abas para visualizar o Relatório Técnico Final.",
      );
    pdfWindow.opener = null;
    try {
      const documents = await api(`/orders/${order.id}/documents`);
      const final = documents
        .filter((row: any) => row.type === "final")
        .sort((a: any, b: any) => b.revision - a.revision)[0];
      if (!final) {
        pdfWindow.close();
        return window.alert("O Relatório Técnico Final ainda não foi gerado.");
      }
      pdfWindow.location.replace(
        `/api/orders/${order.id}/final/${final.revision}/pdf`,
      );
    } catch (reason: any) {
      pdfWindow.close();
      window.alert(
        reason.message || "Não foi possível abrir o Relatório Técnico Final.",
      );
    }
  };
  const sendFinalLink = async () => {
    const phone = digits(order.client?.phone || "");
    if (!phone)
      return window.alert("O cliente não possui telefone para WhatsApp.");
    const target = window.open("about:blank", "_blank");
    setFinalLinkBusy(true);
    try {
      const share = await api(`/orders/${order.id}/final-share`);
      const full = phone.startsWith("55") ? phone : `55${phone}`;
      const destination = `https://wa.me/${full}?text=${whatsappText(finalWhatsappMessage(order, share.url))}`;
      setFinalLinkStatus({
        active: true,
        expires_at: share.expires_at,
        revision: share.revision,
      });
      if (target) target.location.href = destination;
      else window.location.href = destination;
    } catch (reason: any) {
      target?.close();
      window.alert(
        reason.message || "Não foi possível gerar o link do relatório.",
      );
    } finally {
      setFinalLinkBusy(false);
    }
  };
  const revokeFinalLinks = async () => {
    if (!window.confirm("Revogar agora todos os links ativos deste relatório?"))
      return;
    setFinalLinkBusy(true);
    try {
      await api(`/orders/${order.id}/final-share`, { method: "DELETE" });
      setFinalLinkStatus({ active: false, expires_at: null, revision: null });
    } catch (reason: any) {
      window.alert(reason.message || "Não foi possível revogar os links.");
    } finally {
      setFinalLinkBusy(false);
    }
  };
  const finalLinkActions =
    order.status === "completed" ? (
      <>
        <button
          type="button"
          disabled={finalLinkBusy}
          onClick={() => void sendFinalLink()}
        >
          Enviar link ao cliente
        </button>
        <button
          type="button"
          disabled={finalLinkBusy || !finalLinkStatus?.active}
          onClick={() => void revokeFinalLinks()}
        >
          Revogar link
        </button>
        <small>
          {finalLinkStatus?.active && finalLinkStatus.expires_at
            ? `Link ativo até ${new Date(finalLinkStatus.expires_at).toLocaleDateString("pt-BR")}`
            : "Nenhum link ativo"}
        </small>
      </>
    ) : null;
  const openingPhone = digits(order.client?.phone || "");
  const openingFullPhone = openingPhone
    ? openingPhone.startsWith("55")
      ? openingPhone
      : `55${openingPhone}`
    : "";
  const openingCondition = String(order.intake_condition || "").trim();
  const openingMessage = [
    `Olá, ${order.client?.name || "cliente"}`,
    "",
    `Informamos que a sua *Ordem de Serviço nº ${order.number}* foi aberta com sucesso na *ARL Informática*.`,
    ...(openingCondition
      ? ["", "Estado físico registrado na abertura:", openingCondition, ""]
      : [""]),
    "Nosso departamento técnico já iniciou os procedimentos necessários. Em breve, entraremos em contato para atualizar o status do serviço e apresentar os detalhes da verificação do seu equipamento.",
    "",
    "Permanecemos à disposição para qualquer dúvida.",
    "",
    "Atenciosamente,",
    "",
    "*ARL Informática*",
  ].join("\n");
  const openingWhatsapp = openingFullPhone
    ? `https://wa.me/${openingFullPhone}?text=${whatsappText(openingMessage)}`
    : "";
  const mapsAddress = [
    order.client?.street,
    order.client?.number,
    order.client?.district,
    order.client?.city,
    order.client?.state,
  ]
    .filter(Boolean)
    .join(", ");
  const mapsUrl =
    order.mobile_actions?.maps_url ||
    (mapsAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsAddress)}`
      : "");
  if (readOnly)
    return (
      <div
        data-arl-order-detail-react="1"
        data-mobile-read-only="1"
        className="arl-mobile-read-only"
      >
        <header className="arl-mobile-read-only-header">
          <button
            type="button"
            className="arl-back-button"
            onClick={back}
            aria-label="Voltar para OS abertas"
          >
            ←
          </button>
          <div>
            <span>ORDEM DE SERVIÇO</span>
            <h1>OS #{order.number}</h1>
            <span className="arl-order-markers">
              {reopened && (
                <span className="arl-reopened-marker status-paid arl-order-reopened-marker">
                  Reaberta
                </span>
              )}
              {closingMarker}
            </span>
            {interrupted && (
              <span className="arl-reopened-marker arl-interrupted-marker arl-order-reopened-marker">
                Interrompida
              </span>
            )}
          </div>
        </header>
        <div className="arl-read-only-banner">
          Somente leitura · edite pelo PC
        </div>
        <div className="arl-mobile-read-only-actions">
          {openingWhatsapp && (
            <a href={openingWhatsapp} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              Rota
            </a>
          )}
          {canAdminister && operational && (
            <button
              type="button"
              aria-label="Precisa fechar"
              onClick={openClosingReference}
            >
              Precisa fechar
            </button>
          )}
        </div>
        <details className="arl-opening-call" ref={mobilePdfActionsRef}>
          <summary>PDF's e Reaberturas OS</summary>
          <div className="arl-opening-call-menu">
            {openingWhatsapp ? (
              <a target="_blank" rel="noreferrer" href={openingWhatsapp}>
                Mensagem de abertura
              </a>
            ) : (
              <span aria-disabled="true">
                Mensagem de abertura indisponível
              </span>
            )}
            <a
              target="_blank"
              rel="noreferrer"
              href={`/api/orders/${order.id}/term`}
            >
              Termo de Recebimento PDF
            </a>
            {order.status === "completed" ? (
              <button type="button" onClick={() => void shareFinalReport()}>
                Relatório Técnico Final
              </button>
            ) : (
              <span aria-disabled="true">Relatório Técnico Final</span>
            )}
            {finalLinkActions}
            {canAdminister &&
              (order.status === "completed" ? (
                <button type="button" onClick={() => setReopenOpen(true)}>
                  Reabrir OS
                </button>
              ) : (
                <span aria-disabled="true">
                  {interrupted
                    ? "OS interrompida não pode ser reaberta"
                    : "Reabrir OS"}
                </span>
              ))}
          </div>
        </details>
        <section>
          <h2>Cliente</h2>
          <strong>{order.client.name}</strong>
          <p>
            {masks.document(order.client.document)} ·{" "}
            {masks.phone(order.client.phone)}
          </p>
          <p>
            {order.client.street}, {order.client.number} — {order.client.city}/
            {order.client.state}
          </p>
        </section>
        <section>
          <h2>Equipamento</h2>
          <p>{order.equipment_description || "Equipamento não informado"}</p>
          {order.equipment_details && (
            <p>
              <strong>Fabricante / Modelo / Acessórios:</strong>{" "}
              {order.equipment_details}
            </p>
          )}
          <p>
            {order.attendance_type === "bench"
              ? "Análise na Bancada"
              : "Atendimento Externo"}
          </p>
        </section>
        <section>
          <h2>Problema relatado</h2>
          <p>{order.reported_problem}</p>
        </section>
        <section>
          <h2>Estado físico na entrada</h2>
          <p>
            {order.intake_condition ||
              "Equipamento aparentemente 100% sem avarias"}
          </p>
        </section>
        <section>
          <h2>Serviços</h2>
          {order.items?.length ? (
            order.items.map((item: any) => (
              <p key={item.id}>
                {item.quantity} × {item.description}
              </p>
            ))
          ) : (
            <p>Nenhum serviço registrado.</p>
          )}
        </section>
        {interrupted && (
          <section className="arl-interruption-note">
            <h2>Interrupção</h2>
            <p>
              <strong>Motivo:</strong>{" "}
              {order.interruption_reason || order.technical_report}
            </p>
            <p>
              <strong>O que já foi feito:</strong>{" "}
              {order.interruption_work_done}
            </p>
          </section>
        )}
        {reopenOpen && (
          <div className="arl-od-modal">
            <section
              className="arl-od-card"
              role="dialog"
              aria-modal="true"
              aria-label={`Reabrir OS #${order.number}`}
            >
              <h2>Reabrir OS #{order.number}</h2>
              <p>
                A mesma OS voltará para Em Análise. Ao concluir novamente, a
                revisão anterior será mantida como um registro interno resumido.
              </p>
              <label>
                Motivo da reabertura
                <textarea
                  spellCheck={true}
                  value={reopenNote}
                  onChange={(event) => setReopenNote(event.target.value)}
                />
              </label>
              <div className="arl-od-actions">
                <button type="button" onClick={() => setReopenOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={async () => {
                    if (!reopenNote.trim()) return;
                    await api(`/orders/${order.id}/reopen`, {
                      method: "POST",
                      body: JSON.stringify({ note: reopenNote.trim() }),
                    });
                    setReopenOpen(false);
                    await load();
                  }}
                >
                  Confirmar reabertura
                </button>
              </div>
            </section>
          </div>
        )}
        {closingDialog}
      </div>
    );
  const stages = [
    "Entrada",
    "Aguardando",
    "Execução",
    "Finalização",
    "Pagamento",
  ];
  const currentStage = order.archived
    ? -1
    : ["completed", "interrupted"].includes(order.status)
      ? 4
      : ["in_service", "waiting_part"].includes(order.status)
        ? 2
        : order.status === "analysis"
          ? 1
          : 0;
  const stageState = (index: number) =>
    order.archived
      ? "completed"
      : index < currentStage
        ? "completed"
        : index === currentStage
          ? "current"
          : "future";
  const paymentEnabled = Boolean(
    canAdminister &&
    paymentSummary &&
    paymentSummary.collectible_balance_cents > 0 &&
    paymentSummary.total_cents > 0,
  );
  return (
    <div data-arl-order-detail-react="1" className="arl-order-detail-page">
      <header className="arl-order-sticky-header">
        <div className="arl-order-header-main">
          <button type="button" className="arl-order-back" onClick={back}>
            ← Voltar
          </button>
          <div className="arl-order-header-identity">
            <span className="arl-eyebrow">ORDEM DE SERVIÇO</span>
            <h1>OS #{order.number}</h1>
            <span className="arl-order-markers">
              {reopened && (
                <span className="arl-reopened-marker status-paid arl-order-reopened-marker">
                  Reaberta
                </span>
              )}
              {closingMarker}
            </span>
            {interrupted && (
              <span className="arl-reopened-marker arl-interrupted-marker arl-order-reopened-marker">
                Interrompida
              </span>
            )}
          </div>
        </div>
        <div className="arl-order-quick-actions arl-order-header-actions">
          {onOpenClientHistory && (
            <button
              type="button"
              data-order-action="history"
              onClick={() => onOpenClientHistory(order.client.id)}
            >
              <History aria-hidden="true" />
              <span>Histórico</span>
            </button>
          )}
          {order.status === "completed"
            ? canAdminister && (
                <button
                  type="button"
                  className="arl-od-btn"
                  data-order-action="reopen"
                  onClick={() => setReopenOpen(true)}
                >
                  <RotateCcw aria-hidden="true" />
                  <span>Reabrir OS</span>
                </button>
              )
            : !immutable && (
                <button
                  type="button"
                  className="arl-od-btn"
                  data-order-action="edit"
                  onClick={editOrder}
                >
                  <Pencil aria-hidden="true" />
                  <span>Editar</span>
                </button>
              )}
          {!immutable && (
            <button
              type="button"
              data-order-action="budget"
              data-quick="budget"
              onClick={() => setBudgetSignal((x) => x + 1)}
            >
              <ReceiptText aria-hidden="true" />
              <span>Orçamento</span>
            </button>
          )}
          <div
            className="arl-opening-call arl-header-pdf-actions"
            ref={pdfActionsRef}
          >
            <button
              type="button"
              data-order-action="pdf"
              aria-expanded={pdfActionsOpen}
              onClick={() => setPdfActionsOpen((open) => !open)}
            >
              <FileText aria-hidden="true" />
              <span>PDF's</span>
            </button>
            {pdfActionsOpen && (
              <div className="arl-opening-call-menu">
                {openingWhatsapp ? (
                  <a target="_blank" rel="noreferrer" href={openingWhatsapp}>
                    Mensagem de abertura
                  </a>
                ) : (
                  <span aria-disabled="true">
                    Mensagem de abertura indisponível
                  </span>
                )}
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`/api/orders/${order.id}/term`}
                >
                  Termo de Recebimento PDF
                </a>
                {order.status === "completed" ? (
                  <button type="button" onClick={() => void shareFinalReport()}>
                    Relatório Técnico Final
                  </button>
                ) : (
                  <span aria-disabled="true">Relatório Técnico Final</span>
                )}
                {finalLinkActions}
                {canAdminister &&
                  (order.status === "completed" ? (
                    <button type="button" onClick={() => setReopenOpen(true)}>
                      Reabrir OS
                    </button>
                  ) : (
                    <span aria-disabled="true">
                      {interrupted
                        ? "OS interrompida não pode ser reaberta"
                        : "Reabrir OS"}
                    </span>
                  ))}
              </div>
            )}
          </div>
          {paymentEnabled && (
            <button
              type="button"
              className="primary"
              data-order-action="payment"
              data-quick="payment"
              onClick={() => setPaymentSignal((x) => x + 1)}
            >
              <Wallet aria-hidden="true" />
              <span>Pagamento</span>
            </button>
          )}
          {canAdminister && !immutable && order.status !== "completed" && (
            <button
              id="finalization-action"
              type="button"
              data-order-action="finalize"
              className="primary arl-finalization-action"
              onClick={() => setFinalSignal((x) => x + 1)}
            >
              <Check aria-hidden="true" />
              <span>Concluir</span>
            </button>
          )}
        </div>
      </header>
      <ol
        className="arl-order-stage-rail"
        aria-label="Etapas da Ordem de Serviço"
      >
        {stages.map((stage, index) => {
          const state = stageState(index);
          return (
            <li
              key={stage}
              data-stage-state={state}
              className={`arl-order-stage ${state}`}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span>{index + 1}</span>
              <b>{stage}</b>
            </li>
          );
        })}
      </ol>
      <section
        className="panel arl-intake-card"
        aria-labelledby="arl-intake-title"
      >
        <div className="section-title arl-intake-title">
          <div>
            <span className="arl-eyebrow">ENTRADA</span>
            <h2 id="arl-intake-title">Ficha de entrada</h2>
          </div>
        </div>
        <div className="arl-intake-dates">
          <span>
            <b>Entrada</b> {formatOptionalDate(order.received_at)}
          </span>
          <i aria-hidden="true">|</i>
          <span>
            <b>Saída</b>{" "}
            {["completed", "interrupted"].includes(order.status)
              ? formatOptionalDate(order.completed_at)
              : "Em aberto"}
          </span>
        </div>
        <div className="arl-intake-grid">
          <section className="arl-intake-field arl-intake-client-field">
            <h3>Cliente</h3>
            <div className="arl-intake-client-info">
              <p className="arl-intake-client-name">
                <strong>{order.client.name}</strong>
              </p>
              <p className="arl-intake-client-phone">
                <Phone aria-hidden="true" />
                {masks.phone(order.client.phone)}
              </p>
              <p className="arl-intake-client-address">
                <MapPin aria-hidden="true" />
                <span>
                  {[
                    `${order.client.street || ""}${order.client.number ? `, ${order.client.number}` : ""}`,
                    order.client.district,
                    [order.client.city, order.client.state]
                      .filter(Boolean)
                      .join("/"),
                  ]
                    .filter(Boolean)
                    .join(" — ")}
                </span>
              </p>
              <p className="arl-intake-client-document">
                {masks.document(order.client.document)}
              </p>
            </div>
          </section>
          <section className="arl-intake-field arl-intake-equipment-field">
            <h3>Equipamento</h3>
            <div>
              <p className="arl-intake-equipment-name">
                <strong>
                  {order.equipment_description || "Equipamento não informado"}
                </strong>
              </p>
              <div className="arl-intake-equipment-details">
                <h4>Fabricante / Modelo / Acessórios</h4>
                <p>{order.equipment_details || "Não informado"}</p>
              </div>
            </div>
          </section>
          <section className="arl-intake-field">
            <h3>Problema relatado</h3>
            <p>{order.reported_problem}</p>
          </section>
          <section
            className={`arl-intake-field ${!order.intake_condition ? "arl-checklist-ok" : ""}`}
          >
            <h3>Estado físico na entrada</h3>
            <p className={!order.intake_condition ? "ok" : undefined}>
              {order.intake_condition ||
                "Equipamento aparentemente 100% sem avarias"}
            </p>
          </section>
        </div>
        <section className="arl-intake-photos">
          <div className="arl-intake-photos-heading">
            <h3>Fotos</h3>
            <span aria-live="polite">{order.photos?.length || 0}/5</span>
          </div>
          <div>
            <div className="arl-order-photo-tools">
              <label>
                ↑ Enviar foto
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    const selectedPhotos = Array.from(
                      e.currentTarget.files ?? [],
                    );
                    e.currentTarget.value = "";
                    void uploadFiles(selectedPhotos);
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
            </div>
            <div className="photos">
              {order.photos?.length ? (
                order.photos.map((photo: any) => (
                  <div className="arl-order-photo" key={photo.id}>
                    <a
                      href={`/api/orders/${order.id}/photos/${photo.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={`/api/orders/${order.id}/photos/${photo.id}`}
                        alt={`Foto ${photo.id} da OS`}
                      />
                    </a>
                    {canAdminister && (
                      <button
                        type="button"
                        aria-label={`Excluir foto ${photo.id}`}
                        title="Excluir foto"
                        onClick={() => void deletePhoto(photo)}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p>Nenhuma foto anexada.</p>
              )}
            </div>
          </div>
        </section>
      </section>
      <div className="detail-grid arl-order-detail arl-order-workflow">
        {immutable && order.items?.length > 0 && (
          <section className="wide order-items-summary">
            <h2>Serviços / Produtos da OS</h2>
            {order.items.map((item: any) => (
              <div className="order-item-line" key={item.id}>
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
        {!immutable && (
          <ServicesPanel
            order={order}
            reload={load}
            pendingSaveRef={pendingServicesSave}
            onDirtyChange={setServicesDirty}
          />
        )}
        <FinalReportPanel
          order={order}
          value={finalReport}
          setValue={setFinalReport}
          reload={load}
          onDirtyChange={setFinalReportDirty}
        />
        {interrupted && (
          <section className="wide arl-interruption-note">
            <h2>Interrupção</h2>
            <p>
              <strong>Motivo:</strong>{" "}
              {order.interruption_reason || order.technical_report}
            </p>
            <p>
              <strong>O que já foi feito:</strong>{" "}
              {order.interruption_work_done}
            </p>
          </section>
        )}
        <BudgetBox order={order} role={role} openSignal={budgetSignal} />
        {canAdminister && (
          <PaymentBox
            order={order}
            role={role}
            openSignal={paymentSignal}
            onSummary={setPaymentSummary}
          />
        )}
        {canAdminister && (
          <FinalizationBox
            order={order}
            reload={load}
            openSignal={finalSignal}
            finalReport={finalReport}
            setFinalReport={setFinalReport}
            persistPendingChanges={persistPendingChanges}
            onFinalReportDirty={setFinalReportDirty}
          />
        )}
        {SHOW_ORDER_RECORD && (
          <section className="wide arl-order-record">
            <div className="section-title">
              <div>
                <span className="arl-eyebrow">REGISTRO</span>
                <h2>Registro da OS</h2>
                <p>
                  Históricos e documentos preservados, recolhidos por padrão.
                </p>
              </div>
            </div>
            <details className="arl-record-accordion">
              <summary>Histórico de status</summary>
              <div className="arl-record-body">
                {order.histories.map((history: any, index: number) => (
                  <p key={history.id || index}>
                    {statusLabel[history.to_status] || history.to_status} ·{" "}
                    {new Date(history.created_at).toLocaleString("pt-BR")} ·{" "}
                    {history.user?.name}
                    {history.reason ? ` · Motivo: ${history.reason}` : ""}
                  </p>
                ))}
              </div>
            </details>
            <OrderAuditHistory orderId={order.id} />
            <details className="arl-record-accordion">
              <summary>Documentos</summary>
              <div className="arl-record-body">
                <DocumentsBox order={order} embedded />
              </div>
            </details>
          </section>
        )}
      </div>
      {editOpen &&
        (immutable ? (
          <ImmutableModal order={order} onClose={() => setEditOpen(false)} />
        ) : (
          <EditOrderModal
            order={order}
            onClose={() => setEditOpen(false)}
            onSaved={async () => {
              setEditOpen(false);
              await load();
            }}
          />
        ))}
      {reopenOpen && (
        <div className="arl-od-modal">
          <section
            className="arl-od-card"
            role="dialog"
            aria-modal="true"
            aria-label={`Reabrir OS #${order.number}`}
          >
            <h2>Reabrir OS #{order.number}</h2>
            <p>
              A mesma OS voltará para Em Análise. Ao concluir novamente, a
              revisão anterior será mantida como um registro interno resumido.
            </p>
            <label>
              Motivo da reabertura
              <textarea
                spellCheck={true}
                value={reopenNote}
                onChange={(event) => setReopenNote(event.target.value)}
              />
            </label>
            <div className="arl-od-actions">
              <button type="button" onClick={() => setReopenOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                onClick={async () => {
                  if (!reopenNote.trim()) return;
                  await api(`/orders/${order.id}/reopen`, {
                    method: "POST",
                    body: JSON.stringify({ note: reopenNote.trim() }),
                  });
                  setReopenOpen(false);
                  await load();
                }}
              >
                Confirmar reabertura
              </button>
            </div>
          </section>
        </div>
      )}
      {photoChoice && (
        <PhotoChoice
          onClose={() => setPhotoChoice(false)}
          onUpload={() => {
            setPhotoChoice(false);
            fileInput.current?.click();
          }}
          onCamera={() => {
            setPhotoChoice(false);
            setCamera(true);
          }}
        />
      )}
      {camera && (
        <CameraModal
          onClose={() => setCamera(false)}
          onFile={(file) => {
            setCamera(false);
            void uploadFiles([file]);
          }}
        />
      )}
      {closingDialog}
      {order.status === "completed" && (
        <FinalShareCard
          order={order}
          onLinkCreated={() => void loadFinalLinkStatus()}
        />
      )}
    </div>
  );
}
