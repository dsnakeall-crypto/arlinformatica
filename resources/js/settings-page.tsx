import { FormEvent, useEffect, useState } from "react";
import PageHeader from "./page-header";
import AppearanceSettings from './appearance-settings';
import { Camera, ChevronDown, Settings, Users, Trash2, FileSignature } from "lucide-react";
import { api, formatCompanySettings, serializeCompanySettings, masks, Field } from './app-shared';
import { ClientImport, TermTextEditor, DatabaseResetPanel } from './lazy-pages';

export function InfrastructureSettings({ section }: { section: string }) {
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

export function SettingsPage({ role, initialSection = "company" }: any) {
  const [data, setData] = useState<any>();
  const [message, setMessage] = useState("");
  const [section, setSection] = useState(initialSection);
  const [logo, setLogo] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [removingSignature, setRemovingSignature] = useState(false);
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
  const removeSignature = async () => {
    if (!window.confirm("Remover a assinatura técnica cadastrada? Os PDFs futuros serão emitidos sem a imagem.")) return;
    setRemovingSignature(true);
    setMessage("");
    try {
      await api("/settings/signature", { method: "DELETE" });
      setData((current: any) => ({ ...current, technical_signature_configured: false }));
      setSignature(null);
      setMessage("Assinatura técnica removida.");
    } catch (error: any) {
      setMessage(error.message || "Não foi possível remover a assinatura técnica.");
    } finally {
      setRemovingSignature(false);
    }
  };
  const tabs = [
    ["company", "Empresa", "▣"],
    ["identity", "Identidade", "◆"],
    ["documents", "Documentos", "▧"],
    ["messages", "Mensagens", "✉"],
    ["notifications", "Notificações", "♢"],
    ...(role === "Master"
      ? [
          ["users", "Usuários", "♙"],
          ["backup", "Backup", "▦"],
          ["reset", "Zeramento", "⚠"],
          ["system", "Sistema", "⌁"],
        ]
      : []),
    ["storage", "Armazenamento", "▥"],
  ];
  const generalSave =
    ["company", "identity", "messages"].includes(section) ||
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
      {role === "Master" && section === "users" && <UsersAdmin />}
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
                    ["URL futura da Política de Privacidade", "privacy_policy_url"],
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
              <AppearanceSettings />
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
              {data.technical_signature_configured && !signature && (
                <div className="technical-signature-current">
                  <img className="technical-signature-preview" src="/api/settings/signature" alt="Assinatura técnica cadastrada"/>
                  <button type="button" disabled={removingSignature} onClick={() => void removeSignature()}>
                    <Trash2 aria-hidden="true"/>
                    {removingSignature ? "Removendo…" : "Remover assinatura técnica"}
                  </button>
                </div>
              )}
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
          {section === "messages" && <>
            <h2>Mensagens de abertura da OS</h2>
            <label className="check"><input type="checkbox" name="order_opened_auto_whatsapp" checked={String(data.order_opened_auto_whatsapp) === "1"} onChange={change} /> Abrir WhatsApp automaticamente após criar OS</label>
            <p>A OS abre normalmente. Ativado, o WhatsApp abre com a mensagem pronta; você confirma o envio. Se o navegador bloquear, haverá um botão para abrir a conversa.</p>
            <p>Variáveis: {"{{nome_cliente}}"}, {"{{numero_os}}"} e {"{{empresa}}"}. As linhas em branco são mantidas.</p>
            <label className="field"><span>Atendimento interno</span><textarea name="order_opened_internal_message" value={data.order_opened_internal_message || ""} onChange={change} required maxLength={6000} rows={12} /></label>
            <label className="field"><span>Atendimento externo</span><textarea name="order_opened_external_message" value={data.order_opened_external_message || ""} onChange={change} required maxLength={6000} rows={14} /></label>
          </>}
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
      {role === "Master" && section === "reset" && <DatabaseResetPanel />}
      {section === "storage" && <StorageAdmin role={role} />}
      {section === "notifications" && <PushSettings />}
    </>
  );
}

export function PushSettings() {
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

export function UsersAdmin() {
  const [data, setData] = useState<any>({ users: { data: [] }, roles: [] }),
    [form, setForm] = useState<any>(),
    [error, setError] = useState("");
  const load = () => api("/users").then(setData);
  useEffect(() => {
    void load();
  }, []);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.id) {
      const missing = [
        Array.from(form.password).length < 6 && "pelo menos 6 caracteres",
        !/\p{Lu}/u.test(form.password) && "uma letra maiúscula",
        !/[^\p{L}\p{N}\s]/u.test(form.password) && "um caractere especial",
      ].filter(Boolean);
      if (missing.length) {
        setError(`A senha precisa conter ${missing.join(", ")}.`);
        return;
      }
      if (form.password !== form.password_confirmation) {
        setError("A confirmação da senha não confere.");
        return;
      }
    }
    const payload = { ...form, role_id: +form.role_id, active: !!form.active };
    try {
      await api(form.id ? `/users/${form.id}` : "/users", {
        method: form.id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setForm(null);
      await load();
    } catch (reason: any) {
      setError((Object.values(reason.errors || {}).flat()[0] as string) || reason.message || "Não foi possível salvar o usuário.");
    }
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
            onClick={() => {
              setError("");
              setForm({
                name: "",
                login: "",
                email: "",
                role_id: data.roles[0]?.id,
                active: true,
                password: "",
                password_confirmation: "",
              });
            }}
          >
            Novo usuário
          </button>
        }
      />
      <section className="panel admin-list">
        {!form && error && <div className="alert" role="alert">{error}</div>}
        {data.users.data.map((u: any) => (
          <article>
            <div>
              <b>{u.name}</b>
              <small>
                {u.login} · {u.role.name} · {u.active ? "Ativo" : "Inativo"} ·
                criado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
              </small>
            </div>
            <button onClick={() => { setError(""); setForm({ ...u, role_id: u.role.id }); }}>
              Editar
            </button>
            <button
              onClick={() => {
                const p = prompt("Nova senha (mínimo 6 caracteres, uma letra maiúscula e um caractere especial)");
                if (p) {
                  setError("");
                  api(`/users/${u.id}/password`, {
                    method: "PUT",
                    body: JSON.stringify({
                      password: p,
                      password_confirmation: p,
                    }),
                  }).catch((reason) => setError((Object.values(reason.errors || {}).flat()[0] as string) || reason.message || "Não foi possível redefinir a senha."));
                }
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
            {error && <div className="alert" role="alert">{error}</div>}
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
                  label="Senha (mínimo 6 caracteres, maiúscula e caractere especial)"
                  type="password"
                  value={form.password}
                  onChange={(e: any) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                <Field
                  label="Confirmar senha"
                  type="password"
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

export function StorageAdmin({ role }: any) {
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
