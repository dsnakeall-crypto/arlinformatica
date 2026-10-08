import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import CacheBoundary from './cache-boundary';
import { reserveOpeningWindow, openCreatedOrderMessage } from "./whatsapp-opening-flow";
import PageHeader from "./page-header";
import { Box, Camera, ClipboardList, Plus, Users } from "lucide-react";
import NewOrderClientPicker from "./new-order-client-picker";
import TextImprovement from "./text-improvement";
import ServiceProductSearch from "./service-product-search";
import { centsFromMoneyInput, moneyInputFromCents } from "./money-input";
import OrderPopup from './order-popup';
import { Client, api, Order, Catalog, masks, money, status, formatBrasiliaDateTime } from './app-shared';
import { CameraModal, ClientsPage as Clients } from './lazy-pages';

export function NewOrder({ done, initialClient }: { done: (id: number, fallback?: string) => void; initialClient?: Client }) {
  const [autoWhatsapp, setAutoWhatsapp] = useState(false);
  useEffect(() => { let active = true; api("/operational-settings").then(s => { if (active) setAutoWhatsapp(s.order_opened_auto_whatsapp === true); }).catch(() => {}); return () => { active = false; }; }, []);
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  const [openOrderWarning, setOpenOrderWarning] = useState(false);
  const submitAfterConfirmation = useRef(false);
  const confirmedOrders = useRef<number[]>([]);
  const [clients, setClients] = useState<Client[]>([]),
    [services, setServices] = useState<Catalog[]>([]),
    [orderItems, setOrderItems] = useState<any[]>([]);
  const [client, setClient] = useState(0),
    [type, setType] = useState(0),
    [attendance, setAttendance] = useState("bench"),
    [problem, setProblem] = useState(""),
    [intakeCondition, setIntakeCondition] = useState(""),
    [equipmentDescription, setEquipmentDescription] = useState(""),
    [equipmentDetails, setEquipmentDetails] = useState(""),
    [systemPassword, setSystemPassword] = useState(""),
    [withoutSystemPassword, setWithoutSystemPassword] = useState(false),
    [photos, setPhotos] = useState<File[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [quick, setQuick] = useState(false),
    [camera, setCamera] = useState(false);
  useEffect(() => {
    Promise.all([
      api("/clients"),
      api("/catalogs/equipment"),
      api("/catalogs/items"),
    ])
      .then(([c, e, s]) => {
        setClients(c.data);
        setServices(s);
        const manual = e.find(
          (item: Catalog) => item.name === "Informado manualmente",
        );
        if (manual) setType(manual.id);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!initialClient) return;
    setClients((current: Client[]) => [
      initialClient,
      ...current.filter((row: Client) => row.id !== initialClient.id),
    ]);
    setClient(initialClient.id);
    window.__arlSelectedClient = initialClient;
  }, [initialClient]);
  const currentClient = clients.find((c) => c.id === client);
  useEffect(() => {
    confirmedOrders.current = [];
    submitAfterConfirmation.current = false;
    setExistingOrders([]);
    setOpenOrderWarning(false);
    if (!client) return;
    const controller = new AbortController();
    api(`/clients/${client}/open-orders`, { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return;
        setExistingOrders(result.data);
        setOpenOrderWarning(result.data.length > 0);
      })
      .catch(() => { /* Submission checks again on the server, even if this preview fails. */ });
    return () => controller.abort();
  }, [client]);
  const photoPreviews = useMemo(
    () => photos.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [photos],
  );
  useEffect(
    () => () => photoPreviews.forEach(({ url }) => URL.revokeObjectURL(url)),
    [photoPreviews],
  );
  if (quick)
    return (
      <CacheBoundary>
      <Clients
        quick
        role="Master"
        onSelected={(c: Client) => {
          setClients((x) => [c, ...x]);
          setClient(c.id);
          setQuick(false);
        }}
      />
      </CacheBoundary>
    );
  const addPhotos = (files: readonly File[] | null | undefined) => {
    if (!files?.length) return;
    setPhotos((current) => {
      const available = Math.max(0, 5 - current.length);
      if (files.length > available) window.alert("Cada OS aceita no máximo 5 fotos. As fotos excedentes não foram adicionadas.");
      return [...current, ...files.slice(0, available)];
    });
  };
  const addItem = (item: Catalog, quantity = 1) =>
    setOrderItems((current) => {
      const found = current.find((x) => x.catalog_id === item.id);
      return found
        ? current.map((x) =>
            x.catalog_id === item.id
              ? { ...x, quantity: Math.min(999, x.quantity + quantity) }
              : x,
          )
        : [
            ...current,
            {
              catalog_id: item.id,
              name: item.name,
              quantity,
              price_cents: item.price_cents || 0,
              free_price: !!item.free_price,
            },
          ];
    });
  const updateQuantity = (catalogId: number, quantity: number) =>
    setOrderItems((current) =>
      current.map((x) =>
        x.catalog_id === catalogId
          ? { ...x, quantity: Math.max(1, Math.min(999, quantity || 1)) }
          : x,
      ),
    );
  const openingTotal = orderItems.reduce(
    (sum, x) => sum + x.quantity * x.price_cents,
    0,
  );
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    let conversation: Window | null = null;
    let createdOrder: any;
    try {
      if (!client) throw new Error("Selecione um cliente cadastrado.");
      if (!type)
        throw new Error(
          "Não foi possível carregar o tipo interno de equipamento.",
        );
      if (!withoutSystemPassword && !systemPassword.trim())
        throw new Error("Informe a senha ou marque Sem senha");
      const checklist: any[] = [];
      const items = orderItems.map((x) => ({
        catalog_id: x.catalog_id,
        quantity: x.quantity,
        ...(x.free_price ? { unit_price_cents: x.price_cents } : {}),
      }));
      conversation = reserveOpeningWindow(autoWhatsapp);
      const order = await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          client_id: client,
          confirmed_open_order_ids: confirmedOrders.current,
          equipment_type_id: type,
          manufacturer_id: null,
          equipment_description: equipmentDescription.trim(),
          equipment_details: equipmentDetails.trim() || null,
          system_password: withoutSystemPassword ? null : systemPassword,
          system_password_absent: withoutSystemPassword,
          attendance_type: attendance,
          reported_problem: problem,
          intake_condition: intakeCondition,
          checklist,
          items,
        }),
      });
      createdOrder = order;
      for (const photo of photos) {
        const form = new FormData();
        form.append("photo", photo);
        await api(`/orders/${order.id}/photos`, { method: "POST", body: form });
      }
      const fallback = openCreatedOrderMessage(order.opening_whatsapp, conversation);
      done(order.id, fallback);
    } catch (x: any) {
      conversation?.close();
      if (createdOrder) {
        window.alert("A OS foi criada, mas não foi possível concluir os anexos ou abrir o WhatsApp. Confira a OS antes de tentar novamente.");
        done(createdOrder.id, createdOrder.opening_whatsapp?.auto_open ? createdOrder.opening_whatsapp?.url : undefined);
        return;
      }
      if (x.code === 'CLIENT_HAS_OPEN_ORDERS') {
        submitAfterConfirmation.current = true;
        setExistingOrders(x.open_orders);
        setOpenOrderWarning(true);
        return;
      }
      setError(
        (Object.values(x.errors || {}).flat()[0] as string) || x.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="ATENDIMENTO ARL"
        title="Abertura de Chamado / Nova OS"
        description="Registre cliente, equipamento, checklist, fotos e itens opcionais."
        icon={Plus}
      />
      <form className="os-form arl-new-order" onSubmit={submit}>
        {error && <div className="alert">{error}</div>}
        <div className="os-layout">
          <div className="os-main">
            <section>
              <h2>
                <Users />
                Dados do cliente
              </h2>
              <div className="inline">
                <NewOrderClientPicker
                  selected={currentClient}
                  onSelect={(c) => {
                    setClients((current) => [
                      ...current.filter((x) => x.id !== c.id),
                      c as Client,
                    ]);
                    setClient(c.id);
                    window.__arlSelectedClient = c;
                  }}
                />
                <button type="button" onClick={() => setQuick(true)}>
                  <Plus />
                  Cadastro rápido
                </button>
              </div>
              {currentClient && (
                <div className="selected-client-summary">
                  <b>{currentClient.name}</b>
                  <small>
                    {masks.phone(currentClient.phone)} ·{" "}
                    {masks.document(currentClient.document)}
                  </small>
                  <small>
                    {currentClient.street}, {currentClient.number} —{" "}
                    {currentClient.city}/{currentClient.state}
                  </small>
                </div>
              )}
            </section>
            <section>
              <h2>
                <Box />
                Dados do equipamento
              </h2>
              <label className="field arl-manual-equipment-field">
                <span>Equipamento *</span>
                <input
                  type="text"
                  maxLength={500}
                  required
                  autoComplete="off"
                  spellCheck={true}
                  value={equipmentDescription}
                  onChange={(e) => setEquipmentDescription(e.target.value)}
                  placeholder="Ex.: Notebook"
                />
              </label>
              <label className="field arl-manual-equipment-details-field">
                <span>Fabricante / Modelo / Acessórios</span>
                <input
                  type="text"
                  maxLength={500}
                  autoComplete="off"
                  spellCheck={true}
                  value={equipmentDetails}
                  onChange={(e) => setEquipmentDetails(e.target.value)}
                  placeholder="Ex.: Dell Inspiron 15 + carregador"
                />
              </label>
              <div className="arl-system-password-field">
                <label className="field">
                  <span>Senha do sistema *</span>
                  <input
                    type="text"
                    maxLength={500}
                    autoComplete="off"
                    disabled={withoutSystemPassword}
                    value={systemPassword}
                    onChange={(e) => setSystemPassword(e.target.value)}
                    aria-label="Senha do sistema"
                  />
                </label>
                <label className="arl-system-password-absent">
                  <input
                    type="checkbox"
                    checked={withoutSystemPassword}
                    onChange={(e) => {
                      setWithoutSystemPassword(e.target.checked);
                      if (e.target.checked) setSystemPassword("");
                    }}
                  />
                  <span>Sem senha</span>
                </label>
              </div>
              <p className="arl-manual-equipment-help">
                Descreva o equipamento e, se necessário, complemente com fabricante, modelo e acessórios.
              </p>
              <div className="attendance">
                <button
                  type="button"
                  className={attendance === "bench" ? "chosen" : ""}
                  onClick={() => setAttendance("bench")}
                >
                  ANÁLISE NA BANCADA
                </button>
                <button
                  type="button"
                  className={attendance === "external" ? "chosen" : ""}
                  onClick={() => setAttendance("external")}
                >
                  ATENDIMENTO EXTERNO
                </button>
              </div>
              <label className="field">
                <span>Problema relatado *</span>
                <textarea
                  required
                  spellCheck={true}
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                />
                <TextImprovement value={problem} onUse={setProblem} />
              </label>
            </section>
            <section>
              <h2>
                <ClipboardList />
                Estado físico na entrada
              </h2>
              <label className="field">
                <span>Avarias aparentes (opcional)</span>
                <textarea
                  aria-label="Estado físico do equipamento na entrada"
                  maxLength={10000}
                  spellCheck={true}
                  value={intakeCondition}
                  onChange={(e) => setIntakeCondition(e.target.value)}
                  placeholder="Ex.: riscos, trincas, peça faltando ou marcas de queda"
                />
              </label>
              <p className="field-help">
                Deixe vazio quando o equipamento chegar aparentemente sem
                avarias.
              </p>
            </section>
            <section>
              <h2>
                <Camera />
                Fotos do equipamento
              </h2>
              <label className="upload">
                <Camera />
                <span>
                  {photos.length
                    ? `${photos.length} foto${photos.length === 1 ? "" : "s"} anexada${photos.length === 1 ? "" : "s"}`
                    : "JPEG, PNG ou WebP — será otimizada para até 100 KB"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    // FileList pertence ao input e é esvaziada ao limpar o campo.
                    // Preserve os arquivos antes disso para que seleções sucessivas
                    // sejam sempre acumuladas no estado da ficha.
                    const selectedPhotos = Array.from(e.currentTarget.files ?? []);
                    e.currentTarget.value = "";
                    addPhotos(selectedPhotos);
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
              {photoPreviews.length > 0 && (
                <div className="opening-photo-previews" aria-label="Fotos anexadas">
                  {photoPreviews.map(({ file, url }, index) => (
                    <figure key={`${file.name}-${file.lastModified}-${index}`}>
                      <img className="preview" src={url} alt={`Prévia da foto ${index + 1}`} />
                      <button
                        type="button"
                        aria-label={`Remover foto ${index + 1}`}
                        onClick={() =>
                          setPhotos((current) =>
                            current.filter((_, photoIndex) => photoIndex !== index),
                          )
                        }
                      >
                        ×
                      </button>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          </div>
          <section className="os-items-panel">
            <h2>
              <Box />
              Serviços / Itens da OS
            </h2>
            <p>
              Opcional na abertura. Preço e garantia são confirmados pelo
              servidor a partir do catálogo.
            </p>
            <ServiceProductSearch items={services as any} ariaLabel="Pesquisar Serviço / Produto na abertura" onSelect={addItem as any} />
            <div className="catalog-pills opening-catalog arl-service-catalog">
              {services
                .filter((item) => item.category !== "product")
                .map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => addItem(item)}
                  >
                    + {item.name}
                  </button>
                ))}
            </div>
            <div className="opening-items">
              {orderItems.length ? (
                orderItems.map((item) => (
                  <div className="opening-item" key={item.catalog_id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {money(item.price_cents)} cada · subtotal{" "}
                        {money(item.quantity * item.price_cents)}
                      </small>
                    </div>
                    <input
                      aria-label={`Valor unitário de ${item.name}`}
                      inputMode="decimal"
                      disabled={!item.free_price}
                      value={moneyInputFromCents(item.price_cents)}
                      onChange={(event) =>
                        setOrderItems((current) => current.map((row) =>
                          row.catalog_id === item.catalog_id
                            ? { ...row, price_cents: centsFromMoneyInput(event.target.value) }
                            : row,
                        ))
                      }
                    />
                    <input
                      aria-label={`Quantidade de ${item.name}`}
                      type="number"
                      min="1"
                      max="999"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.catalog_id, +e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOrderItems((current) =>
                          current.filter(
                            (x) => x.catalog_id !== item.catalog_id,
                          ),
                        )
                      }
                    >
                      Remover
                    </button>
                  </div>
                ))
              ) : (
                <div className="opening-empty">
                  Nenhum serviço ou produto adicionado. Você pode criar a OS sem
                  itens.
                </div>
              )}
            </div>
            <div className="opening-total">
              <span>Subtotal previsto</span>
              <strong>{money(openingTotal)}</strong>
            </div>
          </section>
        </div>
        <div className="actions">
          <button className="primary" disabled={busy}>
            {busy ? "Criando OS…" : "Criar ordem de serviço"}
          </button>
        </div>
      </form>
      {openOrderWarning && <OrderPopup
        title="Cliente com chamado em aberto"
        eyebrow="CONFIRMAR NOVA OS"
        description={`${currentClient?.name || 'Este cliente'} já possui chamado em aberto. Confirma a abertura de um novo chamado?`}
        icon={ClipboardList} variant="budget" closeLabel="Cancelar nova abertura"
        onClose={() => { setOpenOrderWarning(false); confirmedOrders.current = []; }}
      >
        <div className="arl-open-orders-warning">
          {existingOrders.map(order => <article key={order.id}>
            <strong>OS #{order.number} · {status[order.status]}</strong>
            <small>{order.equipment_description || 'Equipamento'} · {formatBrasiliaDateTime(order.received_at)}</small>
            <b>Problema relatado</b>
            <p>{order.reported_problem}</p>
          </article>)}
        </div>
        <footer className="arl-3d-footer">
          <button type="button" onClick={() => { setOpenOrderWarning(false); confirmedOrders.current = []; }}>Cancelar</button>
          <button type="button" className="primary" onClick={() => {
            confirmedOrders.current = existingOrders.map(order => order.id);
            setOpenOrderWarning(false);
            if (submitAfterConfirmation.current) void submit();
          }}>Confirmar novo chamado</button>
        </footer>
      </OrderPopup>}
      {camera && (
        <CameraModal
          onClose={() => setCamera(false)}
          onFile={(file: File) => {
            addPhotos([file]);
            setCamera(false);
          }}
        />
      )}
    </>
  );
}
