export {};

type OrderRow = {
  id: number;
  number: string;
  status: string;
  attendance_type: 'bench' | 'external';
  reported_problem: string;
  reopen_type?: string | null;
  reopened_from_order_id?: number | null;
};

const REOPEN_LABELS: Record<string, string> = {
  warranty_service: 'Garantia de serviço',
  warranty_product: 'Garantia de produto',
  same_issue_return: 'Retorno do mesmo defeito',
  adjustment_return: 'Retorno para ajuste',
  other: 'Outro retorno',
};

const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
const api = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(`/api${url}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrf() ? { 'X-CSRF-TOKEN': csrf() } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({ message: 'Resposta inválida do servidor.' }));
  if (!response.ok) throw new Error(body.message || 'Não foi possível concluir.');
  return body;
};

const icon = (name: 'edit' | 'reopen') => name === 'edit'
  ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>'
  : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/></svg>';

function installStyles() {
  if (document.getElementById('arl-order-maintenance-style')) return;
  const style = document.createElement('style');
  style.id = 'arl-order-maintenance-style';
  style.textContent = `
    .order-list .order-row{position:relative;min-height:52px!important;padding-top:10px!important;padding-bottom:10px!important;font-size:13px!important}
    .order-list .order-row.head{min-height:38px!important;font-size:11px!important;letter-spacing:.01em;color:#69707d!important}
    .order-list .order-row>b{font-size:13px!important}.order-list .order-row .badge{font-size:12px!important;padding:5px 9px!important}
    .order-list .order-row>button{min-height:34px!important;padding:6px 10px!important;font-size:12px!important;border-radius:9px!important}
    .arl-order-maintenance-actions{position:absolute;right:12px;top:50%;transform:translateY(-50%);display:flex;gap:6px;align-items:center}
    .order-list .order-row.arl-maintainable>button{margin-right:92px!important;width:62px!important;justify-self:end!important}
    .order-list .order-row.arl-editable-only>button{margin-right:48px!important;width:62px!important;justify-self:end!important}
    .arl-order-mini-action{width:34px;height:34px;min-width:34px;border:1px solid #e3dfe1;border-radius:9px;background:#fff;display:grid;place-items:center;cursor:pointer;color:#5e626b}
    .arl-order-mini-action:hover{border-color:#ce0a2b;color:#a7001b;background:#fff5f7}.arl-order-mini-action svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .arl-order-mini-action.reopen{color:#08743a;border-color:#b9e7c9;background:#f2fff6}
    .arl-return-tag{display:inline-flex;margin-left:7px;padding:3px 6px;border-radius:999px;background:#fff1d9;color:#8a5800;font-size:10px;font-weight:800;vertical-align:middle;white-space:nowrap}
    .arl-maintenance-modal{position:fixed;inset:0;z-index:120;background:rgba(12,9,10,.64);display:grid;place-items:center;padding:16px}
    .arl-maintenance-card{width:min(520px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.3);display:grid;gap:14px}
    .arl-maintenance-card h2{margin:0;font-size:20px}.arl-maintenance-card p{margin:0;color:#737985;font-size:13px;line-height:1.5}.arl-maintenance-card label{display:grid;gap:6px;font-size:12px;font-weight:800;color:#4e535d}
    .arl-maintenance-card select,.arl-maintenance-card textarea{width:100%;border:1px solid #dcdde1;border-radius:10px;background:#fff;padding:10px 12px;font:inherit;outline:none}.arl-maintenance-card textarea{min-height:120px;resize:vertical}
    .arl-maintenance-card select:focus,.arl-maintenance-card textarea:focus{border-color:#c9001c;box-shadow:0 0 0 3px rgba(201,0,28,.09)}
    .arl-maintenance-actions{display:flex;justify-content:flex-end;gap:8px}.arl-maintenance-actions button{min-height:38px;border-radius:9px;border:1px solid #dedde1;background:#fff;padding:8px 13px;font-weight:800;cursor:pointer}.arl-maintenance-actions .primary{background:#c9001c!important;color:#fff!important;border-color:#c9001c!important;min-height:38px!important;padding:8px 13px!important;box-shadow:none!important}
    .arl-maintenance-note{padding:10px 12px;border-radius:9px;background:#fff8e8;color:#725100;font-size:12px!important}
    @media(max-width:800px){.order-list .order-row{font-size:12px!important}.arl-order-maintenance-actions{right:8px}.order-list .order-row.arl-maintainable>button{margin-right:84px!important}}
  `;
  document.head.append(style);
}

function nativeSetInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function modal(title: string, body: string) {
  document.querySelector('.arl-maintenance-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'arl-maintenance-modal';
  overlay.innerHTML = `<section class="arl-maintenance-card" role="dialog" aria-modal="true" aria-label="${title}"><h2>${title}</h2>${body}</section>`;
  document.body.append(overlay);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
  return overlay;
}

function openEdit(order: OrderRow, row: HTMLElement) {
  const overlay = modal(`Editar OS #${order.number}`, `
    <p>Você pode corrigir o tipo de atendimento e o problema relatado. Documentos finais e lançamentos financeiros já emitidos não são alterados.</p>
    <label>Atendimento<select data-attendance><option value="bench">Bancada</option><option value="external">Externo</option></select></label>
    <label>Problema relatado<textarea data-problem></textarea></label>
    <div class="arl-maintenance-actions"><button type="button" data-cancel>Cancelar</button><button type="button" class="primary" data-save>Salvar</button></div>
  `);
  const attendance = overlay.querySelector<HTMLSelectElement>('[data-attendance]')!;
  const problem = overlay.querySelector<HTMLTextAreaElement>('[data-problem]')!;
  attendance.value = order.attendance_type;
  problem.value = order.reported_problem;
  overlay.querySelector('[data-cancel]')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector<HTMLButtonElement>('[data-save]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true; button.textContent = 'Salvando…';
    try {
      const updated = await api(`/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ attendance_type: attendance.value, reported_problem: problem.value.trim() }) });
      order.attendance_type = updated.attendance_type;
      order.reported_problem = updated.reported_problem;
      const cells = Array.from(row.children).filter((item) => !(item as HTMLElement).classList?.contains('arl-order-maintenance-actions')) as HTMLElement[];
      if (cells[2]) cells[2].textContent = updated.attendance_type === 'bench' ? 'Bancada' : 'Externo';
      overlay.remove();
    } catch (error) {
      button.disabled = false; button.textContent = 'Salvar';
      alert(error instanceof Error ? error.message : 'Não foi possível salvar.');
    }
  });
}

function openReopen(order: OrderRow) {
  const options = Object.entries(REOPEN_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  const overlay = modal(`Reabrir OS #${order.number}`, `
    <p class="arl-maintenance-note">A OS concluída original será preservada. O sistema criará uma nova OS vinculada a ela para o retorno/garantia.</p>
    <label>Tipo do retorno<select data-type>${options}</select></label>
    <label>Motivo / detalhes<textarea data-note placeholder="Descreva o que o cliente informou e o que precisa ser verificado."></textarea></label>
    <div class="arl-maintenance-actions"><button type="button" data-cancel>Cancelar</button><button type="button" class="primary" data-reopen>Criar OS de retorno</button></div>
  `);
  overlay.querySelector('[data-cancel]')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector<HTMLButtonElement>('[data-reopen]')?.addEventListener('click', async (event) => {
    const type = overlay.querySelector<HTMLSelectElement>('[data-type]')!.value;
    const note = overlay.querySelector<HTMLTextAreaElement>('[data-note]')!.value.trim();
    if (!note) { alert('Descreva o motivo do retorno.'); return; }
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true; button.textContent = 'Criando…';
    try {
      const result = await api(`/orders/${order.id}/reopen`, { method: 'POST', body: JSON.stringify({ reopen_type: type, note }) });
      overlay.remove();
      alert(`OS #${result.order.number} criada como ${result.reopen_label}. A OS #${order.number} foi preservada.`);
      const search = document.querySelector<HTMLElement>('.order-list')?.closest('.panel')?.querySelector<HTMLInputElement>('.filters input');
      if (search) nativeSetInput(search, result.order.number);
    } catch (error) {
      button.disabled = false; button.textContent = 'Criar OS de retorno';
      alert(error instanceof Error ? error.message : 'Não foi possível reabrir a OS.');
    }
  });
}

let syncRunning = false;
let lastSignature = '';
let role: string | null = null;

async function syncOrders(force = false) {
  if (syncRunning) return;
  const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.trim() === 'Ordens de Serviço');
  const list = document.querySelector<HTMLElement>('.order-list');
  if (!heading || !list) { lastSignature = ''; return; }

  const rows = Array.from(list.querySelectorAll<HTMLElement>('.order-row:not(.head)'));
  const numbers = rows.map((row) => row.querySelector('b')?.textContent?.replace(/\D/g, '') || '').filter(Boolean);
  const signature = numbers.join(',');
  if (!force && signature === lastSignature && rows.every((row) => row.dataset.arlMaintenance === '1')) return;
  syncRunning = true;
  try {
    if (role === null) role = (await api('/me')).role || '';
    const canMaintain = role === 'Master' || role === 'Administrador';
    const search = list.closest('.panel')?.querySelector<HTMLInputElement>('.filters input')?.value || '';
    const page = await api(`/orders?q=${encodeURIComponent(search)}`);
    const orders = new Map<string, OrderRow>((page.data || []).map((order: OrderRow) => [String(order.number).replace(/\D/g, ''), order]));

    rows.forEach((row, index) => {
      const number = numbers[index];
      const order = orders.get(number);
      if (!order) return;
      row.dataset.arlMaintenance = '1';
      row.querySelector('.arl-order-maintenance-actions')?.remove();
      row.classList.remove('arl-maintainable', 'arl-editable-only');

      if (order.reopen_type && !row.querySelector('.arl-return-tag')) {
        const numberCell = row.querySelector('b');
        const tag = document.createElement('span');
        tag.className = 'arl-return-tag';
        tag.textContent = REOPEN_LABELS[order.reopen_type] || 'Retorno';
        numberCell?.insertAdjacentElement('afterend', tag);
      }
      const view = Array.from(row.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === 'Ver OS');
      view?.classList.add('arl-order-view-button');
      if (!canMaintain) return;

      const actions = document.createElement('div');
      actions.className = 'arl-order-maintenance-actions';
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'arl-order-mini-action edit'; edit.title = 'Editar OS'; edit.setAttribute('aria-label', 'Editar OS'); edit.innerHTML = icon('edit');
      edit.addEventListener('click', () => openEdit(order, row));
      actions.append(edit);

      if (order.status === 'completed') {
        const reopen = document.createElement('button');
        reopen.type = 'button'; reopen.className = 'arl-order-mini-action reopen'; reopen.title = 'Reabrir OS'; reopen.setAttribute('aria-label', 'Reabrir OS'); reopen.innerHTML = icon('reopen');
        reopen.addEventListener('click', () => openReopen(order));
        actions.append(reopen);
        row.classList.add('arl-maintainable');
      } else {
        row.classList.add('arl-editable-only');
      }
      row.append(actions);
    });
    lastSignature = signature;
  } catch {
    // A tela principal continua funcional mesmo se o aprimoramento administrativo falhar.
  } finally {
    syncRunning = false;
  }
}

installStyles();
const observer = new MutationObserver(() => window.requestAnimationFrame(() => void syncOrders()));
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', () => void syncOrders(true));
void syncOrders(true);
