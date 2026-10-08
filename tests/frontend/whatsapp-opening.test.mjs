import assert from 'node:assert/strict';
import test from 'node:test';
import { reserveOpeningWindow, openCreatedOrderMessage, finalMessageValue } from '../../resources/js/whatsapp-opening-flow.ts';

test('WhatsApp só abre após criação confirmada; bloqueio fornece alternativa e desativação fecha reserva', () => {
  const previous = globalThis.window;
  let opened = 0, closed = 0, destination;
  const target = { opener: {}, document: { title: '', body: {} }, closed: false, close() { closed++; }, location: { replace(url) { destination = url; } } };
  globalThis.window = { open() { opened++; return target; } };
  try {
    assert.equal(reserveOpeningWindow(false), null);
    assert.equal(opened, 0);
    const reserved = reserveOpeningWindow(true);
    assert.equal(target.opener, null);
    openCreatedOrderMessage({ auto_open: false, url: 'https://wa.me/5535999999999' }, reserved);
    assert.equal(closed, 1);
    assert.equal(destination, undefined);
    openCreatedOrderMessage({ auto_open: true, url: 'https://wa.me/5535999999999?text=teste' }, target);
    assert.equal(destination, 'https://wa.me/5535999999999?text=teste');
    globalThis.window.open = () => null;
    assert.equal(openCreatedOrderMessage({ auto_open: true, url: 'https://wa.me/5535999999999' }, null), 'https://wa.me/5535999999999');
    assert.equal(openCreatedOrderMessage({ auto_open: true, url: 'https://evil.example/' }, null), undefined);
  } finally { globalThis.window = previous; }
});

test('Mensagem final identifica somente quitação confirmada, em negrito entre parênteses', () => {
  assert.equal(finalMessageValue('R$ 80,00', true), '- Valor: R$ 80,00 *(PGTO Já Realizado)*');
  assert.equal(finalMessageValue('R$ 80,00', false), '- Valor: R$ 80,00');
});
