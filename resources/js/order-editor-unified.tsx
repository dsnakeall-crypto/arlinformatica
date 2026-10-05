import { useEffect, useState } from 'react';
import { FileText, Save, X, CalendarDays, Clock3, Wrench, Box, Tag, LockKeyhole, ClipboardList, Info, WandSparkles, ChevronDown } from 'lucide-react';
import TextImprovement from './text-improvement';
import OrderPopup from './order-popup';
import { completedRequest } from './cache-requests';

type Props = {
  orderId: number;
  onClose: () => void;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

type ApiError = Error & { errors?: Record<string, string[]> };

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
  completedRequest(url, options, response.status);
  if (!response.ok) throw Object.assign(new Error(body.message || 'Não foi possível concluir.'), { errors: body.errors }) as ApiError;
  return body;
};

const formatOptionalDate = (value: unknown, fallback = '—') => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

export default function UnifiedOrderEditor({ orderId, onClose, onSaved, onDirtyChange }: Props) {
  const [order, setOrder] = useState<any>();
  const [termIssued, setTermIssued] = useState(false);
  const [equipment, setEquipment] = useState('');
  const [equipmentDetails, setEquipmentDetails] = useState('');
  const [attendance, setAttendance] = useState('bench');
  const [problem, setProblem] = useState('');
  const [intakeCondition, setIntakeCondition] = useState('');
  const [systemPassword, setSystemPassword] = useState('');
  const [withoutSystemPassword, setWithoutSystemPassword] = useState(false);
  const [systemPasswordTouched, setSystemPasswordTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [nextOrder, documents] = await Promise.all([
          api(`/orders/${orderId}`),
          api(`/orders/${orderId}/documents`),
        ]);
        if (!active) return;
        if (nextOrder.archived || ['completed', 'interrupted'].includes(nextOrder.status)) {
          throw new Error('Somente uma OS aberta pode ser editada.');
        }
        setOrder(nextOrder);
        setTermIssued(Array.isArray(documents) && documents.some((row: any) => row.type === 'term'));
        setEquipment(nextOrder.equipment_description || '');
        setEquipmentDetails(nextOrder.equipment_details || '');
        setAttendance(nextOrder.attendance_type);
        setProblem(nextOrder.reported_problem || '');
        setIntakeCondition(nextOrder.intake_condition || '');
        setSystemPassword('');
        setWithoutSystemPassword(false);
        setSystemPasswordTouched(false);
        setDirty(false);
      } catch (reason: any) {
        if (active) setError(reason.message);
      }
    })();
    return () => { active = false; };
  }, [orderId]);

  const markDirty = () => setDirty(true);
  const close = () => {
    if (dirty && !window.confirm(UNSAVED_MESSAGE)) return;
    setDirty(false);
    onDirtyChange?.(false);
    onClose();
  };

  if (!order) return <div className="state error">{error || 'Carregando dados…'}</div>;

  const equipmentChanged = equipment.trim() !== String(order.equipment_description || '').trim();
  const equipmentDetailsChanged = equipmentDetails.trim() !== String(order.equipment_details || '').trim();

  const save = async () => {
    if (!problem.trim()) return setError('Informe o problema relatado.');
    if (!equipment.trim()) return setError('Informe o Equipamento.');
    if ((!order.has_system_password || systemPasswordTouched) && !withoutSystemPassword && !systemPassword.trim()) {
      return setError('Informe a senha ou marque Sem senha');
    }

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
      if (withoutSystemPassword) {
        payload.system_password = null;
        payload.system_password_absent = true;
      } else if (systemPasswordTouched || !order.has_system_password) {
        payload.system_password = systemPassword;
        payload.system_password_absent = false;
      }

      await api(`/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setDirty(false);
      onDirtyChange?.(false);
      onSaved();
    } catch (reason: any) {
      setError((Object.values(reason.errors || {}).flat()[0] as string) || reason.message);
    } finally {
      setBusy(false);
    }
  };

  return <OrderPopup variant="editor" title="Ficha de entrada — edição" eyebrow={`ENTRADA · OS #${order.number}`} description="Atualize o atendimento e os dados de entrada do equipamento." icon={FileText} onClose={() => { if (!busy) close(); }}>
    <div className="arl-3d-editor-body">
      <div className="arl-3d-meta">
        <div><CalendarDays /><b>Entrada</b><span className="arl-3d-readonly">{formatOptionalDate(order.received_at)}<CalendarDays /></span></div>
        <i /><div><Clock3 /><b>Saída</b><span className="arl-3d-readonly">Em aberto<ChevronDown aria-hidden="true" /></span></div>
        <i /><label><Wrench /><b>Atendimento</b><select aria-label="Atendimento" value={attendance} onChange={(event) => { markDirty(); setAttendance(event.target.value); }}><option value="bench">Interno</option><option value="external">Externo</option></select></label>
      </div>
      <div className="arl-3d-editor-columns">
        <section className="arl-3d-panel">
          <div className="arl-3d-section-heading"><span className="arl-3d-number">01</span><div><h3>Equipamento e acesso</h3><p>Identificação, acessórios e senha do sistema.</p></div></div>
          <label className="arl-3d-field"><span><Box />Equipamento</span><textarea aria-label="Equipamento" spellCheck required maxLength={500} value={equipment} onChange={(event) => { markDirty(); setEquipment(event.target.value); }} /></label>
          <label className="arl-3d-field"><span><Tag />Fabricante / Modelo / Acessórios</span><textarea aria-label="Fabricante / Modelo / Acessórios" spellCheck maxLength={500} value={equipmentDetails} onChange={(event) => { markDirty(); setEquipmentDetails(event.target.value); }} /></label>
          {termIssued && (equipmentChanged || equipmentDetailsChanged) && <div className="notice">O Termo de Recebimento já emitido mantém os dados anteriores do equipamento.</div>}
          <div className="arl-3d-password"><label className="arl-3d-field"><span><LockKeyhole />Senha do sistema</span><input type="text" aria-label="Senha do sistema" autoComplete="off" maxLength={500} disabled={withoutSystemPassword} value={systemPassword} placeholder={order.has_system_password ? 'Senha já cadastrada — digite para substituir' : ''} onChange={(event) => { markDirty(); setSystemPasswordTouched(true); setSystemPassword(event.target.value); }} /></label>
            <label className="arl-3d-no-password"><input type="checkbox" checked={withoutSystemPassword} onChange={(event) => { markDirty(); setSystemPasswordTouched(true); setWithoutSystemPassword(event.target.checked); if (event.target.checked) setSystemPassword(''); }} />Sem senha</label></div>
          {order.has_system_password && !systemPasswordTouched && <p className="arl-3d-help"><Info />Há uma senha cadastrada. Digite uma nova somente se quiser substituí-la.</p>}
        </section>
        <section className="arl-3d-panel">
          <div className="arl-3d-section-heading"><span className="arl-3d-number">02</span><div><h3>Relato e condição de entrada</h3><p>Registre o que o cliente informou e o estado do equipamento.</p></div></div>
          <label className="arl-3d-field"><span><FileText />Problema relatado</span><textarea aria-label="Problema relatado" spellCheck value={problem} onChange={(event) => { markDirty(); setProblem(event.target.value); }} /></label>
          <div className="arl-3d-improve"><WandSparkles aria-hidden="true" /><TextImprovement value={problem} onUse={(text) => { markDirty(); setProblem(text); }} /></div>
          <label className="arl-3d-field"><span><ClipboardList />Estado físico na entrada</span><textarea aria-label="Estado físico na entrada" maxLength={10000} spellCheck value={intakeCondition} onChange={(event) => { markDirty(); setIntakeCondition(event.target.value); }} placeholder="Ex.: riscos, trincas, peça faltando ou marcas de queda" /></label>
          <p className="arl-3d-help">Deixe vazio quando o equipamento chegar aparentemente sem avarias.</p>
        </section>
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
    </div>
    <footer className="arl-3d-footer"><button type="button" disabled={busy} onClick={close}><X />Cancelar</button><button type="button" className="arl-3d-primary" disabled={busy} onClick={() => void save()}><Save />{busy ? 'Salvando…' : 'Salvar'}</button></footer>
  </OrderPopup>;
}
