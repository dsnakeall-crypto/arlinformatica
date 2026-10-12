import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseNote } from '../../resources/js/expense-purchase-note.ts';

test('frases automáticas são ocultadas; observações manuais e valor armazenado são preservados', () => {
  const original = 'Importado por foto\nCadastro por foto. Dados conferidos pelo usuário. Observação manual preservada';
  assert.equal(purchaseNote(original), 'Observação manual preservada');
  assert.equal(original, 'Importado por foto\nCadastro por foto. Dados conferidos pelo usuário. Observação manual preservada');
  assert.equal(purchaseNote('A observação Importado por foto é manual.'), 'A observação Importado por foto é manual.');
  assert.equal(purchaseNote(null), '');
});
