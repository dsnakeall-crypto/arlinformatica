import '../css/new-order-search.css';

export {};

type CatalogKind = 'equipment' | 'manufacturer';

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/\s+/g, ' ')
  .trim();

function matchScore(label: string, rawQuery: string): number {
  const value = normalize(label);
  const query = normalize(rawQuery);
  if (!query) return 10;

  const tokens = query.split(' ').filter(Boolean);
  if (!tokens.every((token) => value.includes(token))) return Number.POSITIVE_INFINITY;

  if (value === query) return 0;
  if (value.startsWith(query)) return 1;
  if (value.split(/[^a-z0-9]+/).some((word) => word.startsWith(query))) return 2;
  if (value.includes(query)) return 3;

  return 4;
}

function catalogOptions(select: HTMLSelectElement, query: string) {
  return Array.from(select.options)
    .filter((option) => option.value !== '')
    .map((option, index) => ({ option, index, score: matchScore(option.textContent || '', query) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => a.score - b.score || a.option.text.localeCompare(b.option.text, 'pt-BR') || a.index - b.index)
    .slice(0, 40);
}

function selectedLabel(select: HTMLSelectElement): string {
  if (!select.value) return '';
  return select.selectedOptions[0]?.textContent?.trim() || '';
}

function installCatalogCombobox(label: HTMLLabelElement, kind: CatalogKind) {
  const select = label.querySelector<HTMLSelectElement>('select');
  if (!select) return;

  // React pode reaplicar required após uma renderização. A validação fica no campo visível.
  const required = kind === 'equipment';
  select.required = false;

  const existing = label.querySelector<HTMLInputElement>('.arl-deep-catalog-input');
  if (existing) {
    if (document.activeElement !== existing && select.value) existing.value = selectedLabel(select);
    return;
  }

  select.classList.add('arl-deep-native-select');
  select.setAttribute('aria-hidden', 'true');
  select.tabIndex = -1;

  const shell = document.createElement('div');
  shell.className = 'arl-deep-combobox';
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'arl-deep-catalog-input';
  input.autocomplete = 'off';
  input.required = required;
  input.placeholder = kind === 'equipment' ? 'Pesquisar equipamento…' : 'Pesquisar fabricante…';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');

  const results = document.createElement('div');
  results.className = 'arl-deep-catalog-results';
  results.setAttribute('role', 'listbox');
  results.hidden = true;

  shell.append(input, results);
  select.before(shell);
  input.value = selectedLabel(select);

  let activeIndex = -1;

  const close = () => {
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
  };

  const choose = (option: HTMLOptionElement) => {
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    input.value = option.textContent?.trim() || '';
    close();
  };

  const render = () => {
    const rows = catalogOptions(select, input.value);
    results.replaceChildren();
    activeIndex = -1;

    if (!rows.length) {
      const empty = document.createElement('span');
      empty.className = 'arl-deep-catalog-empty';
      empty.textContent = 'Nenhum resultado encontrado.';
      results.append(empty);
    } else {
      rows.forEach(({ option }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'arl-deep-catalog-option';
        button.setAttribute('role', 'option');
        button.textContent = option.textContent?.trim() || '';
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', () => choose(option));
        results.append(button);
      });
    }

    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('focus', render);
  input.addEventListener('input', () => {
    if (select.value) {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    render();
  });
  input.addEventListener('blur', () => window.setTimeout(close, 100));
  input.addEventListener('keydown', (event) => {
    const buttons = Array.from(results.querySelectorAll<HTMLButtonElement>('button'));
    if (!buttons.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(buttons.length - 1, activeIndex + 1);
      buttons.forEach((button, index) => button.classList.toggle('active', index === activeIndex));
      buttons[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      buttons.forEach((button, index) => button.classList.toggle('active', index === activeIndex));
      buttons[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && !results.hidden) {
      event.preventDefault();
      const target = buttons[activeIndex >= 0 ? activeIndex : 0];
      target?.click();
    } else if (event.key === 'Escape') {
      close();
    }
  });

  select.addEventListener('change', () => {
    if (select.value) input.value = selectedLabel(select);
  });
}

function installEquipmentSearch() {
  const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.includes('Abertura de Chamado'));
  if (!heading) return;

  document.querySelectorAll<HTMLLabelElement>('.os-form .field').forEach((label) => {
    const title = label.querySelector(':scope > span')?.textContent?.trim() || '';
    if (title.startsWith('Equipamento')) installCatalogCombobox(label, 'equipment');
    if (title.startsWith('Fabricante')) installCatalogCombobox(label, 'manufacturer');
  });
}

function installServiceSearch() {
  document.querySelectorAll<HTMLInputElement>('.arl-service-search input[type="search"]').forEach((input) => {
    if (input.dataset.arlDeepServiceSearch === '1') return;
    input.dataset.arlDeepServiceSearch = '1';
    input.placeholder = 'Pesquisar serviço ou produto…';

    input.addEventListener('input', (event) => {
      event.stopImmediatePropagation();
      const catalog = input.closest('section')?.querySelector<HTMLElement>('.opening-catalog');
      if (!catalog) return;

      const buttons = Array.from(catalog.querySelectorAll<HTMLButtonElement>('button'));
      buttons.forEach((button, index) => {
        if (!button.dataset.arlOriginalIndex) button.dataset.arlOriginalIndex = String(index);
      });

      const query = input.value.trim();
      const ranked = buttons
        .map((button) => ({ button, score: matchScore(button.textContent || '', query) }))
        .sort((a, b) => a.score - b.score || Number(a.button.dataset.arlOriginalIndex) - Number(b.button.dataset.arlOriginalIndex));

      ranked.forEach(({ button, score }) => {
        button.hidden = !Number.isFinite(score);
        catalog.append(button);
      });
    }, { capture: true });
  });
}

function installAll() {
  installEquipmentSearch();
  installServiceSearch();
}

const observer = new MutationObserver(() => window.requestAnimationFrame(installAll));
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', installAll);
installAll();
