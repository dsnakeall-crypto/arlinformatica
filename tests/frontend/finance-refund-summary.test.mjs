import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonthlyRefundNote, OrderPaymentFigures } from '../../resources/js/finance-refund-summary.ts';

const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test('linha complementar mostra estorno e líquido sem substituir o bruto', () => {
  assert.equal(render(MonthlyRefundNote, { received: 13000, refunded: 1890 }),
    '<small>menos R$ 18,90 em estornos · líquido R$ 111,10</small>');
  assert.equal(render(MonthlyRefundNote, { received: 13000, refunded: 0 }), '');
  assert.equal(render(MonthlyRefundNote, { received: 0, refunded: 1890 }),
    '<small>menos R$ 18,90 em estornos · líquido R$ -18,90</small>');
});

test('OS estornada preserva o cobrado, mostra líquido e devolução sem afirmar quitação', () => {
  const html = render(OrderPaymentFigures, {
    summary: { total_cents: 13000, paid_cents: 11110, balance_cents: 1890, collectible_balance_cents: 0, refunded_cents: 1890, status: 'partial' },
  });
  assert.match(html, /Total da OS<\/small><strong>R\$ 130,00/);
  assert.match(html, /Estornado: R\$ 18,90/);
  assert.match(html, /Total pago<\/small><strong>R\$ 111,10/);
  assert.match(html, /Diferença após estorno<\/small><strong>R\$ 18,90/);
  assert.match(html, /Saldo a cobrar: R\$ 0,00/);
  assert.doesNotMatch(html, /Pago integralmente|Saldo zerado|ainda faltam/);
});

test('OS sem estorno conserva a mensagem de quitação', () => {
  const html = render(OrderPaymentFigures, {
    summary: { total_cents: 13000, paid_cents: 13000, balance_cents: 0, collectible_balance_cents: 0, refunded_cents: 0, status: 'paid' },
  });
  assert.match(html, /Pago integralmente/);
  assert.doesNotMatch(html, /Estornado|Diferença após estorno/);
});
