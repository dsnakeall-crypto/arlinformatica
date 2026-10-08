import { useEffect, useState } from 'react';
import { appearanceColors, type AppearanceColor } from './appearance-preference';
import { getAppearance, setAppearance } from './appearance';

export default function AppearanceSettings() {
  const [value, update] = useState(getAppearance);
  const [warning, setWarning] = useState('');
  useEffect(() => {
    const sync = () => update(getAppearance());
    window.addEventListener('arl-appearance-change', sync);
    return () => window.removeEventListener('arl-appearance-change', sync);
  }, []);
  const change = (next: typeof value) => {
    setWarning(setAppearance(next) ? '' : 'A aparência foi aplicada, mas este navegador não permitiu salvar a preferência.');
  };
  return <fieldset className="appearance-settings">
    <legend>Aparência do aplicativo</legend>
    <p>Escolha o visual neste dispositivo. A mudança é imediata e mantém as funções e posições dos controles.</p>
    <div className="appearance-modes" role="group" aria-label="Estilo do aplicativo">
      <button type="button" aria-pressed={value.mode === 'original'} onClick={() => change({ ...value, mode: 'original' })}>Original</button>
      <button type="button" aria-pressed={value.mode === 'clean'} onClick={() => change({ ...value, mode: 'clean' })}>Clean</button>
    </div>
    <div className="appearance-colors" role="group" aria-label="Cor do visual Clean">
      {(Object.entries(appearanceColors) as [AppearanceColor, typeof appearanceColors[AppearanceColor]][]).map(([key, color]) =>
        <button type="button" key={key} aria-label={`Clean ${color.label}`} aria-pressed={value.mode === 'clean' && value.color === key} onClick={() => change({ mode: 'clean', color: key })}>
          <i aria-hidden="true" style={{ backgroundColor: color.accent }} />{color.label}
        </button>)}
    </div>
    <small>Salvo neste navegador. Impressões, PDFs e dados da empresa permanecem iguais.</small>
    {warning && <p role="status">{warning}</p>}
  </fieldset>;
}
