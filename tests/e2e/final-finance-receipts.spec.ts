import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { api, login } from './helpers';

test('pacote financeiro: instituição/modalidade, falha de PDF e reemissão não repetem pagamento', async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const bankName = 'Banco final ' + stamp;
  const typeName = 'Cartão final ' + stamp;
  const bank = await api(page, '/expense-control/catalogs/institutions', 'POST', { name: bankName, active: true, due_day: 12, color: '#123456' });
  const type = await api(page, '/expense-control/catalogs/types', 'POST', { name: typeName, active: true });
  const loan = await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Empréstimo final ' + stamp, active: true });
  const month = new Date().toLocaleDateString('sv-SE').slice(0, 7);
  const debts: any[] = [];
  for (const [responsibility, amount, kind] of [['one', 5000, type.body.id], ['shared', 10000, type.body.id], ['one', 50000, loan.body.id]]) {
    const created = await api(page, '/expense-control/debts', 'POST', { request_key: crypto.randomUUID(), institution_id: bank.body.id, type_id: kind,
      name: 'Compra final ' + responsibility + kind + stamp, recurrence: 'installments', responsibility, percent_one: 50,
      amount_cents: amount, installment_count: 2, first_number: 1, start_month: month, due_day: 12 });
    expect(created.status).toBe(201); debts.push(created.body);
  }
  let writes = 0;
  page.on('request', request => { if (request.url().endsWith('/institution-payments') && request.method() === 'POST' && !request.postDataJSON()?.preview) writes++; });
  await page.goto('/expense-control');
  await page.getByRole('button', { name: 'Pagamento rápido de Allan', exact: true }).click();
  await page.getByRole('button', { name: 'Quitar fatura de ' + bankName + ' — ' + typeName + ' de Allan', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Quitar fatura da instituição' });
  await expect(dialog.getByText('R$ 100,00', { exact: true })).toBeVisible();
  await page.route('**/api/expense-control/operations/*/receipt', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'PDF indisponível no teste' }) }));
  await dialog.getByRole('button', { name: 'Confirmar quitação da instituição' }).dblclick();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Pagamento registrado.' })).toBeVisible();
  expect(writes).toBe(1);
  const personal = await api(page, '/expense-control/debts/' + debts[0].debt.id);
  const shared = await api(page, '/expense-control/debts/' + debts[1].debt.id);
  const otherType = await api(page, '/expense-control/debts/' + debts[2].debt.id);
  expect(personal.body.installments[0].remaining_one_cents).toBe(0);
  expect(shared.body.installments[0].remaining_two_cents).toBe(5000);
  expect(personal.body.installments[1].remaining_one_cents).toBe(5000);
  expect(otherType.body.entries).toHaveLength(0);
  await page.unroute('**/api/expense-control/operations/*/receipt');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Baixar comprovante #/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^comprovante-arl-operacao-\d+\.pdf$/);
  expect(writes).toBe(1);
  mkdirSync('output/final-financeiro-20261013', { recursive: true });
  await page.screenshot({ path: 'output/final-financeiro-20261013/resumo-desktop.png', fullPage: true });
});
