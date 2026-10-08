import '../css/clean-appearance.css';
import { appearanceColors, appearanceKey, normalizeAppearance, type AppearancePreference } from './appearance-preference';

function readAppearance(): AppearancePreference {
  try { return normalizeAppearance(JSON.parse(localStorage.getItem(appearanceKey) || 'null')); }
  catch { return normalizeAppearance(null); }
}

let preference = readAppearance();

function applyAppearance() {
  const root = document.documentElement;
  const color = appearanceColors[preference.color];
  root.dataset.arlAppearance = preference.mode;
  root.dataset.arlPalette = preference.color;
  root.style.setProperty('--clean-accent', color.accent);
  root.style.setProperty('--clean-soft', color.soft);
  root.style.setProperty('--clean-on-accent', color.ink);
}

export function getAppearance() { return preference; }

export function setAppearance(value: AppearancePreference): boolean {
  preference = normalizeAppearance(value);
  applyAppearance();
  let saved = true;
  try { localStorage.setItem(appearanceKey, JSON.stringify(preference)); }
  catch { saved = false; }
  window.dispatchEvent(new Event('arl-appearance-change'));
  return saved;
}

applyAppearance();
window.addEventListener('storage', event => {
  if (event.key !== appearanceKey && event.key !== null) return;
  preference = readAppearance();
  applyAppearance();
  window.dispatchEvent(new Event('arl-appearance-change'));
});
