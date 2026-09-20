import { createElement as h, Fragment } from 'react';

const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

type PaymentTotals = {
  total_cents: number;
  paid_cents: number;
  balance_cents: number;
  collectible_balance_cents: number;
  refunded_cents: number;
  status: 'unpaid' | 'partial' | 'paid';
};

export function OrderPaymentFigures({ summary }: { summary: PaymentTotals }) {
  const refunded = summary.refunded_cents > 0;
  return h(Fragment, null,
    h('div', { className: 'finance-cards' },
      h('article', null, h('small', null, 'Total da OS'), h('strong', null, money(summary.total_cents)),
        refunded ? h('small', null, `Estornado: ${money(summary.refunded_cents)}`) : null),
      h('article', null, h('small', null, 'Total pago'), h('strong', null, money(summary.paid_cents))),
      h('article', null, h('small', null, refunded ? 'Diferença após estorno' : 'Falta pagar'), h('strong', null, money(summary.balance_cents)))),
    refunded
      ? h('div', { className: 'notice' }, h('b', null, 'Estorno registrado'),
        ` · devolvido ${money(summary.refunded_cents)}. O estorno não gera nova cobrança. Saldo a cobrar: ${money(summary.collectible_balance_cents)}.`)
      : summary.status === 'paid'
        ? h('div', { className: 'payment-ok' }, h('b', null, 'Pago integralmente'), h('span', null, 'Saldo zerado.'))
        : summary.status === 'partial'
          ? h('div', { className: 'notice' }, h('b', null, 'Pagamento parcial'), ` · ainda faltam ${money(summary.balance_cents)}.`)
          : h('p', null, 'Pagamento ainda não registrado.'));
}

export function MonthlyRefundNote({ received, refunded }: { received: number; refunded: number }) {
  return refunded > 0
    ? h('small', null, `menos ${money(refunded)} em estornos · líquido ${money(received - refunded)}`)
    : null;
}
