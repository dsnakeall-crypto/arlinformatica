export {};

type OpeningClient = { name: string; phone: string };
type OpeningContext = { number: string; clientName: string; phone: string };

let pendingOpening: OpeningContext | null = null;

const digits = (value: string) => value.replace(/\D/g, '');
const q = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector);
const qa = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(selector));

function selectedClient(): OpeningClient | null {
  const current = (window as Window & { __arlSelectedClient?: OpeningClient | null }).__arlSelectedClient;
  if (current?.name) return current;

  const name = q<HTMLElement>('.arl-selected-client b, .selected-client-summary b')?.textContent?.trim() || '';
  return name ? { name, phone: '' } : null;
}

function selectedClientName() {
  const current = selectedClient();
  if (current?.name) return current.name;

  const select = q<HTMLSelectElement>('form.os-form select');
  const label = select?.selectedOptions[0]?.textContent?.trim() || '';
  return label && !/selecione/i.test(label) ? label : '';
}

function fixedOpeningMessage(clientName: string, orderNumber: string) {
  return [
    `Olá, ${clientName}`,
    '',
    `Informamos que a sua *Ordem de Serviço nº ${orderNumber}* foi aberta com sucesso na *ARL Informática*.`,
    '',
    'Nosso departamento técnico já iniciou os procedimentos necessários. Em breve, entraremos em contato para atualizar o status do serviço e apresentar os detalhes da verificação do seu equipamento.',
    '',
    'Permanecemos à disposição para qualquer dúvida.',
    '',
    'Atenciosamente,',
    '',
    '*ARL Informática*',
  ].join('\n');
}

function whatsappUrl(phone: string, message: string) {
  const raw = digits(phone);
  const full = raw.startsWith('55') ? raw : `55${raw}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

function phoneFromLink(link: HTMLAnchorElement | null) {
  if (!link?.href) return '';
  try {
    const url = new URL(link.href);
    return digits(url.pathname);
  } catch {
    return '';
  }
}

function clientNameFromPage() {
  const current = selectedClientName();
  if (current) return current;

  const clientSection = qa<HTMLElement>('.detail-grid > section').find(
    (section) => section.querySelector('h2')?.textContent?.trim() === 'Cliente',
  );
  return clientSection?.querySelector('b')?.textContent?.trim() || '';
}

function orderNumberFromModal(modal: HTMLElement) {
  const heading = modal.querySelector('h2')?.textContent?.trim() || '';
  return heading.match(/OS #([^\s]+) aberta/)?.[1] || pendingOpening?.number || '';
}

function rewriteOpeningModal(modal: HTMLElement) {
  if (modal.dataset.arlFixedOpening === '1') return;

  const oldLink = modal.querySelector<HTMLAnchorElement>('a[href*="wa.me"]');
  const number = pendingOpening?.number || orderNumberFromModal(modal);
  const clientName = pendingOpening?.clientName || clientNameFromPage();
  const phone = pendingOpening?.phone || phoneFromLink(oldLink);

  if (!number || !clientName || !phone) return;

  const message = fixedOpeningMessage(clientName, number);
  modal.dataset.arlFixedOpening = '1';
  modal.innerHTML = `<div role="dialog" aria-modal="true" aria-labelledby="arl-opening-whatsapp-title">
    <h2 id="arl-opening-whatsapp-title">Enviar mensagem da Abertura da OS via Whatsapp</h2>
    <section>
      <button type="button" data-opening-cancel>Cancelar</button>
      <a data-opening-send target="_blank" rel="noreferrer">Enviar</a>
    </section>
  </div>`;

  const cancel = q<HTMLButtonElement>('[data-opening-cancel]', modal)!;
  const send = q<HTMLAnchorElement>('[data-opening-send]', modal)!;
  send.href = whatsappUrl(phone, message);

  const close = () => {
    pendingOpening = null;
    sessionStorage.removeItem('arl:new-order-id');
    modal.remove();
  };

  cancel.addEventListener('click', close);
  send.addEventListener('click', close);
}

function removeLegacyOpeningShare() {
  qa<HTMLElement>('.arl-od-sharebar').forEach((item) => item.remove());
  qa<HTMLElement>('.arl-od-modal').forEach((item) => {
    const content = item.textContent || '';
    if (content.includes('Compartilhar Termo PDF') || /OS #\S+ aberta/.test(content)) item.remove();
  });
}

function syncMessageSettings() {
  const settingsHeading = qa<HTMLHeadingElement>('main h1').find((item) => item.textContent?.trim() === 'Configurações');
  if (!settingsHeading) return;

  const openingPanel = q<HTMLElement>('.arl-opening-message-panel');
  if (openingPanel) {
    openingPanel.hidden = true;
    openingPanel.setAttribute('aria-hidden', 'true');
    openingPanel.style.setProperty('display', 'none', 'important');
  }

  q<HTMLButtonElement>('.arl-message-subnav [data-msg-tab="opening"]')?.remove();

  const messagesTab = q<HTMLButtonElement>('.arl-settings-tab[data-section="messages"]');
  const description = messagesTab?.querySelector('small');
  if (description) description.textContent = 'Avaliação Google e Instagram.';

  const nav = q<HTMLElement>('.arl-message-subnav');
  if (!nav) return;

  let active = document.documentElement.dataset.arlMessageSubtab || '';
  if (!active || active === 'opening') {
    active = 'google';
    document.documentElement.dataset.arlMessageSubtab = active;
  }

  const topActive = messagesTab?.classList.contains('active') === true;
  qa<HTMLElement>('.arl-post-message-panel').forEach((panel) => {
    panel.hidden = !topActive || panel.dataset.msgPanel !== active;
  });
  qa<HTMLButtonElement>('.arl-message-subnav [data-msg-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.msgTab === active);
  });
  nav.hidden = !topActive;
}

function captureOrderCreation() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw, location.origin);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const isOrderCreation = url.origin === location.origin && url.pathname === '/api/orders' && method === 'POST';
    const client = isOrderCreation ? selectedClient() : null;
    const clientName = isOrderCreation ? (client?.name || selectedClientName()) : '';

    const response = await nativeFetch(input, init);

    if (isOrderCreation && response.ok) {
      const created = await response.clone().json().catch(() => null);
      if (created?.number) {
        pendingOpening = {
          number: String(created.number),
          clientName,
          phone: client?.phone || '',
        };
        sessionStorage.removeItem('arl:new-order-id');
      }
    }

    return response;
  };
}

let frame = 0;
function scheduleSync() {
  if (frame) return;
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    const modal = q<HTMLElement>('.arl-order-opened-modal');
    if (modal) rewriteOpeningModal(modal);
    removeLegacyOpeningShare();
    syncMessageSettings();
  });
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('.arl-settings-tab[data-section="messages"], .arl-message-subnav [data-msg-tab]')) {
    window.requestAnimationFrame(syncMessageSettings);
  }
});

function syncImmediately() {
  const modal = q<HTMLElement>('.arl-order-opened-modal');
  if (modal) rewriteOpeningModal(modal);
  removeLegacyOpeningShare();
  scheduleSync();
}

captureOrderCreation();
new MutationObserver(syncImmediately).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['href'],
});
document.addEventListener('DOMContentLoaded', syncImmediately);
syncImmediately();
