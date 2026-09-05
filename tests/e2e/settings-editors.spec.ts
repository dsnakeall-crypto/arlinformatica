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

test('configurações organiza cadastros da OS em três subabas compactas e padronizadas', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.locator('.arl-settings-tab[data-section="orders"]').click();

  const tabs = page.locator('.arl-order-subtabs [role="tab"]');
  const equipmentTab = page.getByRole('tab', { name: 'Equipamentos', exact: true });
  const manufacturersTab = page.getByRole('tab', { name: 'Fabricantes', exact: true });
  const checklistTab = page.getByRole('tab', { name: 'Checklist de Entrada', exact: true });
  const equipmentPanel = page.locator('[data-arl-order-panel="equipment"]');
  const manufacturersPanel = page.locator('[data-arl-order-panel="manufacturers"]');
  const checklistPanel = page.locator('[data-arl-order-panel="checklist"]');

  await expect(tabs).toHaveCount(3);
  await expect(equipmentTab).toHaveAttribute('aria-selected', 'true');
  await expect(equipmentPanel).toBeVisible();
  await expect(manufacturersPanel).toBeHidden();
  await expect(checklistPanel).toBeHidden();

  const addButton = equipmentPanel.getByRole('button', { name: 'Adicionar', exact: true });
  await expect(addButton).toBeVisible();
  const addBox = await addButton.boundingBox();
  expect(addBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(await addButton.evaluate((el) => getComputedStyle(el).borderRadius)).not.toBe('0px');

  await manufacturersTab.click();
  await expect(equipmentPanel).toBeHidden();
  await expect(manufacturersPanel).toBeVisible();
  await expect(checklistPanel).toBeHidden();

  await checklistTab.click();
  await expect(equipmentPanel).toBeHidden();
  await expect(manufacturersPanel).toBeHidden();
  await expect(checklistPanel).toBeVisible();
});
