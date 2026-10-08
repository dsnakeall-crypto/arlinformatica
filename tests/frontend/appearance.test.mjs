import test from 'node:test';
import assert from 'node:assert/strict';
import { appearanceColors, normalizeAppearance } from '../../resources/js/appearance-preference.ts';

test('aparência rejeita preferências inválidas e preserva original como padrão', () => {
  for (const value of [null, undefined, '', { mode: 'invalid', color: '__proto__' }, { color: 'constructor' }]) {
    assert.deepEqual(normalizeAppearance(value), { mode: 'original', color: 'blue' });
  }
  assert.deepEqual(normalizeAppearance({ mode: 'clean', color: 'purple' }), { mode: 'clean', color: 'purple' });
});

test('sete paletas têm contraste AA para o texto dos botões', () => {
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  assert.equal(Object.keys(appearanceColors).length, 7);
  for (const palette of Object.values(appearanceColors)) {
    const values = [luminance(palette.accent), luminance(palette.ink)].sort((a, b) => a - b);
    assert.ok((values[1] + .05) / (values[0] + .05) >= 4.5, palette.label);
  }
});
