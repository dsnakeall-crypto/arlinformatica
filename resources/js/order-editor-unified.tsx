import { useEffect, useState } from 'react';

type Props = {
  orderId: number;
  onClose: () => void;
  onSaved: () => void;
};

type ApiError = Error & { errors?: Record<string, string[]> };
type ChecklistState = Record<number, { selected: boolean; note: string }>;
type ServiceLine = { catalog_id: number; description: string; quantity: number; unit_price_cents: number };

const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
const api = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(`/api${url}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(csrf() ? { 'X-CSRF-TOKEN': csrf() } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({ message: 'Resposta inválida do servidor.' }));
  if (!response.ok) throw Object.assign(new Error(body.message || 'Não foi possível concluir.'), { errors: body.errors }) as ApiError;
  return body;
};

const money = (cents = 0) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

export default function UnifiedOrderEditor({ orderId, onClose, onSaved }: Props) {
  const [order, setOrder] = useState<any>();
  const [clients, setClients] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [termIssued, setTermIssued] = useState(false);
  const [clientId, setClientId] = useState('');
  const [equipment, setEquipment] = useState('');
  const [attendance, setAttendance] = useState('bench');
  const [problem, setProblem] = useState('');
  const [checks, setChecks] = useState<ChecklistState>({});
  const [items, setItems] = useState<ServiceLine[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const nextOrder = await api(`/orders/${orderId}`);
        const [clientPayload, checklistRows, serviceRows, documents] = await Promise.all([
          api('/clients?all=1'),
          api(`/catalogs/checklist?equipment_type_id=${nextOrder.equipment_type_id}`),
          api('/catalogs/services'),
          api(`/orders/${orderId}/documents`),
        ]);
        if (!active) return;

        const nextTemplates = Array.isArray(checklistRows) ? checklistRows : [];
        const currentChecks = new Map((nextOrder.checklists || []).map((row: any) => [row.label, row]));
        const nextChecks: ChecklistState = {};
        nextTemplates.forEach((row: any) => {
          const current = currentChecks.get(row.label) as any;
          nextChecks[Number(row.id)] = { selected: Boolean(current), note: current?.note || '' };
        });

        const nextItems = (nextOrder.items || [])
          .filter((row: any) => !row.finalization_id && row.catalog_id)
          .map((row: any) => ({
            catalog_id: Number(row.catalog_id),
            description: row.description,
            quantity: Number(row.quantity),
            unit_price_cents: Number(row.unit_price_cents),
          }));

        setOrder(nextOrder);
        setClients(Array.isArray(clientPayload?.data) ? clientPayload.data : []);
        setTemplates(nextTemplates);
        setCatalog(Array.isArray(serviceRows) ? serviceRows : []);
        setTermIssued(Array.isArray(documents) && documents.some((row: any) => row.type === 'term'));
        setClientId(String(nextOrder.client_id));
        setEquipment(nextOrder.equipment_description || '');
        setAttendance(nextOrder.attendance_type);
        setProblem(nextOrder.reported_problem || '');
        setChecks(nextChecks);
        setItems(nextItems);
        if (serviceRows?.[0]) setServiceId(String(serviceRows[0].id));
      } catch (reason: any) {
        if (active) setError(reason.message);
      }
    })();
    return () => { active = false; };
  }, [orderId]);

  if (!order) {
    return <div className="modal"><section className="modal-card arl-od-card" role="dialog" aria-modal="true" aria-label="Editar OS"><h2>Editar OS</h2><p>{error || 'Carregando dados…'}</p><div className="arl-od-actions"><button type="button" onClick={onClose}>Fechar</button></div></section></div>;
  }

  const administrativeOnly = Boolean(order.archived || order.status === 'completed');
  const clientChanged = Number(clientId) !== Number(order.client_id);
  const equipmentChanged = equipment.trim() !== String(order.equipment_description || '').trim();

  const updateCheck = (id: number, patch: Partial<{ selected: boolean; note: string }>) => {
    setChecks((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const addService = () => {
    const entry = catalog.find((row) => String(row.id) === serviceId);
    if (!entry) return;
    setItems((current) => {
      const found = current.find((row) => row.catalog_id === Number(entry.id));
      if (found) return current.map((row) => row.catalog_id === Number(entry.id) ? { ...row, quantity: Math.min(999, row.quantity + 1) } : row);
      return [...current, { catalog_id: Number(entry.id), description: entry.name, quantity: 1, unit_price_cents: Number(entry.price_cents) }];
    });
  };

  const save = async () => {
    if (!problem.trim()) { setError('Informe o problema relatado.'); return; }
    if (!administrativeOnly && equipmentChanged && !equipment.trim()) { setError('Informe Equipamento / Modelo / Acessórios.'); return; }

    setBusy(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        attendance_type: attendance,
        reported_problem: problem.trim(),
      };

      if (!administrativeOnly) {
        if (clientChanged) payload.client_id = Number(clientId);
        if (equipmentChanged) payload.equipment_description = equipment.trim();
        payload.checklist = templates
          .filter((row) => checks[Number(row.id)]?.selected)
          .map((row) => ({ template_id: Number(row.id), note: checks[Number(row.id)]?.note.trim() || null }));
        payload.items = items.map((row) => ({ catalog_id: row.catalog_id, quantity: row.quantity }));
      }

      await api(`/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      onSaved();
    } catch (reason: any) {
      setError(Object.values(reason.errors || {}).flat()[0] as string || reason.message);
    } finally {
      setBusy(false);
    }
  };

  const currentClientInList = clients.some((client) => Number(client.id) === Number(order.client_id));
  const subtotal = items.reduce((sum, row) => sum + row.quantity * row.unit_price_cents, 0);

  return <div className="modal"><section className="modal-card arl-od-card" role="dialog" aria-modal="true" aria-label={`Editar OS #${order.number}`}>
    <h2>Editar OS #{order.number}</h2>
    <p>{administrativeOnly ? 'Correção administrativa: o fechamento, valores, cliente, equipamento, checklist e serviços permanecem preservados.' : 'Cliente, equipamento, atendimento, relato, checklist e serviços são salvos juntos nesta OS.'}</p>

    {!administrativeOnly && <>
      <label>Cliente<select aria-label="Cliente da OS" value={clientId} onChange={(event) => setClientId(event.target.value)}>
        {!currentClientInList && <option value={order.client_id}>{order.client?.name || `Cliente #${order.client_id}`}</option>}
        {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
      </select></label>
      {termIssued && clientChanged && <div className="notice" role="alert">Atenção: o Termo de Recebimento já emitido permanece com o cliente {order.client?.name}. A troca será registrada na OS e na auditoria, sem reescrever o documento assinado.</div>}

      <label>Equipamento / Modelo / Acessórios<textarea aria-label="Equipamento / Modelo / Acessórios" maxLength={500} value={equipment} onChange={(event) => setEquipment(event.target.value)}/></label>
      {termIssued && equipmentChanged && <div className="notice">O Termo de Recebimento já emitido mantém a descrição anterior do equipamento.</div>}
    </>}

    <label>Atendimento<select aria-label="Atendimento" value={attendance} onChange={(event) => setAttendance(event.target.value)}><option value="bench">Bancada</option><option value="external">Externo</option></select></label>
    <label>Problema relatado<textarea aria-label="Problema relatado" value={problem} onChange={(event) => setProblem(event.target.value)}/></label>

    {!administrativeOnly && <>
      <h3>Checklist</h3>
      <div className="arl-od-checks">{templates.length ? templates.map((row) => {
        const state = checks[Number(row.id)] || { selected: false, note: '' };
        return <div key={row.id}>
          <label><input type="checkbox" aria-label={row.label} checked={state.selected} onChange={(event) => updateCheck(Number(row.id), { selected: event.target.checked })}/>{row.label}</label>
          {state.selected && row.allows_note && <label>Observação de {row.label}<input aria-label={`Observação de ${row.label}`} value={state.note} onChange={(event) => updateCheck(Number(row.id), { note: event.target.value })}/></label>}
        </div>;
      }) : <span>Nenhuma opção para este equipamento.</span>}</div>

      <h3>Serviços</h3>
      <div className="arl-od-service-top"><select aria-label="Serviço para adicionar no editor" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{catalog.map((row) => <option key={row.id} value={row.id}>{row.name} — {money(row.price_cents)}</option>)}</select><button type="button" onClick={addService}>Adicionar serviço</button></div>
      <div className="arl-od-lines">{items.length ? items.map((row, index) => <div className="arl-od-line" key={`${row.catalog_id}-${index}`}><b>{row.description}</b><input aria-label={`Quantidade no editor de ${row.description}`} type="number" min="1" max="999" value={row.quantity} onChange={(event) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Math.max(1, Math.min(999, Number(event.target.value) || 1)) } : item))}/><span>{money(row.quantity * row.unit_price_cents)}</span><button type="button" aria-label={`Remover ${row.description} do editor`} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>) : <p>Nenhum serviço adicionado.</p>}</div>
      <div className="arl-od-foot"><span/><strong>Subtotal: {money(subtotal)}</strong></div>
    </>}

    {error && <div className="alert">{error}</div>}
    <div className="arl-od-actions"><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="primary" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
  </section></div>;
}
