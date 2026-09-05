export {};

function installRegressionStyles() {
  if (document.getElementById('arl-ui-regression-guard-style')) return;

  const style = document.createElement('style');
  style.id = 'arl-ui-regression-guard-style';
  style.textContent = `
    main:has(.post-sale) .arl-post-sale-editor{display:grid!important}
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

let queued = false;
function scheduleSync() {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(() => {
    queued = false;
    installRegressionStyles();
    syncPostSaleAccessibility();
  });
}

new MutationObserver(scheduleSync).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', scheduleSync);
scheduleSync();
