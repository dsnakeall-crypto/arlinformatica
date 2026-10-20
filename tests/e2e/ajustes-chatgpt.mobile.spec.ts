import { expect, test } from '@playwright/test';
import { login, openExpenseSection } from './helpers';

test('barra inferior Premium abre gaveta acessível à direita e fecha ao tocar fora', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const menu = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'Menu', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Menu' });
  await expect(drawer).toBeVisible();
  await expect(page.locator('.layout-mobile > aside#arl-main-sidebar')).toBeHidden();
  await expect.poll(async () => { const rect = await drawer.boundingBox(); return rect ? Math.round(rect.x + rect.width) : 9999; }).toBeLessThanOrEqual(394);
  const bounds = await drawer.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  await expect(drawer.getByRole('button', { name: 'Ordens' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Configurações' })).toBeVisible();
  await page.locator('.arl-premium-menu-backdrop').click({ position: { x: 10, y: 100 } });
  await expect(drawer).toHaveCount(0);
  await expect(menu).toBeVisible();
});

test('submenus financeiros mobile funcionam pela gaveta, sem perder projeção e histórico', async ({ page }) => {
  await login(page);
  await page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' })
    .getByRole('button', { name: 'Gastos', exact: true }).click();
  await openExpenseSection(page, 'Projeção');
  const projection = page.getByRole('navigation', { name: 'Submenus de gastos e projeção' });
  await expect(projection.getByRole('button', { name: 'Projeção futura' })).toBeVisible();
  await expect(projection.getByRole('button', { name: 'Histórico de gastos' })).toBeVisible();
  await projection.getByRole('button', { name: 'Histórico de gastos' }).click();
  await expect(projection.getByRole('button', { name: 'Histórico de gastos' })).toHaveAttribute('aria-pressed', 'true');
  await projection.getByRole('button', { name: 'Projeção futura' }).click();
  await expect(page.getByRole('heading', { name: 'Compromissos futuros' })).toBeVisible();
  await openExpenseSection(page, 'Pagamentos');
  await expect(page.locator('.cg-payment-institutions')).toBeVisible();
  await openExpenseSection(page, 'Quitadas');
  await expect(page.getByRole('heading', { name: 'Dívidas quitadas' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('clientes mobile tem busca e ordem alfabética compactas', async ({ page }) => {
  await login(page);
  await page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' })
    .getByRole('button', { name: 'Clientes' }).click();
  const panel = page.locator('.clients-list-panel');
  await expect(panel.getByRole('textbox', { name: 'Buscar clientes' })).toBeVisible();
  // Mobile aprovado: ordem alfabética fixa; seletor de ordenação só existe no desktop.
  await expect(panel.getByRole('combobox', { name: 'Ordenar clientes' })).toHaveCount(0);
  await expect(panel.locator('.clients-pagination')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
