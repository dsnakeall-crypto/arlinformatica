import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('controle: seções e calendário adaptam de celular a desktop compacto', async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.evaluate((mobile) => localStorage.setItem('arl-layout-mode', mobile ? 'mobile' : 'web'), width < 1024);
    await page.goto('/expense-control');
    await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
    for (const name of ['Resumo', 'Gastos', 'Instituições', 'Pagamentos', 'Projeção', 'Quitadas']) {
      await page.getByRole('tab', { name, exact: true }).click();
      await expect(page.getByText('Atualizando informações…')).not.toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: ${width}px`).toBe(true);
    }
    await page.getByRole('button', { name: 'Selecionar mês do Controle de Gasto', exact: true }).click();
    const calendar = page.getByRole('dialog', { name: 'Selecionar mês e ano' });
    await expect(calendar).toBeVisible();
    const rect = await calendar.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: `output/controle-gasto/revisao-${width}.png`, fullPage: true });
  }
});
