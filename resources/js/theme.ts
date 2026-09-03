type Theme = {
  theme_primary: string;
  theme_sidebar: string;
  theme_accent: string;
};

const defaultTheme: Theme = {
  theme_primary: '#087443',
  theme_sidebar: '#063B2D',
  theme_accent: '#28BD65',
};

let currentTheme: Theme = { ...defaultTheme };

const safeHex = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : fallback;

const toRgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');

const mix = (hex: string, target: string, ratio: number) => {
  const a = toRgb(hex);
  const b = toRgb(target);
  return `#${toHex(a.r + (b.r - a.r) * ratio)}${toHex(a.g + (b.g - a.g) * ratio)}${toHex(a.b + (b.b - a.b) * ratio)}`.toUpperCase();
};

const luminance = (hex: string) => {
  const { r, g, b } = toRgb(hex);
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a: string, b: string) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const readableText = (background: string) =>
  contrast(background, '#FFFFFF') >= contrast(background, '#111827') ? '#FFFFFF' : '#111827';

const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

function normalizeTheme(input: Partial<Theme>): Theme {
  return {
    theme_primary: safeHex(input.theme_primary, defaultTheme.theme_primary),
    theme_sidebar: safeHex(input.theme_sidebar, defaultTheme.theme_sidebar),
    theme_accent: safeHex(input.theme_accent, defaultTheme.theme_accent),
  };
}

function applyTheme(input: Partial<Theme>) {
  currentTheme = normalizeTheme(input);
  const root = document.documentElement;
  const primary = currentTheme.theme_primary;
  const sidebar = currentTheme.theme_sidebar;
  const accent = currentTheme.theme_accent;

  root.style.setProperty('--arl-primary', primary);
  root.style.setProperty('--arl-primary-dark', mix(primary, '#000000', 0.18));
  root.style.setProperty('--arl-primary-soft', mix(primary, '#FFFFFF', 0.9));
  root.style.setProperty('--arl-primary-border', mix(primary, '#FFFFFF', 0.68));
  root.style.setProperty('--arl-primary-shadow', rgba(primary, 0.2));
  root.style.setProperty('--arl-on-primary', readableText(primary));
  root.style.setProperty('--arl-sidebar', sidebar);
  root.style.setProperty('--arl-sidebar-dark', mix(sidebar, '#000000', 0.28));
  root.style.setProperty('--arl-on-sidebar', readableText(sidebar));
  root.style.setProperty('--arl-accent', accent);
  root.style.setProperty('--arl-accent-soft', mix(accent, '#FFFFFF', 0.88));

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = sidebar;
  syncControls();
}

async function loadTheme() {
  try {
    const response = await fetch('/api/theme', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!response.ok) return applyTheme(defaultTheme);
    applyTheme(await response.json());
  } catch {
    applyTheme(defaultTheme);
  }
}

function valuesFromControls(): Theme {
  return normalizeTheme({
    theme_primary: (document.getElementById('theme-primary') as HTMLInputElement | null)?.value,
    theme_sidebar: (document.getElementById('theme-sidebar') as HTMLInputElement | null)?.value,
    theme_accent: (document.getElementById('theme-accent') as HTMLInputElement | null)?.value,
  });
}

function renderPreview(theme = valuesFromControls()) {
  const sidebar = document.querySelector<HTMLElement>('.theme-preview-sidebar');
  const button = document.querySelector<HTMLElement>('.theme-preview-button');
  const accent = document.querySelector<HTMLElement>('.theme-preview-accent');
  if (sidebar) {
    sidebar.style.background = `linear-gradient(155deg,${theme.theme_sidebar},${mix(theme.theme_sidebar, '#000000', 0.28)})`;
    sidebar.style.color = readableText(theme.theme_sidebar);
  }
  if (button) {
    button.style.background = theme.theme_primary;
    button.style.color = readableText(theme.theme_primary);
  }
  if (accent) {
    accent.style.background = theme.theme_accent;
    accent.setAttribute('aria-label', `Cor de destaque ${theme.theme_accent}`);
  }
}

function syncControls() {
  const mapping: Array<[string, keyof Theme]> = [
    ['theme-primary', 'theme_primary'],
    ['theme-sidebar', 'theme_sidebar'],
    ['theme-accent', 'theme_accent'],
  ];
  let found = false;
  mapping.forEach(([id, key]) => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) {
      input.value = currentTheme[key];
      found = true;
    }
  });
  if (found) renderPreview(currentTheme);
}

function status(message: string, kind: 'ok' | 'error' | '' = '') {
  const el = document.querySelector<HTMLElement>('.theme-status');
  if (!el) return;
  el.textContent = message;
  el.className = `theme-status${kind ? ` ${kind}` : ''}`;
}

async function saveTheme() {
  const button = document.querySelector<HTMLButtonElement>('.theme-save');
  if (button) button.disabled = true;
  status('Salvando cores…');
  try {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch('/api/theme', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
      body: JSON.stringify(valuesFromControls()),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Não foi possível salvar as cores.');
    applyTheme(body);
    status('Cores salvas para toda a empresa.', 'ok');
  } catch (error) {
    status(error instanceof Error ? error.message : 'Não foi possível salvar as cores.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

function injectThemeSettings() {
  if (document.getElementById('theme-settings')) return;
  const form = document.querySelector<HTMLFormElement>('form.settings-form');
  if (!form) return;
  const headings = Array.from(form.querySelectorAll('h2'));
  const identityHeading = headings.find((heading) => heading.textContent?.trim() === 'Identidade Visual');
  if (!identityHeading) return;
  const nextHeading = headings.find((heading) => identityHeading.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING);

  const section = document.createElement('section');
  section.id = 'theme-settings';
  section.className = 'theme-settings';
  section.innerHTML = `
    <h2>Cores do sistema</h2>
    <p>Paleta global da empresa. Ela é aplicada ao app e ao PDF A4 emitido a partir desta configuração. O layout continua sendo uma preferência local de cada dispositivo.</p>
    <div class="theme-color-grid">
      <label class="theme-color-control"><span>Cor principal</span><small>Botões, links e destaques</small><input id="theme-primary" type="color" aria-label="Cor principal do sistema"></label>
      <label class="theme-color-control"><span>Cor do menu</span><small>Barra lateral e navegação</small><input id="theme-sidebar" type="color" aria-label="Cor do menu do sistema"></label>
      <label class="theme-color-control"><span>Cor de destaque</span><small>Indicadores e detalhes</small><input id="theme-accent" type="color" aria-label="Cor de destaque do sistema"></label>
    </div>
    <div class="theme-preview" aria-label="Prévia das cores">
      <div class="theme-preview-sidebar">ARL Informática<br>Menu do sistema</div>
      <div class="theme-preview-main"><span class="theme-preview-button">Botão principal</span><span class="theme-preview-accent"></span><span>Prévia sem alterar o sistema até salvar.</span></div>
    </div>
    <div class="theme-actions">
      <button class="theme-reset" type="button">Restaurar padrão ARL</button>
      <button class="theme-save" type="button">Salvar cores</button>
      <span class="theme-status" aria-live="polite"></span>
    </div>`;
  form.insertBefore(section, nextHeading ?? null);

  section.querySelectorAll<HTMLInputElement>('input[type="color"]').forEach((input) => input.addEventListener('input', () => renderPreview()));
  section.querySelector<HTMLButtonElement>('.theme-reset')?.addEventListener('click', () => {
    (document.getElementById('theme-primary') as HTMLInputElement).value = defaultTheme.theme_primary;
    (document.getElementById('theme-sidebar') as HTMLInputElement).value = defaultTheme.theme_sidebar;
    (document.getElementById('theme-accent') as HTMLInputElement).value = defaultTheme.theme_accent;
    renderPreview(defaultTheme);
    status('Padrão ARL carregado na prévia. Clique em Salvar cores para aplicar.');
  });
  section.querySelector<HTMLButtonElement>('.theme-save')?.addEventListener('click', () => void saveTheme());
  syncControls();
}

const observer = new MutationObserver(() => injectThemeSettings());
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', () => injectThemeSettings());
void loadTheme();
