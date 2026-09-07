export {};

const q = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const qa = <T extends Element = HTMLElement>(selector: string) => Array.from(document.querySelectorAll<T>(selector));
const heading = (value: string | RegExp) => qa<HTMLHeadingElement>('main h1').some((item) => {
  const label = item.textContent?.trim() || '';
  return typeof value === 'string' ? label === value : value.test(label);
});

function remove(selector: string) {
  qa<HTMLElement>(selector).forEach((item) => item.remove());
}

function closeDetachedOverlays() {
  // A nova tela Ver OS é dona do próprio ciclo de vida. Enquanto a raiz React
  // estiver ativa, o legado não remove overlays nem resíduos dela no capture.
  if (q('[data-arl-order-detail-react="1"]')) return;
  remove('.arl-od-modal, .arl-status-modal, .arl-photo-choice, .arl-camera-modal, .arl-order-opened-modal');
}

function syncPageScopedArtifacts() {
  const main = q<HTMLElement>('.shell > main');
  if (!main) return;

  const orderDetail = heading(/^OS #/);
  if (!orderDetail) {
    remove('.arl-od-sharebar, .arl-order-quick-actions');
  }

  const settings = heading('Configurações');
  if (!settings) {
    remove('.arl-settings-tabs, .arl-opening-message-panel, .arl-finance-settings-note, .arl-message-subnav, .arl-post-message-panel, .arl-order-subtabs, .arl-document-subtabs');
  }

  const postSale = heading(/^Pós-Venda(?: & Reputação)?$/);
  if (!postSale) {
    remove('.arl-post-sale-editor, .arl-post-toolbar');
  }

  const dashboard = heading('Painel');
  if (!dashboard) {
    remove('.arl-mobile-home');
    delete main.dataset.arlMobileHome;
  }
}

let frame = 0;
function scheduleSync() {
  if (frame) return;
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    syncPageScopedArtifacts();
  });
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('aside nav button, [data-mobile-nav]')) {
    closeDetachedOverlays();
    scheduleSync();
  }
}, true);

const observer = new MutationObserver(scheduleSync);
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', scheduleSync);
window.addEventListener('arl:order-detail', scheduleSync);
scheduleSync();
