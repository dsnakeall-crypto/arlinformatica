export {};

function syncSettingsAccess() {
  const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.trim() === 'Configurações');
  if (!heading) return;

  const tabs = document.querySelector<HTMLElement>('.arl-settings-tabs');
  if (!tabs) return;

  const hasMasterInfrastructure = Boolean(document.querySelector('.infra-grid'));
  for (const section of ['backup', 'system']) {
    const button = tabs.querySelector<HTMLButtonElement>(`[data-section="${section}"]`);
    if (button) button.hidden = !hasMasterInfrastructure;
  }

  const storageContent = document.querySelector('[data-arl-settings-section="storage"]');
  const storageButton = tabs.querySelector<HTMLButtonElement>('[data-section="storage"]');
  if (storageButton) storageButton.hidden = !storageContent;

  const notificationContent = document.querySelector('[data-arl-settings-section="notifications"]');
  const notificationButton = tabs.querySelector<HTMLButtonElement>('[data-section="notifications"]');
  if (notificationButton) notificationButton.hidden = !notificationContent;
}

const observer = new MutationObserver(() => window.requestAnimationFrame(syncSettingsAccess));
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', syncSettingsAccess);
syncSettingsAccess();
