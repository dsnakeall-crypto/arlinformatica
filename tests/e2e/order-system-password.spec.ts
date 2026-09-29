import { expect, test } from '@playwright/test';
import { api, login, selectNewOrderClient, uniqueDocument } from './helpers';

async function logout(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    await fetch('/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-CSRF-TOKEN': token },
    });
  });
}

test('Nova OS exige escolha de senha e o olho fica restrito ao Administrador e Master', async ({ page }) => {
  await login(page, 'e2e.admin');
  const suffix = Date.now();
  const client = await api(page, '/clients', 'POST', {
    name: `Cliente Senha E2E ${suffix}`,
    document: uniqueDocument(suffix),
    phone: '35999993333',
    street: 'Rua da Senha',
  });
  expect(client.status, JSON.stringify(client.body)).toBe(201);

  await page.locator('aside').getByRole('button', { name: 'Nova OS', exact: true }).click();
  await selectNewOrderClient(page, client.body.id);
  await page.getByLabel('Equipamento *').fill('Notebook do cliente');
  await page.getByLabel('Fabricante / Modelo / Acessórios').fill('Dell Inspiron + carregador');
  await page.getByLabel('Problema relatado *').fill('Sistema não inicia');

  await page.getByRole('button', { name: 'Criar ordem de serviço' }).click();
  await expect(page.getByText('Informe a senha ou marque Sem senha', { exact: true })).toBeVisible();

  const secret = 'Windows#Cliente-31';
  await expect(page.getByLabel('Senha do sistema')).toHaveAttribute('type', 'text');
  await expect(page.getByLabel('Senha do sistema')).toHaveAttribute('autocomplete', 'off');
  await page.getByLabel('Senha do sistema').fill(secret);
  const createdResponse = page.waitForResponse((response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Criar ordem de serviço' }).click();
  const created = await createdResponse;
  expect(created.status()).toBe(201);
  const order = await created.json();

  const intakeDates = page.locator('.arl-intake-dates');
  const reveal = intakeDates.getByRole('button', { name: 'Ver senha do usuário' });
  await expect(reveal).toBeVisible();
  await expect(page.locator('.arl-order-sticky-header').getByRole('button', { name: 'Ver senha do usuário' })).toHaveCount(0);
  const passwordResponse = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/orders/${order.id}/system-password`);
  await reveal.click();
  expect((await passwordResponse).status()).toBe(200);
  const passwordDialog = page.getByRole('dialog', { name: `Senha do sistema da OS #${order.number}` });
  await expect(passwordDialog.getByLabel('Senha cadastrada')).toHaveText(secret);
  await passwordDialog.getByRole('button', { name: 'Fechar', exact: true }).click();

  const ordinaryResponse = await api(page, `/orders/${order.id}`);
  expect(ordinaryResponse.body).not.toHaveProperty('system_password');

  await logout(page);
  await login(page, 'e2e.funcionario');
  await page.goto(`/orders/${order.id}`);
  await expect(page.getByRole('heading', { name: `OS #${order.number}`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver senha do usuário' })).toHaveCount(0);
  expect((await api(page, `/orders/${order.id}/system-password`)).status).toBe(403);

  await page.locator('aside').getByRole('button', { name: 'Nova OS', exact: true }).click();
  await selectNewOrderClient(page, client.body.id);
  await page.getByLabel('Equipamento *').fill('Computador sem senha');
  await page.getByLabel('Problema relatado *').fill('Computador lento');
  await page.getByLabel('Sem senha').check();
  await expect(page.getByLabel('Senha do sistema')).toBeDisabled();
  const withoutPasswordResponse = page.waitForResponse((response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Criar ordem de serviço' }).click();
  expect((await withoutPasswordResponse).status()).toBe(201);
  await expect(page.getByRole('button', { name: 'Ver senha do usuário' })).toHaveCount(0);
});
