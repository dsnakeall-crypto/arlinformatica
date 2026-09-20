import React, { useEffect, useState } from "react";

const csrf = () =>
  document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
  "";

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(csrf() ? { "X-CSRF-TOKEN": csrf() } : {}),
      ...options.headers,
    },
  });
  const body = await response
    .json()
    .catch(() => ({ message: "Resposta inválida do servidor." }));
  if (!response.ok) {
    const detail = Object.values(body.errors || {}).flat()[0];
    throw new Error(String(detail || body.message || "Não foi possível concluir."));
  }
  return body;
}

const labels: Record<string, string> = {
  clients: "Clientes",
  service_orders: "Ordens de serviço",
  order_items: "Itens de OS",
  budgets: "Orçamentos",
  services_and_products: "Serviços e produtos",
  financial_records: "Registros financeiros e pagamentos",
  documents: "PDFs e documentos emitidos",
  photos: "Fotos de equipamentos",
  post_sales: "Registros de pós-venda",
  history_and_reports: "Históricos e laudos",
  notifications: "Notificações",
  audit_logs: "Registros de auditoria atuais",
  users: "Usuários removidos (Master preservado)",
};

export default function DatabaseResetPanel() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [backup, setBackup] = useState<any>();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/database-reset/preview")
      .then((data) => setCounts(data.counts))
      .catch((error) => setMessage(error.message));
  }, []);

  const prepare = async () => {
    setBusy(true);
    setMessage("Gerando e validando o backup de segurança…");
    try {
      const result = await api("/database-reset/prepare", {
        method: "POST",
      });
      setBackup(result);
      setCounts(result.counts);
      setMessage(
        `Backup ${result.filename} validado. Confira as contagens e confirme o zeramento.`,
      );
    } catch (error: any) {
      setBackup(undefined);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!backup || confirmation !== "ZERAR BANCO" || !password) return;
    setBusy(true);
    setMessage("Zerando os dados operacionais…");
    try {
      await api("/database-reset", {
        method: "POST",
        body: JSON.stringify({
          backup_id: backup.backup_id,
          password,
          confirmation,
        }),
      });
      setPassword("");
      setConfirmation("");
      setBackup(undefined);
      setCounts(Object.fromEntries(Object.keys(counts).map((key) => [key, 0])));
      setMessage("Banco zerado. O Master, as configurações e os modelos foram preservados.");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="form-card database-reset" data-testid="database-reset-panel">
      <h2>Zeramento do banco</h2>
      <p>
        Esta ação apaga definitivamente os dados operacionais. Empresa, identidade
        visual, termos, garantias, checklists, modelos de laudo, equipamentos e
        fabricantes serão preservados.
      </p>
      <div className="database-reset-counts" aria-label="Contagem do zeramento">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <b>{counts[key] ?? "…"}</b>
          </div>
        ))}
      </div>
      <button type="button" onClick={prepare} disabled={busy}>
        {backup ? "GERAR NOVO BACKUP DE SEGURANÇA" : "GERAR BACKUP E LIBERAR"}
      </button>
      {backup && (
        <div className="database-reset-confirmation">
          <label className="field">
            <span>Senha do Master</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Digite exatamente ZERAR BANCO</span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="database-reset-danger"
            disabled={busy || !password || confirmation !== "ZERAR BANCO"}
            onClick={reset}
          >
            ZERAR BANCO DEFINITIVAMENTE
          </button>
        </div>
      )}
      {message && <div className="notice">{message}</div>}
    </section>
  );
}
