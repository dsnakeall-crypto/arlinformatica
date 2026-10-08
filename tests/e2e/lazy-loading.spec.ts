import { expect, test } from '@playwright/test';
import { login } from './helpers';

// Network fault injection must reach Playwright instead of the PWA service worker.
test.use({ serviceWorkers: 'block' });

test('módulos carregam sob demanda e a navegação reutiliza o código já carregado', async ({ page }) => {
  const modules: string[] = [];
  let identityRequests = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/me') identityRequests++;
    if (/\/assets\/.*\.js$/.test(new URL(request.url()).pathname)) modules.push(request.url());
  });
  await login(page);
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
  // Legacy order controls must not repeat session verification on unrelated React pages.
  expect(identityRequests).toBe(1);
  expect(modules.some(url => /finance-page-/.test(url))).toBe(false);
  expect(modules.some(url => /suppliers-page-/.test(url))).toBe(false);
  expect(modules.some(url => /expense-control-page-/.test(url))).toBe(false);
  expect(modules.some(url => /quick-entry-/.test(url))).toBe(false);
  await page.getByRole('button', { name: 'Financeiro', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Formas de pagamento', exact: true })).toBeVisible();
  expect(modules.filter(url => /finance-page-/.test(url))).toHaveLength(1);
  await page.getByRole('button', { name: 'Painel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Financeiro', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Formas de pagamento', exact: true })).toBeVisible();
  expect(modules.filter(url => /finance-page-/.test(url))).toHaveLength(1);
});

test('carregamento lento mantém o menu utilizável e não troca a página escolhida depois', async ({ page }) => {
  await login(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/suppliers-page-*.js', async route => { await gate; await route.continue(); });
  await page.getByRole('button', { name: 'Fornecedores', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Preparando suas informações' })).toBeVisible();
  await expect(page.locator('.arl-loading-tile')).toHaveCount(3);
  await page.screenshot({ path: test.info().outputPath('carregamento-3d.png'), fullPage: true });
  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('carregamento-3d-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel('Layout neste dispositivo').selectOption('desktop');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.arl-loading-emblem i').first()).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Painel', exact: true }).click();
  release();
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fornecedores', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fornecedores', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('fornecedores-lazy.png'), fullPage: true });
});

test('falha ao baixar módulo apresenta aviso e permite continuar em outra área', async ({ page }) => {
  await login(page);
  await page.route('**/assets/suppliers-page-*.js', route => route.abort());
  await page.getByRole('button', { name: 'Fornecedores', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar esta área');
  await page.getByRole('button', { name: 'Painel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
});
