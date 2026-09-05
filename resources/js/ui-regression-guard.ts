export {};

const statusIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/><circle cx="18" cy="17" r="2"/></svg>';

function installRegressionStyles() {
  if (document.getElementById('arl-ui-regression-guard-style')) return;

  const style = document.createElement('style');
  style.id = 'arl-ui-regression-guard-style';
  style.textContent = `
    main:has(.post-sale) .arl-post-sale-editor{display:grid!important}
    .arl-restored-external-status svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    @media(max-width:760px){
      .arl-vivid-actions a,.arl-vivid-actions button{width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important;flex-basis:44px!important}
      .dashboard-contact{width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important}
      .external-actions>a,.external-actions>button,.external-actions>label{width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important}
      .arl-order-quick-actions button,.dashboard-row .arl-view-order{min-height:44px!important}
    }
  `;
  document.head.append(style);
}

function syncPostSaleAccessibility() {
  if (!document.querySelector('.post-sale')) return;
  document.querySelector<HTMLElement>('.arl-post-sale-editor')?.removeAttribute('aria-hidden');
}

function syncExternalStatusAction() {
  const actions = document.querySelector<HTMLElement>('.external-actions');
  if (!actions || actions.querySelector('.arl-restored-external-status')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'arl-restored-external-status';
  button.setAttribute('aria-label', 'Status');
  button.title = 'Status';
  button.innerHTML = statusIcon;
  button.addEventListener('click', () => {
    document.querySelector<HTMLSelectElement>('.status-picker select')?.focus();
  });

  const finalize = actions.querySelector<HTMLElement>('[data-arl-finalize]');
  if (finalize) finalize.before(button);
  else actions.append(button);
}

let queued = false;
function scheduleSync() {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(() => {
    queued = false;
    installRegressionStyles();
    syncPostSaleAccessibility();
    syncExternalStatusAction();
  });
}

new MutationObserver(scheduleSync).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', scheduleSync);
scheduleSync();
