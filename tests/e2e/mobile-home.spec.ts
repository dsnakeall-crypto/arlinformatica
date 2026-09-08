import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

async function createOpenOrder(page: Parameters<typeof api>[0]) {
  const suffix = Date.now();
  const clientName = `Cliente Mobile ${suffix}`;
  const client = await api(page, '/clients', 'POST', {
    name: clientName,
    document: uniqueDocument(suffix),
    phone: '35988887777',
    postal_code: '37160000',
    street: 'Rua Mobile',
    number: '123',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
    complement: '',
  });
  expect(client.status).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  expect(equipment.status).toBe(200);
  const equipmentId = equipment.body?.[0]?.id;
  expect(equipmentId).toBeTruthy();

  const order = await api(page, '/orders', 'POST', {
    client_id: client.body.id,
    equipment_type_id: equipmentId,
    attendance_type: 'bench',
    reported_problem: 'Validação da tela inicial mobile',
    checklist: [],
    items: [],
  });
  expect(order.status).toBe(201);

  return { clientName };
}

test('mobile explícito prioriza OS abertas, mantém barra global e abre OS somente leitura', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('arl-layout-mode', 'mobile'));
  await login(page);

  const { clientName } = await createOpenOrder(page);
  await page.reload();

  const home = page.locator('.arl-mobile-home');
  await expect(home).toBeVisible();
  await expect(home.getByRole('heading', { name: 'OS abertas' })).toBeVisible();

  const card = home.locator('.arl-mobile-order-card').filter({ hasText: clientName });
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: `Abrir WhatsApp de ${clientName}` })).toHaveAttribute('href', /wa\.me/);
  await expect(card.getByRole('link', { name: `Abrir Google Maps de ${clientName}` })).toHaveAttribute('href', /google\.com\/maps/);

  await card.click();
  await expect(page.getByText('Somente leitura · edite pelo PC')).toBeVisible();
  await expect(page.locator('[data-mobile-read-only="1"]')).toBeVisible();
  for (const forbidden of ['Fotos', 'Laudos técnicos', 'Orçamento', 'Pagamento', 'Finalização da OS']) {
    await expect(page.getByRole('heading', { name: forbidden, exact: true })).toHaveCount(0);
  }
  const bottom = page.locator('.arl-global-mobile-nav');
  await expect(bottom.getByRole('button', { name: 'Clientes' })).toBeVisible();
  await expect(bottom.getByRole('button', { name: 'Nova OS' })).toBeVisible();

  await bottom.getByRole('button', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: /Clientes/ })).toBeVisible();
  await expect(page.locator('.arl-mobile-home')).toHaveCount(0);
});

test('modo Mobile / Tablet ativa a mesma tela inicial mesmo em viewport largo', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.addInitScript(() => localStorage.setItem('arl-layout-mode', 'mobile'));
  await login(page);

  await expect(page.locator('.arl-mobile-home')).toBeVisible();
  await expect(page.locator('.arl-mobile-home').getByRole('heading', { name: 'OS abertas' })).toBeVisible();
});

test('URL fora do alcance redireciona ao início apenas no modo Mobile / Tablet', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('arl-layout-mode', 'mobile'));
  await login(page);
  await page.goto('/finance');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.arl-mobile-home').getByRole('heading', { name: 'OS abertas' })).toBeVisible();
  await expect(page.locator('aside nav').getByRole('button', { name: 'Financeiro' })).toHaveCount(0);
});

test('Web / PC preserva navegação e detalhe completo em viewport estreito', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('arl-layout-mode', 'desktop'));
  await login(page);
  await expect(page.locator('.shell')).toHaveClass(/layout-desktop/);
  await expect(page.locator('.arl-global-mobile-nav')).toHaveCount(0);
  await expect(page.locator('aside nav').getByRole('button', { name: 'Financeiro' })).toBeVisible();
  await expect(page.locator('.arl-mobile-home')).toHaveCount(0);
});
