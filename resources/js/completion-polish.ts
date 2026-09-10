export {};

type FinalShare = { url: string; expires_at: string; revision: number };
type FinalOrder = { id: number; number: string; total_cents?: number; client?: { name?: string; phone?: string } };

const STATUS_LABELS: Record<string, string> = {
  analysis: 'Em Análise',
  waiting_part: 'Aguardando',
  in_service: 'Em Serviço',
  completed: 'Finalizado',
  interrupted: 'Interrompido',
  paid: 'Pago',
};

const LEGACY_LABELS: Record<string, string> = {
  'Aguardando Peça': 'Aguardando',
  'Aguardando Peça/Cliente': 'Aguardando',
  Concluído: 'Finalizado',
};

const ICONS = {
  whatsapp: '/arl-assets/icons/icon-whatsapp.png',
  maps: '/arl-assets/icons/icon-maps.png',
  visualizar: '/arl-assets/icons/icon-visualizar.png',
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
    .arl-final-share-host{position:fixed;right:18px;bottom:18px;z-index:19;pointer-events:none;width:min(390px,calc(100vw - 28px))}
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
    if (option.closest('[data-arl-order-detail-react="1"]')) return;
    const label = STATUS_LABELS[option.value];
    if (label) option.textContent = label;
  });

  qa<HTMLElement>('.badge, .completion b, .completion strong, .completion span, .detail-grid section p').forEach((element) => {
    if (element.closest('[data-arl-order-detail-react="1"]') || element.children.length) return;
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

function syncExactIcons() {
  qa<HTMLElement>('.client-list .contact-links a,.client-list .contact-links button,.dashboard-contact,.dashboard-address,.arl-order-mini-action,.dashboard-row:not(.head) button,.order-row:not(.head) button,.arl-client-delete,.arl-order-delete').forEach((action) => {
    if (action.closest('[data-arl-clients-react="1"]') || action.closest('[data-arl-order-detail-react="1"]')) return;
    const label = `${action.getAttribute('aria-label') || ''} ${action.getAttribute('title') || ''} ${action.textContent || ''}`;
    if (action.classList.contains('arl-client-delete') || action.classList.contains('arl-order-delete') || /Excluir/i.test(label)) return setVisualIcon(action, 'lixeira');
    if (action.classList.contains('dashboard-contact') || /WhatsApp/i.test(label)) return setVisualIcon(action, 'whatsapp');
    if (action.classList.contains('dashboard-address') || /Maps|Google Maps/i.test(label)) return setVisualIcon(action, 'maps');
    if (/Visualizar|Ver OS/i.test(label)) return setVisualIcon(action, 'visualizar');
    if (/Editar/i.test(label)) return setVisualIcon(action, 'editar');
  });
}

function hideRetiredMessageEditors() {
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

function showFinalShare(order: FinalOrder, share: FinalShare) {
  document.querySelector('.arl-final-share-host')?.remove();
  const host = document.createElement('div');
  host.className = 'arl-final-share-host';
  const clientName = order.client?.name || 'cliente';
  const message = [
    `Olá, ${clientName} 👋`,
    `Seu Equipamento está pronto da OS ${order.number}! 🎉`,
    '📋 Detalhes do Serviço:',
    `- Valor: ${money(order.total_cents || 0)}`,
    '💳 Formas de Pagamento:',
    '- PIX (Chave): 35988285777',
    '- Cartão: (Com taxas inclusas)',
    '- Dinheiro: (Favor trazer trocado)',
    '⚠️ A retirada ou entrega será liberada imediatamente após a confirmação do pagamento.',
    'Agradecemos pela preferência! 😊',
  ].join('\n');
  const whatsapp = whatsappUrl(order.client?.phone || '', message);
  host.innerHTML = `<section class="arl-final-share-card" role="status" aria-label="Compartilhar fechamento da OS">
    <h2>OS #${order.number} finalizada</h2>
    <p>O PDF Final está pronto. O link abaixo expira em 48 horas; o PDF original continua preservado no histórico.</p>
    <div class="arl-final-share-actions">
      <a data-final-pdf target="_blank" rel="noreferrer">Abrir PDF</a>
      ${whatsapp ? '<a class="whatsapp" data-final-whatsapp target="_blank" rel="noreferrer">Enviar PDF pelo WhatsApp</a>' : ''}
      <button type="button" data-final-close>Fechar</button>
    </div>
  </section>`;
  q<HTMLAnchorElement>('[data-final-pdf]', host)!.href = share.url;
  const whatsappLink = q<HTMLAnchorElement>('[data-final-whatsapp]', host);
  if (whatsappLink) {
    whatsappLink.href = whatsapp;
    whatsappLink.prepend(exactIcon('whatsapp'));
    whatsappLink.addEventListener('click', (event) => {
      event.preventDefault();
      if (!window.confirm('Deseja abrir o WhatsApp para enviar a mensagem de finalização desta OS?')) return;
      window.open(whatsapp, '_blank', 'noopener');
    });
  }
  q<HTMLButtonElement>('[data-final-close]', host)?.addEventListener('click', () => host.remove());
  document.body.append(host);
}

async function prepareFinalShare(orderId: string) {
  try {
    const [orderResponse, shareResponse] = await Promise.all([
      fetch(`/api/orders/${orderId}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
      fetch(`/api/orders/${orderId}/final-share`, { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
    ]);
    if (!orderResponse.ok || !shareResponse.ok) return;
    const order = await orderResponse.json() as FinalOrder;
    const share = await shareResponse.json() as FinalShare;
    if (!share.url) return;
    showFinalShare(order, share);
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
