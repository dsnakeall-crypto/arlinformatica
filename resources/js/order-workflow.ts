export {};

type OrderScope = 'active' | 'finalized';
type WorkflowOrder = {
  id?: number;
  number?: string;
  status?: string;
  archived?: boolean;
  technical_report?: string | null;
  interruption_reason?: string | null;
  histories?: Array<{ to_status?: string }>;
};

declare global {
  interface Window {
    __arlOrderWorkflowInstalled?: boolean;
    __arlOrderScope?: OrderScope;
    __arlWorkflowOrder?: WorkflowOrder | null;
  }
}

const scope = (): OrderScope => window.__arlOrderScope ?? 'active';
const reactOrderDetailActive = () => Boolean(document.querySelector('[data-arl-order-detail-react="1"]'));

function installStyles() {
  if (document.getElementById('arl-order-workflow-style')) return;
  const style = document.createElement('style');
  style.id = 'arl-order-workflow-style';
  style.textContent = `
    .arl-order-title-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .arl-finalized-toggle{min-height:40px;border:1px solid #dfd9dc;border-radius:11px;background:#fff;padding:8px 13px;font-weight:800;font-size:12px;cursor:pointer;color:#4d515a}
    .arl-finalized-toggle.active{background:#161619;color:#fff;border-color:#161619}
    .status-picker.status-paid select{border-color:#8ed5aa!important;background:#effcf4!important;color:#08743a!important;font-weight:800}
    .arl-interruption-note{grid-column:1/-1;border:1px solid #f0c56d!important;background:#fff9eb!important}
    .arl-interruption-note h2{color:#815600!important}.arl-interruption-note p{white-space:pre-wrap;line-height:1.55}
    .arl-status-modal{position:fixed;inset:0;z-index:140;background:rgba(12,9,10,.64);display:grid;place-items:center;padding:16px}
    .arl-status-modal-card{width:min(540px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.3);display:grid;gap:14px}
    .arl-status-modal-card h2{margin:0;font-size:20px}.arl-status-modal-card p{margin:0;color:#737985;font-size:13px;line-height:1.5}
    .arl-status-modal-card label{display:grid;gap:6px;font-size:12px;font-weight:800;color:#4e535d}
    .arl-status-modal-card textarea{width:100%;min-height:130px;border:1px solid #dcdde1;border-radius:10px;background:#fff;padding:10px 12px;font:inherit;resize:vertical;outline:none}
    .arl-status-modal-card textarea:focus{border-color:#c9001c;box-shadow:0 0 0 3px rgba(201,0,28,.09)}
    .arl-status-modal-actions{display:flex;justify-content:flex-end;gap:8px}.arl-status-modal-actions button{min-height:38px;border-radius:9px;border:1px solid #dedde1;background:#fff;padding:8px 13px;font-weight:800;cursor:pointer}
    .arl-status-modal-actions .primary{background:#c9001c!important;color:#fff!important;border-color:#c9001c!important;min-height:38px!important;padding:8px 13px!important;box-shadow:none!important}
    .arl-status-modal-note{padding:10px 12px;border-radius:9px;background:#fff8e8;color:#725100;font-size:12px!important}.arl-status-modal-error{min-height:16px;color:#a7001b;font-size:12px}
    @media(max-width:800px){.arl-order-title-actions{width:100%}.arl-finalized-toggle{flex:1}}
  `;
  document.head.append(style);
}

function interruptionReason(current = ''): Promise<string | null> {
  return new Promise((resolve) => {
    document.querySelector('.arl-status-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'arl-status-modal';
    overlay.innerHTML = `<section class="arl-status-modal-card" role="dialog" aria-modal="true" aria-label="Interromper OS">
      <h2>Interromper OS</h2>
      <p class="arl-status-modal-note">Descreva por que o atendimento foi interrompido. O motivo ficará salvo enquanto a OS estiver interrompida e será apagado automaticamente quando ela voltar para outro status.</p>
      <label>Motivo da interrupção<textarea data-reason placeholder="Ex.: cliente pediu pausa, aguardando decisão, atendimento suspenso..."></textarea></label>
      <div class="arl-status-modal-error" data-error></div>
      <div class="arl-status-modal-actions"><button type="button" data-cancel>Cancelar</button><button type="button" class="primary" data-save>Salvar interrupção</button></div>
    </section>`;
    document.body.append(overlay);
    const area = overlay.querySelector<HTMLTextAreaElement>('[data-reason]')!;
    const error = overlay.querySelector<HTMLElement>('[data-error]')!;
    area.value = current;
    area.focus();
    let finished = false;
    const finish = (value: string | null) => {
      if (finished) return;
      finished = true;
      overlay.remove();
      resolve(value);
    };
    overlay.querySelector('[data-cancel]')?.addEventListener('click', () => finish(null));
    overlay.addEventListener('click', (event) => { if (event.target === overlay) finish(null); });
    overlay.addEventListener('keydown', (event) => { if (event.key === 'Escape') finish(null); });
    overlay.querySelector('[data-save]')?.addEventListener('click', () => {
      const value = area.value.trim();
      if (!value) { error.textContent = 'Informe o motivo da interrupção.'; area.focus(); return; }
      finish(value);
    });
  });
}

function installFetchWorkflow() {
  if (window.__arlOrderWorkflowInstalled) return;
  window.__arlOrderWorkflowInstalled = true;
  window.__arlOrderScope = 'active';
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let nextInput: RequestInfo | URL = input;
    let nextInit = init;
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw, location.origin);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const reactDetail = reactOrderDetailActive();

    if (url.origin === location.origin && url.pathname === '/api/orders' && method === 'GET') {
      url.searchParams.set('finalized', scope() === 'finalized' ? '1' : '0');
      nextInput = input instanceof Request ? new Request(url.toString(), input) : url.toString();
    }

    const statusMatch = url.origin === location.origin ? url.pathname.match(/^\/api\/orders\/(\d+)\/status$/) : null;
    if (!reactDetail && statusMatch && method === 'PATCH' && typeof init?.body === 'string') {
      const payload = JSON.parse(init.body || '{}');
      if (payload.status === 'interrupted' && !payload.interruption_reason) {
        const current = window.__arlWorkflowOrder?.status === 'interrupted'
          ? (window.__arlWorkflowOrder.interruption_reason || window.__arlWorkflowOrder.technical_report || '')
          : '';
        const reason = await interruptionReason(current);
        if (!reason) {
          const currentOrder = window.__arlWorkflowOrder ?? {};
          return new Response(JSON.stringify(currentOrder), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        nextInit = { ...init, body: JSON.stringify({ ...payload, interruption_reason: reason }) };
      }
    }

    const response = await nativeFetch(nextInput, nextInit);

    const showMatch = url.origin === location.origin ? url.pathname.match(/^\/api\/orders\/(\d+)$/) : null;
    if (!reactDetail && showMatch && method === 'GET' && response.ok) {
      void response.clone().json().then((order) => {
        window.__arlWorkflowOrder = order;
        window.requestAnimationFrame(syncUi);
      }).catch(() => undefined);
    }

    const reopenMatch = url.origin === location.origin ? url.pathname.match(/^\/api\/orders\/(\d+)\/reopen$/) : null;
    if (reopenMatch && method === 'POST' && response.ok) {
      window.__arlOrderScope = 'active';
    }

    if (!reactDetail && statusMatch && method === 'PATCH' && !response.ok && typeof init?.body === 'string') {
      const payload = JSON.parse(init.body || '{}');
      if (payload.status === 'paid') {
        void response.clone().json().then((body) => alert(body?.message || 'Não foi possível marcar a OS como paga.')).catch(() => undefined);
      }
    }

    return response;
  };
}

function nativeSetInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function forceOrdersReload() {
  const input = Array.from(document.querySelectorAll<HTMLInputElement>('.panel .filters input')).find((item) => item.placeholder.includes('Número da OS'));
  if (!input) return;
  const value = input.value;
  nativeSetInput(input, `${value} `);
  window.requestAnimationFrame(() => nativeSetInput(input, value));
}

function normalizeLabels() {
  const waitingLabel = 'Aguardando';
  document.querySelectorAll<HTMLOptionElement>('option[value="waiting_part"]').forEach((option) => {
    if (option.closest('[data-arl-order-detail-react="1"], .service-orders-table')) return;
    if (option.textContent?.trim() !== waitingLabel) option.textContent = waitingLabel;
  });
  document.querySelectorAll<HTMLElement>('.badge').forEach((badge) => {
    if (badge.textContent?.trim() === 'Aguardando Peça' || badge.textContent?.trim() === 'Aguardando Peça/Cliente') badge.textContent = waitingLabel;
  });
}

function installFinalizedToggle() {
  if (document.querySelector('.order-tabs')) {
    document.querySelector('.arl-finalized-toggle')?.remove();
    return;
  }
  const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.trim() === 'Ordens de Serviço');
  if (!heading) return;
  const title = heading.closest<HTMLElement>('.title');
  if (!title) return;
  let actions = title.querySelector<HTMLElement>('.arl-order-title-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'arl-order-title-actions';
    Array.from(title.children).filter((item): item is HTMLButtonElement => item instanceof HTMLButtonElement).forEach((button) => actions!.append(button));
    title.append(actions);
  }
  let toggle = actions.querySelector<HTMLButtonElement>('.arl-finalized-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'arl-finalized-toggle';
    toggle.addEventListener('click', () => {
      window.__arlOrderScope = scope() === 'active' ? 'finalized' : 'active';
      updateOrdersScopeUi();
      forceOrdersReload();
    });
    actions.prepend(toggle);
  }
  updateOrdersScopeUi();
}

function updateOrdersScopeUi() {
  const finalized = scope() === 'finalized';
  const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.trim() === 'Ordens de Serviço');
  const title = heading?.closest<HTMLElement>('.title');
  const subtitle = title?.querySelector('p');
  if (subtitle) subtitle.textContent = finalized ? 'OS pagas, retiradas e preservadas no histórico.' : 'Acompanhe os atendimentos e o histórico operacional.';
  const toggle = title?.querySelector<HTMLButtonElement>('.arl-finalized-toggle');
  if (toggle) {
    toggle.textContent = finalized ? 'OS EM ANDAMENTO' : 'OS FINALIZADAS';
    toggle.classList.toggle('active', finalized);
  }
  if (finalized) document.querySelectorAll<HTMLElement>('.order-row:not(.head) .badge').forEach((badge) => { badge.textContent = 'Pago'; });
}

function syncOrderDetail() {
  if (reactOrderDetailActive()) return;
  const heading = Array.from(document.querySelectorAll('h1')).find((item) => /^OS #/.test(item.textContent?.trim() || ''));
  if (!heading) return;
  const order = window.__arlWorkflowOrder;
  const select = document.querySelector<HTMLSelectElement>('.status-picker select');
  if (!order || !select) return;

  select.querySelector('option[value="paid"]')?.remove();
  if (order.archived) {
    const option = document.createElement('option'); option.value = 'paid'; option.textContent = 'Pago'; select.append(option);
    select.disabled = true;
    select.value = 'paid';
    select.closest('.status-picker')?.classList.add('status-paid');
  } else if (order.status === 'completed') {
    const option = document.createElement('option'); option.value = 'paid'; option.textContent = 'Pago'; select.append(option);
    select.disabled = false;
    select.value = 'completed';
    select.closest('.status-picker')?.classList.remove('status-paid');
  } else {
    select.closest('.status-picker')?.classList.remove('status-paid');
  }

  const detail = document.querySelector<HTMLElement>('.detail-grid');
  if (!detail) return;
  const history = Array.from(detail.querySelectorAll<HTMLElement>(':scope > section')).find((section) => section.querySelector('h2')?.textContent?.trim() === 'Histórico de status');
  history?.querySelectorAll<HTMLParagraphElement>('p').forEach((line) => {
    if (line.textContent?.startsWith('Aguardando Peça ·')) line.textContent = line.textContent.replace('Aguardando Peça ·', 'Aguardando ·');
    if (line.textContent?.startsWith('Aguardando Peça/Cliente ·')) line.textContent = line.textContent.replace('Aguardando Peça/Cliente ·', 'Aguardando ·');
  });
  if (order.archived && history) {
    const lines = Array.from(history.querySelectorAll<HTMLParagraphElement>('p'));
    const paidIndex = order.histories?.findIndex((item) => item.to_status === 'paid') ?? -1;
    const line = paidIndex >= 0 ? lines[paidIndex] : lines.find((item) => item.textContent?.trim().startsWith('·'));
    if (line && !line.textContent?.trim().startsWith('Pago')) line.textContent = `Pago${line.textContent || ''}`;
  }

  document.querySelector('.arl-interruption-note')?.remove();
  const reason = order.status === 'interrupted' ? (order.interruption_reason || order.technical_report || '') : '';
  if (reason) {
    const note = document.createElement('section');
    note.className = 'wide arl-interruption-note';
    const h2 = document.createElement('h2'); h2.textContent = 'Motivo da interrupção';
    const p = document.createElement('p'); p.textContent = reason;
    note.append(h2, p);
    if (history) history.before(note); else detail.append(note);
  }
}

function syncScope() {
  const h1 = document.querySelector('h1')?.textContent?.trim() || '';
  if (h1 !== 'Ordens de Serviço' && !h1.startsWith('OS #')) {
    window.__arlOrderScope = 'active';
    window.__arlWorkflowOrder = null;
  }
}

function syncUi() {
  syncScope();
  normalizeLabels();
  installFinalizedToggle();
  updateOrdersScopeUi();
  syncOrderDetail();
}

installStyles();
installFetchWorkflow();
const observer = new MutationObserver(() => window.requestAnimationFrame(syncUi));
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', syncUi);
syncUi();
