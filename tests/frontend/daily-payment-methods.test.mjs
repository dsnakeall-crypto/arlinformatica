import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyPaymentMethods } from '../../resources/js/daily-payment-methods.ts';

test('daily receipts preserve cents and exclude outflows, refunds and expenses', () => {
  assert.deepEqual(dailyPaymentMethods([
    { method: 'cash', effective_cents: 1234, kind: 'service_order' },
    { method: 'cash', effective_cents: 6, kind: 'service_order' },
    { method: 'pix', effective_cents: 3000, kind: 'service_order' },
    { method: 'pix', effective_cents: -500, kind: 'refund' },
    { effective_cents: 900, kind: 'quick_entry' },
    { method: 'unknown', effective_cents: 100, kind: 'quick_entry' },
    { method: 'cash', effective_cents: -200, kind: 'expense' },
  ]), { cash: 1240, pix: 3000, credit: 0, debit: 0, transfer: 0, other: 1000 });
});
