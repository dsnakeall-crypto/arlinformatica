export {};

declare global {
  interface Window {
    __arlManualEquipmentFetchInstalled?: boolean;
    __arlOrderDetailState?: any;
  }
}

const INTERNAL_EQUIPMENT = 'Informado manualmente';
const UI_ORDER_NUMBER_KEY = 'arl:ui-created-order-number';
const reactOrderDetailActive = () => Boolean(document.querySelector('[data-arl-order-detail-react="1"]'));

function nativeSetSelect(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(select, value);
  else select.value = value;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function equipmentSelect(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll<HTMLSelectElement>('select')).find((select) => {
    const label = select.closest('label');
    return label?.querySelector(':scope > span')?.textContent?.trim().startsWith('Equipamento');
  }) ?? null;
}

function manufacturerSelect(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll<HTMLSelectElement>('select')).find((select) => {
    const label = select.closest('label');
    return label?.querySelector(':scope > span')?.textContent?.trim().startsWith('Fabricante');
  }) ?? null;
}

function installStyles() {
  if (document.getElementById('arl-manual-equipment-style')) return;
  const style = document.createElement('style');
  style.id = 'arl-manual-equipment-style';
  style.textContent = `
    .arl-manual-equipment-field{display:grid;gap:7px;margin:2px 0 10px}
    .arl-manual-equipment-field>span{font-size:12px;font-weight:800;color:#4e535d}
    .arl-manual-equipment-field input{width:100%;min-height:44px;border:1px solid #d9dade;border-radius:10px;background:#fff;padding:9px 11px;font:inherit;outline:none}
    .arl-manual-equipment-field input:focus{border-color:#c9001c;box-shadow:0 0 0 3px rgba(201,0,28,.09)}
    .arl-manual-equipment-help{margin:-3px 0 9px;color:#737985;font-size:11px;line-height:1.45}
    .arl-manual-equipment-detail p{white-space:pre-wrap}
    @media(max-width:760px){.arl-manual-equipment-field input{font-size:16px}}
  `;
  document.head.append(style);
}

function installManualField() {
  const form = document.querySelector<HTMLFormElement>('form.os-form');
  if (!form) return;

  const section = Array.from(form.querySelectorAll<HTMLElement>('section')).find(
    (item) => item.querySelector('h2')?.textContent?.includes('Dados do equipamento'),
  );
  if (!section) return;

  const typeSelect = equipmentSelect(form);
  const makerSelect = manufacturerSelect(form);

  for (const select of [typeSelect, makerSelect]) {
    if (!select) continue;
    const label = select.closest<HTMLElement>('label');
    if (label) {
      label.hidden = true;
      label.style.display = 'none';
      label.setAttribute('aria-hidden', 'true');
      label.querySelectorAll<HTMLInputElement>('.arl-deep-catalog-input').forEach((input) => {
        input.required = false;
        input.disabled = true;
      });
    }
    select.required = false;
  }

  if (makerSelect) nativeSetSelect(makerSelect, '');

  if (typeSelect) {
    const manualOption = Array.from(typeSelect.options).find(
      (option) => option.textContent?.trim() === INTERNAL_EQUIPMENT,
    );
    if (manualOption) {
      nativeSetSelect(typeSelect, manualOption.value);
      form.dataset.arlManualEquipmentInitialized = '1';
    }
  }

  let field = section.querySelector<HTMLLabelElement>('.arl-manual-equipment-field');
  const fieldIsReady = form.dataset.arlManualEquipmentInitialized === '1'
    && field?.querySelector<HTMLInputElement>('[data-arl-equipment-description]')?.required === true;
  if (fieldIsReady) return;

  if (!field) {
    field = document.createElement('label');
    field.className = 'field arl-manual-equipment-field';
    field.innerHTML = '<span>Equipamento / Modelo / Acessórios *</span><input type="text" maxlength="500" required autocomplete="off" data-arl-equipment-description placeholder="Ex.: Notebook Dell Inspiron 15 + carregador">';
    const formGrid = section.querySelector('.form-grid');
    if (formGrid) formGrid.before(field);
    else section.querySelector('h2')?.insertAdjacentElement('afterend', field);

    const help = document.createElement('p');
    help.className = 'arl-manual-equipment-help';
    help.textContent = 'Digite livremente tudo que está entrando. O checklist abaixo continua opcional e independente deste texto.';
    field.after(help);
  }
}

function removeAutomaticCatalogEditors() {
  const settings = Array.from(document.querySelectorAll('h1')).some((heading) => heading.textContent?.trim() === 'Configurações');
  if (!settings) return;

  document.querySelectorAll<HTMLElement>('.admin-list').forEach((card) => {
    const title = card.querySelector('h2')?.textContent?.trim();
    if (title === 'Equipamentos' || title === 'Fabricantes') {
      card.hidden = true;
      card.style.display = 'none';
      card.setAttribute('aria-hidden', 'true');
    }
  });
  document.querySelector('.arl-order-subtabs')?.remove();
}

function normalizeChecklistLabels() {
  document.querySelectorAll<HTMLElement>('.arl-checklist-enhanced .checks > label').forEach((label) => {
    Array.from(label.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === '0') node.remove();
    });
  });
}

function cleanupUnexpectedOpeningModal() {
  const modal = document.querySelector<HTMLElement>('.arl-od-modal');
  const heading = modal?.querySelector('h2')?.textContent?.trim() || '';
  const match = heading.match(/^OS #(\d+) aberta$/);
  if (!modal || !match) return;

  const uiNumber = sessionStorage.getItem(UI_ORDER_NUMBER_KEY);
  if (uiNumber !== match[1]) modal.remove();
}

function syncOrderDetailDescription() {
  if (reactOrderDetailActive()) return;
  const order = window.__arlOrderDetailState;
  if (!order?.equipment_description) {
    document.querySelector('.arl-manual-equipment-detail')?.remove();
    return;
  }

  const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.trim() === `OS #${order.number}`);
  const grid = document.querySelector<HTMLElement>('.detail-grid');
  if (!heading || !grid) return;

  let panel = grid.querySelector<HTMLElement>('.arl-manual-equipment-detail');
  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'arl-manual-equipment-detail';
    panel.innerHTML = '<h2>Equipamento / Modelo / Acessórios</h2><p></p>';
    const client = Array.from(grid.querySelectorAll<HTMLElement>(':scope > section')).find(
      (item) => item.querySelector('h2')?.textContent?.trim() === 'Cliente',
    );
    if (client) client.after(panel);
    else grid.prepend(panel);
  }
  panel.querySelector('p')!.textContent = String(order.equipment_description);
}

function installFetch() {
  if (window.__arlManualEquipmentFetchInstalled) return;
  window.__arlManualEquipmentFetchInstalled = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw, location.origin);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    let nextInit = init;
    let uiCreate = false;

    if (url.origin === location.origin && url.pathname === '/api/orders' && method === 'POST' && typeof init?.body === 'string') {
      try {
        const payload = JSON.parse(init.body || '{}');
        const form = document.querySelector<HTMLFormElement>('form.os-form');
        const manual = form?.querySelector<HTMLInputElement>('[data-arl-equipment-description]');
        if (form && manual) {
          const description = manual.value.trim();
          if (description) {
            payload.equipment_description = description;
            uiCreate = true;
          }
          if (!payload.equipment_type_id) {
            const select = equipmentSelect(form);
            if (select?.value) payload.equipment_type_id = Number(select.value);
          }
          payload.manufacturer_id = null;
          nextInit = { ...init, body: JSON.stringify(payload) };
        }
      } catch {
      }
    }

    const response = await nativeFetch(input, nextInit);
    if (uiCreate && response.ok) {
      void response.clone().json().then((order) => {
        if (order?.number) sessionStorage.setItem(UI_ORDER_NUMBER_KEY, String(order.number));
      }).catch(() => undefined);
    }
    return response;
  };
}

let queued = false;
const observer = new MutationObserver(scheduleSync);

function observe() {
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function scheduleSync() {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(() => {
    queued = false;
    observer.disconnect();
    try {
      installStyles();
      installManualField();
      removeAutomaticCatalogEditors();
      normalizeChecklistLabels();
      cleanupUnexpectedOpeningModal();
      syncOrderDetailDescription();
    } finally {
      observe();
    }
  });
}

installFetch();
observe();
document.addEventListener('DOMContentLoaded', scheduleSync);
window.addEventListener('arl:order-detail', scheduleSync);
scheduleSync();
