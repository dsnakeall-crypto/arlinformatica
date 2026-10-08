export const appearanceColors = {
  blue: { label: 'Azul', accent: '#2457d6', soft: '#edf2ff', ink: '#ffffff' },
  green: { label: 'Verde', accent: '#137a50', soft: '#eaf6ef', ink: '#ffffff' },
  yellow: { label: 'Amarelo', accent: '#f0c541', soft: '#fff8df', ink: '#332900' },
  purple: { label: 'Roxo', accent: '#7444bf', soft: '#f3edfb', ink: '#ffffff' },
  red: { label: 'Vermelho', accent: '#bf3347', soft: '#fff0f2', ink: '#ffffff' },
  black: { label: 'Preto', accent: '#272d38', soft: '#edf0f4', ink: '#ffffff' },
  light: { label: 'Claro', accent: '#e8edf4', soft: '#f3f5f9', ink: '#27354b' },
} as const;

export type AppearanceColor = keyof typeof appearanceColors;
export type AppearancePreference = { mode: 'original' | 'clean'; color: AppearanceColor };
export const appearanceKey = 'arl-appearance-v1';

export function normalizeAppearance(value: unknown): AppearancePreference {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    mode: candidate.mode === 'clean' ? 'clean' : 'original',
    color: typeof candidate.color === 'string' && Object.hasOwn(appearanceColors, candidate.color)
      ? candidate.color as AppearanceColor : 'blue',
  };
}
