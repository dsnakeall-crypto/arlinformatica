import { test, expect } from '@playwright/test';
import { login, api, uniqueDocument } from './helpers';

test('Web oferece Original e Clean e a escolha persiste quando a janela muda de tamanho', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.evaluate(() => {
    localStorage.setItem('arl-layout-mode', 'desktop');
    localStorage.setItem('arl-appearance-v1', JSON.stringify({ mode: 'clean', color: 'red' }));
  });
  await page.reload();
  const shell = page.locator('.shell');
  await expect(shell).toHaveClass(/layout-desktop/);
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('tab', { name: 'Layouts' }).click();
  const theme = page.getByRole('group', { name: 'Estilo do aplicativo' });
  await expect(theme.getByRole('button', { name: 'Original' })).toBeVisible();
  await expect(theme.getByRole('button', { name: 'Clean' })).toBeVisible();
  await theme.getByRole('button', { name: 'Original' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'original');
  await page.setViewportSize({ width: 790, height: 650 });
  await expect(shell).toHaveClass(/layout-mobile/);
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'clean');
  await page.reload();
  await expect(shell).toHaveClass(/layout-mobile/);
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'clean');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(shell).toHaveClass(/layout-desktop/);
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'original');
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('tab', { name: 'Layouts' }).click();
  await page.getByRole('group', { name: 'Estilo do aplicativo' }).getByRole('button', { name: 'Clean' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'clean');
  await page.setViewportSize({ width: 790, height: 650 });
  await page.reload();
  await expect(shell).toHaveClass(/layout-mobile/);
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'clean');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(shell).toHaveClass(/layout-desktop/);
  expect(await page.evaluate(() => localStorage.getItem('arl-layout-mode'))).toBe('desktop');
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'clean');
});

test('Mobile mantém Clean sem seletor Original, mesmo após ampliar a janela', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', {
    configurable: true, get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari/604.1',
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.evaluate(() => {
    localStorage.setItem('arl-layout-mode', 'mobile');
    localStorage.setItem('arl-appearance-v1', JSON.stringify({ mode: 'original', color: 'red' }));
  });
  await page.reload();
  await expect(page.locator('.shell.layout-mobile')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'clean');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(page.locator('.shell.layout-mobile')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'clean');
});

test('Web Clean usa ícones 3D para olho, lápis e lixeira, mantendo WhatsApp e Maps', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.evaluate(() => {
    localStorage.setItem('arl-layout-mode', 'desktop');
    localStorage.setItem('arl-appearance-v1', JSON.stringify({ mode: 'clean', color: 'red' }));
  });
  await page.reload();
  const created = await api(page, '/clients', 'POST', {
    name: 'Cliente Ícones Web Clean', document: uniqueDocument(202610103559),
    phone: '35998825777', postal_code: '37160000', street: 'Rua Teste', number: '99',
    district: 'Centro', city: 'Campos Gerais', state: 'MG'
  });
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Clientes' }).click();
  // A lista é paginada no servidor; encontre a fixture via busca, não pela primeira página.
  await page.getByRole('textbox', { name: 'Buscar clientes' }).fill('Cliente Ícones Web Clean');
  const row = page.locator('.clients-row').filter({ hasText: 'Cliente Ícones Web Clean' });
  await expect(row).toBeVisible();
  for (const [name, filename] of [['Visualizar','eye'],['Editar','edit'],['Excluir cliente Cliente Ícones Web Clean','delete']]) {
    const button = row.getByRole('button', { name });
    await expect(button).toBeVisible();
    const background = await button.evaluate(el => getComputedStyle(el).backgroundImage);
    // Layout final aprovado usa arquivos compact-2x sem aro.
    expect(background).toContain('icon-web-' + filename + '-compact-2x.png');
    const response = await page.request.get('/arl-assets/icons/icon-web-' + filename + '.png');
    expect(response.status()).toBe(200);
  }
  await expect(row.getByRole('link', { name: 'WhatsApp' }).locator('img')).toHaveAttribute('src', /icon-whatsapp\.png/);
  await expect(row.getByRole('link', { name: 'Maps' }).locator('img')).toHaveAttribute('src', /icon-maps\.png/);
  await page.screenshot({ path: 'output/web-clean-reference-20261010/web-clean-clientes-icones.png' });
});
