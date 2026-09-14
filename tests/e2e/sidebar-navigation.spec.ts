import { expect, test } from '@playwright/test';
import { api, login } from './helpers';

const expectedGroups = {
  'Operação': ['Painel', 'Ordens'],
  'Cadastros': ['Clientes', 'Serviços'],
  'Gestão': ['Financeiro', 'Pós-Venda'],
  'Administração': ['Usuários', 'Configurações'],
};

test('menu agrupa destinos, destaca Nova OS e mostra contadores vindos do backend nos dois layouts', async ({ page }) => {
  await page.route('**/api/navigation-summary', route => route.fulfill({ json: { open_orders: 7, available_post_sales: 3 } }));
  await login(page);
  const aside = page.locator('aside');

  for (const [groupName, items] of Object.entries(expectedGroups)) {
    const group = aside.locator('.nav-group').filter({ has: page.getByRole('heading', { name: groupName, exact: true }) });
    await expect(group).toBeVisible();
    for (const item of items) await expect(group.getByRole('button', { name: new RegExp(`^${item}(?: \\d+)?$`) })).toBeVisible();
  }
  const newOrder = aside.getByRole('button', { name: 'Nova OS', exact: true });
  await expect(newOrder).toHaveClass(/new-order-shortcut/);
  await expect(aside.getByRole('button', { name: /Ordens/ }).locator('.nav-badge')).toHaveText('7');
  await expect(aside.getByRole('button', { name: /Pós-Venda/ }).locator('.nav-badge')).toHaveText('3');
  await newOrder.click();
  await expect(page.getByRole('heading', { name: 'Abertura de Chamado / Nova OS', exact: true })).toBeVisible();

  await page.getByLabel('Layout neste dispositivo').selectOption('mobile');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  expect(await aside.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  const footer = await aside.locator('.profile').boundingBox();
  const bottomBar = await page.locator('.arl-global-mobile-nav').boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(bottomBar!.y);
  for (const groupName of Object.keys(expectedGroups)) await expect(aside.getByRole('heading', { name: groupName, exact: true })).toBeVisible();
  await expect(aside.getByRole('button', { name: /Ordens/ }).locator('.nav-badge')).toHaveText('7');
});

test('menu recolhe, revela nomes no hover, libera largura e persiste após recarregar', async ({ page }) => {
  await login(page);
  const shell = page.locator('.shell');
  const main = page.getByRole('main');
  const expanded = await main.boundingBox();
  await page.locator('aside').hover();
  await page.getByRole('main').hover();
  await expect(shell).toHaveClass(/sidebar-collapsed/);
  const collapsed = await main.boundingBox();
  expect(collapsed?.width).toBeGreaterThan(expanded?.width ?? 0);

  const aside = page.locator('aside');
  await aside.hover();
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
  await expect(aside.getByRole('button', { name: /Ordens/ }).locator('.nav-label')).toBeVisible();
  await page.getByRole('main').hover();
  await expect(shell).toHaveClass(/sidebar-collapsed/);
  await page.reload();
  await expect(shell).toHaveClass(/sidebar-collapsed/);
  await aside.hover();
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
  await page.reload();
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
});

test('usuário fixa, desfixa e mantém a preferência do menu após recarregar', async ({ page }) => {
  await login(page);
  expect((await api(page, '/me/sidebar', 'PATCH', { sidebar_pinned: false })).status).toBe(200);

  const shell = page.locator('.shell');
  const aside = page.locator('aside');
  await page.getByRole('main').hover();
  await expect(shell).toHaveClass(/sidebar-collapsed/);

  const pin = aside.getByRole('button', { name: 'Fixar menu lateral', exact: true });
  const pinnedResponse = page.waitForResponse(response => response.url().endsWith('/api/me/sidebar') && response.request().method() === 'PATCH');
  await pin.click();
  expect((await pinnedResponse).status()).toBe(200);
  await expect(shell).toHaveClass(/sidebar-pinned/);
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
  await expect(aside.getByRole('button', { name: 'Desfixar menu lateral', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await page.getByRole('main').hover();
  await expect(shell).toHaveClass(/sidebar-pinned/);
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);

  const unpin = aside.getByRole('button', { name: 'Desfixar menu lateral', exact: true });
  const unpinnedResponse = page.waitForResponse(response => response.url().endsWith('/api/me/sidebar') && response.request().method() === 'PATCH');
  await unpin.click();
  expect((await unpinnedResponse).status()).toBe(200);
  await page.getByRole('main').hover();
  await expect(shell).toHaveClass(/sidebar-collapsed/);
  await page.reload();
  await expect(shell).toHaveClass(/sidebar-collapsed/);
  await expect(aside.getByRole('button', { name: 'Fixar menu lateral', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

for (const width of [1280, 1920]) {
  test('menu contém logo, bordas e contadores em ' + width + 'px', async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/navigation-summary', route => route.fulfill({ json: { open_orders: 12345, available_post_sales: 9876 } }));
    await login(page);
    const aside = page.locator('aside');
    await aside.hover();
    await expect(aside.locator('.nav-badge').first()).toHaveText('12345');
    await expect(aside.locator('.sidebar-collapse, .arl-sidebar-slogan, .arl-nav-arrow, .arl-profile-arrow, .profile > i')).toHaveCount(0);
    await expect(aside.locator('.logo img')).toBeVisible();
    await expect.poll(() => aside.locator('.logo img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const geometry = await aside.evaluate(el => {
      const box = el.getBoundingClientRect();
      const buttons = [...el.querySelectorAll('.nav-group button')];
      return {
        width: box.width,
        overflow: el.scrollWidth > el.clientWidth,
        logoRatio: el.querySelector('.logo img')!.getBoundingClientRect().width / (el.clientWidth - 28),
        rows: buttons.map(button => {
          const r = button.getBoundingClientRect();
          return { left: r.left - box.left, right: box.right - r.right,
            overflow: button.scrollWidth > button.clientWidth,
            children: [...button.children].filter(child => getComputedStyle(child).display !== 'none').every(child => {
              const c = child.getBoundingClientRect(); return c.left >= r.left + 1 && c.right <= r.right - 1;
            }) };
        }),
      };
    });
    expect(geometry.width).toBe(240);
    expect(geometry.overflow).toBe(false);
    expect(geometry.logoRatio).toBeGreaterThan(.95);
    for (const row of geometry.rows) {
      expect(row.left).toBeGreaterThanOrEqual(14);
      expect(Math.abs(row.left - row.right)).toBeLessThanOrEqual(1);
      expect(row.overflow).toBe(false);
      expect(row.children).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath('sidebar-open.png') });
    await page.getByRole('main').hover();
    await expect(page.locator('.shell')).toHaveClass(/sidebar-collapsed/);
    expect((await aside.boundingBox())?.width).toBe(58);
    expect((await page.getByRole('main').boundingBox())?.x).toBe(58);
    await expect(aside.locator('.nav-count').first()).toBeVisible();
    expect(await aside.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.getByRole('main').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    await page.screenshot({ path: testInfo.outputPath('sidebar-closed.png') });
  });
}
