import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingTotalInCents } from '../../resources/js/expense-quick-payment-total.ts';

const item = (month_remaining_cents) => ({ month_remaining_cents });

test('Fixo da Casa: soma apenas o pendente do grupo em centavos (25+45+37 reais)', () => {
  assert.equal(pendingTotalInCents([item(2500), item(4500), item(3700)]), 10700);
});

test('Cartão com nova compra: soma saldo pós-pagamento parcial e nova fatura', () => {
  // API já entrega o restante de cada dívida/compra, não o valor original.
  assert.equal(pendingTotalInCents([item(0), item(3990), item(1255), item(695)]), 5940);
});

test('Contas quitadas ou com crédito excedente não aumentam nem diminuem o total', () => {
  assert.equal(pendingTotalInCents([item(0), item(-500), item(1599)]), 1599);
});

test('Grupos independentes não são combinados', () => {
  const fixoCasa = [item(2500), item(4500), item(3700)];
  const mercadoPago = [item(9981)];
  const nubankCroma = [item(2636), item(1048)];
  assert.equal(pendingTotalInCents(fixoCasa), 10700);
  assert.equal(pendingTotalInCents(mercadoPago), 9981);
  assert.equal(pendingTotalInCents(nubankCroma), 3684);
});

test('Sem contas pendentes, o subtotal matemático é zero', () => {
  assert.equal(pendingTotalInCents([]), 0);
});
