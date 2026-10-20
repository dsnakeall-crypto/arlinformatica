import { test, expect } from '@playwright/test';
import { login, setDeviceLayout, openArlSection } from './helpers';

const desktopMenus = ['Painel','Ordens','Clientes','Serviços','Produtos','Fornecedores','Financeiro','Controle de Gasto','Pós-Venda','Configurações'];
const destinations: Record<string, string> = {
  Painel:'/', Ordens:'/orders', Clientes:'/clients', Serviços:'/services',
  Produtos:'/products', Fornecedores:'/suppliers', Financeiro:'/finance',
  'Controle de Gasto':'/expense-control', 'Pós-Venda':'/post-sale', Configurações:'/settings',
};

for (const profile of [
  { mode: 'original', widths: [1672,1366,960] },
  { mode: 'clean', widths: [1366,960] },
]) {
  test('Regressão responsiva WEB ' + profile.mode, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: profile.widths[0], height: 900 });
    await login(page);
    await page.evaluate(mode => localStorage.setItem('arl-appearance-v1', JSON.stringify({ mode, color: 'blue' })), profile.mode);
    await page.reload();
    const nav = page.getByRole('navigation', { name: 'Menu principal' });
    await expect(nav).toBeVisible();
    for (const width of profile.widths) {
      await page.setViewportSize({ width, height: 850 });
      for (const name of desktopMenus.filter(name => width > 1024 || name !== 'Pós-Venda')) {
        if (width > 1024) {
          const button = nav.getByRole('button', { name, exact: true });
          await expect(button).toBeVisible();
          await button.click();
          await expect(button).toHaveClass(/active/);
        } else {
          await expect(page.locator('.shell.layout-mobile')).toBeVisible();
          await openArlSection(page, name);
          await expect(page.locator('main h1').first()).toBeVisible();
        }
        await expect.poll(() => new URL(page.url()).pathname).toBe(destinations[name]);
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const geometry = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, main: document.querySelector('main')?.getBoundingClientRect().toJSON() }));
        expect(geometry.documentWidth - geometry.viewportWidth, profile.mode + ' ' + width + 'px - ' + name).toBeLessThanOrEqual(3);
        expect(geometry.main?.width).toBeGreaterThan(0);
      }
    }
    expect(errors, 'Erros JS no WEB ' + profile.mode).toEqual([]);
  });
}

test('Regressão responsiva Mobile/Tablet em rotas essenciais', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  await setDeviceLayout(page, 'mobile');
  for (const width of [390,768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['dashboard','orders','clients','finance','expense-control','settings']) {
      await page.goto('/' + route, { waitUntil: 'domcontentloaded' });
      await page.locator('main').waitFor({ state: 'visible' });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, 'Mobile ' + width + 'px - ' + route).toBeLessThanOrEqual(3);
    }
  }
  expect(errors).toEqual([]);
});
