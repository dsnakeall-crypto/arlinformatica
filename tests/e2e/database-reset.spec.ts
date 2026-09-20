import { expect, test } from '@playwright/test';
import { api, login } from './helpers';

test('Master vê o zeramento, mas a confirmação fica bloqueada sem a frase exata', async ({ page }) => {
  await login(page);
  await page.route('**/api/database-reset/prepare', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        backup_id: 999,
        filename: 'backup-arl-20260920-120000-999.zip',
        bytes: 1024,
        counts: { clients: 1, users: 0 },
      }),
    });
  });
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('tab', { name: /Zeramento/ }).click();

  await expect(page.getByTestId('database-reset-panel')).toBeVisible();
  await page.getByRole('button', { name: 'GERAR BACKUP E LIBERAR' }).click();
  await page.getByLabel('Senha do Master').fill('senha-de-teste');
  await page.getByLabel('Digite exatamente ZERAR BANCO').fill('zerar banco');
  await expect(page.getByRole('button', { name: 'ZERAR BANCO DEFINITIVAMENTE' })).toBeDisabled();
  await expect(page.getByText('Usuários removidos (Master preservado)')).toBeVisible();
});

test('Administrador não vê nem acessa o zeramento', async ({ page }) => {
  await login(page, 'e2e.admin');
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();

  await expect(page.getByRole('tab', { name: /Zeramento/ })).toHaveCount(0);
  expect((await api(page, '/database-reset/preview')).status).toBe(403);
  expect((await api(page, '/database-reset/prepare', 'POST')).status).toBe(403);
  expect((await api(page, '/database-reset', 'POST', {
    backup_id: 1,
    password: 'qualquer',
    confirmation: 'ZERAR BANCO',
  })).status).toBe(403);
});
