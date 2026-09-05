import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('configurações separa textos de documentos em subabas com editor expandido', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.locator('.arl-settings-tab[data-section="documents"]').click();

  const termTab = page.getByRole('tab', { name: 'Termo de recebimento' });
  const budgetTab = page.getByRole('tab', { name: 'Orçamento', exact: true });
  const reportsTab = page.getByRole('tab', { name: 'Modelos de laudos' });
  const termEditor = page.getByLabel('Texto do termo de recebimento');
  const budgetEditor = page.getByLabel('Texto institucional do orçamento');

  await expect(termTab).toHaveAttribute('aria-selected', 'true');
  await expect(termEditor).toBeVisible();
  await expect(budgetEditor).toBeHidden();
  await expect(termEditor).toHaveJSProperty('scrollHeight', await termEditor.evaluate((el) => el.scrollHeight));
  expect(await termEditor.evaluate((el) => el.clientHeight)).toBeGreaterThanOrEqual(220);

  await budgetTab.click();
  await expect(termEditor).toBeHidden();
  await expect(budgetEditor).toBeVisible();
  expect(await budgetEditor.evaluate((el) => el.clientHeight)).toBeGreaterThanOrEqual(220);

  await reportsTab.click();
  await expect(page.getByRole('heading', { name: 'Modelos de laudos', exact: true })).toBeVisible();
  await expect(budgetEditor).toBeHidden();
});
