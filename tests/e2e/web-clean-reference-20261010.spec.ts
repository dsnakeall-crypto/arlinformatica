import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { login } from './helpers';

const shots = 'output/web-clean-reference-20261010';
const desktop = { width: 1600, height: 900 };

async function selectAppearance(page: import('@playwright/test').Page, mode: 'clean' | 'original') {
  await page.evaluate((mode) => {
    localStorage.setItem('arl-layout-mode', 'desktop');
    localStorage.setItem('arl-appearance-v1', JSON.stringify({ mode, color: 'red' }));
  }, mode);
  await page.reload();
  await expect(page.locator('.shell.layout-desktop')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', mode);
}

test('Web Clean usa visual de referência e preserva estrutura desktop dos módulos ARL', async ({ page }) => {
  mkdirSync(shots, { recursive: true });
  await page.setViewportSize(desktop);
  await login(page);
  await selectAppearance(page, 'clean');
  const shell = page.locator('.shell.layout-desktop');
  const aside = shell.locator('#arl-main-sidebar');
  await expect(aside).toBeVisible();
  if (await shell.evaluate(el => el.classList.contains('sidebar-collapsed'))) {
    await aside.getByRole('button', { name: 'Fixar menu lateral' }).click();
    await expect(shell).not.toHaveClass(/sidebar-collapsed/);
  }
  const asideCss = await aside.evaluate((el) => {
    const s = getComputedStyle(el);
    return { background: s.backgroundImage, radius: s.borderTopLeftRadius };
  });
  expect(asideCss.background).toContain('linear-gradient');
  expect(parseFloat(asideCss.radius)).toBeGreaterThanOrEqual(20);
  const nav = aside.getByRole('navigation', { name: 'Menu principal' });
  const pages = [
    ['Ordens', 'Ordens de Serviço', 'ordens'],
    ['Clientes', 'Gestão de Clientes', 'clientes'],
    ['Serviços', 'Serviços', 'servicos'],
    ['Produtos', 'Produtos', 'produtos'],
    ['Fornecedores', 'Fornecedores', 'fornecedores'],
    ['Financeiro', 'Financeiro', 'financeiro'],
    ['Pós-Venda', 'Pós-Venda & Reputação', 'posvenda'],
    ['Configurações', 'Configurações', 'configuracoes'],
    ['Painel', 'Painel', 'painel']
  ] as const;
  for (const [destination, heading, filename] of pages) {
    await nav.getByRole('button', { name: destination, exact: true }).click();
    await expect(page.getByTestId('page-header').getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(aside).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(desktop.width + 2);
    if (['ordens', 'clientes', 'financeiro', 'painel'].includes(filename)) {
      await page.screenshot({ path: `${shots}/web-clean-${filename}.png`, fullPage: false });
    }
  }
  await nav.getByRole('button', { name: 'Ordens', exact: true }).click();
  await expect(page.getByTestId('page-header').getByRole('heading', { name: 'Ordens de Serviço' })).toBeVisible();
  const activeStyle = await page.locator('.order-tabs button.active').first().evaluate(el => getComputedStyle(el).backgroundImage);
  expect(activeStyle).toContain('linear-gradient');
});

test('Web Original continua diferente do Clean e mantém menus intactos', async ({ page }) => {
  await page.setViewportSize(desktop);
  await login(page);
  await selectAppearance(page, 'original');
  const aside = page.locator('.shell.layout-desktop #arl-main-sidebar');
  await expect(aside).toBeVisible();
  const oldBg = await aside.evaluate(el => getComputedStyle(el).backgroundImage);
  expect(oldBg).not.toContain('255, 251, 253');
  await expect(aside.getByRole('navigation', { name: 'Menu principal' }).getByRole('button', { name: 'Ordens' })).toBeVisible();
});

test('Skin Web não muda o tema no mobile nem invade Controle de Gastos', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.evaluate(() => {
    localStorage.setItem('arl-layout-mode', 'mobile');
    localStorage.setItem('arl-appearance-v1', JSON.stringify({ mode: 'original', color: 'red' }));
  });
  await page.reload();
  await expect(page.locator('.shell.layout-mobile')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-arl-appearance', 'clean');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
});
