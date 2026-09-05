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

const orderSubtabs = [
  ['equipment', 'Equipamentos'],
  ['manufacturers', 'Fabricantes'],
] as const;

type OrderSubtabId = (typeof orderSubtabs)[number][0];

const orderPanelByTitle: Record<string, OrderSubtabId> = {
  Equipamentos: 'equipment',
  Fabricantes: 'manufacturers',
};

function removeChecklistSettingsEditor() {
  const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.trim() === 'Configurações');
  if (!heading) return;

  document.querySelectorAll<HTMLElement>('.admin-list').forEach((card) => {
    if (card.querySelector('h2')?.textContent?.trim() === 'Checklist de Entrada') {
      // Keep React-owned nodes attached so React can safely reconcile/unmount them later.
      card.hidden = true;
      card.style.display = 'none';
      card.setAttribute('aria-hidden', 'true');
    }
  });

  if (document.documentElement.dataset.arlOrderSubtab === 'checklist') {
    document.documentElement.dataset.arlOrderSubtab = 'equipment';
  }
}

function syncOrderSubtabState() {
  const active = document.documentElement.dataset.arlOrderSubtab || 'equipment';
  document.querySelectorAll<HTMLButtonElement>('.arl-order-subtab').forEach((button) => {
    const selected = button.dataset.orderSubtab === active;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
    button.tabIndex = selected ? 0 : -1;
  });
  document.querySelectorAll<HTMLElement>('[data-arl-order-panel]').forEach((panel) => {
    panel.setAttribute('aria-hidden', panel.dataset.arlOrderPanel === active ? 'false' : 'true');
  });
}

function syncOrderSettingsSubtabs() {
  const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.trim() === 'Configurações');
  if (!heading) {
    document.querySelector('.arl-order-subtabs')?.remove();
    return;
  }

  const cards = Array.from(document.querySelectorAll<HTMLElement>('.admin-list')).filter((card) => {
    if (card.hidden) return false;
    const title = card.querySelector('h2')?.textContent?.trim() || '';
    return Boolean(orderPanelByTitle[title]);
  });
  if (cards.length < orderSubtabs.length) {
    document.querySelector('.arl-order-subtabs')?.remove();
    return;
  }

  cards.forEach((card) => {
    const title = card.querySelector('h2')?.textContent?.trim() || '';
    const panel = orderPanelByTitle[title];
    if (!panel) return;
    card.dataset.arlOrderPanel = panel;
    card.dataset.arlSettingsSection = 'orders';
    card.id = `arl-order-panel-${panel}`;
    card.setAttribute('role', 'tabpanel');
    card.setAttribute('aria-labelledby', `arl-order-tab-${panel}`);
    card.classList.add('arl-order-settings-card');
    card.querySelector<HTMLElement>('.inline')?.classList.add('arl-order-add-row');
    card.querySelectorAll<HTMLElement>('article').forEach((row) => row.classList.add('arl-order-setting-row'));
    card.querySelectorAll<HTMLButtonElement>('article button').forEach((button) => {
      const label = button.textContent?.trim() || '';
      button.classList.add('arl-order-row-action');
      if (label === 'Editar') button.classList.add('arl-order-edit');
      if (label === 'Desativar' || label === 'Reativar') button.classList.add('arl-order-toggle');
    });
  });

  let tabs = document.querySelector<HTMLElement>('.arl-order-subtabs');
  if (!tabs) {
    tabs = document.createElement('div');
    tabs.className = 'arl-order-subtabs';
    tabs.dataset.arlSettingsSection = 'orders';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Cadastros da Ordem de Serviço');
    tabs.innerHTML = orderSubtabs
      .map(
        ([id, label]) =>
          `<button type="button" id="arl-order-tab-${id}" class="arl-order-subtab" role="tab" aria-controls="arl-order-panel-${id}" data-order-subtab="${id}">${label}</button>`,
      )
      .join('');
    cards[0].before(tabs);
  }

  const validTabs = new Set(orderSubtabs.map(([id]) => id));
  if (!validTabs.has((document.documentElement.dataset.arlOrderSubtab || '') as OrderSubtabId)) {
    document.documentElement.dataset.arlOrderSubtab = 'equipment';
  }

  syncOrderSubtabState();
}

const checklistCategories = [
  { id: 'notebooks', label: 'Notebooks', equipment: ['Notebook', 'Mac Apple'], preferred: 'Notebook' },
  { id: 'computers', label: 'Computadores', equipment: ['Computador'], preferred: 'Computador' },
  { id: 'tablets', label: 'Tablets & iPads', equipment: ['Tablet', 'iPad'], preferred: 'Tablet' },
  { id: 'printers', label: 'Impressoras', equipment: ['Impressora'], preferred: 'Impressora' },
] as const;

type ChecklistCategoryId = (typeof checklistCategories)[number]['id'];
let activeChecklistCategory: ChecklistCategoryId | null = null;

function checklistCategoryForEquipment(name: string) {
  return checklistCategories.find((category) => category.equipment.includes(name as never));
}

function newOrderEquipmentSelect() {
  return Array.from(document.querySelectorAll<HTMLSelectElement>('.os-form select')).find((select) => {
    const label = select.closest('label');
    return label?.querySelector('span')?.textContent?.trim().startsWith('Equipamento');
  });
}

function setNativeSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function syncNewOrderChecklist() {
  const details = Array.from(document.querySelectorAll<HTMLDetailsElement>('.os-form details')).find((item) =>
    item.querySelector('summary')?.textContent?.includes('CHECKLIST DE ENTRADA'),
  );
  if (!details) {
    activeChecklistCategory = null;
    return;
  }

  const checks = details.querySelector<HTMLElement>('.checks');
  const equipmentSelect = newOrderEquipmentSelect();
  if (!checks || !equipmentSelect) return;

  details.classList.add('arl-checklist-enhanced');
  let categories = details.querySelector<HTMLElement>('.arl-checklist-categories');
  if (!categories) {
    categories = document.createElement('div');
    categories.className = 'arl-checklist-categories';
    categories.setAttribute('role', 'group');
    categories.setAttribute('aria-label', 'Categorias do checklist');
    categories.innerHTML = checklistCategories
      .map(
        (category) =>
          `<button type="button" class="arl-checklist-category" data-checklist-category="${category.id}" aria-expanded="false">${category.label}</button>`,
      )
      .join('');
    checks.before(categories);
  }

  let note = details.querySelector<HTMLElement>('.arl-checklist-helper');
  if (!note) {
    note = document.createElement('p');
    note.className = 'arl-checklist-helper';
    note.textContent = 'Checklist opcional: escolha uma categoria e marque somente as avarias encontradas.';
    categories.after(note);
  }

  const selectedName = equipmentSelect.selectedOptions[0]?.textContent?.trim() || '';
  const selectedCategory = checklistCategoryForEquipment(selectedName);
  if (activeChecklistCategory && selectedCategory && activeChecklistCategory !== selectedCategory.id) {
    activeChecklistCategory = selectedCategory.id;
  }

  categories.querySelectorAll<HTMLButtonElement>('.arl-checklist-category').forEach((button) => {
    const category = checklistCategories.find((item) => item.id === button.dataset.checklistCategory);
    if (!category) return;

    if (!button.dataset.arlChecklistBound) {
      button.dataset.arlChecklistBound = '1';
      button.addEventListener('click', () => {
        if (activeChecklistCategory === category.id) {
          activeChecklistCategory = null;
          syncNewOrderChecklist();
          return;
        }

        const currentName = equipmentSelect.selectedOptions[0]?.textContent?.trim() || '';
        const currentCategory = checklistCategoryForEquipment(currentName);
        if (currentCategory?.id !== category.id) {
          checks.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked').forEach((checkbox) => checkbox.click());
          const options = Array.from(equipmentSelect.options);
          const target = options.find((option) => option.textContent?.trim() === category.preferred)
            || options.find((option) => category.equipment.includes((option.textContent?.trim() || '') as never));
          if (target) setNativeSelectValue(equipmentSelect, target.value);
        }

        activeChecklistCategory = category.id;
        window.requestAnimationFrame(syncNewOrderChecklist);
      });
    }

    const active = activeChecklistCategory === category.id;
    const selectedCount = active && selectedCategory?.id === category.id
      ? checks.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked').length
      : 0;
    button.classList.toggle('active', active);
    button.setAttribute('aria-expanded', active ? 'true' : 'false');
    button.textContent = `${category.label}${selectedCount ? ` (${selectedCount})` : ''}`;
  });

  const showItems = Boolean(activeChecklistCategory && selectedCategory?.id === activeChecklistCategory);
  checks.querySelectorAll<HTMLElement>(':scope > label').forEach((label) => {
    label.hidden = !showItems;
  });

  const empty = checks.querySelector<HTMLParagraphElement>(':scope > p');
  if (empty) {
    empty.textContent = selectedName
      ? 'Escolha uma das categorias acima para ver os itens.'
      : 'Escolha uma categoria acima. O checklist é opcional.';
  }
}

function syncSettingsAccess() {
  syncDecorativeAccessibility();
  syncPostSaleScope();
  removeChecklistSettingsEditor();
  syncOrderSettingsSubtabs();
  syncNewOrderChecklist();

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

  const orderTab = target?.closest<HTMLButtonElement>('.arl-order-subtab');
  if (orderTab?.dataset.orderSubtab) {
    document.documentElement.dataset.arlOrderSubtab = orderTab.dataset.orderSubtab;
    syncOrderSubtabState();
    return;
  }

  if (target?.closest('.arl-settings-tab')) {
    window.requestAnimationFrame(() => {
      removeChecklistSettingsEditor();
      syncOrderSettingsSubtabs();
      window.requestAnimationFrame(syncSettingsEditorHeights);
    });
  }
});

document.addEventListener('input', (event) => {
  const area = event.target instanceof HTMLTextAreaElement ? event.target : null;
  if (area?.matches('textarea[data-arl-document-editor], .arl-opening-message-panel textarea, .report-settings textarea')) {
    autoSizeTextarea(area);
  }
});

document.addEventListener('change', (event) => {
  if (event.target === newOrderEquipmentSelect()) window.requestAnimationFrame(syncNewOrderChecklist);
  if (event.target instanceof HTMLInputElement && event.target.matches('.arl-checklist-enhanced input[type="checkbox"]')) {
    window.requestAnimationFrame(syncNewOrderChecklist);
  }
});

const observer = new MutationObserver(() => window.requestAnimationFrame(syncSettingsAccess));
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', syncSettingsAccess);
syncSettingsAccess();
