import '../css/mobile-home.css';
import { isReopenedOrder } from './order-reopened';

export {};

type MobileClient = {
  name: string;
  nickname?: string | null;
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
  attendance_type: 'bench' | 'external';
  client: MobileClient;
};

const statusLabels: Record<string, string> = {
  analysis: 'Em Análise',
  waiting_part: 'Aguardando Peça',
  in_service: 'Em Serviço',
};

const actionIcons = {
  whatsapp: '/arl-assets/icons/icon-whatsapp.png',
  maps: '/arl-assets/icons/icon-maps.png',
} as const;

function isEffectiveMobile() {
  return document.documentElement.dataset.layout === 'mobile';
}

function isDashboardVisible() {
  // No mobile, o React mantém a raiz do Painel, enquanto este enhancer só
  // acrescenta a home própria (lista de OS abertas). O marcador é a fonte de
  // verdade porque o PageHeader/heading não é montado nesse modo.
  if (document.querySelector('[data-arl-dashboard-react="1"]')) return true;
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
  const icon = document.createElement('img');
  icon.src = actionIcons[kind];
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  icon.style.width = '23px';
  icon.style.height = '23px';
  icon.style.objectFit = 'contain';
  icon.style.display = 'block';
  link.append(icon);
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

    const nickname = order.client.nickname ? document.createElement('small') : null;
    if (nickname) {
      nickname.className = 'arl-mobile-client-nickname';
      nickname.textContent = order.client.nickname ?? '';
    }

    const meta = document.createElement('span');
    meta.textContent = `OS #${order.number} · ${statusLabels[order.status] || order.status}`;

    info.append(client);
    if (nickname) info.append(nickname);
    info.append(meta);
    const markers = document.createElement('div');
    markers.className = 'arl-mobile-order-markers';
    if (order.attendance_type === 'external') {
      const marker = document.createElement('span');
      marker.className = 'arl-external-attendance-marker status-awaiting_payment';
      marker.textContent = 'Externo';
      markers.append(marker);
    }
    if (reopened) {
      const marker = document.createElement('span');
      marker.className = 'arl-reopened-marker status-paid';
      marker.textContent = 'Reaberta';
      markers.append(marker);
    }
    if (markers.childElementCount) info.append(markers);

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
    const values: Record<string, number> = {
      all: orders.length,
      analysis: orders.filter(order => order.status === 'analysis').length,
      service: orders.filter(order => order.status === 'in_service').length,
      waiting: orders.filter(order => order.status === 'waiting_part').length,
    };
    home.querySelectorAll<HTMLElement>('[data-mobile-stat]').forEach(element => {
      element.textContent = String(values[element.dataset.mobileStat || 'all']);
    });
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

const premiumIconPaths = {
  clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6M9 15h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  wrench: '<path d="M14.7 6.3a6 6 0 0 0-7.7 7.7l-4.5 4.5a2.1 2.1 0 0 0 3 3l4.5-4.5a6 6 0 0 0 7.7-7.7l-4.2 4.1-3.3-3.3z"/>',
  package: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2zM17 5.5a3 3 0 0 1 0 5.8M15.8 14a5 5 0 0 1 6.2 5v1h-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chart: '<path d="M3 3v18h18"/><rect x="6" y="12" width="3" height="6" rx=".5"/><rect x="11" y="8" width="3" height="10" rx=".5"/><rect x="16" y="5" width="3" height="13" rx=".5"/>',
} as const;

let premiumIconSequence = 0;
function premiumIcon(name: keyof typeof premiumIconPaths): string {
  // SVG metálico próprio: realces, sombra e contorno em camadas, sem PNG
  // de interface ou dependência de serviço externo. IDs únicos por instância.
  const id = 'arl-3d-' + name + '-' + ++premiumIconSequence;
  const blue = name === 'search' || name === 'package' || name === 'users' || name === 'chart';
  const stops = blue
    ? '<stop offset="0" stop-color="#f0f9ff"/><stop offset=".24" stop-color="#9cb9d7"/><stop offset=".49" stop-color="#234a70"/><stop offset=".72" stop-color="#071a31"/><stop offset="1" stop-color="#7895b0"/>'
    : '<stop offset="0" stop-color="#fff6c9"/><stop offset=".25" stop-color="#ffd962"/><stop offset=".5" stop-color="#bd7e13"/><stop offset=".72" stop-color="#754403"/><stop offset="1" stop-color="#f9c14b"/>';
  const outline = blue ? '#101d30' : '#754006';
  const paths = premiumIconPaths[name];
  return '<svg class="arl-premium-icon arl-premium-icon-' + name + '" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">'
    + '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' + stops + '</linearGradient></defs>'
    + '<g transform="translate(.25 .65)" stroke="' + outline + '" stroke-width="3.8" opacity=".9">' + paths + '</g>'
    + '<g stroke="url(#' + id + ')" stroke-width="2.8">' + paths + '</g>'
    + '<g transform="translate(-.3 -.48)" stroke="#fff9e7" stroke-width=".65" opacity=".88">' + paths + '</g></svg>';
}

function buildHome(main: HTMLElement) {
  const home = document.createElement('section');
  const premium = main.dataset.arlMobileVariant === 'premium';
  home.className = premium ? 'arl-mobile-home arl-mobile-home-premium' : 'arl-mobile-home arl-mobile-home-classic';
  home.dataset.variant = premium ? 'premium' : 'classic';
  home.setAttribute('aria-label', premium ? 'Painel mobile ARL Informática' : 'OS abertas — mobile clássico');
  if (!premium) {
    home.innerHTML = `<div class="arl-mobile-home-section-title"><h2>OS abertas</h2><small data-mobile-count>Carregando…</small></div><div class="arl-mobile-order-list" data-mobile-orders></div>`;
    return home;
  }
  home.innerHTML = `
    <div class="arl-premium-hero">
      <div class="arl-premium-brand">
        <img src="/arl-assets/arl-red-gold-from-vector-20261019.svg" alt="ARL" width="178" height="72" />
        <span>INFORMÁTICA</span>
        <small>Manutenção e Soluções Inteligentes</small>
      </div>
    </div>
    <div class="arl-premium-welcome">
      <span>BEM-VINDO,</span>
      <h1 data-mobile-user>ARL Informática</h1>
      <p>Aqui está o resumo dos atendimentos.</p>
    </div>
    <div class="arl-premium-kpis" aria-label="Indicadores operacionais">
      <article><span class="arl-premium-stat-icon">${premiumIcon('clipboard')}</span><strong data-mobile-stat="all">—</strong><small>OS abertas</small></article>
      <article><span class="arl-premium-stat-icon">${premiumIcon('search')}</span><strong data-mobile-stat="analysis">—</strong><small>Em análise</small></article>
      <article><span class="arl-premium-stat-icon">${premiumIcon('wrench')}</span><strong data-mobile-stat="service">—</strong><small>Em serviço</small></article>
      <article><span class="arl-premium-stat-icon">${premiumIcon('package')}</span><strong data-mobile-stat="waiting">—</strong><small>Aguardando peça</small></article>
    </div>
    <div class="arl-premium-title"><h2>Acesso rápido</h2><span>Atalhos</span></div>
    <div class="arl-premium-shortcuts">
      <button type="button" data-mobile-dest="orders"><span aria-hidden="true">${premiumIcon('wrench')}</span><strong>Ordens de Serviço</strong><small>Atendimentos e prazos</small></button>
      <button type="button" data-mobile-dest="clients"><span aria-hidden="true">${premiumIcon('users')}</span><strong>Clientes</strong><small>Cadastro e histórico</small></button>
      <button type="button" data-mobile-dest="new"><span aria-hidden="true">${premiumIcon('plus')}</span><strong>Abrir OS</strong><small>Novo atendimento</small></button>
      <button type="button" data-mobile-dest="finance" data-mobile-admin><span aria-hidden="true">${premiumIcon('chart')}</span><strong>Financeiro</strong><small>Para administradores</small></button>
    </div>
    <div class="arl-premium-title arl-premium-order-title"><h2>Ordens de Serviço recentes</h2><small data-mobile-count>Carregando…</small></div>
    <div class="arl-mobile-order-list" data-mobile-orders></div>`;
  const firstName = main.dataset.arlUserName?.trim().split(/\s+/)[0];
  home.querySelector<HTMLElement>('[data-mobile-user]')!.textContent = firstName ? firstName + ' 👋' : 'ARL Informática';
  if (main.dataset.arlUserRole === 'Usuário local') {
    home.querySelector<HTMLElement>('[data-mobile-admin]')?.remove();
  }
  home.addEventListener('click', (event) => {
    const destination = (event.target as Element).closest<HTMLElement>('[data-mobile-dest]')?.dataset.mobileDest;
    if (destination) window.dispatchEvent(new CustomEvent('arl-mobile-go-page', { detail: destination }));
  });
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
  if (home && home.dataset.variant !== main.dataset.arlMobileVariant) {
    clearMobileHome(main);
    main.dataset.arlMobileHome = '1';
    home = null;
  }
  if (home) {
    const firstName = main.dataset.arlUserName?.trim().split(/\s+/)[0];
    const title = home.querySelector<HTMLElement>('[data-mobile-user]');
    if (title && firstName) title.textContent = firstName + ' 👋';
    return;
  }

  home = buildHome(main);
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
  attributeFilter: ['data-layout', 'data-arl-user-name', 'data-arl-mobile-variant'],
});
document.addEventListener('DOMContentLoaded', scheduleSync);
scheduleSync();
