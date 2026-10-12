import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { login } from './helpers';

test('iPhone: retorno confirmado, pesquisas neutras e menu junto à base', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await login(page);
  await page.goto('/expense-control');
  const back = page.getByRole('button', { name: 'Voltar à ARL', exact: true });
  await expect(back).toHaveCSS('color', 'rgb(185, 28, 28)');
  await back.click();
  const dialog = page.getByRole('dialog', { name: 'Confirmar retorno para o aplicativo da ARL?', exact: true });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x+box!.width).toBeLessThanOrEqual(376);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page).toHaveURL(/expense-control/);
  await back.click(); await dialog.getByRole('button', { name: 'Confirmar retorno', exact: true }).click();
  await expect(page).not.toHaveURL(/expense-control/);
  mkdirSync('output/pacote-final', { recursive: true });
  for (const [url, label] of [['/clients', 'Buscar clientes'], ['/services', 'Pesquisar serviços']]) {
    await page.goto(url);
    const search = page.getByRole('textbox', { name: label, exact: true }).or(page.getByRole('searchbox', { name: label, exact: true }));
    await search.fill('teste');
    await expect(search).toHaveCSS('outline-color', 'rgb(121, 137, 156)');
    const parent = await search.evaluate(el => ({ border: getComputedStyle(el.parentElement!).borderColor, outline: getComputedStyle(el).outlineColor }));
    expect(parent.outline).toBe('rgb(121, 137, 156)');
    await page.screenshot({ path: 'output/pacote-final/foco-'+(url === '/clients' ? 'clientes' : 'servicos')+'.png' });
  }
});
