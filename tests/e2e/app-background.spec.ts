import { expect, test } from '@playwright/test';
import { api, login } from './helpers';

test('Administrador envia imagem, vê a prévia e aplica o fundo personalizado', async ({ page }) => {
  await login(page, 'e2e.admin');
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('tab', { name: 'Identidade', exact: true }).click();

  const section = page.locator('.app-background-settings');
  await expect(section.getByRole('heading', { name: 'Fundo do app' })).toBeVisible();
  await section.getByRole('radio', { name: 'Imagem personalizada' }).check();
  await expect(section.getByRole('checkbox', { name: /Suavizar imagem/ })).toBeChecked();

  await section.locator('input[type="file"]').setInputFiles({
    name: 'fundo-e2e.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP4z8DAwMDAxAADCBYAG10CAfqfMcQAAAAASUVORK5CYII=', 'base64'),
  });
  await expect(section.getByAltText('Prévia do fundo personalizado')).toBeVisible();

  const uploaded = page.waitForResponse((response) =>
    response.url().includes('/api/settings/app-background') &&
    response.request().method() === 'POST' &&
    response.status() === 201,
  );
  await page.getByRole('button', { name: 'Salvar configurações' }).click();
  await uploaded;

  await expect(section.getByText('Prévia da imagem atual')).toBeVisible();
  await expect(page.locator('main')).toHaveClass(/arl-app-custom-background/);
  await expect.poll(() => page.locator('main').evaluate((element) => getComputedStyle(element).backgroundImage))
    .toContain('/api/app-background/file?v=');

  const cleanup = await api(page, '/settings/app-background', 'DELETE');
  expect(cleanup.status).toBe(200);
});
