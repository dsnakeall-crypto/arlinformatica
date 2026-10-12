import { test, expect } from '@playwright/test';
import { api, login, openExpenseSection } from './helpers';

export function quickPaymentScenario(mobile = false) {
  test('pagamento rápido: mês, valor parcial, saldo total, CSRF e preservação da outra parte', async ({ page }) => {
    await login(page);
    const stamp = Date.now();
    const institution = await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Quick bank ' + stamp, active: true, due_day: 12, color: '#123456' });
    const type = await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Quick type ' + stamp, active: true });
    expect(institution.status).toBe(200); expect(type.status).toBe(200);
    const month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
    const name = 'Quick debt ' + stamp;
    const debt = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: institution.body.id, type_id: type.body.id,
      name, recurrence: 'installments', responsibility: 'shared', percent_one: 70, amount_cents: 10000, installment_count: 3, first_number: 1, start_month: month, due_day: 12, notes: null });
    expect(debt.status).toBe(201);
    const id = debt.body.debt.id;
    const path = '/expense-control/debts/' + id + '/person-payment';
    const preview = await api(page, path + '?' + new URLSearchParams({ target: 'one', action: 'month', month }));
    expect(preview.status).toBe(200);
    // APIRequestContext bypasses the application's fetch wrapper, which correctly injects CSRF.
    const csrf = await page.request.post('/api/expense-control/debts/' + id + '/person-payment', { data: {
      target: 'one', action: 'month', month, request_key: crypto.randomUUID(), amount_cents: preview.body.total_cents,
      preview_hash: preview.body.preview_hash, paid_by: 1, occurred_on: new Date().toLocaleDateString('sv-SE'),
    }, headers: { Accept: 'application/json' } });
    expect(csrf.status()).toBe(419);
    expect((await api(page, '/expense-control/debts/' + id)).body.entries).toHaveLength(0);
    await page.goto('/expense-control');
    if (!mobile) { await page.mouse.move(10, 10); await page.mouse.move(1250, 10); }
    await openExpenseSection(page, 'Resumo');
    const dialog = page.getByRole('dialog', { name: 'Pagamento rápido de Allan' });
    for (const [mode, input, total, outstanding] of [['Pagar fatura do mês', '', '70,00', 14000], ['Abater valor personalizado', '8000', '80,00', 6000], ['Quitar saldo total', '', '60,00', 0]] as const) {
      await page.getByRole('button', { name: 'Pagamento rápido de Allan', exact: true }).click();
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button').filter({ hasText: name }).click();
      await dialog.getByRole('button', { name: mode, exact: true }).click();
      if (input) await dialog.getByLabel('Valor a pagar (R$)').fill(input);
      await dialog.getByRole('button', { name: 'Conferir distribuição', exact: true }).click();
      await expect(dialog.getByRole('region', { name: 'Confira antes de pagar' }).locator(':scope > strong')).toContainText(total);
      await expect(dialog.getByText('Ficará pendente nesta parte:', { exact: false })).toContainText((outstanding / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
      await dialog.getByRole('button', { name: 'Confirmar pagamento', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      const detail = await api(page, '/expense-control/debts/' + id);
      expect(detail.body.installments.reduce((sum: number, item: any) => sum + item.remaining_one_cents, 0)).toBe(outstanding);
      expect(detail.body.installments.map((item: any) => item.remaining_two_cents)).toEqual([3000, 3000, 3000]);
      if (outstanding === 14000) expect(detail.body.installments[1].remaining_one_cents).toBe(7000);
      if (outstanding === 6000) expect(detail.body.installments[2].remaining_one_cents).toBe(6000);
    }
    const detail = await api(page, '/expense-control/debts/' + id);
    expect(detail.body.entries.reduce((sum: number, item: any) => sum + item.amount_cents, 0)).toBe(21000);
    expect(detail.body.entries.filter((item: any) => item.kind === 'discount')).toHaveLength(0);
    if (mobile) {
      const bottom = page.locator('.arl-expense-bottom');
      await expect(bottom).toBeVisible();
      const box = await bottom.boundingBox();
      expect(box!.y + box!.height).toBeCloseTo(page.viewportSize()!.height, 0);
    }
  });
}
