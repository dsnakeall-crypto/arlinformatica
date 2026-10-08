import React, { useEffect, useState } from "react";
import { centsFromMoneyInput, maskMoneyInput, moneyInputFromCents } from "./money-input";
import { ArrowDown, ArrowUp, ClipboardList, LayoutDashboard, Plus, Wallet, X, Banknote, CreditCard, Landmark, RotateCcw, Clock3, BarChart3, CalendarDays, CircleDollarSign, ReceiptText } from "lucide-react";
import PageHeader from "./page-header";
import { FinanceDate } from "./finance-date";
import { api, Field, money, brazilianDate, movementTitle, expenseCategoryLabel, financeMethodLabel } from './app-shared';
import { QuickEntry } from './lazy-pages';

export function ExpenseEntry({ open, onClose, onSaved, item }: any) {
  const [spentOn, setSpentOn] = useState(""),
    [category, setCategory] = useState("merchandise_purchase"),
    [description, setDescription] = useState(""),
    [value, setValue] = useState("0,00"),
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
      moneyInputFromCents(item?.amount_cents || 0),
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
          amount_cents: centsFromMoneyInput(value),
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
          spellCheck
        />
        <Field
          label="Valor (R$)"
          value={value}
          onChange={(e: any) => setValue(maskMoneyInput(e.target.value))}
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

export function DailyRevenueChart({ data }: any) {
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

export function FinancePage({ role, openOrder }: any) {
  const [tab, setTab] = useState("overview"),
    [daily, setDaily] = useState<any>(),
    [month, setMonth] = useState<any>(),
    [previous, setPrevious] = useState<any>(),
    [receivables, setReceivables] = useState<any>(),
    [monthLoading, setMonthLoading] = useState(true),
    [monthError, setMonthError] = useState(""),
    [dailyLoading, setDailyLoading] = useState(true),
    [dailyError, setDailyError] = useState(""),
    [previousLoading, setPreviousLoading] = useState(true),
    [previousError, setPreviousError] = useState(""),
    [receivablesLoading, setReceivablesLoading] = useState(true),
    [receivablesError, setReceivablesError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [quick, setQuick] = useState(false),
    [expense, setExpense] = useState(false),
    [editingExpense, setEditingExpense] = useState<any>(),
    [moveFilter, setMoveFilter] = useState("all"),
    [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  useEffect(() => {
    const controller = new AbortController();
    setMonthLoading(true);
    setMonthError("");
    api("/finance/month?period=" + period, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setMonth(result); })
      .catch(error => { if (!controller.signal.aborted) setMonthError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setMonthLoading(false); });
    return () => controller.abort();
  }, [period, refresh]);
  useEffect(() => {
    if (tab !== "daily" && tab !== "receivables") return;
    const controller = new AbortController();
    const isDaily = tab === "daily";
    const setBusy = isDaily ? setDailyLoading : setReceivablesLoading;
    const setFailure = isDaily ? setDailyError : setReceivablesError;
    setBusy(true);
    setFailure("");
    api(isDaily ? "/finance/daily" : "/finance/receivables", { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) (isDaily ? setDaily : setReceivables)(result); })
      .catch(error => { if (!controller.signal.aborted) setFailure(error.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [tab, refresh]);
  useEffect(() => {
    if (tab !== "reports") return;
    const controller = new AbortController();
    const date = new Date(`${period}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - 1);
    const prior = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    setPreviousLoading(true);
    setPreviousError("");
    api("/finance/month?period=" + prior, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setPrevious(result); })
      .catch(error => { if (!controller.signal.aborted) setPreviousError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setPreviousLoading(false); });
    return () => controller.abort();
  }, [tab, period, refresh]);
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
  const reload = () => setRefresh(value => value + 1);
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
            <strong>{monthLoading ? "…" : monthError ? "—" : money(value)}</strong>
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
      {monthLoading && <div className="state" role="status">Carregando mês financeiro…</div>}
      {monthError && <div className="state error" role="alert">Dados do mês indisponíveis: {monthError}</div>}
      {tab === "overview" && !monthLoading && !monthError && (
        <>
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
      {tab === "daily" && (dailyLoading ? <div className="state">Carregando caixa diário…</div> : dailyError ? <div className="state error">{dailyError}</div> : daily && (
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
      ))}
      {tab === "moves" && !monthLoading && !monthError && (
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
      {tab === "month" && !monthLoading && !monthError && (
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
      {tab === "reports" && !monthLoading && !monthError && (previousLoading ? <div className="state">Carregando comparação mensal…</div> : previousError ? <div className="state error">{previousError}</div> : (
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
      ))}
      {tab === "expenses" && !monthLoading && !monthError && (
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
