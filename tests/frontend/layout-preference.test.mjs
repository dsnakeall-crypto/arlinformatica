import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLayoutMode, isHandheldDevice } from '../../resources/js/layout-preference.ts';

test('o Web/PC escolhido continua Web ao minimizar ou redimensionar para 390px', () => {
  const desktopAgent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/154.0';
  assert.equal(resolveLayoutMode('desktop',desktopAgent,false),'desktop');
  assert.equal(resolveLayoutMode('desktop',desktopAgent,true),'desktop');
});
test('o mobile escolhido num computador continua mobile em monitor grande', () => {
  assert.equal(resolveLayoutMode('mobile','Mozilla/5.0 (Windows NT 10.0; Win64; x64)',false),'mobile');
});
test('novo navegador preserva escolha inicial automática mas a grava uma única vez', () => {
  const agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
  assert.equal(resolveLayoutMode(null,agent,true),'mobile');
  assert.equal(resolveLayoutMode(null,agent,false),'desktop');
});
test('celular/tablet real recebe mobile independentemente de preferência anterior', () => {
  const mobile='Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36';
  assert.equal(isHandheldDevice(mobile),true);
  assert.equal(resolveLayoutMode('desktop',mobile,false),'mobile');
  assert.equal(resolveLayoutMode('desktop','Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X)',false),'mobile');
});
