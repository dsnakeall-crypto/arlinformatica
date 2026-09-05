export {};

const statusIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/><circle cx="18" cy="17" r="2"/></svg>';

const checklistCategoryEquipment: Record<string, { preferred: string; accepted: string[] }> = {
  notebooks: { preferred: 'Notebook', accepted: ['Notebook', 'Mac Apple'] },
  computers: { preferred: 'Computador', accepted: ['Computador'] },
  tablets: { preferred: 'Tablet', accepted: ['Tablet', 'iPad'] },
  printers: { preferred: 'Impressora', accepted: ['Impressora'] },
};
let pendingChecklistCategory: string | null = null;

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

function newOrderEquipmentSelect() {
  const form = document.querySelector<HTMLFormElement>('form.os-form');
  if (!form) return null;
  return Array.from(form.querySelectorAll<HTMLSelectElement>('select')).find((item) => {
    const label = item.closest('label');
    return label?.querySelector(':scope > span')?.textContent?.trim().startsWith('Equipamento');
  }) ?? null;
}

function applyChecklistCategory(categoryId: string) {
  const category = checklistCategoryEquipment[categoryId];
  const select = newOrderEquipmentSelect();
  if (!category || !select) return false;

  const selectedName = select.selectedOptions[0]?.textContent?.trim() || '';
  if (category.accepted.includes(selectedName)) {
    const search = select.closest('label')?.querySelector<HTMLInputElement>('.arl-deep-catalog-input');
    if (search) {
      search.value = selectedName;
      search.setCustomValidity('');
    }
    return true;
  }

  const target = Array.from(select.options).find((option) => option.textContent?.trim() === category.preferred)
    || Array.from(select.options).find((option) => category.accepted.includes(option.textContent?.trim() || ''));
  if (!target) return false;

  select.closest('form')
    ?.querySelectorAll<HTMLInputElement>('.checks input[type="checkbox"]:checked')
    .forEach((checkbox) => checkbox.click());

  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(select, target.value);
  else select.value = target.value;

  const search = select.closest('label')?.querySelector<HTMLInputElement>('.arl-deep-catalog-input');
  if (search) {
    search.value = target.textContent?.trim() || category.preferred;
    search.setCustomValidity('');
  }

  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function syncChecklistEquipmentBeforeCategoryClick(event: MouseEvent) {
  const button = event.target instanceof Element
    ? event.target.closest<HTMLButtonElement>('.arl-checklist-category')
    : null;
  const categoryId = button?.dataset.checklistCategory || '';
  if (!button || !checklistCategoryEquipment[categoryId]) return;

  pendingChecklistCategory = categoryId;
  if (applyChecklistCategory(categoryId)) pendingChecklistCategory = null;
}

function syncPendingChecklistEquipment() {
  if (!pendingChecklistCategory) return;
  if (!document.querySelector('form.os-form')) {
    pendingChecklistCategory = null;
    return;
  }
  if (applyChecklistCategory(pendingChecklistCategory)) pendingChecklistCategory = null;
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
    syncPendingChecklistEquipment();
  });
}

document.addEventListener('click', syncChecklistEquipmentBeforeCategoryClick, { capture: true });
new MutationObserver(scheduleSync).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', scheduleSync);
scheduleSync();
