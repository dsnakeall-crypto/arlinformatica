import { test, expect } from '@playwright/test';
import { login } from './helpers';

for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`controle: foto preserva estilos e geometria da página ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page);
    await page.goto('/expense-control');
    await expect(page.getByRole('heading', { name: 'Visão geral do casal', exact: true })).toBeVisible();
    await expect(page.getByText('Atualizando informações…', { exact: true })).not.toBeVisible();
    const snapshot = () => page.evaluate(() => {
      const main = document.querySelector('main')!;
      const aside = document.querySelector('aside')!;
      const rect = main.getBoundingClientRect();
      return {
        x: rect.x, width: rect.width, height: rect.height,
        background: getComputedStyle(document.body).background,
        sidebar: getComputedStyle(aside).background,
        sidebarWidth: aside.getBoundingClientRect().width,
        mainSheets: [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].filter(link => /\/main-[^/]+\.css$/.test(link.href)).length,
      };
    });
    const before = await snapshot();
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.getByRole('button', { name: 'Cadastrar por foto', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect.poll(snapshot).toEqual(before);
      await dialog.getByRole('button', { name: /Fechar/ }).click();
      await expect(dialog).not.toBeVisible();
      await expect.poll(snapshot).toEqual(before);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('tab', { name: 'Gastos', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Nova dívida', exact: true })).toBeVisible();
  });
}
