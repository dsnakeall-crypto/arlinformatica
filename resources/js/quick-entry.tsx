import { useState } from "react";
import { centsFromMoneyInput, maskMoneyInput } from "./money-input";
import { X } from "lucide-react";
import { api, Field } from './app-shared';

export function QuickEntry({ open, onClose, onSaved }: any) {
  const [value, setValue] = useState("0,00"),
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
          amount_cents: centsFromMoneyInput(value),
          description: description.trim() || null,
        }),
      });
      setValue("0,00");
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
          spellCheck
        />
        <Field
          label="Valor recebido (R$)"
          value={value}
          onChange={(e: any) => setValue(maskMoneyInput(e.target.value))}
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
