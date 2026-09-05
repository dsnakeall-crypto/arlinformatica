import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('gestão de clientes mostra o formulário somente quando solicitado', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  const workspace = page.locator('.clients-workspace');
  const editor = page.locator('.clients-editor');

  await expect(workspace).toBeVisible();
  await expect(workspace).not.toHaveClass(/arl-client-editor-open/);
  await expect(editor).toBeHidden();

  await page.getByRole('button', { name: 'Novo cliente', exact: true }).first().click();
  await expect(workspace).toHaveClass(/arl-client-editor-open/);
  await expect(editor).toBeVisible();
  await expect(editor.getByRole('heading', { name: 'Novo cliente', exact: true })).toBeVisible();

  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(workspace).not.toHaveClass(/arl-client-editor-open/);
  await expect(editor).toBeHidden();
});
