import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('painel de notificações fecha fora e com Esc, mas permanece aberto ao interagir dentro no Web', async ({ page }) => {
  await login(page);

  const bell = page.getByRole('button', { name: 'Notificações', exact: true });
  const panel = page.locator('.notification-center');
  const outside = page.locator('main');

  await bell.click();
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Marcar todas como lidas' }).click();
  await expect(panel).toBeVisible();

  await outside.click({ position: { x: 1, y: 1 } });
  await expect(panel).toHaveCount(0);

  await bell.click();
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});
