import { useEffect, useState } from 'react';
import { ClipboardList, FileText, Save, X } from 'lucide-react';
import ServiceProductSearch, { type ServiceProductCatalogItem } from './service-product-search';
import TextImprovement from './text-improvement';

type Props = {
  orderId: number;
  onClose: () => void;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

type ApiError = Error & { errors?: Record<string, string[]> };
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
  const [catalog, setCatalog] = useState<ServiceProductCatalogItem[]>([]);
  const [termIssued, setTermIssued] = useState(false);
  const [equipment, setEquipment] = useState('');
  const [equipmentDetails, setEquipmentDetails] = useState('');
  const [attendance, setAttendance] = useState('bench');
  const [problem, setProblem] = useState('');
  const [intakeCondition, setIntakeCondition] = useState('');
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
        const [serviceRows, documents] = await Promise.all([
          api('/catalogs/items'),
          api(`/orders/${orderId}/documents`),
        ]);
        if (!active) return;

        const nextItems = (nextOrder.items || [])
          .filter((row: any) => !row.finalization_id && row.catalog_id)
          .map((row: any) => ({
            catalog_id: Number(row.catalog_id),
            description: row.description,
            quantity: Number(row.quantity),
            unit_price_cents: Number(row.unit_price_cents),
          }));

        setOrder(nextOrder);
        setCatalog(Array.isArray(serviceRows) ? serviceRows.filter((row: any) => row.active !== false) : []);
        setTermIssued(Array.isArray(documents) && documents.some((row: any) => row.type === 'term'));
        setEquipment(nextOrder.equipment_description || '');
        setEquipmentDetails(nextOrder.equipment_details || '');
        setAttendance(nextOrder.attendance_type);
        setProblem(nextOrder.reported_problem || '');
        setIntakeCondition(nextOrder.intake_condition || '');
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
  const equipmentDetailsChanged = equipmentDetails.trim() !== String(order.equipment_details || '').trim();
  const markDirty = () => setDirty(true);

  const addService = (entry: ServiceProductCatalogItem, quantity = 1) => {
    markDirty();
    setItems((current) => {
      const found = current.find((row) => row.catalog_id === Number(entry.id));
      if (found) return current.map((row) => row.catalog_id === Number(entry.id) ? { ...row, quantity: Math.min(999, row.quantity + quantity) } : row);
      return [...current, { catalog_id: Number(entry.id), description: entry.name, quantity, unit_price_cents: Number(entry.price_cents) }];
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
    if (!equipment.trim()) { setError('Informe o Equipamento.'); return; }

    setBusy(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        attendance_type: attendance,
        reported_problem: problem.trim(),
        intake_condition: intakeCondition.trim(),
      };
      if (equipmentChanged) payload.equipment_description = equipment.trim();
      if (equipmentDetailsChanged) payload.equipment_details = equipmentDetails.trim() || null;
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
    <header className="arl-unified-editor-header"><div className="arl-unified-editor-heading"><span className="arl-unified-editor-icon"><FileText/></span><div><h2>Editar OS #{order.number}</h2><p>Atualize os dados técnicos, o atendimento, o estado físico e os serviços desta OS.</p></div></div><button type="button" className="arl-unified-editor-close" aria-label="Fechar" onClick={close}><X/></button></header>
    <div className="arl-unified-editor-columns">
      <div className="arl-unified-editor-column">
        <label>Equipamento<textarea aria-label="Equipamento" spellCheck={true} required maxLength={500} value={equipment} onChange={(event) => { markDirty(); setEquipment(event.target.value); }}/></label>
        <label>Fabricante / Modelo / Acessórios<textarea aria-label="Fabricante / Modelo / Acessórios" spellCheck={true} maxLength={500} value={equipmentDetails} onChange={(event) => { markDirty(); setEquipmentDetails(event.target.value); }}/></label>
        {termIssued && (equipmentChanged || equipmentDetailsChanged) && <div className="notice">O Termo de Recebimento já emitido mantém os dados anteriores do equipamento.</div>}
        <label>Problema relatado<textarea aria-label="Problema relatado" spellCheck={true} value={problem} onChange={(event) => { markDirty(); setProblem(event.target.value); }}/><TextImprovement value={problem} onUse={(text) => { markDirty(); setProblem(text); }}/></label>
      </div>
      <div className="arl-unified-editor-column">
        <label>Atendimento<select aria-label="Atendimento" value={attendance} onChange={(event) => { markDirty(); setAttendance(event.target.value); }}><option value="bench">Bancada</option><option value="external">Externo</option></select></label>
        <div className="arl-unified-editor-section-title"><span className="arl-unified-editor-icon"><ClipboardList/></span><h3>Estado físico na entrada</h3></div>
        <label className="arl-unified-editor-intake-condition">Avarias aparentes (opcional)<textarea aria-label="Estado físico na entrada" maxLength={10000} spellCheck={true} value={intakeCondition} onChange={(event) => { markDirty(); setIntakeCondition(event.target.value); }} placeholder="Ex.: riscos, trincas, peça faltando ou marcas de queda"/></label>
        <p className="arl-unified-editor-help">Deixe vazio quando o equipamento chegar aparentemente sem avarias.</p>
        <div className="arl-unified-editor-section-title"><span className="arl-unified-editor-icon"><FileText/></span><h3>Serviços / Produtos</h3></div>
        <ServiceProductSearch items={catalog} ariaLabel="Pesquisar Serviço / Produto no editor" onSelect={addService}/>
        <div className="arl-od-lines">{items.length ? items.map((row, index) => <div className="arl-od-line" key={`${row.catalog_id}-${index}`}><b>{row.description}</b><input aria-label={`Quantidade no editor de ${row.description}`} type="number" min="1" max="999" value={row.quantity} onChange={(event) => { markDirty(); setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Math.max(1, Math.min(999, Number(event.target.value) || 1)) } : item)); }}/><span>{money(row.quantity * row.unit_price_cents)}</span><button type="button" aria-label={`Remover ${row.description} do editor`} onClick={() => { markDirty(); setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)); }}>×</button></div>) : <p>Nenhum serviço adicionado.</p>}</div>
        <div className="arl-od-foot"><span/><strong>Subtotal: {money(subtotal)}</strong></div>
      </div>
    </div>

    {error && <div className="alert">{error}</div>}
    <div className="arl-od-actions"><button type="button" onClick={close}>Cancelar</button><button type="button" className="primary arl-od-save" disabled={busy} onClick={save}><Save/>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
  </section></div>;
}
