import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FinanceDate } from '../../resources/js/finance-date.ts';

const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test('Lançamentos do mês renderiza timestamp SQL UTC em São Paulo sem acrescentar um segundo horário', () => {
  assert.equal(render(FinanceDate, { value: '2026-09-12 05:33:19' }),
    '<time dateTime="2026-09-12T05:33:19.000Z">12/09/2026, 02:33:19</time>');
});

test('timestamps ISO com Z e offset representam o mesmo instante no Financeiro', () => {
  const expected = '<time dateTime="2026-09-12T05:33:19.000Z">12/09/2026, 02:33:19</time>';
  for (const value of ['2026-09-12T05:33:19Z', '2026-09-12T02:33:19-03:00', '2026-09-12T05:33:19']) {
    assert.equal(render(FinanceDate, { value }), expected);
  }
});

test('instante UTC perto da meia-noite aparece no dia anterior em São Paulo', () => {
  assert.equal(render(FinanceDate, { value: '2026-10-01 02:30:00' }),
    '<time dateTime="2026-10-01T02:30:00.000Z">30/09/2026, 23:30:00</time>');
});

test('data civil da despesa permanece no dia escolhido sem inventar horário na tela', () => {
  assert.equal(render(FinanceDate, { value: '2026-09-12' }),
    '<time dateTime="2026-09-12T15:00:00.000Z">12/09/2026</time>');
});

