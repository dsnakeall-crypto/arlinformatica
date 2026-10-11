import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('barra inferior abre drawer mobile transparente e fecha ao tocar fora', async ({ page }) => {
  await login(page);
  const menu = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await expect(menu).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  const drawer = page.getByRole('navigation', { name: 'Menu lateral compacto' });
  await expect(drawer).toBeVisible();
  await expect(page.locator('.layout-mobile > aside#arl-main-sidebar')).toBeHidden();
  const backdrop = page.getByRole('button', { name: 'Fechar menu lateral' });
  await expect(backdrop).toBeVisible();
  const appearance = await drawer.evaluate(el => ({
    radius: getComputedStyle(el).borderTopRightRadius,
    background: getComputedStyle(el).backgroundImage,
    width: el.getBoundingClientRect().width,
  }));
  expect(appearance.radius).not.toBe('0px');
  expect(appearance.background).toContain('linear-gradient');
  expect(appearance.width).toBeLessThan(72);
  await backdrop.click({ position: { x: 390, y: 460 } });
  await expect(drawer).toBeVisible();
  await expect(drawer).toBeHidden({ timeout: 3300 });
  await expect(menu).toBeVisible();
});

test('submenus financeiros mobile permanecem visíveis ao alternar telas', async ({ page }) => {
  await login(page);
  await page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' })
    .getByRole('button', { name: 'Gestor de Gasto' }).click();
  const bottom = page.getByRole('navigation', { name: 'Menu do Controle de Gastos' });
  await bottom.getByRole('button', { name: 'Projeção' }).click();
  const subnav = page.getByRole('navigation', { name: 'Submenus de gastos e projeção' });
  for (const name of ['Quitadas', 'Pagamentos', 'Projeção futura', 'Histórico de gastos']) {
    await expect(subnav.getByRole('button', { name })).toBeVisible();
  }
  await subnav.getByRole('button', { name: 'Histórico de gastos' }).click();
  await expect(subnav.getByRole('button', { name: 'Histórico de gastos' })).toHaveAttribute('aria-pressed', 'true');
  await subnav.getByRole('button', { name: 'Pagamentos' }).click();
  await expect(subnav.getByRole('button', { name: 'Pagamentos' })).toHaveAttribute('aria-pressed', 'true');
  await subnav.getByRole('button', { name: 'Quitadas' }).click();
  await expect(subnav.getByRole('button', { name: 'Quitadas' })).toHaveAttribute('aria-pressed', 'true');
  await expect(subnav.locator('button')).toHaveCount(4);
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
