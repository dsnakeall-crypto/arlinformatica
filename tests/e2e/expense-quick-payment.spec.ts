import { quickPaymentScenario } from './expense-quick-payment-scenario';
quickPaymentScenario();

import { test, expect } from '@playwright/test';
import { api, login, openExpenseSection } from './helpers';

test('pagamento rápido: duplo clique e resposta perdida não duplicam o pagamento na retentativa', async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const bank = await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'Retry bank ' + stamp, active: true, due_day: 12, color: '#123456' });
  const type = await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Retry type ' + stamp, active: true });
  expect(bank.status).toBe(200); expect(type.status).toBe(200);
  const month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const name = 'Retry debt ' + stamp;
  const created = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.body.id, type_id: type.body.id, name,
    recurrence: 'once', responsibility: 'shared', percent_one: 70, amount_cents: 10000, installment_count: 1, first_number: 1, start_month: month, due_day: 12, notes: null });
  expect(created.status).toBe(201);
  const id = created.body.debt.id;
  await page.goto('/expense-control'); await page.mouse.move(1250, 10); await openExpenseSection(page, 'Resumo');
  await page.getByRole('button', { name: 'Pagamento rápido de Allan', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Pagamento rápido de Allan' });
  await dialog.getByRole('button').filter({ hasText: name }).click();
  await dialog.getByRole('button', { name: 'Conferir distribuição', exact: true }).click();
  const writes: any[] = [];
  let replayed = false;
  await page.route('**/api/expense-control/debts/' + id + '/person-payment', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    writes.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    const result = await response.json();
    if (writes.length === 1) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Resposta de confirmação perdida após gravar (fixture)' }) });
    else { replayed = result.replayed === true; await route.fulfill({ response }); }
  });
  await dialog.getByRole('button', { name: 'Confirmar pagamento', exact: true }).dblclick();
  await expect(dialog.getByRole('alert')).toContainText('Resposta de confirmação perdida');
  expect(writes).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Confirmar pagamento', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]); expect(replayed).toBe(true);
  const detail = await api(page, '/expense-control/debts/' + id);
  expect(detail.body.entries).toHaveLength(1);
  expect(detail.body.installments[0].remaining_one_cents).toBe(0);
  expect(detail.body.installments[0].remaining_two_cents).toBe(3000);
});
