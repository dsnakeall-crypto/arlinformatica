import React from 'react';
import { createRoot } from 'react-dom/client';
import { Eye } from 'lucide-react';
import { reactPageActive, reactOwnedSelector } from './react-ownership';
export {};

type FinalShare = { url: string; expires_at: string; revision: number };
type FinalOrder = { id: number; number: string; total_cents?: number; client?: { name?: string; phone?: string } };

const STATUS_LABELS: Record<string, string> = {
  analysis: 'Em Análise',
  waiting_part: 'Aguardando Peça',
  in_service: 'Em Serviço',
  completed: 'Finalizado',
  interrupted: 'Interrompido',
  paid: 'Pago',
};

const LEGACY_LABELS: Record<string, string> = {
  Concluído: 'Finalizado',
};

const ICONS = {
  whatsapp: '/arl-assets/icons/icon-whatsapp.png',
  maps: '/arl-assets/icons/icon-maps.png',
  editar: '/arl-assets/icons/icon-editar.png',
  lixeira: '/arl-assets/icons/icon-lixeira.png',
} as const;

const digits = (value: string) => value.replace(/\D/g, '');
const q = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector);
const qa = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(selector));
const reactOrderDetailActive = () => Boolean(document.querySelector('[data-arl-order-detail-react="1"]'));

function installStyles() {
  if (document.getElementById('arl-completion-polish-style')) return;
  const style = document.createElement('style');
  style.id = 'arl-completion-polish-style';
  style.textContent = `
    .arl-exact-action-icon{width:22px;height:22px;object-fit:contain;display:block;flex:0 0 auto}
    .dashboard-address .arl-exact-action-icon,.arl-order-mini-action .arl-exact-action-icon,.arl-client-delete .arl-exact-action-icon,.arl-order-delete .arl-exact-action-icon{width:20px;height:20px}
    .arl-final-share-host{position:fixed;right:18px;bottom:18px;z-index:200;pointer-events:none;width:min(390px,calc(100vw - 28px))}
    .arl-final-share-card{pointer-events:auto;background:#fff;border:1px solid #e3dfe1;border-radius:16px;padding:16px;box-shadow:0 20px 55px rgba(15,10,12,.24);display:grid;gap:10px}
    .arl-final-share-card h2{margin:0;font-size:17px}.arl-final-share-card p{margin:0;color:#666d78;font-size:12px;line-height:1.5}
    .arl-final-share-actions{display:flex;gap:8px;flex-wrap:wrap}.arl-final-share-actions a,.arl-final-share-actions button{min-height:37px;border:1px solid #ddd;border-radius:9px;background:#fff;padding:7px 11px;font-size:12px;font-weight:800;text-decoration:none;color:#30343a;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}
    .arl-final-share-actions .whatsapp{background:#effcf4;border-color:#a7deba;color:#08743a}.arl-final-share-actions img{width:20px;height:20px;object-fit:contain}
    @media(max-width:760px){.arl-final-share-host{right:14px;bottom:14px}}
  `;
  document.head.append(style);
}

function normalizeStatuses() {
  qa<HTMLOptionElement>('.status-picker option, select[aria-label="Filtrar status"] option').forEach((option) => {
    if (option.closest(reactOwnedSelector)) return;
    const label = STATUS_LABELS[option.value];
    if (label) option.textContent = label;
  });

  qa<HTMLElement>('.badge, .completion b, .completion strong, .completion span, .detail-grid section p').forEach((element) => {
    if (element.closest(reactOwnedSelector) || element.children.length) return;
    const current = element.textContent?.trim() || '';
    if (LEGACY_LABELS[current]) {
      element.textContent = LEGACY_LABELS[current];
      return;
    }
    for (const [legacy, replacement] of Object.entries(LEGACY_LABELS)) {
      if (current.startsWith(`${legacy} ·`)) {
        element.textContent = current.replace(`${legacy} ·`, `${replacement} ·`);
        return;
      }
    }
  });
}

function exactIcon(kind: keyof typeof ICONS, alt = '') {
  const img = document.createElement('img');
  img.className = 'arl-exact-action-icon';
  img.src = ICONS[kind];
  img.alt = alt;
  img.setAttribute('aria-hidden', alt ? 'false' : 'true');
  return img;
}

function setVisualIcon(action: HTMLElement, kind: keyof typeof ICONS) {
  const existing = action.querySelector<HTMLImageElement>(`.arl-exact-action-icon[src="${ICONS[kind]}"]`);
  if (action.dataset.arlExactIcon === kind && existing) return;

  action.dataset.arlExactIcon = kind;
  qa<HTMLElement>('.arl-exact-action-icon', action).forEach((item) => item.remove());
  qa<HTMLElement>('.arl-action-icon,.arl-dashboard-icon,.arl-external-icon,.arl-quick-icon,svg', action).forEach((item) => {
    item.style.setProperty('display', 'none', 'important');
    item.setAttribute('aria-hidden', 'true');
  });
  action.prepend(exactIcon(kind));
}

function setEyeIcon(action: HTMLElement) {
  if (action.dataset.arlExactIcon === 'eye' && action.querySelector('.arl-lucide-eye')) return;

  action.dataset.arlExactIcon = 'eye';
  qa<HTMLElement>('.arl-exact-action-icon,.arl-action-icon,.arl-dashboard-icon,.arl-external-icon,.arl-quick-icon,svg', action).forEach((item) => item.remove());
  const host = document.createElement('span');
  host.className = 'arl-lucide-eye';
  action.prepend(host);
  createRoot(host).render(React.createElement(Eye, { 'aria-hidden': true }));
}

function syncExactIcons() {
  qa<HTMLElement>('.client-list .contact-links a,.client-list .contact-links button,.dashboard-contact,.dashboard-address,.arl-order-mini-action,.dashboard-row:not(.head) button,.order-row:not(.head) button,.arl-client-delete,.arl-order-delete').forEach((action) => {
    if (action.closest(reactOwnedSelector) || action.closest('[data-arl-clients-react="1"]') || action.closest('[data-arl-order-detail-react="1"]')) return;
    const label = `${action.getAttribute('aria-label') || ''} ${action.getAttribute('title') || ''} ${action.textContent || ''}`;
    if (action.classList.contains('arl-client-delete') || action.classList.contains('arl-order-delete') || /Excluir/i.test(label)) return setVisualIcon(action, 'lixeira');
    if (action.classList.contains('dashboard-contact') || /WhatsApp/i.test(label)) return setVisualIcon(action, 'whatsapp');
    if (action.classList.contains('dashboard-address') || /Maps|Google Maps/i.test(label)) return setVisualIcon(action, 'maps');
    if (/Visualizar|Ver OS/i.test(label)) return setEyeIcon(action);
    if (/Editar/i.test(label)) return setVisualIcon(action, 'editar');
  });
}

function hideRetiredMessageEditors() { if (reactPageActive('settings')) return;
  qa<HTMLTextAreaElement>('textarea[name="post_sale_follow_up"]').forEach((area) => {
    const field = area.closest<HTMLElement>('.field');
    if (field) field.remove();
    else area.remove();
  });
}

function whatsappUrl(phone: string, message: string) {
  const raw = digits(phone);
  if (!raw) return '';
  const full = raw.startsWith('55') ? raw : `55${raw}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

function money(cents = 0) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function finalMessage(order: FinalOrder, pdfUrl: string) {
  return [
    `Olá, ${order.client?.name || 'cliente'}`,
    '',
    `Seu equipamento está pronto (${order.number}).`,
    '',
    'Detalhes do Serviço no link abaixo',
    pdfUrl,
    '',
    '',
    `- Valor: ${money(order.total_cents || 0)}`,
    '',
    'Formas de Pagamento: ',
    '',
    '- PIX (Chave): 35988285777 ',
    '- Cartão (com taxas) ',
    '- Dinheiro (favor trazer trocado)',
    '',
    'A retirada ou entrega será liberada imediatamente após a confirmação do pagamento.',
    '',
    'Agradecemos pela preferência!',
  ].join('\n');
}

function showFinalShare(order: FinalOrder) {
  document.querySelector('.arl-final-share-host')?.remove();
  const host = document.createElement('div');
  host.className = 'arl-final-share-host';
  host.innerHTML = `<section class="arl-final-share-card" role="status" aria-label="Compartilhar fechamento da OS">
    <h2>OS #${order.number} finalizada</h2>
    <p>O PDF Final está pronto. Um link novo, válido por 48 horas, será criado somente quando você escolher uma ação.</p>
    <div class="arl-final-share-actions">
      <button type="button" data-final-pdf>Abrir PDF</button>
      <button type="button" class="whatsapp" data-final-whatsapp>Enviar PDF pelo WhatsApp</button>
    </div>
  </section>`;
  const prepare = async (kind: 'pdf' | 'whatsapp') => {
    const target = window.open('about:blank', '_blank');
    try {
      const response = await fetch(`/api/orders/${order.id}/final-share`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Não foi possível gerar o link do PDF.');
      const share = await response.json() as FinalShare;
      const destination = kind === 'pdf' ? share.url : whatsappUrl(order.client?.phone || '', finalMessage(order, share.url));
      if (!destination) throw new Error('O cliente não possui telefone para WhatsApp.');
      if (target) target.location.href = destination;
      else window.location.href = destination;
    } catch {
      target?.close();
    }
  };
  q<HTMLButtonElement>('[data-final-pdf]', host)?.addEventListener('click', () => void prepare('pdf'));
  const whatsappButton = q<HTMLButtonElement>('[data-final-whatsapp]', host);
  whatsappButton?.prepend(exactIcon('whatsapp'));
  whatsappButton?.addEventListener('click', () => void prepare('whatsapp'));
  document.body.append(host);
}

async function prepareFinalShare(orderId: string) {
  try {
    const orderResponse = await fetch(`/api/orders/${orderId}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!orderResponse.ok) return;
    const order = await orderResponse.json() as FinalOrder;
    showFinalShare(order);
  } catch {
  }
}

function installFinalizationObserver() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw, location.origin);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const finalMatch = url.origin === location.origin ? url.pathname.match(/^\/api\/orders\/(\d+)\/finalize$/) : null;
    const response = await nativeFetch(input, init);
    if (finalMatch && method === 'POST' && response.ok && !reactOrderDetailActive()) void prepareFinalShare(finalMatch[1]);
    return response;
  };
}

function sync() {
  installStyles();
  normalizeStatuses();
  syncExactIcons();
  hideRetiredMessageEditors();
}

installFinalizationObserver();
let queued = false;
const queue = () => {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(() => {
    queued = false;
    sync();
  });
};
new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', sync);
sync();
