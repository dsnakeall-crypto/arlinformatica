export {};

function syncDecorativeAccessibility() {
  document.querySelectorAll<HTMLElement>('.arl-nav-arrow, .arl-profile-arrow').forEach((item) => {
    item.setAttribute('aria-hidden', 'true');
  });
}

function syncPostSaleScope() {
  const postSalePanel = document.querySelector('.post-sale');
  if (postSalePanel) return;

  document.querySelectorAll<HTMLElement>('.arl-post-sale-editor, .arl-post-toolbar').forEach((item) => {
    item.remove();
  });
}

function syncSettingsAccess() {
  syncDecorativeAccessibility();
  syncPostSaleScope();

  const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.trim() === 'Configurações');
  if (!heading) return;

  const tabs = document.querySelector<HTMLElement>('.arl-settings-tabs');
  if (!tabs) return;

  const hasMasterInfrastructure = Boolean(document.querySelector('.infra-grid'));
  for (const section of ['backup', 'system']) {
    const button = tabs.querySelector<HTMLButtonElement>(`[data-section="${section}"]`);
    if (button) {
      button.hidden = !hasMasterInfrastructure;
      button.style.display = hasMasterInfrastructure ? '' : 'none';
    }
  }

  const storageContent = document.querySelector('[data-arl-settings-section="storage"]');
  const storageButton = tabs.querySelector<HTMLButtonElement>('[data-section="storage"]');
  if (storageButton) {
    storageButton.hidden = !storageContent;
    storageButton.style.display = storageContent ? '' : 'none';
  }

  const notificationContent = document.querySelector('[data-arl-settings-section="notifications"]');
  const notificationButton = tabs.querySelector<HTMLButtonElement>('[data-section="notifications"]');
  if (notificationButton) {
    notificationButton.hidden = !notificationContent;
    notificationButton.style.display = notificationContent ? '' : 'none';
  }
}

const observer = new MutationObserver(() => window.requestAnimationFrame(syncSettingsAccess));
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', syncSettingsAccess);
syncSettingsAccess();
