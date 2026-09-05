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

test('configurações mantém somente equipamentos e fabricantes nos cadastros da OS', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.locator('.arl-settings-tab[data-section="orders"]').click();

  const tabs = page.locator('.arl-order-subtabs [role="tab"]');
  const equipmentTab = page.getByRole('tab', { name: 'Equipamentos', exact: true });
  const manufacturersTab = page.getByRole('tab', { name: 'Fabricantes', exact: true });
  const equipmentPanel = page.locator('[data-arl-order-panel="equipment"]');
  const manufacturersPanel = page.locator('[data-arl-order-panel="manufacturers"]');

  await expect(tabs).toHaveCount(2);
  await expect(page.getByRole('tab', { name: 'Checklist de Entrada', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Checklist de Entrada', exact: true })).toHaveCount(0);
  await expect(equipmentTab).toHaveAttribute('aria-selected', 'true');
  await expect(equipmentPanel).toBeVisible();
  await expect(manufacturersPanel).toBeHidden();

  const addButton = equipmentPanel.getByRole('button', { name: 'Adicionar', exact: true });
  await expect(addButton).toBeVisible();
  const addBox = await addButton.boundingBox();
  expect(addBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(await addButton.evaluate((el) => getComputedStyle(el).borderRadius)).not.toBe('0px');

  await manufacturersTab.click();
  await expect(equipmentPanel).toBeHidden();
  await expect(manufacturersPanel).toBeVisible();
});

test('nova OS oferece checklist opcional em quatro categorias fixas', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Nova OS', exact: true }).first().click();
  const checklist = page.locator('.os-form details').filter({ hasText: 'CHECKLIST DE ENTRADA' });
  await checklist.locator('summary').click();

  const categories = checklist.locator('.arl-checklist-category');
  await expect(categories).toHaveCount(4);
  await expect(categories).toHaveText(['Notebooks', 'Computadores', 'Tablets & iPads', 'Impressoras']);
  await expect(checklist.getByText('Checklist opcional:', { exact: false })).toBeVisible();

  await checklist.getByRole('button', { name: 'Impressoras', exact: true }).click();
  const equipment = page.getByLabel('Equipamento *');
  await expect(equipment.locator('option:checked')).toHaveText('Impressora');
  const printerDamage = checklist.getByText('Carcaça Trincada / Quebrada', { exact: true });
  await expect(printerDamage).toBeVisible();
  await printerDamage.locator('input[type="checkbox"]').check();
  await expect(checklist.getByRole('button', { name: 'Impressoras (1)', exact: true })).toBeVisible();

  await checklist.getByRole('button', { name: 'Notebooks', exact: true }).click();
  await expect(equipment.locator('option:checked')).toHaveText('Notebook');
  await expect(checklist.getByText('Carcaça Trincada', { exact: true })).toBeVisible();
  await expect(checklist.getByText('Carcaça Trincada / Quebrada', { exact: true })).toHaveCount(0);
});
