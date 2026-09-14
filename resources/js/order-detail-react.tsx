import { FormEvent, useEffect, useRef, useState } from 'react';
import { Camera, Check, MapPin, Pencil, Phone, Plus, RotateCcw, Wallet, X } from 'lucide-react';
import ServiceProductSearch, { type ServiceProductCatalogItem } from './service-product-search';
import OrderAuditHistory from './order-audit-history';
import '../css/order-detail-layout.css';
import { OrderPaymentFigures } from './finance-refund-summary';
import { isReopenedOrder } from './order-reopened';

type Props = { reopenOnLoad?: boolean; id: number; back: () => void; onEdit?: () => void; onDirtyChange?: (dirty: boolean) => void; onOpenClientHistory?: (clientId: number) => void };
type ApiError = Error & { errors?: Record<string, string[]> };
type PaymentSummary = { total_cents: number; paid_cents: number; balance_cents: number; collectible_balance_cents: number; status: 'unpaid' | 'partial' | 'paid'; payments: any[]; refunded_cents: number; refundable_cents: number; refunds: any[] };

type FinalShare = { url: string; expires_at: string; revision: number };

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

const digits = (value: string) => value.replace(/\D/g, '');
const masks = {
  document: (value: string) => {
    const n = digits(value).slice(0, 14);
    return n.length <= 11
      ? n.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      : n.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  },
  phone: (value: string) => digits(value).slice(0, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'),
};

const money = (cents = 0) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
const formatOptionalDate = (value: unknown, fallback = '—') => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};
const statusLabel: Record<string, string> = {
  analysis: 'Em Análise',
  waiting_part: 'Aguardando Peça',
  in_service: 'Em Serviço',
  completed: 'Finalizado',
  interrupted: 'Interrompido',
  paid: 'Pago',
};
const paymentMethodLabel = (value: string) => ({ pix: 'Pix', cash: 'Dinheiro', debit: 'Débito', credit: 'Crédito', transfer: 'Transferência', other: 'Outro' } as Record<string, string>)[value] || value;

function TextField({ label, value, onChange, required = false, type = 'text', name }: any) {
  return <label className="field"><span>{label}{required ? ' *' : ''}</span><input name={name} type={type} value={value} onChange={onChange} required={required}/></label>;
}

export function CameraModal({ onClose, onFile }: { onClose: () => void; onFile: (file: File) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((media) => {
        if (!active) return media.getTracks().forEach((track) => track.stop());
        stream.current = media;
        if (video.current) video.current.srcObject = media;
      })
      .catch((reason) => setError(reason?.message || 'Não foi possível acessar a câmera.'));
    return () => {
      active = false;
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  const shot = () => {
    const source = video.current;
    if (!source?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    canvas.getContext('2d')?.drawImage(source, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onFile(new File([blob], `camera-${Date.now()}.webp`, { type: 'image/webp' }));
    }, 'image/webp', .86);
  };
  return <div className="arl-camera-modal" role="dialog" aria-modal="true" aria-label="Capturar foto">
    <div className="arl-camera-card">
      <button className="arl-camera-close" type="button" onClick={onClose}>×</button>
      <h2>Capturar foto</h2><p>A imagem será anexada diretamente à ordem de serviço.</p>
      <video ref={video} autoPlay playsInline muted/>
      <div className="arl-camera-error">{error}</div>
      <div className="arl-camera-actions"><button type="button" onClick={onClose}>Cancelar</button><button type="button" onClick={shot}>◉ Tirar foto</button></div>
    </div>
  </div>;
}

function PhotoChoice({ onClose, onUpload, onCamera }: { onClose: () => void; onUpload: () => void; onCamera: () => void }) {
  return <div className="arl-photo-choice" role="dialog" aria-modal="true" aria-label="Adicionar foto"><div>
    <h3>Adicionar foto</h3>
    <button type="button" className="primary" onClick={onUpload}>Enviar arquivo</button>
    <button type="button" onClick={onCamera}>Usar câmera / webcam</button>
    <button type="button" onClick={onClose}>Cancelar</button>
  </div></div>;
}

function EditOrderModal({ order, onClose, onSaved }: any) {
  const [attendance, setAttendance] = useState(order.attendance_type);
  const [problem, setProblem] = useState(order.reported_problem);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void api(`/catalogs/checklist?equipment_type_id=${order.equipment_type_id}`).then((rows: any[]) => {
      setTemplates(rows);
      const names = new Set((order.checklists || []).map((row: any) => row.label));
      setSelected(new Set(rows.filter((row) => names.has(row.label)).map((row) => row.id)));
    }).catch((reason) => setError(reason.message));
  }, [order]);
  const toggle = (id: number, checked: boolean) => setSelected((current) => {
    const next = new Set(current);
    checked ? next.add(id) : next.delete(id);
    return next;
  });
  const save = async () => {
    setBusy(true); setError('');
    try {
      const updated = await api(`/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ attendance_type: attendance, reported_problem: problem.trim(), checklist: Array.from(selected).map((template_id) => ({ template_id })) }) });
      onSaved(updated);
    } catch (reason: any) {
      setError(Object.values(reason.errors || {}).flat()[0] as string || reason.message);
    } finally { setBusy(false); }
  };
  return <div className="arl-od-modal"><section className="arl-od-card" role="dialog" aria-modal="true" aria-label={`Editar OS #${order.number}`}>
    <h2>Editar OS #{order.number}</h2><p>Corrija o relato e o checklist da OS ativa. Pagamentos são corrigidos separadamente e ficam auditados.</p>
    <label>Atendimento<select value={attendance} onChange={(e) => setAttendance(e.target.value)}><option value="bench">Bancada</option><option value="external">Externo</option></select></label>
    <label>Problema relatado<textarea value={problem} onChange={(e) => setProblem(e.target.value)}/></label>
    <label>Checklist selecionado</label><div className="arl-od-checks">{templates.length ? templates.map((row) => <label key={row.id}><input type="checkbox" checked={selected.has(row.id)} onChange={(e) => toggle(row.id, e.target.checked)}/>{row.label}</label>) : <span>Nenhuma opção para este equipamento.</span>}</div>
    {error && <div className="alert">{error}</div>}
    <div className="arl-od-actions"><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="primary" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
  </section></div>;
}

function ImmutableModal({ order, onClose }: any) {
  const preservedState = order.archived ? 'paga e arquivada' : order.status === 'interrupted' ? 'interrompida e fechada' : 'finalizada';
  return <div className="arl-od-modal"><section className="arl-od-card" role="dialog" aria-modal="true" aria-label={`Editar OS #${order.number}`}>
    <h2>OS #{order.number} preservada</h2>
    <p>Esta OS está {preservedState} e o conteúdo histórico não pode ser alterado. {order.status === 'interrupted' ? 'Uma OS interrompida não pode ser reaberta; um novo atendimento exige uma nova OS.' : 'A reabertura preserva o histórico da finalização anterior.'}</p>
    <div className="arl-od-actions"><button type="button" className="primary" onClick={onClose}>Fechar</button></div>
  </section></div>;
}

function InterruptionModal({ order, onClose, onSaved }: any) {
  const [reason, setReason] = useState(order.status === 'interrupted' ? (order.interruption_reason || order.technical_report || '') : '');
  const [workDone, setWorkDone] = useState(order.status === 'interrupted' ? (order.interruption_work_done || '') : '');
  const [error, setError] = useState('');
  const save = async () => {
    if (!reason.trim()) { setError('Informe o motivo da interrupção.'); return; }
    if (!workDone.trim()) { setError('Informe o que já foi feito no equipamento. Se nada foi feito, escreva "Nada".'); return; }
    try {
      await api(`/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'interrupted', interruption_reason: reason.trim(), interruption_work_done: workDone.trim() }) });
      onSaved();
    } catch (e: any) { setError(e.message); }
  };
  return <div className="arl-status-modal"><section className="arl-status-modal-card" role="dialog" aria-modal="true" aria-label="Interromper OS">
    <h2>Interromper OS</h2><p className="arl-status-modal-note">A OS será fechada sem lançamento financeiro. Os serviços serão removidos e o total ficará zerado.</p>
    <label>Motivo da interrupção<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: cliente pediu pausa, aguardando decisão, atendimento suspenso..."/></label>
    <label>O que já foi feito no equipamento? *<textarea aria-label="O que já foi feito no equipamento" value={workDone} onChange={(e) => setWorkDone(e.target.value)} placeholder='Se nada foi feito, escreva "Nada".'/></label>
    <div className="arl-status-modal-error">{error}</div>
    <div className="arl-status-modal-actions"><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="primary" onClick={save}>Salvar interrupção</button></div>
  </section></div>;
}

function ServicesPanel({ order, reload, pendingSaveRef, onDirtyChange }: any) {
  const [catalog, setCatalog] = useState<ServiceProductCatalogItem[]>([]);
  const [items, setItems] = useState<any[]>(() => (order.items || []).filter((row: any) => !row.finalization_id && row.catalog_id).map((row: any) => ({ catalog_id: Number(row.catalog_id), description: row.description, quantity: Number(row.quantity), unit_price_cents: Number(row.unit_price_cents) })));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => { void api('/catalogs/services').then((rows) => setCatalog(Array.isArray(rows) ? rows.filter((row: any) => row.active !== false) : [])); }, [order.id]);
  useEffect(() => {
    setItems((order.items || []).filter((row: any) => !row.finalization_id && row.catalog_id).map((row: any) => ({ catalog_id: Number(row.catalog_id), description: row.description, quantity: Number(row.quantity), unit_price_cents: Number(row.unit_price_cents) })));
    setDirty(false);
    onDirtyChange?.(false);
  }, [order.items]);
  useEffect(() => () => { pendingSaveRef.current = null; onDirtyChange?.(false); }, [order.id, pendingSaveRef]);
  if (order.archived || ['completed', 'interrupted'].includes(order.status)) return null;
  const changeItems = (updater: (current: any[]) => any[]) => {
    setMessage('');
    setItems(updater);
    setDirty(true);
    onDirtyChange?.(true);
  };
  const add = (entry: ServiceProductCatalogItem) => changeItems((current) => {
    const found = current.find((row) => row.catalog_id === Number(entry.id));
    return found ? current.map((row) => row.catalog_id === Number(entry.id) ? { ...row, quantity: Math.min(999, row.quantity + 1) } : row) : [...current, { catalog_id: Number(entry.id), description: entry.name, quantity: 1, unit_price_cents: Number(entry.price_cents) }];
  });
  const persist = async (notify = false) => {
    if (!dirty) {
      if (notify) setMessage('Serviços já estão salvos.');
      return order;
    }
    setBusy(true);
    if (notify) setMessage('');
    try {
      const updated = await api(`/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ items: items.map((row) => ({ catalog_id: row.catalog_id, quantity: row.quantity })) }) });
      setDirty(false);
      onDirtyChange?.(false);
      if (notify) setMessage('Serviços salvos.');
      await reload();
      return updated;
    } catch (e: any) {
      if (notify) setMessage(e.message);
      throw e;
    } finally { setBusy(false); }
  };
  pendingSaveRef.current = () => persist(false);
  const save = async () => { try { await persist(true); } catch { /* mensagem já exibida */ } };
  return <section className="wide arl-od-services"><h2>Serviços / Produtos</h2><p>Independente do orçamento: registre o que realmente foi feito e a quantidade.</p>
    <ServiceProductSearch items={catalog} ariaLabel="Pesquisar Serviço / Produto" onSelect={add}/>
    <div className="arl-od-lines">{items.length ? items.map((row, index) => <div className="arl-od-line" key={`${row.catalog_id}-${index}`}><b>{row.description}</b><input aria-label={`Quantidade de ${row.description}`} type="number" min="1" max="999" value={row.quantity} onChange={(e) => changeItems((current) => current.map((item, i) => i === index ? { ...item, quantity: Math.max(1, Math.min(999, Number(e.target.value) || 1)) } : item))}/><span>{money(row.quantity * row.unit_price_cents)}</span><button type="button" aria-label={`Remover ${row.description}`} onClick={() => changeItems((current) => current.filter((_, i) => i !== index))}>×</button></div>) : <p>Nenhum serviço adicionado.</p>}</div>
    <div className="arl-od-foot"><span>{message}</span><strong>Subtotal: {money(items.reduce((sum, row) => sum + row.quantity * row.unit_price_cents, 0))}</strong><button type="button" className="primary arl-od-save" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar serviços'}</button></div>
  </section>;
}

function FinalReportPanel({ order, value, setValue, reload, onDirtyChange }: any) {
  const [message, setMessage] = useState('');
  const readOnly = Boolean(order.archived || ['completed', 'interrupted'].includes(order.status));
  const save = async () => {
    setMessage('');
    try { await api(`/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ final_report: value.trim() || null }) }); onDirtyChange?.(false); setMessage('Salvo.'); await reload(); }
    catch (e: any) { setMessage(e.message); }
  };
  return <section className="wide arl-od-report"><h2>Laudo Final</h2><p>O que foi feito, pontos de atenção e recomendações. Este texto sai no PDF final.</p>
    <textarea readOnly={readOnly} placeholder="Descreva o serviço executado e observações..." value={value} onChange={(e) => { setValue(e.target.value); onDirtyChange?.(true); }}/>
    {!readOnly && <div className="arl-od-report-actions"><small>{message}</small><button type="button" className="primary arl-od-save" onClick={save}>Salvar Laudo Final</button></div>}
  </section>;
}

function BudgetBox({ order, role, openSignal = 0 }: any) {
  const isFinalized = ['completed', 'interrupted'].includes(order.status);
  const [list, setList] = useState<any[]>([]), [open, setOpen] = useState(false), [validity, setValidity] = useState(7), [catalog, setCatalog] = useState<ServiceProductCatalogItem[]>([]), [items, setItems] = useState<any[]>([]), [error, setError] = useState('');
  const [diagnosis, setDiagnosis] = useState(''), [proposal, setProposal] = useState(''), [observation, setObservation] = useState('');
  const load = () => api(`/orders/${order.id}/budgets`).then(setList);
  useEffect(() => { void load(); void Promise.all([api('/operational-settings'), api('/catalogs/services')]).then(([settings, services]) => { setValidity(+settings.budget_validity_days || 7); setCatalog(services); }).catch(() => undefined); }, [order.id]);
  useEffect(() => { if (openSignal && !isFinalized) setOpen(true); }, [openSignal, isFinalized]);
  const add = (entry: ServiceProductCatalogItem) => setItems((current) => { const found = current.find((row) => row.catalog_id === entry.id); return found ? current.map((row) => row === found ? { ...row, quantity: row.quantity + 1 } : row) : [...current, { catalog_id: entry.id, description: entry.name, quantity: 1, unit_price_cents: entry.price_cents, warranty_enabled: !!entry.warranty_enabled, warranty_term: entry.warranty_term, warranty_unit: entry.warranty_unit }]; });
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!items.length) { setError('Adicione ao menos um serviço ou produto do catálogo.'); return; }
    try { await api(`/orders/${order.id}/budgets`, { method: 'POST', body: JSON.stringify({ diagnosis, proposal, observation, validity_days: validity, items }) }); setOpen(false); setItems([]); setDiagnosis(''); setProposal(''); setObservation(''); await load(); }
    catch (e: any) { setError(Object.values(e.errors || {}).flat()[0] as string || e.message); }
  };
  const remove = async (budget: any) => {
    if (!window.confirm(`Excluir o orçamento Revisão ${budget.revision}? O PDF já emitido continuará preservado.`)) return;
    setError('');
    try {
      await api(`/orders/${order.id}/budgets/${budget.revision}`, { method: 'DELETE' });
      setList((current) => current.filter((entry) => entry.id !== budget.id));
      await load();
    }
    catch (e: any) { setError(e.message); }
  };
  return <section className="wide"><div className="section-title"><h2>Orçamentos</h2>{!isFinalized && <button className="primary" data-arl-quick-source="budget" onClick={() => setOpen(true)}><Plus/>Gerar orçamento</button>}</div>
    {open && <div className="modal"><form className="modal-card budget-form" role="dialog" aria-modal="true" aria-label="Gerar orçamento" onSubmit={submit}><button type="button" className="modal-close" aria-label="Fechar orçamento" onClick={() => setOpen(false)}><X/></button><h1>Gerar orçamento</h1><label className="field"><span>Diagnóstico</span><textarea required value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}/></label><label className="field"><span>Serviço proposto</span><textarea required value={proposal} onChange={(e) => setProposal(e.target.value)}/></label><TextField label="Validade (dias)" value={validity} onChange={(e: any) => setValidity(+e.target.value)} required/><ServiceProductSearch items={catalog} ariaLabel="Buscar serviço ou produto para o orçamento" onSelect={add}/><div className="arl-od-lines">{items.map((row, index) => <div className="finish-item" key={`${row.catalog_id}-${index}`}><b>{row.description}</b><input aria-label={`Quantidade de ${row.description}`} type="number" min="1" max="999" value={row.quantity} onChange={(e) => setItems(items.map((item, i) => i === index ? { ...item, quantity: Math.max(1, +e.target.value || 1) } : item))}/><input aria-label={`Valor unitário de ${row.description}`} value={(row.unit_price_cents / 100).toFixed(2).replace('.', ',')} onChange={(e) => setItems(items.map((item, i) => i === index ? { ...item, unit_price_cents: Math.max(0, Math.round(Number(e.target.value.replace(',', '.')) * 100) || 0) } : item))}/><span>{money(row.quantity * row.unit_price_cents)}</span><button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))}>Remover</button></div>)}</div><label className="field"><span>Observação (opcional)</span><textarea value={observation} onChange={(e) => setObservation(e.target.value)}/></label><strong>Total: {money(items.reduce((sum, row) => sum + row.quantity * row.unit_price_cents, 0))}</strong>{error && <div className="alert">{error}</div>}<div className="actions"><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary">Salvar e gerar PDF</button></div></form></div>}
    {error && !open && <div className="alert">{error}</div>}{list.length ? list.map((budget) => <p key={budget.id}>Revisão {budget.revision} · {budget.status} · R$ {(budget.total_cents / 100).toFixed(2)} · <a target="_blank" rel="noreferrer" href={`/api/orders/${order.id}/budgets/${budget.revision}/pdf`}>Abrir PDF</a> {!isFinalized && budget.status === 'draft' && <button onClick={() => api(`/orders/${order.id}/budgets/${budget.revision}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'sent' }) }).then(load)}>Marcar enviado</button>}{!isFinalized && budget.status === 'sent' && <><button onClick={() => api(`/orders/${order.id}/budgets/${budget.revision}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) }).then(load)}>Aprovar orçamento</button><button onClick={() => api(`/orders/${order.id}/budgets/${budget.revision}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'refused' }) }).then(load)}>Recusar</button></>}{!isFinalized && ['Master', 'Administrador'].includes(role) && !budget.used_in_finalization && <button type="button" onClick={() => void remove(budget)}>Excluir orçamento</button>}</p>) : <p>Nenhum orçamento criado.</p>}
  </section>;
}

function PaymentCorrection({ order, payment, onClose, onSaved }: any) {
  const [value, setValue] = useState((payment.effective_cents / 100).toFixed(2).replace('.', ','));
  const [reason, setReason] = useState(''); const [error, setError] = useState('');
  const save = async () => {
    const cents = Math.round(Number(value.replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents < 0 || reason.trim().length < 3) { setError('Informe valor e motivo válidos.'); return; }
    try { await api(`/finance/transactions/${payment.transaction_id}/adjust`, { method: 'POST', body: JSON.stringify({ new_cents: cents, reason: reason.trim() }) }); onSaved(); }
    catch (e: any) { setError(e.message); }
  };
  return <div className="arl-od-modal"><section className="arl-od-card" role="dialog" aria-modal="true" aria-label={`Corrigir pagamento da OS #${order.number}`}><h2>Corrigir pagamento da OS #{order.number}</h2><p>A correção mantém o lançamento original e fica auditada.</p><label>Novo valor (R$)<input value={value} onChange={(e) => setValue(e.target.value)}/></label><label>Motivo<textarea value={reason} onChange={(e) => setReason(e.target.value)}/></label>{error && <div className="alert">{error}</div>}<div className="arl-od-actions"><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="primary" onClick={save}>Salvar correção</button></div></section></div>;
}

function RefundModal({ order, maximum, onClose, onSaved }: any) {
  const [value, setValue] = useState((maximum / 100).toFixed(2).replace('.', ',')), [reason, setReason] = useState(''), [method, setMethod] = useState('pix'), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const save = async () => { const cents = Math.round(Number(value.replace(',', '.')) * 100); setBusy(true); setError(''); try { await api(`/orders/${order.id}/refunds`, { method: 'POST', body: JSON.stringify({ amount_cents: cents, reason: reason.trim(), method }) }); onSaved(); } catch (e: any) { setError(Object.values(e.errors || {}).flat()[0] as string || e.message); } finally { setBusy(false); } };
  return <div className="arl-od-modal"><section className="arl-od-card" role="dialog" aria-modal="true" aria-label={`Registrar estorno da OS #${order.number}`}><h2>Registrar estorno</h2><p>O valor original da OS será preservado. A devolução será uma saída financeira na data de hoje.</p><TextField label="Valor devolvido (R$)" value={value} onChange={(e: any) => setValue(e.target.value)} required/><label>Motivo obrigatório<textarea value={reason} onChange={(e) => setReason(e.target.value)}/></label><label>Forma de devolução<select value={method} onChange={(e) => setMethod(e.target.value)}>{[['pix','Pix'],['cash','Dinheiro'],['debit','Cartão de débito'],['credit','Cartão de crédito'],['transfer','Transferência'],['other','Outro']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><div className="notice">Disponível para estorno: <b>{money(maximum)}</b></div>{error&&<div className="alert">{error}</div>}<div className="arl-od-actions"><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="primary" disabled={busy} onClick={save}>{busy?'Registrando…':'Confirmar estorno'}</button></div></section></div>;
}

function PaymentBox({ order, role, openSignal = 0, onSummary }: any) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null), [open, setOpen] = useState(false), [method, setMethod] = useState('pix'), [amount, setAmount] = useState('0,00'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [correcting, setCorrecting] = useState<any>(), [refunding, setRefunding] = useState(false);
  const load = async () => { const next = await api(`/orders/${order.id}/payments`) as PaymentSummary; setSummary(next); setAmount(((next.collectible_balance_cents || 0) / 100).toFixed(2).replace('.', ',')); onSummary?.(next); };
  useEffect(() => { void load(); }, [order.id, order.total_cents]);
  useEffect(() => { if (openSignal && summary && summary.collectible_balance_cents > 0 && summary.total_cents > 0) { setAmount((summary.collectible_balance_cents / 100).toFixed(2).replace('.', ',')); setError(''); setOpen(true); } }, [openSignal]);
  if (order.status === 'interrupted') return <section className="wide arl-payment-empty"><h2>Pagamento</h2><p>OS interrompida não gera pagamento, A Receber ou lançamento no Caixa.</p></section>;
  if (!summary) return <section className="wide"><h2>Pagamento</h2><p>Carregando situação do pagamento…</p></section>;
  const { total_cents: total, paid_cents: paid, collectible_balance_cents: balance } = summary;
  const entered = Math.round(Number(amount.replace(',', '.')) * 100), remainingAfter = Number.isFinite(entered) ? Math.max(0, balance - entered) : balance;
  const save = async () => {
    const cents = Math.round(Number(amount.replace(',', '.')) * 100); if (!Number.isFinite(cents) || cents <= 0) { setError('Informe um valor recebido válido.'); return; }
    setBusy(true); setError(''); try { await api(`/orders/${order.id}/payment`, { method: 'POST', body: JSON.stringify({ amount_cents: cents, method, idempotency_key: crypto.randomUUID() }) }); setOpen(false); await load(); } catch (e: any) { setError(Object.values(e.errors || {}).flat()[0] as string || e.message); } finally { setBusy(false); }
  };
  const compact = summary.status !== 'unpaid' || summary.payments.length > 0;
  return <section className={`wide ${compact ? 'arl-payment-compact' : 'arl-payment-empty'}`}><div className="section-title"><div><h2>Pagamento</h2><p>Registro financeiro independente do status operacional.</p></div><div className="actions">{order.status === 'completed' && summary.refundable_cents > 0 && <button type="button" onClick={() => setRefunding(true)}>Registrar estorno</button>}{balance > 0 && total > 0 && <button className="primary" data-arl-quick-source="payment" onClick={() => { setAmount((balance / 100).toFixed(2).replace('.', ',')); setError(''); setOpen(true); }}><Wallet/>{paid > 0 ? 'Registrar novo pagamento' : 'Registrar pagamento'}</button>}</div></div>
    <OrderPaymentFigures summary={summary}/>
    {summary.payments.map((payment) => <article className="transaction" key={payment.id}><div><b>{money(payment.effective_cents)}</b><small>{paymentMethodLabel(payment.method)} · {new Date(payment.paid_at).toLocaleString('pt-BR')} · {payment.user_name}</small></div>{['Master', 'Administrador'].includes(role) && <button type="button" className="arl-pay-edit" title="Corrigir valor pago" aria-label="Corrigir valor pago" onClick={() => setCorrecting(payment)}><Pencil/></button>}</article>)}
    {summary.refunds?.map((refund) => <article className="transaction arl-refund" key={`refund-${refund.id}`}><div><b>Estorno − {money(refund.amount_cents)}</b><small>{paymentMethodLabel(refund.method)} · {new Date(refund.refunded_at).toLocaleString('pt-BR')} · {refund.user_name}</small><small>Motivo: {refund.reason}</small></div></article>)}
    {open && <div className="modal"><div className="modal-card" role="dialog" aria-modal="true" aria-label={`Pagamento da OS #${order.number}`}><button className="modal-close" onClick={() => setOpen(false)}><X/></button><h1>Pagamento da OS #{order.number}</h1><div className="finance-cards"><article><small>Total</small><strong>{money(total)}</strong></article><article><small>Já pago</small><strong>{money(paid)}</strong></article><article><small>Saldo</small><strong>{money(balance)}</strong></article></div><button type="button" onClick={() => setAmount((balance / 100).toFixed(2).replace('.', ','))}>Pagar valor total ({money(balance)})</button><TextField label="Valor recebido (R$)" value={amount} onChange={(e: any) => setAmount(e.target.value)} required/><label className="field"><span>Forma de pagamento *</span><select value={method} onChange={(e) => setMethod(e.target.value)}>{[['pix', 'Pix'], ['cash', 'Dinheiro'], ['debit', 'Débito'], ['credit', 'Crédito'], ['transfer', 'Transferência'], ['other', 'Outro']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{Number.isFinite(entered) && entered > 0 && entered < balance && <div className="notice">Pagamento parcial: após confirmar, ainda ficarão <b>{money(remainingAfter)}</b> em A Receber.</div>}{error && <div className="alert">{error}</div>}<div className="actions"><button onClick={() => setOpen(false)}>Cancelar</button><button className="primary" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Confirmar pagamento'}</button></div></div></div>}
    {refunding && <RefundModal order={order} maximum={summary.refundable_cents} onClose={() => setRefunding(false)} onSaved={async () => { setRefunding(false); await load(); }}/>}
    {correcting && <PaymentCorrection order={order} payment={correcting} onClose={() => setCorrecting(null)} onSaved={async () => { setCorrecting(null); await load(); }}/>} 
  </section>;
}

function FinalizationBox({ order, reload, openSignal = 0, finalReport, setFinalReport, onShare, persistPendingChanges, onFinalReportDirty }: any) {
  const seeded = (sourceOrder = order) => (sourceOrder.items || []).filter((row: any) => !row.finalization_id).map((row: any) => { let warranty = row.warranty_snapshot; if (typeof warranty === 'string') try { warranty = JSON.parse(warranty); } catch { warranty = null; } return { catalog_id: row.catalog_id, description: row.description, quantity: row.quantity, unit_price_cents: row.unit_price_cents, warranty_enabled: !!warranty, warranty_term: warranty?.term, warranty_unit: warranty?.unit, warranty_description: warranty?.description }; });
  const [open, setOpen] = useState(false), [result, setResult] = useState('repair_completed'), [other, setOther] = useState(''), [discount, setDiscount] = useState('0'), [items, setItems] = useState<any[]>(seeded), [catalog, setCatalog] = useState<any[]>([]), [budgets, setBudgets] = useState<any[]>([]), [sourceBudgetId, setSourceBudgetId] = useState<number | null>(null), [showItemWarranties, setShowItemWarranties] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const loadLists = () => Promise.all([api('/catalogs/services'), api(`/orders/${order.id}/budgets`)]).then(([services, budgetRows]) => { setCatalog(services); setBudgets(budgetRows); });
  const openFinalization = async () => {
    setBusy(true); setError('');
    try {
      const persistedOrder = await persistPendingChanges();
      setItems(seeded(persistedOrder || order));
      setShowItemWarranties(false);
      await loadLists();
      setOpen(true);
    } catch (e: any) {
      setError(Object.values(e.errors || {}).flat()[0] as string || e.message);
    } finally { setBusy(false); }
  };
  useEffect(() => { void loadLists(); }, [order.id]); useEffect(() => { setItems(seeded()); }, [order.items]); useEffect(() => { if (openSignal) void openFinalization(); }, [openSignal]);
  if (order.status === 'completed') return <section className="wide completion"><h2>Finalização da OS</h2><b>Finalizado</b><p>{order.technical_report}</p><strong>Total: {money(order.total_cents)}</strong></section>;
  if (order.status === 'interrupted') return null;
  const approved = budgets.find((row) => row.status === 'approved');
  const budgetItems = approved ? approved.items.map((row: any) => { let warranty = row.warranty_snapshot; if (typeof warranty === 'string') try { warranty = JSON.parse(warranty); } catch { warranty = null; } return { catalog_id: row.catalog_id, description: row.description, quantity: row.quantity, unit_price_cents: row.unit_price_cents, warranty_enabled: !!warranty, warranty_term: warranty?.term, warranty_unit: warranty?.unit }; }) : [];
  const shownItems = sourceBudgetId ? budgetItems : items, subtotal = shownItems.reduce((sum: number, row: any) => sum + row.quantity * row.unit_price_cents, 0), disc = Math.round(Number(discount.replace(',', '.')) * 100), total = Math.max(0, subtotal - disc);
  const add = (entry: ServiceProductCatalogItem) => {
    setSourceBudgetId(null);
    setItems((current) => {
      const found = current.find((row) => row.catalog_id === entry.id);
      return found
        ? current.map((row) => row === found ? { ...row, quantity: Math.min(999, row.quantity + 1) } : row)
        : [...current, { catalog_id: entry.id, description: entry.name, quantity: 1, unit_price_cents: entry.price_cents, warranty_enabled: !!entry.warranty_enabled, warranty_term: entry.warranty_term, warranty_unit: entry.warranty_unit }];
    });
  };
  const finish = async () => {
    setBusy(true); setError('');
    try {
      await persistPendingChanges();
      const payload: any = { result, result_other: other, technical_report: finalReport.trim(), discount_cents: disc, approved_budget_id: sourceBudgetId, photo_ids: (order.photos || []).map((row: any) => row.id), show_item_warranties: showItemWarranties };
      if (!sourceBudgetId) payload.items = items;
      await api(`/orders/${order.id}/finalize`, { method: 'POST', body: JSON.stringify(payload) });
      const share = await api(`/orders/${order.id}/final-share`).catch(() => null);
      if (share?.url) onShare(share);
      setOpen(false); await reload();
    } catch (e: any) { setError(Object.values(e.errors || {}).flat()[0] as string || e.message); } finally { setBusy(false); }
  };
  return <>{!open && error && <div className="alert arl-finalization-error">{error}</div>}
    {open && <div className="modal"><div className="modal-card arl-finalization" role="dialog" aria-modal="true" aria-label="FINALIZAÇÃO DA OS"><button type="button" className="modal-close" aria-label="Fechar finalização" onClick={() => setOpen(false)}><X aria-hidden="true"/></button><h1>FINALIZAÇÃO DA OS</h1><label className="field"><span>Resultado do atendimento *</span><select value={result} onChange={(e) => setResult(e.target.value)}><option value="repair_completed">Reparo realizado</option><option value="irreparable">Equipamento sem possibilidade de reparo</option><option value="client_cancelled">Cliente desistiu/cancelou</option><option value="economically_unviable">Reparo economicamente inviável</option><option value="no_fault">Sem defeito constatado</option><option value="other">Outro</option></select></label>{result === 'other' && <TextField label="Descreva o outro resultado" value={other} onChange={(e: any) => setOther(e.target.value)} required/>}<label className="field"><span>LAUDO TÉCNICO / DESCRIÇÃO DO ATENDIMENTO {result !== 'repair_completed' ? '*' : ''}</span><textarea value={finalReport} onChange={(e) => { setFinalReport(e.target.value); onFinalReportDirty?.(true); }}/></label><div className="section-title"><h2>Serviços da OS</h2>{approved && <button type="button" onClick={() => setSourceBudgetId(approved.id)}>USAR ITENS DO ORÇAMENTO APROVADO</button>}</div><div className="notice arl-final-note">A finalização pode usar os serviços cadastrados na OS ou os itens de um orçamento aprovado selecionado.</div>{sourceBudgetId && <div className="notice">Itens vinculados ao orçamento aprovado. Preço, quantidade e garantia serão lidos diretamente do servidor. <button type="button" onClick={() => setSourceBudgetId(null)}>Usar itens manuais</button></div>}{!sourceBudgetId && <ServiceProductSearch items={catalog} ariaLabel="Pesquisar Serviço / Produto na finalização" onSelect={add} showBrowseAll/>}<div className="arl-finalization-items">{shownItems.map((row: any, index: number) => <div className="finish-item" data-finalization-item="true" key={`${row.catalog_id}-${index}`}><input aria-label={`Descrição do item ${index + 1}`} disabled={!!sourceBudgetId} value={row.description} onChange={(e) => setItems(items.map((item, i) => i === index ? { ...item, description: e.target.value } : item))}/><input aria-label={`Quantidade de ${row.description}`} disabled={!!sourceBudgetId} type="number" min="1" max="999" value={row.quantity} onChange={(e) => setItems(items.map((item, i) => i === index ? { ...item, quantity: Math.max(1, Math.min(999, Number(e.target.value) || 1)) } : item))}/><input aria-label={`Valor unitário de ${row.description}`} disabled={!!sourceBudgetId} value={(row.unit_price_cents / 100).toFixed(2)} onChange={(e) => setItems(items.map((item, i) => i === index ? { ...item, unit_price_cents: Math.max(0, Math.round(Number(e.target.value.replace(',', '.')) * 100) || 0) } : item))}/><span>{money(row.quantity * row.unit_price_cents)}</span>{!sourceBudgetId && <button type="button" className="arl-finalization-remove" aria-label={`Remover ${row.description}`} onClick={() => setItems(items.filter((_, i) => i !== index))}><X aria-hidden="true"/></button>}</div>)}</div><label className="arl-finalization-warranty-toggle"><input type="checkbox" checked={showItemWarranties} onChange={(event) => setShowItemWarranties(event.target.checked)}/><span>Mostrar garantia dos serviços no PDF</span></label><div className="money"><span>Subtotal <b>{money(subtotal)}</b></span><label>Desconto (R$)<input value={discount} onChange={(e) => setDiscount(e.target.value)}/></label><strong>Total {money(total)}</strong></div>{error && <div className="alert">{error}</div>}<div className="actions"><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="primary" disabled={busy} onClick={finish}>{busy ? 'Finalizando…' : 'Salvar e concluir OS'}</button></div></div></div>}
  </>;
}

function ReportBox({ order }: any) {
  const [list, setList] = useState<any[]>([]), [templates, setTemplates] = useState<any[]>([]), [open, setOpen] = useState(false), [template, setTemplate] = useState<any>(), [content, setContent] = useState<any>({ customer_report: order.reported_problem, technical_analysis: '', tests_performed: '', components: '', diagnosis: '', conclusion: '', equipment_situation: '', responsible_technician: '', qualification: '', certification: '', electrical_conclusion: '', confirmed: false, photo_ids: [] }), [error, setError] = useState('');
  const load = () => Promise.all([api(`/orders/${order.id}/reports`), api('/report-templates')]).then(([reports, rows]) => { setList(reports); setTemplates(rows); setTemplate((current: any) => current || rows[0]); });
  useEffect(() => { void load(); }, [order.id]); const set = (key: string, value: any) => setContent((current: any) => ({ ...current, [key]: value }));
  const issue = async () => { setError(''); try { const draft = await api(`/orders/${order.id}/reports`, { method: 'POST', body: JSON.stringify({ template_id: template.id, content: { ...content, confirmed: true } }) }); await api(`/orders/${order.id}/reports/${draft.revision}/issue`, { method: 'POST', body: '{}' }); setOpen(false); await load(); } catch (e: any) { setError(e.message); } };
  return <section className="wide arl-old-report"><div className="section-title"><h2>Laudos técnicos</h2><button className="primary" onClick={() => setOpen(!open)}>GERAR LAUDO TÉCNICO</button></div>{open && <div className="report-form"><div className="notice">O conteúdo técnico deve ser revisado e confirmado pelo profissional responsável antes da emissão.</div><label className="field"><span>Modelo</span><select value={template?.id || ''} onChange={(e) => setTemplate(templates.find((row) => row.id === +e.target.value))}>{templates.filter((row) => row.active).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>{[['customer_report', 'Relato'], ['technical_analysis', 'Análise técnica'], ['tests_performed', 'Testes realizados'], ['components', 'Componentes avaliados/danificados'], ['diagnosis', 'Diagnóstico'], ['conclusion', 'Conclusão'], ['equipment_situation', 'Situação do equipamento'], ['observations', 'Observações'], ['responsible_technician', 'Técnico responsável'], ['qualification', 'Qualificação'], ['certification', 'Registro/certificação (opcional)']].map(([key, label]) => <label className="field" key={key}><span>{label}</span>{['responsible_technician', 'qualification', 'certification', 'equipment_situation'].includes(key) ? <input value={content[key] || ''} onChange={(e) => set(key, e.target.value)}/> : <textarea value={content[key] || ''} onChange={(e) => set(key, e.target.value)}/>}</label>)}{error && <div className="alert">{error}</div>}<button className="primary" onClick={issue}>Revisar, confirmar e emitir</button></div>}{list.map((row) => <p key={row.id}>Laudo {row.template_name} · Revisão {row.revision} · {row.status === 'issued' ? 'Emitido' : 'Rascunho'} {row.status === 'issued' && <a target="_blank" rel="noreferrer" href={`/api/orders/${order.id}/reports/${row.revision}/pdf`}>Visualizar / imprimir / baixar</a>}</p>)}</section>;
}

function DocumentsBox({ order, embedded = false }: any) {
  const [docs, setDocs] = useState<any[]>([]); useEffect(() => { void api(`/orders/${order.id}/documents`).then(setDocs); }, [order.id, order.status]);
  const content = <div className="documents"><a target="_blank" rel="noreferrer" href={`/api/orders/${order.id}/term`}>Termo de recebimento</a>{docs.filter((row) => row.type !== 'term').map((row) => { const href = row.type === 'final' ? `/api/orders/${order.id}/final/${row.revision}/pdf` : row.type === 'technical-report' ? `/api/orders/${order.id}/reports/${row.revision}/pdf` : `/api/orders/${order.id}/budgets/${row.revision}/pdf`; return <article key={row.id}><div><b>{row.type === 'final' ? 'PDF Final' : row.type === 'technical-report' ? 'Laudo Técnico' : 'Orçamento'}</b><small>Revisão {row.revision} · {new Date(row.issued_at).toLocaleString('pt-BR')} · {row.issued_by_name}</small></div><a target="_blank" rel="noreferrer" href={href}>Visualizar</a><a href={href} download>Baixar PDF</a><button onClick={() => { const popup = window.open(href); popup?.addEventListener('load', () => popup.print()); }}>Imprimir</button></article>; })}</div>;
  return embedded ? <div className="arl-record-documents">{content}</div> : <section className="wide"><h2>Documentos</h2>{content}</section>;
}

function FinalShareCard({ order, share, onClose }: { order: any; share: FinalShare; onClose: () => void }) {
  const phone = digits(order.client?.phone || ''); const full = phone.startsWith('55') ? phone : `55${phone}`;
  const message = [`Olá, ${order.client?.name || 'cliente'} 👋`, `Seu Equipamento está pronto da OS ${order.number}! 🎉`, '📋 Detalhes do Serviço:', `- Valor: ${money(order.total_cents || 0)}`, '💳 Formas de Pagamento:', '- PIX (Chave): 35988285777', '- Cartão: (Com taxas inclusas)', '- Dinheiro: (Favor trazer trocado)', '⚠️ A retirada ou entrega será liberada imediatamente após a confirmação do pagamento.', 'Agradecemos pela preferência! 😊'].join('\n');
  const whatsapp = full ? `https://wa.me/${full}?text=${encodeURIComponent(message)}` : '';
  return <div className="arl-final-share-host"><section className="arl-final-share-card" role="status" aria-label="Compartilhar fechamento da OS"><h2>OS #{order.number} finalizada</h2><p>O PDF Final está pronto. O link abaixo expira em 48 horas; o PDF original continua preservado no histórico.</p><div className="arl-final-share-actions"><a target="_blank" rel="noreferrer" href={share.url}>Abrir PDF</a>{whatsapp && <a className="whatsapp" target="_blank" rel="noreferrer" href={whatsapp} onClick={(e) => { e.preventDefault(); if (window.confirm('Deseja abrir o WhatsApp para enviar a mensagem de finalização desta OS?')) window.open(whatsapp, '_blank', 'noopener'); }}>Enviar PDF pelo WhatsApp</a>}<button type="button" onClick={onClose}>Fechar</button></div></section></div>;
}

export default function OrderDetailPage({ id, back, readOnly = false, reopenOnLoad = false, onEdit, onDirtyChange, onOpenClientHistory }: Props & { readOnly?: boolean }) {
  const [order, setOrder] = useState<any>(), [role, setRole] = useState<string | null>(null), [error, setError] = useState(''), [editOpen, setEditOpen] = useState(false), [reopenOpen, setReopenOpen] = useState(false), [reopenNote, setReopenNote] = useState(''), [interruptOpen, setInterruptOpen] = useState(false), [budgetSignal, setBudgetSignal] = useState(0), [paymentSignal, setPaymentSignal] = useState(0), [finalSignal, setFinalSignal] = useState(0), [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null), [finalReport, setFinalReport] = useState(''), [servicesDirty, setServicesDirty] = useState(false), [finalReportDirty, setFinalReportDirty] = useState(false), [share, setShare] = useState<FinalShare | null>(null), [photoChoice, setPhotoChoice] = useState(false), [camera, setCamera] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null), statusSelect = useRef<HTMLSelectElement>(null), pendingServicesSave = useRef<null | (() => Promise<any>)>(null);
  const load = async () => { try { const next = await api(`/orders/${id}`); setOrder(next); if (!finalReportDirty) setFinalReport(next.final_report || (next.status === 'completed' ? next.technical_report || '' : '')); setError(''); } catch (e: any) { setError(e.message); } };
  useEffect(() => {
    setRole(null);
    void Promise.all([
      load(),
      api('/me').then((me) => setRole(me.role || '')).catch((reason) => setError(reason.message)),
    ]);
  }, [id]);
  useEffect(() => { onDirtyChange?.(servicesDirty || finalReportDirty); }, [servicesDirty, finalReportDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [id, onDirtyChange]);
  useEffect(() => {
    if (reopenOnLoad && order?.status === 'completed' && ['Master', 'Administrador'].includes(role || '')) setReopenOpen(true);
  }, [reopenOnLoad, order?.id, order?.status, role]);

  if (error) return <div className="state error">{error}</div>; if (!order || role === null) return <div className="state">Carregando OS…</div>;
  const immutable = Boolean(order.archived || ['completed', 'interrupted'].includes(order.status));
  const interrupted = order.status === 'interrupted';
  const reopened = isReopenedOrder(order);
  const persistPendingChanges = async () => {
    let persistedOrder = order;
    if (finalReportDirty) {
      persistedOrder = await api(`/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ final_report: finalReport.trim() || null }) });
      setFinalReportDirty(false);
    }
    if (servicesDirty && pendingServicesSave.current) {
      persistedOrder = await pendingServicesSave.current() || persistedOrder;
    }
    return persistedOrder;
  };
  const uploadFile = async (file?: File | null) => { if (!file) return; const form = new FormData(); form.append('photo', file); try { await api(`/orders/${order.id}/photos`, { method: 'POST', body: form }); await load(); } catch (e: any) { setError(e.message); } };
  const changeStatus = async (value: string) => {
    if (value === 'completed') { setFinalSignal((x) => x + 1); return; }
    if (value === 'interrupted') { setInterruptOpen(true); return; }
    try { await api(`/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: value }) }); await load(); } catch (e: any) { window.alert(e.message); await load(); }
  };
  const shownStatus = order.archived ? 'paid' : order.status;
  const activeStatusOptions = [['analysis', 'Em Análise'], ['waiting_part', 'Aguardando Peça'], ['in_service', 'Em Serviço'], ['interrupted', 'Interrompido'], ['completed', 'Finalizado']];
  const canAdminister = ['Master', 'Administrador'].includes(role);
  const statusOptions = role === 'Funcionário'
    ? activeStatusOptions.filter(([value]) => !['completed', 'interrupted'].includes(value))
    : order.archived ? [['paid', 'Pago']] : order.status === 'completed' ? [['completed', 'Finalizado'], ['paid', 'Pago']] : interrupted ? [['interrupted', 'Interrompido']] : activeStatusOptions;
  const editOrder = () => onEdit ? onEdit() : setEditOpen(true);
  const finalMessage = [`Olá, ${order.client?.name || 'cliente'} 👋`, `Seu Equipamento está pronto da OS ${order.number}! 🎉`, '📋 Detalhes do Serviço:', `- Valor: ${money(order.total_cents || 0)}`, '💳 Formas de Pagamento:', '- PIX (Chave): 35988285777', '- Cartão: (Com taxas inclusas)', '- Dinheiro: (Favor trazer trocado)', '⚠️ A retirada ou entrega será liberada imediatamente após a confirmação do pagamento.', 'Agradecemos pela preferência! 😊'].join('\n');
  const shareFinalReport = async () => {
    const documents = await api(`/orders/${order.id}/documents`);
    const final = documents.find((row: any) => row.type === 'final');
    if (!final) return window.alert('O Relatório Técnico Final ainda não foi gerado.');
    const href = `/api/orders/${order.id}/final/${final.revision}/pdf`;
    const blob = await fetch(href, { credentials: 'same-origin' }).then((response) => response.blob());
    const file = new File([blob], `Relatorio-Tecnico-OS-${order.number}-R${final.revision}.pdf`, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) return navigator.share({ text: finalMessage, files: [file] });
    const anchor = document.createElement('a'); anchor.href = href; anchor.download = file.name; anchor.click();
    if (openingFullPhone) window.open(`https://wa.me/${openingFullPhone}?text=${encodeURIComponent(finalMessage)}`, '_blank', 'noopener');
  };
  const openingPhone = digits(order.client?.phone || '');
  const openingFullPhone = openingPhone ? (openingPhone.startsWith('55') ? openingPhone : `55${openingPhone}`) : '';
  const openingCondition = String(order.intake_condition || '').trim();
  const openingMessage = [
    `Olá, ${order.client?.name || 'cliente'}`,
    '',
    `Informamos que a sua *Ordem de Serviço nº ${order.number}* foi aberta com sucesso na *ARL Informática*.`,
    ...(openingCondition ? ['', 'Estado físico registrado na abertura:', openingCondition, ''] : ['']),
    'Nosso departamento técnico já iniciou os procedimentos necessários. Em breve, entraremos em contato para atualizar o status do serviço e apresentar os detalhes da verificação do seu equipamento.',
    '',
    'Permanecemos à disposição para qualquer dúvida.',
    '',
    'Atenciosamente,',
    '',
    '*ARL Informática*',
  ].join('\n');
  const openingWhatsapp = openingFullPhone ? `https://wa.me/${openingFullPhone}?text=${encodeURIComponent(openingMessage)}` : '';
  const mapsAddress = [order.client?.street, order.client?.number, order.client?.district, order.client?.city, order.client?.state].filter(Boolean).join(', ');
  const mapsUrl = order.mobile_actions?.maps_url || (mapsAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsAddress)}` : '');
  if (readOnly) return <div data-arl-order-detail-react="1" data-mobile-read-only="1" className="arl-mobile-read-only">
    <header className="arl-mobile-read-only-header"><button type="button" onClick={back} aria-label="Voltar para OS abertas">←</button><div><span>ORDEM DE SERVIÇO</span><h1>OS #{order.number}</h1>{reopened&&<span className="arl-reopened-marker arl-order-reopened-marker">Reaberta</span>}{interrupted&&<span className="arl-reopened-marker arl-interrupted-marker arl-order-reopened-marker">Interrompida</span>}</div></header>
    <div className="arl-read-only-banner">Somente leitura · edite pelo PC</div>
    <div className="arl-mobile-read-only-actions">{openingWhatsapp && <a href={openingWhatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}{mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer">Rota</a>}</div>
    <details className="arl-opening-call"><summary>PDF's e Reaberturas OS</summary><div className="arl-opening-call-menu">{openingWhatsapp ? <a target="_blank" rel="noreferrer" href={openingWhatsapp}>Mensagem de abertura</a> : <span aria-disabled="true">Mensagem de abertura indisponível</span>}<a target="_blank" rel="noreferrer" href={`/api/orders/${order.id}/term`}>Termo de Recebimento PDF</a>{order.status === 'completed' ? <button type="button" onClick={() => void shareFinalReport()}>Relatório Técnico Final</button> : <span aria-disabled="true">Relatório Técnico Final</span>}{canAdminister && (order.status === 'completed' ? <button type="button" onClick={() => setReopenOpen(true)}>Reabrir OS</button> : <span aria-disabled="true">{interrupted ? 'OS interrompida não pode ser reaberta' : 'Reabrir OS'}</span>)}</div></details>
    <section><h2>Cliente</h2><strong>{order.client.name}</strong><p>{masks.document(order.client.document)} · {masks.phone(order.client.phone)}</p><p>{order.client.street}, {order.client.number} — {order.client.city}/{order.client.state}</p></section>
    <section><h2>Equipamento</h2><p>{order.equipment_description || 'Equipamento não informado'}</p>{order.equipment_details && <p><strong>Fabricante / Modelo / Acessórios:</strong> {order.equipment_details}</p>}<p>{order.attendance_type === 'bench' ? 'Análise na Bancada' : 'Atendimento Externo'}</p></section>
    <section><h2>Problema relatado</h2><p>{order.reported_problem}</p></section>
    <section><h2>Estado físico na entrada</h2><p>{order.intake_condition || 'Equipamento aparentemente 100% sem avarias'}</p></section>
    <section><h2>Serviços</h2>{order.items?.length ? order.items.map((item: any) => <p key={item.id}>{item.quantity} × {item.description}</p>) : <p>Nenhum serviço registrado.</p>}</section>
    {interrupted && <section className="arl-interruption-note"><h2>Interrupção</h2><p><strong>Motivo:</strong> {order.interruption_reason || order.technical_report}</p><p><strong>O que já foi feito:</strong> {order.interruption_work_done}</p></section>}
    {reopenOpen && <div className="arl-od-modal"><section className="arl-od-card" role="dialog" aria-modal="true" aria-label={`Reabrir OS #${order.number}`}><h2>Reabrir OS #{order.number}</h2><p>A mesma OS voltará para Em Análise. A finalização e o PDF atuais permanecerão no histórico.</p><label>Motivo da reabertura<textarea value={reopenNote} onChange={(event) => setReopenNote(event.target.value)}/></label><div className="arl-od-actions"><button type="button" onClick={() => setReopenOpen(false)}>Cancelar</button><button type="button" className="primary" onClick={async () => { if (!reopenNote.trim()) return; await api(`/orders/${order.id}/reopen`, { method: 'POST', body: JSON.stringify({ note: reopenNote.trim() }) }); setReopenOpen(false); await load(); }}>Confirmar reabertura</button></div></section></div>}
  </div>;
  const stages = ['Entrada', 'Orçamento', 'Execução', 'Finalização', 'Pagamento'];
  const currentStage = order.archived ? -1 : ['completed', 'interrupted'].includes(order.status) ? 4 : ['in_service', 'waiting_part'].includes(order.status) ? 2 : order.status === 'analysis' ? 1 : 0;
  const stageState = (index: number) => order.archived ? 'completed' : index < currentStage ? 'completed' : index === currentStage ? 'current' : 'future';
  const paymentEnabled = Boolean(canAdminister && paymentSummary && paymentSummary.collectible_balance_cents > 0 && paymentSummary.total_cents > 0);
  return <div data-arl-order-detail-react="1" className="arl-order-detail-page">
    <header className="arl-order-sticky-header">
      <div className="arl-order-header-main">
        <button type="button" className="arl-order-back" onClick={back}>← Voltar</button>
        <div className="arl-order-header-identity"><span className="arl-eyebrow">ORDEM DE SERVIÇO</span><h1>OS #{order.number}</h1>{reopened&&<span className="arl-reopened-marker arl-order-reopened-marker">Reaberta</span>}{interrupted&&<span className="arl-reopened-marker arl-interrupted-marker arl-order-reopened-marker">Interrompida</span>}<div className="arl-order-header-meta"><span className="arl-order-client-link"><strong>{order.client.name}</strong>{onOpenClientHistory&&<button type="button" onClick={()=>onOpenClientHistory(order.client.id)}>Ver histórico do cliente</button>}</span><span>{order.equipment_description || 'Equipamento não informado'}</span><span>{order.attendance_type === 'bench' ? 'Análise na Bancada' : 'Atendimento Externo'}</span></div></div>
        <label className={`status-picker status-${shownStatus}`}><span>Status</span><select ref={statusSelect} value={shownStatus} disabled={order.archived || interrupted} onChange={(e) => void changeStatus(e.target.value)}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="arl-order-quick-actions arl-order-header-actions">
        {order.status === 'completed' ? canAdminister && <button type="button" className="arl-od-btn" onClick={() => setReopenOpen(true)}><RotateCcw/><span>Reabrir OS</span></button> : !immutable && <button type="button" className="arl-od-btn" onClick={editOrder}><Pencil/><span>Editar OS</span></button>}
        {!immutable && <button type="button" data-quick="budget" onClick={() => setBudgetSignal((x) => x + 1)}><Plus/><span>Gerar orçamento</span></button>}
        {paymentEnabled && <button type="button" className="primary" data-quick="payment" onClick={() => setPaymentSignal((x) => x + 1)}><Wallet/><span>{paymentSummary?.paid_cents ? 'Registrar novo pagamento' : 'Registrar pagamento'}</span></button>}
        <details className="arl-opening-call"><summary>PDF's e Reaberturas OS</summary>{' '}<div className="arl-opening-call-menu">{openingWhatsapp ? <a target="_blank" rel="noreferrer" href={openingWhatsapp}>Mensagem de abertura</a> : <span aria-disabled="true">Mensagem de abertura indisponível</span>}<a target="_blank" rel="noreferrer" href={`/api/orders/${order.id}/term`}>Termo de Recebimento PDF</a>{order.status === 'completed' ? <button type="button" onClick={() => void shareFinalReport()}>Relatório Técnico Final</button> : <span aria-disabled="true">Relatório Técnico Final</span>}{canAdminister && (order.status === 'completed' ? <button type="button" onClick={() => setReopenOpen(true)}>Reabrir OS</button> : <span aria-disabled="true">{interrupted ? 'OS interrompida não pode ser reaberta' : 'Reabrir OS'}</span>)}</div></details>
        {canAdminister && !immutable && order.status !== 'completed' && <button id="finalization-action" type="button" className="primary arl-finalization-action" onClick={() => setFinalSignal((x) => x + 1)}><Check/><span>Concluir OS</span></button>}
      </div>
    </header>
    <ol className="arl-order-stage-rail" aria-label="Etapas da Ordem de Serviço">{stages.map((stage, index) => { const state = stageState(index); return <li key={stage} data-stage-state={state} className={`arl-order-stage ${state}`} aria-current={state === 'current' ? 'step' : undefined}><span>{index + 1}</span><b>{stage}</b></li>; })}</ol>
    <section className="panel arl-intake-card" aria-labelledby="arl-intake-title">
      <div className="section-title arl-intake-title"><div><span className="arl-eyebrow">ENTRADA</span><h2 id="arl-intake-title">Ficha de entrada</h2></div>{!immutable&&<button type="button" className="arl-od-btn" onClick={editOrder}><Pencil/><span>Editar ficha</span></button>}</div>
      <div className="arl-intake-dates"><span><b>Data de entrada:</b> {formatOptionalDate(order.received_at)}</span><i aria-hidden="true">|</i><span><b>Data de saída:</b> {['completed', 'interrupted'].includes(order.status) ? formatOptionalDate(order.completed_at) : 'Em aberto'}</span></div>
      <div className="arl-intake-row"><h3>Cliente</h3><div className="arl-intake-client-info"><p className="arl-intake-client-name"><strong>{order.client.name}</strong><span><Phone aria-hidden="true"/>{masks.phone(order.client.phone)}</span></p><p className="arl-intake-client-address"><MapPin aria-hidden="true"/><span>{[`${order.client.street || ''}${order.client.number ? `, ${order.client.number}` : ''}`, order.client.district, [order.client.city, order.client.state].filter(Boolean).join('/') , order.client.complement].filter(Boolean).join(' — ')}</span></p><p className="arl-intake-client-document">{masks.document(order.client.document)}</p></div></div>
      <div className="arl-intake-row"><h3>Equipamento</h3><div><p>{order.equipment_description || 'Equipamento não informado'}</p></div></div>
      <div className="arl-intake-row"><h3>Fabricante / Modelo / Acessórios</h3><div><p>{order.equipment_details || 'Não informado'}</p></div></div>
      <div className="arl-intake-row"><h3>Problema relatado</h3><div><p>{order.reported_problem}</p></div></div>
      <div className={`arl-intake-row ${!order.intake_condition ? 'arl-checklist-ok' : ''}`}><h3>Estado físico na entrada</h3><div><p className={!order.intake_condition ? 'ok' : undefined}>{order.intake_condition || 'Equipamento aparentemente 100% sem avarias'}</p></div></div>
      <div className="arl-intake-row arl-intake-photos"><h3>Fotos</h3><div><div className="arl-order-photo-tools"><label>↑ Enviar foto<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => void uploadFile(e.target.files?.[0])}/></label><button type="button" className="arl-camera-button" onClick={() => setCamera(true)}>◉ Usar câmera</button></div><div className="photos">{order.photos?.length ? order.photos.map((photo: any) => <img key={photo.id} src={`/api/orders/${order.id}/photos/${photo.id}`} alt={`Foto ${photo.id} da OS`}/>) : <p>Nenhuma foto anexada.</p>}</div></div></div>
    </section>
    <div className="detail-grid arl-order-detail arl-order-workflow">
      {immutable && order.items?.length > 0 && <section className="wide order-items-summary"><h2>Serviços / Produtos da OS</h2>{order.items.map((item: any) => <div className="order-item-line" key={item.id}><div><b>{item.description}</b><small>{item.quantity} × {money(item.unit_price_cents)}</small></div><strong>{money(item.subtotal_cents)}</strong></div>)}</section>}
      {!immutable && <ServicesPanel order={order} reload={load} pendingSaveRef={pendingServicesSave} onDirtyChange={setServicesDirty}/>}
      <FinalReportPanel order={order} value={finalReport} setValue={setFinalReport} reload={load} onDirtyChange={setFinalReportDirty}/>
      {interrupted && <section className="wide arl-interruption-note"><h2>Interrupção</h2><p><strong>Motivo:</strong> {order.interruption_reason || order.technical_report}</p><p><strong>O que já foi feito:</strong> {order.interruption_work_done}</p></section>}
      <BudgetBox order={order} role={role} openSignal={budgetSignal}/>
      {canAdminister && <PaymentBox order={order} role={role} openSignal={paymentSignal} onSummary={setPaymentSummary}/>}
      {canAdminister && <FinalizationBox order={order} reload={load} openSignal={finalSignal} finalReport={finalReport} setFinalReport={setFinalReport} onShare={setShare} persistPendingChanges={persistPendingChanges} onFinalReportDirty={setFinalReportDirty}/>}
      <section className="wide arl-order-record"><div className="section-title"><div><span className="arl-eyebrow">REGISTRO</span><h2>Registro da OS</h2><p>Históricos e documentos preservados, recolhidos por padrão.</p></div></div>
        <details className="arl-record-accordion"><summary>Histórico de status</summary><div className="arl-record-body">{order.histories.map((history: any, index: number) => <p key={history.id || index}>{statusLabel[history.to_status] || history.to_status} · {new Date(history.created_at).toLocaleString('pt-BR')} · {history.user?.name}{history.reason ? ` · Motivo: ${history.reason}` : ''}</p>)}</div></details>
        <OrderAuditHistory orderId={order.id}/>
        <details className="arl-record-accordion"><summary>Documentos</summary><div className="arl-record-body"><DocumentsBox order={order} embedded/></div></details>
      </section>
    </div>
    {editOpen && (immutable ? <ImmutableModal order={order} onClose={() => setEditOpen(false)}/> : <EditOrderModal order={order} onClose={() => setEditOpen(false)} onSaved={async () => { setEditOpen(false); await load(); }}/>) }
    {reopenOpen && <div className="arl-od-modal"><section className="arl-od-card" role="dialog" aria-modal="true" aria-label={`Reabrir OS #${order.number}`}><h2>Reabrir OS #{order.number}</h2><p>A mesma OS voltará para Em Análise. A finalização e o PDF atuais permanecerão no histórico.</p><label>Motivo da reabertura<textarea value={reopenNote} onChange={(event) => setReopenNote(event.target.value)}/></label><div className="arl-od-actions"><button type="button" onClick={() => setReopenOpen(false)}>Cancelar</button><button type="button" className="primary" onClick={async () => { if (!reopenNote.trim()) return; await api(`/orders/${order.id}/reopen`, { method: 'POST', body: JSON.stringify({ note: reopenNote.trim() }) }); setReopenOpen(false); await load(); }}>Confirmar reabertura</button></div></section></div>}
    {interruptOpen && <InterruptionModal order={order} onClose={() => setInterruptOpen(false)} onSaved={async () => { setInterruptOpen(false); await load(); }}/>} 
    {photoChoice && <PhotoChoice onClose={() => setPhotoChoice(false)} onUpload={() => { setPhotoChoice(false); fileInput.current?.click(); }} onCamera={() => { setPhotoChoice(false); setCamera(true); }}/>} 
    {camera && <CameraModal onClose={() => setCamera(false)} onFile={(file) => { setCamera(false); void uploadFile(file); }}/>} 
    {share && <FinalShareCard order={order} share={share} onClose={() => setShare(null)}/>} 
  </div>;
}
