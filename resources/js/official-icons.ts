export {};

const ICON_ROOT = '/arl-assets/icons';

function installStyles() {
  if (document.getElementById('arl-official-icons-style')) return;

  const style = document.createElement('style');
  style.id = 'arl-official-icons-style';
  style.textContent = `
    .dashboard-contact.arl-official-whatsapp {
      background-image: url('${ICON_ROOT}/icon-whatsapp.png') !important;
      background-repeat: no-repeat !important;
      background-position: center !important;
      background-size: 22px 22px !important;
    }
    .dashboard-contact.arl-official-whatsapp .arl-dashboard-icon,
    .dashboard-contact.arl-official-whatsapp .arl-wa-mark { display: none !important; }

    .dashboard-address.arl-official-maps {
      background-image: url('${ICON_ROOT}/icon-maps.png') !important;
      background-repeat: no-repeat !important;
      background-position: left center !important;
      background-size: 20px 20px !important;
      padding-left: 26px !important;
    }
    .dashboard-address.arl-official-maps .arl-dashboard-icon,
    .dashboard-address.arl-official-maps .arl-map-mark { display: none !important; }

    button.arl-official-view {
      width: 36px !important;
      min-width: 36px !important;
      height: 34px !important;
      min-height: 34px !important;
      padding: 0 !important;
      font-size: 0 !important;
      background-image: url('${ICON_ROOT}/icon-visualizar.png') !important;
      background-repeat: no-repeat !important;
      background-position: center !important;
      background-size: 22px 22px !important;
    }
    button.arl-official-view svg { display: none !important; }

    .arl-order-mini-action.arl-official-edit,
    .arl-final-edit.arl-official-edit {
      background-image: url('${ICON_ROOT}/icon-editar.png') !important;
      background-repeat: no-repeat !important;
      background-position: center !important;
      background-size: 21px 21px !important;
    }
    .arl-order-mini-action.arl-official-edit > svg,
    .arl-final-edit.arl-official-edit > svg { display: none !important; }

    .arl-order-delete.arl-official-delete {
      background-image: url('${ICON_ROOT}/icon-lixeira.png') !important;
      background-repeat: no-repeat !important;
      background-position: center !important;
      background-size: 21px 21px !important;
    }
    .arl-order-delete.arl-official-delete > svg { display: none !important; }
  `;
  document.head.append(style);
}

function mark(element: Element, className: string, label: string) {
  const html = element as HTMLElement;
  html.classList.add(className);
  if (!html.getAttribute('aria-label')) html.setAttribute('aria-label', label);
  if (!html.getAttribute('title')) html.setAttribute('title', label);
}

function applyOfficialIcons() {
  document.querySelectorAll('.dashboard-contact').forEach((element) => mark(element, 'arl-official-whatsapp', 'Abrir WhatsApp'));
  document.querySelectorAll('.dashboard-address').forEach((element) => mark(element, 'arl-official-maps', 'Abrir no Google Maps'));
  document.querySelectorAll('.dashboard-row:not(.head) .arl-view-order').forEach((element) => mark(element, 'arl-official-view', 'Visualizar OS'));

  document.querySelectorAll<HTMLButtonElement>('.order-list .order-row:not(.head) > button').forEach((button) => {
    if (button.classList.contains('arl-order-view-button') || /ver os|visualizar/i.test(button.textContent || '')) {
      mark(button, 'arl-official-view', 'Visualizar OS');
    }
  });

  document.querySelectorAll('.arl-order-mini-action.edit,.arl-final-edit').forEach((element) => mark(element, 'arl-official-edit', 'Editar OS'));
  document.querySelectorAll('.arl-order-delete').forEach((element) => mark(element, 'arl-official-delete', 'Excluir OS'));
}

function run() {
  installStyles();
  applyOfficialIcons();
}

let queued = false;
const queue = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    run();
  });
};

new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', queue);
document.addEventListener('click', queue, true);
queue();
