import { expect, test } from '@playwright/test';
import { api, login } from './helpers';

test('painel e mesa usam a consulta operacional completa', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await expect(page.getByText('OS abertas')).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: 'Nova OS' })).toBeVisible();

  const deskResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/orders/desk') && response.request().method() === 'GET');
  await page.locator('aside').getByRole('button', { name: 'Mesa de Chamados' }).click();
  const deskResponse = await deskResponsePromise;
  expect(deskResponse.status()).toBe(200);
  expect(Array.isArray(await deskResponse.json())).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Mesa de Chamados' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Em Análise' })).toBeVisible();
  await expect(page.getByText('Todas as OS abertas, sem limite de paginação, organizadas pelos status operacionais.')).toBeVisible();
});

test('layout é persistido por dispositivo e os três modos alteram o shell', async ({ page }) => {
  await login(page);
  const selector = page.getByLabel('Layout neste dispositivo');
  await selector.selectOption('mobile');
  await expect(page.locator('.shell')).toHaveClass(/layout-mobile/);
  await page.reload();
  await expect(selector).toHaveValue('mobile');
  await selector.selectOption('desktop');
  await expect(page.locator('.shell')).toHaveClass(/layout-desktop/);
  await page.reload();
  await expect(selector).toHaveValue('desktop');
  await selector.selectOption('automatic');
  await expect(page.locator('.shell')).toHaveClass(/layout-automatic/);
});

test('Funcionário vê somente operação e o backend continua sendo a autoridade', async ({ page }) => {
  await login(page, 'e2e.funcionario');
  const me = await api(page, '/me');
  expect(me.status).toBe(200);
  expect(me.body.role).toBe('Funcionário');
  const nav = page.locator('aside nav');
  await expect(nav.getByRole('button', { name: 'Nova OS' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Financeiro' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Serviços' })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Usuários' })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Configurações' })).toHaveCount(0);
  expect((await api(page, '/settings')).status).toBe(403);
  expect((await api(page, '/users')).status).toBe(403);
  expect((await api(page, '/catalogs/services', 'POST', {})).status).toBe(403);
});

test('Administrador acessa administração permitida sem funções exclusivas do Master', async ({ page }) => {
  await login(page, 'e2e.admin');
  const me = await api(page, '/me');
  expect(me.status).toBe(200);
  expect(me.body.role).toBe('Administrador');
  const nav = page.locator('aside nav');
  await expect(nav.getByRole('button', { name: 'Serviços' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Configurações' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Usuários' })).toHaveCount(0);
  expect((await api(page, '/settings')).status).toBe(200);
  expect((await api(page, '/users')).status).toBe(403);

  await nav.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  const tabs = page.locator('.arl-settings-tabs');
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole('button', { name: /Backup e Restauração/ })).toBeHidden();
  await expect(tabs.getByRole('button', { name: /Sistema e Diagnóstico/ })).toBeHidden();
});

test('Financeiro abre sem depender do relatório mensal e carrega mensal sob demanda', async ({ page }) => {
  await login(page);
  const monthRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/finance/month') monthRequests.push(request.url());
  });

  await page.locator('aside').getByRole('button', { name: 'Financeiro' }).click();
  await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible();
  await expect(page.getByText('Total do mês')).toBeVisible();
  expect(monthRequests).toHaveLength(0);

  await page.getByRole('button', { name: 'Mensal', exact: true }).click();
  await expect.poll(() => monthRequests.length).toBe(1);
  await expect(page.getByText('Faturamento', { exact: true })).toBeVisible();
});

test('Serviços e Produtos cria e edita tipo, preço e garantia adicional', async ({ page }) => {
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Serviços', exact: true }).click();
  const heading = page.getByRole('heading', { name: 'Serviços e Produtos' });
  await expect(heading).toBeVisible();
  const card = page.locator('section.form-card.admin-list').filter({ has: heading });

  await card.getByLabel('Nome / descrição').fill('Garantia E2E');
  await card.getByLabel('Valor em R$').fill('89,90');
  await card.getByLabel('Tipo').selectOption('product');
  await card.getByRole('checkbox', { name: 'Garantia adicional' }).check();
  await card.getByLabel('Duração da garantia').fill('6');
  await card.getByLabel('Unidade da garantia').selectOption('months');
  const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/catalogs/services') && response.request().method() === 'POST');
  await card.getByRole('button', { name: 'Adicionar' }).click();
  expect((await createResponsePromise).status()).toBe(201);

  const row = page.locator('section.form-card.admin-list article').filter({ hasText: 'Garantia E2E' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Produto');
  await expect(row).toContainText('Garantia 6 meses');

  await row.getByRole('button', { name: 'Editar' }).click();
  const modal = page.locator('.modal-card').filter({ hasText: 'Editar serviço/produto' });
  await expect(modal).toBeVisible();
  await modal.getByLabel('Tipo').selectOption('service');
  await modal.getByLabel('Valor em R$').fill('99,90');
  await modal.getByLabel('Duração da garantia').fill('2');
  await modal.getByLabel('Unidade da garantia').selectOption('years');
  const updateResponsePromise = page.waitForResponse((response) => response.url().includes('/api/catalogs/services/') && response.request().method() === 'PATCH');
  await modal.getByRole('button', { name: 'Salvar' }).click();
  expect((await updateResponsePromise).status()).toBe(200);

  await expect(row).toContainText('Serviço');
  await expect(row).toContainText('R$ 99.90');
  await expect(row).toContainText('Garantia 2 anos');
});

test('Configurações usa sanfona exclusiva e salva Garantia Geral', async ({ page }) => {
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await expect(page.getByText('Disponível', { exact: true })).toHaveCount(0);

  const tabs = page.locator('.arl-settings-tabs');
  await expect(tabs).toBeVisible();
  const company = tabs.getByRole('button', { name: /Empresa/ });
  const identity = tabs.getByRole('button', { name: /Identidade Visual/ });
  const orders = tabs.getByRole('button', { name: /Ordens de Serviço/ });
  await expect(company).toHaveClass(/active/);
  await identity.click();
  await expect(identity).toHaveClass(/active/);
  await expect(company).not.toHaveClass(/active/);
  await orders.click();
  await expect(orders).toHaveClass(/active/);
  await expect(identity).not.toHaveClass(/active/);

  const form = page.locator('form.settings-form');
  await expect(form.locator('[name="layout_mode"]')).toHaveCount(0);
  await expect(page.getByLabel('Layout neste dispositivo')).toBeVisible();
  const toggle = form.getByLabel('Mostrar garantia geral no PDF final');
  await expect(toggle).toBeVisible();
  if (!(await toggle.isChecked())) await toggle.check();
  const text = form.getByLabel('Texto da garantia geral');
  await text.fill('Garantia geral configurada pelo E2E.');

  const save = form.getByRole('button', { name: 'Salvar configurações' });
  const savedResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/settings') && response.request().method() === 'PUT');
  await save.click();
  expect((await savedResponsePromise).status()).toBe(200);
  const saved = await api(page, '/settings');
  expect(saved.body.warranty_general_enabled).toBe('1');
  expect(saved.body.warranty_general_text).toBe('Garantia geral configurada pelo E2E.');
  expect(saved.body.layout_mode).toBeUndefined();

  await text.fill('');
  await toggle.uncheck();
  const resetResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/settings') && response.request().method() === 'PUT');
  await save.click();
  expect((await resetResponsePromise).status()).toBe(200);
  const reset = await api(page, '/settings');
  expect(reset.body.warranty_general_enabled).toBe('0');
});
