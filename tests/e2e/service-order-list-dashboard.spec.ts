import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('lista por abas e painel compartilham tabela operacional', async ({ page }) => {
  await login(page);
  const client = await api(page, '/clients', 'POST', {
    name: 'Cliente Lista Bloco Quatro', document: uniqueDocument(), phone: '35999999999',
    postal_code: '37160000', street: 'Rua do Mapa', number: '40', district: 'Centro', city: 'Campos Gerais', state: 'MG',
  });
  expect(client.status).toBe(201);
  const equipment = await api(page, '/catalogs/equipment');
  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id, equipment_type_id: equipment.body[0].id, attendance_type: 'bench',
    reported_problem: 'Validar lista operacional', checklist: [],
  });
  expect(order.status).toBe(201);

  await page.goto('/orders');
  const list = page.locator('.orders-panel');
  await expect(list.getByRole('tab', { name: 'Todas' })).toHaveAttribute('aria-selected', 'true');
  await expect(list.getByText('Cliente Lista Bloco Quatro', { exact: true })).toBeVisible();
  await expect(list.getByText('VALOR', { exact: true })).toHaveCount(0);
  const status = list.getByLabel(`Status da OS ${order.body.number}`);
  await expect(status.locator('option[value="completed"]')).toHaveCount(0);
  await expect(status.locator('option[value="paid"]')).toHaveCount(0);
  await status.selectOption('interrupted');
  const modal = page.getByRole('dialog', { name: 'Interromper OS' });
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Salvar interrupção' }).click();
  await expect(modal.getByText('Informe o motivo da interrupção.')).toBeVisible();
  await modal.getByLabel('Motivo da interrupção *').fill('Cliente pediu para aguardar autorização.');
  await modal.getByRole('button', { name: 'Salvar interrupção' }).click();
  await expect(modal).toHaveCount(0);
  await list.getByRole('tab', { name: 'Interrompidas' }).click();
  await expect(list.getByText('Cliente Lista Bloco Quatro', { exact: true })).toBeVisible();
  await expect(list.getByText(/Mostrando 1–\d+ de \d+/)).toBeVisible();

  await page.goto('/');
  const dashboard = page.locator('.dashboard-orders');
  await expect(dashboard.getByText('Cliente Lista Bloco Quatro', { exact: true })).toBeVisible();
  await expect(dashboard.locator('.service-orders-pagination')).toHaveCount(0);
  await dashboard.getByRole('button', { name: 'Ver todas' }).click();
  await expect(page).toHaveURL(/\/orders$/);
});
