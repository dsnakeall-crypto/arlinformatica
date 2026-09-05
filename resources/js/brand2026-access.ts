import '../css/settings-editors.css';

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

const documentSubtabs = [
  ['term', 'Termo de recebimento'],
  ['budget', 'Orçamento'],
  ['reports', 'Modelos de laudos'],
] as const;

function syncDocumentSubtabState() {
  const active = document.documentElement.dataset.arlDocumentSubtab || 'term';
  document.querySelectorAll<HTMLButtonElement>('.arl-document-subtab').forEach((button) => {
    const selected = button.dataset.documentSubtab === active;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
    button.tabIndex = selected ? 0 : -1;
  });
}

function autoSizeTextarea(area: HTMLTextAreaElement) {
  if (!area.isConnected) return;
  area.style.height = 'auto';
  area.style.height = `${Math.max(220, area.scrollHeight + 2)}px`;
}

function syncSettingsEditorHeights() {
  document
    .querySelectorAll<HTMLTextAreaElement>(
      'textarea[data-arl-document-editor], .arl-opening-message-panel textarea, .report-settings textarea',
    )
    .forEach(autoSizeTextarea);
}

function syncDocumentEditors() {
  const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.trim() === 'Configurações');
  if (!heading) return;

  const form = document.querySelector<HTMLFormElement>('form.settings-form');
  if (!form) return;

  const children = Array.from(form.children) as HTMLElement[];
  const documentsHeading = children.find((item) => item.tagName === 'H2' && item.textContent?.trim() === 'Documentos');
  const warrantyHeading = children.find((item) => item.tagName === 'H2' && item.textContent?.trim() === 'Garantia Geral');
  if (!documentsHeading || !warrantyHeading) return;

  const start = children.indexOf(documentsHeading);
  const end = children.indexOf(warrantyHeading);
  if (start < 0 || end <= start) return;

  children.slice(start + 1, end).forEach((item) => {
    if (item.classList.contains('arl-document-subtabs')) return;
    const label = item.textContent?.trim() || '';
    if (label.includes('Texto do termo de recebimento')) {
      item.dataset.arlDocumentPanel = 'term';
    } else if (label.includes('Texto institucional do orçamento') || item.classList.contains('form-grid')) {
      item.dataset.arlDocumentPanel = 'budget';
    }
    item.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((area) => {
      area.dataset.arlDocumentEditor = 'true';
    });
  });

  let tabs = form.querySelector<HTMLElement>('.arl-document-subtabs');
  if (!tabs) {
    tabs = document.createElement('div');
    tabs.className = 'arl-document-subtabs';
    tabs.dataset.arlSettingsSection = 'documents';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Seções de Orçamentos e Documentos');
    tabs.innerHTML = documentSubtabs
      .map(
        ([id, label]) =>
          `<button type="button" class="arl-document-subtab" role="tab" data-document-subtab="${id}">${label}</button>`,
      )
      .join('');
    documentsHeading.insertAdjacentElement('afterend', tabs);
  }

  const reportSettings = document.querySelector<HTMLElement>('.report-settings');
  if (reportSettings) reportSettings.dataset.arlDocumentPanel = 'reports';

  const validTabs = new Set(documentSubtabs.map(([id]) => id));
  if (!validTabs.has((document.documentElement.dataset.arlDocumentSubtab || '') as (typeof documentSubtabs)[number][0])) {
    document.documentElement.dataset.arlDocumentSubtab = 'term';
  }

  syncDocumentSubtabState();
  syncSettingsEditorHeights();
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

  syncDocumentEditors();
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const documentTab = target?.closest<HTMLButtonElement>('.arl-document-subtab');
  if (documentTab?.dataset.documentSubtab) {
    document.documentElement.dataset.arlDocumentSubtab = documentTab.dataset.documentSubtab;
    syncDocumentSubtabState();
    window.requestAnimationFrame(syncSettingsEditorHeights);
    return;
  }

  if (target?.closest('.arl-settings-tab')) {
    window.requestAnimationFrame(() => window.requestAnimationFrame(syncSettingsEditorHeights));
  }
});

document.addEventListener('input', (event) => {
  const area = event.target instanceof HTMLTextAreaElement ? event.target : null;
  if (area?.matches('textarea[data-arl-document-editor], .arl-opening-message-panel textarea, .report-settings textarea')) {
    autoSizeTextarea(area);
  }
});

const observer = new MutationObserver(() => window.requestAnimationFrame(syncSettingsAccess));
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', syncSettingsAccess);
syncSettingsAccess();
