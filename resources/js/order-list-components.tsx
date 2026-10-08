import { isReopenedOrder } from "./order-reopened";
import { Box, Trash2, Pencil, CircleDot, Eye, RotateCcw } from "lucide-react";
import { FormEvent, useState } from "react";
import { Order, formatBrasiliaDateTime, money, formatOptionalDate, api } from './app-shared';

export function OrderTable({
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
              const external = o.attendance_type === "external";
              const interrupted = o.status === "interrupted";
              const closed = o.status === "completed" || interrupted;
              const displayStatus = o.display_status || o.status;
              return (
                <tr className={`order-row${reopened ? " order-row-reopened" : ""}`} key={o.id}>
                  <td>
                    <span className="arl-order-number">
                      <b>#{o.number}</b>
                      <small className="arl-order-opened-at">{formatBrasiliaDateTime(o.received_at)}</small>
                    </span>
                  </td>
                  <td>
                    <span className="order-customer">
                      <strong>{o.client.name}</strong>
                      {o.client.nickname && <small className="arl-client-nickname">{o.client.nickname}</small>}
                      <span className="arl-order-markers">
                        {external && <span className="arl-external-attendance-marker status-awaiting_payment">Externo</span>}
                        {reopened && <span className="arl-reopened-marker status-paid" aria-label="OS reaberta">Reaberta</span>}
                        {o.closing_reference_cents != null && <span className="arl-closing-marker" aria-label="OS precisa fechar">⚑ Fechar · {money(o.closing_reference_cents)}</span>}
                      </span>
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
          const external = o.attendance_type === "external";
          const interrupted = o.status === "interrupted";
          const displayStatus = o.display_status || o.status;
          const awaitingPayment = displayStatus === "awaiting_payment";
          const canSetPaid = awaitingPayment && ["Master", "Administrador"].includes(role);
          const closed = Boolean(o.completed_at) || interrupted;
          return (
            <tr className={`order-row${reopened ? " order-row-reopened" : ""}`} key={o.id}>
              <td><span className="arl-order-number"><b>#{o.number}</b><small className="arl-order-opened-at">{formatBrasiliaDateTime(o.received_at)}</small></span></td>
              <td><span className="order-customer"><strong>{o.client.name}</strong>{o.client.nickname && <small className="arl-client-nickname">{o.client.nickname}</small>}<span className="arl-order-markers">{external && <span className="arl-external-attendance-marker status-awaiting_payment">Externo</span>}{reopened && <span className="arl-reopened-marker status-paid" aria-label="OS reaberta">Reaberta</span>}{o.closing_reference_cents != null && <span className="arl-closing-marker" aria-label="OS precisa fechar">⚑ Fechar · {money(o.closing_reference_cents)}</span>}</span>{interrupted && <span className="arl-reopened-marker arl-interrupted-marker" aria-label="OS interrompida">Interrompida</span>}</span></td>
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

export function InterruptionModal({ order, onClose, onSaved }: any) {
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
            spellCheck={true}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </label>
        <label className="field">
          <span>O que já foi feito no equipamento? *</span>
          <textarea
            aria-label="O que já foi feito no equipamento"
            spellCheck={true}
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

export function StatusPaymentModal({ order, onClose, onSaved }: any) {
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
