import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpensePhoto } from '../../resources/js/expense-photo-parser.ts';

test('extrai compras, não confunde data com parcela e ignora pagamentos/totais', () => {
  const { purchases, ignored_lines } = parseExpensePhoto('10/08 LOJA GELADEIRA 03/10 R$ 120,50\n15/09 MERCADO CENTRAL R$ 89,90\nTOTAL R$ 210,40\nPagamento recebido - R$ 100,00\nESTORNO LOJA R$ 30,00');
  assert.equal(purchases.length, 2);
  assert.deepEqual([purchases[0].name, purchases[0].amount_cents, purchases[0].first_number, purchases[0].installment_count, purchases[0].purchased_on], ['LOJA GELADEIRA', 12050, 3, 10, '10/08']);
  assert.equal(purchases[1].installment_count, 1);
  assert.equal(purchases[1].amount_cents, 8990);
  assert.equal(ignored_lines, 3);
});
test('aceita parcela após o valor, de e descrição quebrada em duas linhas', () => {
  const { purchases } = parseExpensePhoto('01/09/2026 LOJA ELETRONICOS\nR$ 1.234,56 parcela 2 de 12\nLOJA MOVEIS R$ 99,99 4/10');
  assert.equal(purchases.length, 2);
  assert.equal(purchases[0].name, 'LOJA ELETRONICOS');
  assert.equal(purchases[0].amount_cents, 123456);
  assert.equal(purchases[0].first_number, 2);
  assert.equal(purchases[0].installment_count, 12);
  assert.equal(purchases[1].first_number, 4);
});
test('sinaliza duplicata sem descartá-la e não confunde compras de datas distintas', () => {
  const { purchases } = parseExpensePhoto('01/09 MERCADO R$ 10,00\n01/09 MERCADO R$ 10,00\n02/09 MERCADO R$ 10,00');
  assert.deepEqual(purchases.map(p => p.duplicate), [false, true, false]);
});
test('valores negativos, zero e linhas sem descrição não viram dívidas', () => {
  assert.equal(parseExpensePhoto('LOJA - R$ 20,00\nLOJA R$ 0,00\nR$ 30,00\nLOJA R$ 10,00-').purchases.length, 0);
});
test('parcelas inválidas e múltiplos valores exigem correção visível', () => {
  const { purchases } = parseExpensePhoto('LOJA 5/3 R$ 100,00\nLOJA ORIGINAL R$ 500,00 R$ 50,00');
  assert.ok(purchases[0].warnings.some(w => w.includes('corrigida')));
  assert.ok(purchases[1].warnings.some(w => w.includes('Mais de um valor')));
  assert.equal(purchases[1].amount_cents, 5000);
});
