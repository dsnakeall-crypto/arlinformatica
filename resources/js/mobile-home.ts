import '../css/mobile-home.css';
import { isReopenedOrder } from './order-reopened';

export {};

type MobileClient = {
  name: string;
  phone?: string | null;
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  whatsapp_url?: string | null;
  maps_url?: string | null;
};

type MobileOrder = {
  id: number;
  number: string;
  status: 'analysis' | 'waiting_part' | 'in_service' | string;
  client: MobileClient;
};

const statusLabels: Record<string, string> = {
  analysis: 'Em Análise',
  waiting_part: 'Aguardando Peça',
  in_service: 'Em Serviço',
};

const whatsappIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="M8.2 8.7c.8 3 3.2 5.4 6.2 6.2"/></svg>';
const mapsIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/></svg>';

function isEffectiveMobile() {
  return document.documentElement.dataset.layout === 'mobile';
}

function isDashboardVisible() {
  // O Painel React controla integralmente seu DOM; este enhancer só serve
  // para a antiga tela não-React e não pode substituir a lista nova.
  if (document.querySelector('[data-arl-dashboard-react="1"]')) return false;
  return Array.from(document.querySelectorAll<HTMLHeadingElement>('main h1')).some(
    (heading) => heading.textContent?.trim() === 'Painel',
  );
}

function appMain() {
  return document.querySelector<HTMLElement>('.shell > main');
}

function whatsappUrl(client: MobileClient) {
  if (client.whatsapp_url) return client.whatsapp_url;
  const raw = String(client.phone || '').replace(/\D/g, '');
  if (!raw) return '';
  const number = raw.startsWith('55') ? raw : `55${raw}`;
  return `https://wa.me/${number}`;
}

function mapsUrl(client: MobileClient) {
  if (client.maps_url) return client.maps_url;
  const address = [client.street, client.number, client.district, client.city, client.state]
    .filter(Boolean)
    .join(', ');
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
}

function actionLink(kind: 'whatsapp' | 'maps', url: string, clientName: string) {
  const link = document.createElement('a');
  link.className = `arl-mobile-order-action arl-mobile-order-${kind}`;
  link.href = url || '#';
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.setAttribute('aria-label', `${kind === 'whatsapp' ? 'Abrir WhatsApp' : 'Abrir Google Maps'} de ${clientName}`);
  link.innerHTML = kind === 'whatsapp' ? whatsappIcon : mapsIcon;
  if (!url) {
    link.classList.add('disabled');
    link.removeAttribute('target');
    link.addEventListener('click', (event) => event.preventDefault());
  }
  return link;
}

function renderOrders(list: HTMLElement, orders: MobileOrder[]) {
  list.innerHTML = '';
  if (!orders.length) {
    const empty = document.createElement('div');
    empty.className = 'arl-mobile-home-empty';
    empty.innerHTML = '<strong>Nenhuma OS aberta</strong><span>Assim que uma nova OS for aberta, ela aparecerá aqui.</span>';
    list.append(empty);
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement('article');
    const reopened = isReopenedOrder(order);
    card.className = `arl-mobile-order-card${reopened ? ' arl-mobile-order-reopened' : ''}`;
    card.dataset.orderId = String(order.id);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Abrir OS ${order.number} de ${order.client.name}`);
    const openOrder = () => window.dispatchEvent(new CustomEvent('arl-open-order', { detail: order.id }));
    card.addEventListener('click', (event) => { if (!(event.target as Element).closest('a')) openOrder(); });
    card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openOrder(); } });

    const info = document.createElement('div');
    info.className = 'arl-mobile-order-info';

    const client = document.createElement('strong');
    client.textContent = order.client.name;

    const meta = document.createElement('span');
    meta.textContent = `OS #${order.number} · ${statusLabels[order.status] || order.status}`;

    info.append(client, meta);
    if (reopened) {
      const marker = document.createElement('span');
      marker.className = 'arl-reopened-marker';
      marker.textContent = 'Reaberta';
      info.append(marker);
    }

    const actions = document.createElement('div');
    actions.className = 'arl-mobile-order-actions';
    actions.append(
      actionLink('whatsapp', whatsappUrl(order.client), order.client.name),
      actionLink('maps', mapsUrl(order.client), order.client.name),
    );

    card.append(info, actions);
    list.append(card);
  });
}

async function loadOrders(home: HTMLElement) {
  const list = home.querySelector<HTMLElement>('[data-mobile-orders]');
  const count = home.querySelector<HTMLElement>('[data-mobile-count]');
  if (!list || !count) return;

  list.innerHTML = '<div class="arl-mobile-home-loading">Carregando OS abertas…</div>';
  try {
    const response = await fetch('/api/orders/desk', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Não foi possível carregar as OS abertas.');
    const orders = (await response.json()) as MobileOrder[];
    if (!home.isConnected) return;
    count.textContent = `${orders.length} ${orders.length === 1 ? 'OS aberta' : 'OS abertas'}`;
    renderOrders(list, orders);
  } catch (error) {
    if (!home.isConnected) return;
    count.textContent = 'Falha ao carregar';
    list.innerHTML = '';
    const failure = document.createElement('div');
    failure.className = 'arl-mobile-home-error';
    failure.textContent = error instanceof Error ? error.message : 'Não foi possível carregar as OS abertas.';
    list.append(failure);
  }
}

function buildHome() {
  const home = document.createElement('section');
  home.className = 'arl-mobile-home';
  home.setAttribute('aria-label', 'Início mobile com Ordens de Serviço abertas');
  home.innerHTML = `
    <div class="arl-mobile-home-section-title">
      <h2>OS abertas</h2>
      <small data-mobile-count>Carregando…</small>
    </div>
    <div class="arl-mobile-order-list" data-mobile-orders></div>`;


  return home;
}

function clearMobileHome(main: HTMLElement | null) {
  document.querySelector('.arl-mobile-home')?.remove();
  if (main) delete main.dataset.arlMobileHome;
}

function syncMobileHome() {
  const main = appMain();
  if (!main) return;

  if (!isEffectiveMobile() || !isDashboardVisible()) {
    clearMobileHome(main);
    return;
  }

  main.dataset.arlMobileHome = '1';
  let home = main.querySelector<HTMLElement>(':scope > .arl-mobile-home');
  if (home) return;

  home = buildHome();
  const header = main.querySelector<HTMLElement>(':scope > .app-head');
  header?.insertAdjacentElement('afterend', home);
  if (!header) main.prepend(home);
  void loadOrders(home);
}

let frame = 0;
function scheduleSync() {
  if (frame) return;
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    syncMobileHome();
  });
}

const observer = new MutationObserver(scheduleSync);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-layout'],
});
document.addEventListener('DOMContentLoaded', scheduleSync);
scheduleSync();
