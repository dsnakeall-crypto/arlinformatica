import { useEffect, useState } from 'react';
import { ClipboardList, FileText, Save, X } from 'lucide-react';
import ServiceProductSearch, { type ServiceProductCatalogItem } from './service-product-search';

type Props = {
  orderId: number;
  onClose: () => void;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

type ApiError = Error & { errors?: Record<string, string[]> };
type ChecklistState = Record<number, { selected: boolean; note: string }>;
type ServiceLine = { catalog_id: number; description: string; quantity: number; unit_price_cents: number };

const UNSAVED_MESSAGE = 'Existem alterações não salvas. Deseja sair sem salvar?';
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

export default function UnifiedOrderEditor({ orderId, onClose, onSaved, onDirtyChange }: Props) {
  const [order, setOrder] = useState<any>();
  const [templates, setTemplates] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<ServiceProductCatalogItem[]>([]);
  const [termIssued, setTermIssued] = useState(false);
  const [equipment, setEquipment] = useState('');
  const [attendance, setAttendance] = useState('bench');
  const [problem, setProblem] = useState('');
  const [checks, setChecks] = useState<ChecklistState>({});
  const [items, setItems] = useState<ServiceLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const nextOrder = await api(`/orders/${orderId}`);
        const [checklistRows, serviceRows, documents] = await Promise.all([
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
        setTemplates(nextTemplates);
        setCatalog(Array.isArray(serviceRows) ? serviceRows.filter((row: any) => row.active !== false) : []);
        setTermIssued(Array.isArray(documents) && documents.some((row: any) => row.type === 'term'));
        setEquipment(nextOrder.equipment_description || '');
        setAttendance(nextOrder.attendance_type);
        setProblem(nextOrder.reported_problem || '');
        setChecks(nextChecks);
        setItems(nextItems);
        setDirty(false);
      } catch (reason: any) {
        if (active) setError(reason.message);
      }
    })();
    return () => { active = false; };
  }, [orderId]);

  if (!order) {
    return <div className="modal"><section className="modal-card arl-od-card" role="dialog" aria-modal="true" aria-label="Editar OS"><h2>Editar OS</h2><p>{error || 'Carregando dados…'}</p><div className="arl-od-actions"><button type="button" onClick={onClose}>Fechar</button></div></section></div>;
  }

  const equipmentChanged = equipment.trim() !== String(order.equipment_description || '').trim();
  const markDirty = () => setDirty(true);

  const updateCheck = (id: number, patch: Partial<{ selected: boolean; note: string }>) => {
    markDirty();
    setChecks((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const addService = (entry: ServiceProductCatalogItem) => {
    markDirty();
    setItems((current) => {
      const found = current.find((row) => row.catalog_id === Number(entry.id));
      if (found) return current.map((row) => row.catalog_id === Number(entry.id) ? { ...row, quantity: Math.min(999, row.quantity + 1) } : row);
      return [...current, { catalog_id: Number(entry.id), description: entry.name, quantity: 1, unit_price_cents: Number(entry.price_cents) }];
    });
  };

  const close = () => {
    if (dirty && !window.confirm(UNSAVED_MESSAGE)) return;
    setDirty(false);
    onDirtyChange?.(false);
    onClose();
  };

  const save = async () => {
    if (!problem.trim()) { setError('Informe o problema relatado.'); return; }
    if (equipmentChanged && !equipment.trim()) { setError('Informe Equipamento / Modelo / Acessórios.'); return; }

    setBusy(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        attendance_type: attendance,
        reported_problem: problem.trim(),
      };
      if (equipmentChanged) payload.equipment_description = equipment.trim();

      payload.checklist = templates
        .filter((row) => checks[Number(row.id)]?.selected)
        .map((row) => ({ template_id: Number(row.id), note: checks[Number(row.id)]?.note.trim() || null }));
      payload.items = items.map((row) => ({ catalog_id: row.catalog_id, quantity: row.quantity }));

      await api(`/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setDirty(false);
      onDirtyChange?.(false);
      onSaved();
    } catch (reason: any) {
      setError(Object.values(reason.errors || {}).flat()[0] as string || reason.message);
    } finally {
      setBusy(false);
    }
  };

  const subtotal = items.reduce((sum, row) => sum + row.quantity * row.unit_price_cents, 0);

  return <div className="modal"><section className="modal-card arl-od-card arl-unified-editor" role="dialog" aria-modal="true" aria-label={`Editar OS #${order.number}`}>
    <header className="arl-unified-editor-header"><div className="arl-unified-editor-heading"><span className="arl-unified-editor-icon"><FileText/></span><div><h2>Editar OS #{order.number}</h2><p>Atualize os dados técnicos, o atendimento, o checklist e os serviços desta OS.</p></div></div><button type="button" className="arl-unified-editor-close" aria-label="Fechar" onClick={close}><X/></button></header>
    <div className="arl-unified-editor-fields">
    <label>Equipamento / Modelo / Acessórios<textarea aria-label="Equipamento / Modelo / Acessórios" maxLength={500} value={equipment} onChange={(event) => { markDirty(); setEquipment(event.target.value); }}/></label>
    {termIssued && equipmentChanged && <div className="notice">O Termo de Recebimento já emitido mantém a descrição anterior do equipamento.</div>}

    <label>Atendimento<select aria-label="Atendimento" value={attendance} onChange={(event) => { markDirty(); setAttendance(event.target.value); }}><option value="bench">Bancada</option><option value="external">Externo</option></select></label>
    <label>Problema relatado<textarea aria-label="Problema relatado" value={problem} onChange={(event) => { markDirty(); setProblem(event.target.value); }}/></label></div>

    <div className="arl-unified-editor-section-title"><span className="arl-unified-editor-icon"><ClipboardList/></span><h3>Checklist</h3></div>
    <div className="arl-od-checks">{templates.length ? templates.map((row) => {
      const state = checks[Number(row.id)] || { selected: false, note: '' };
      return <div key={row.id}>
        <label><input type="checkbox" aria-label={row.label} checked={state.selected} onChange={(event) => updateCheck(Number(row.id), { selected: event.target.checked })}/>{row.label}</label>
        {state.selected && row.allows_note && <label>Observação de {row.label}<input aria-label={`Observação de ${row.label}`} value={state.note} onChange={(event) => updateCheck(Number(row.id), { note: event.target.value })}/></label>}
      </div>;
    }) : <span>Nenhuma opção para este equipamento.</span>}</div>

    <div className="arl-unified-editor-section-title"><span className="arl-unified-editor-icon"><FileText/></span><h3>Serviços / Produtos</h3></div>
    <ServiceProductSearch items={catalog} ariaLabel="Pesquisar Serviço / Produto no editor" onSelect={addService}/>
    <div className="arl-od-lines">{items.length ? items.map((row, index) => <div className="arl-od-line" key={`${row.catalog_id}-${index}`}><b>{row.description}</b><input aria-label={`Quantidade no editor de ${row.description}`} type="number" min="1" max="999" value={row.quantity} onChange={(event) => { markDirty(); setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Math.max(1, Math.min(999, Number(event.target.value) || 1)) } : item)); }}/><span>{money(row.quantity * row.unit_price_cents)}</span><button type="button" aria-label={`Remover ${row.description} do editor`} onClick={() => { markDirty(); setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)); }}>×</button></div>) : <p>Nenhum serviço adicionado.</p>}</div>
    <div className="arl-od-foot"><span/><strong>Subtotal: {money(subtotal)}</strong></div>

    {error && <div className="alert">{error}</div>}
    <div className="arl-od-actions"><button type="button" onClick={close}>Cancelar</button><button type="button" className="primary arl-od-save" disabled={busy} onClick={save}><Save/>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
  </section></div>;
}
