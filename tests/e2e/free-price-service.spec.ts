import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('serviço de preço livre permite informar o valor somente na OS', async ({ page }) => {
  await login(page);
  await page.locator('aside nav').getByRole('button', { name: 'Serviços', exact: true }).click();

  const name = `Serviço preço livre E2E ${Date.now()}`;
  await page.getByLabel('Nome ou descrição do serviço').fill(name);
  await page.getByLabel('Preço livre').check();
  await expect(page.getByLabel('Valor em R$')).toBeDisabled();
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();

  const row = page.locator('.services-row').filter({ hasText: name });
  await expect(row).toContainText('Preço livre');
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar serviço' });
  await expect(dialog.getByLabel('Preço livre')).toBeChecked();
  await expect(dialog.getByLabel('Valor (R$)')).toBeDisabled();
  await dialog.getByLabel('Fechar edição').click();

  const services = await api(page, '/catalogs/services');
  const service = services.body.find((item: any) => item.name === name);
  const equipment = await api(page, '/catalogs/equipment');
  const client = await api(page, '/clients', 'POST', {
    name: `Cliente Preço Livre ${Date.now()}`,
    document: uniqueDocument(),
    phone: '35999997777',
    street: 'Rua do Preço Livre',
  });
  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: equipment.body[0].id,
    attendance_type: 'bench',
    reported_problem: 'Validar serviço de preço livre',
    checklist: [],
    items: [],
  });
  expect(order.status).toBe(201);

  await page.goto(`/orders/${order.body.id}`);
  await page.getByLabel('Pesquisar Serviço / Produto', { exact: true }).fill(name);
  await page.getByRole('button', { name: `Adicionar ${name}`, exact: true }).click();
  const value = page.getByLabel(`Valor unitário de ${name}`);
  await expect(value).toBeEnabled();
  await value.fill('150,00');
  const saveResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/orders/${order.body.id}` && response.request().method() === 'PATCH'
  );
  await page.getByRole('button', { name: 'Salvar serviços', exact: true }).click();
  expect((await saveResponse).status()).toBe(200);

  const persisted = await api(page, `/orders/${order.body.id}`);
  expect(persisted.body.items.find((item: any) => Number(item.catalog_id) === Number(service.id))?.unit_price_cents).toBe(15000);
  const report = page.getByLabel('Laudo Final');
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(page.getByText('Preencha o Laudo Final antes de concluir a OS.', { exact: true })).toBeVisible();
  await expect(report).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' })).toHaveCount(0);

  const reportText = 'Serviço de preço livre concluído.';
  await report.fill(reportText);
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  const finalization = page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' });
  await expect(finalization.getByLabel(`Valor unitário de ${name}`)).toHaveValue('150,00');
  const finalizeResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/orders/${order.body.id}/finalize` && response.request().method() === 'POST'
  );
  await finalization.getByRole('button', { name: 'Salvar e concluir OS' }).click();
  const response = await finalizeResponse;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON().technical_report).toBe(reportText);
});
