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
  expect(Math.round(await termEditor.evaluate((el) => el.getBoundingClientRect().height))).toBeGreaterThanOrEqual(220);

  await budgetTab.click();
  await expect(termEditor).toBeHidden();
  await expect(budgetEditor).toBeVisible();
  expect(Math.round(await budgetEditor.evaluate((el) => el.getBoundingClientRect().height))).toBeGreaterThanOrEqual(220);

  await reportsTab.click();
  await expect(page.getByRole('heading', { name: 'Modelos de laudos', exact: true })).toBeVisible();
  await expect(budgetEditor).toBeHidden();
});

test('configurações não expõe cadastros automáticos de equipamento, fabricante ou checklist', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.locator('.arl-settings-tab[data-section="orders"]').click();

  await expect(page.locator('.arl-order-subtabs')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Equipamentos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Fabricantes', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Checklist de Entrada', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Mostrar garantia geral no PDF final')).toBeVisible();
});

test('nova OS usa descrição manual e checklist opcional em quatro categorias fixas', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Nova OS', exact: true }).first().click();
  const manual = page.getByLabel('Equipamento / Modelo / Acessórios *');
  await expect(manual).toBeVisible();
  await manual.fill('Impressora Epson L3250 + cabo USB + fonte');
  await expect(page.getByPlaceholder('Pesquisar equipamento…')).toBeHidden();
  await expect(page.getByPlaceholder('Pesquisar fabricante…')).toBeHidden();

  const checklist = page.locator('.os-form details').filter({ hasText: 'CHECKLIST DE ENTRADA' });
  await checklist.locator('summary').click();

  const categories = checklist.locator('.arl-checklist-category');
  await expect(categories).toHaveCount(4);
  await expect(categories).toHaveText(['Notebooks', 'Computadores', 'Tablets & iPads', 'Impressoras']);
  await expect(checklist.getByText('Checklist opcional:', { exact: false })).toBeVisible();

  await checklist.getByRole('button', { name: 'Impressoras', exact: true }).click();
  await expect(manual).toHaveValue('Impressora Epson L3250 + cabo USB + fonte');
  const printerDamage = checklist.getByRole('checkbox', { name: 'Carcaça Trincada / Quebrada', exact: true });
  await expect(printerDamage).toBeVisible();
  await printerDamage.check();
  await expect(checklist.getByRole('button', { name: 'Impressoras (1)', exact: true })).toBeVisible();

  await checklist.getByRole('button', { name: 'Notebooks', exact: true }).click();
  await expect(manual).toHaveValue('Impressora Epson L3250 + cabo USB + fonte');
  await expect(checklist.getByRole('checkbox', { name: 'Carcaça Trincada', exact: true })).toBeVisible();
  await expect(checklist.getByRole('checkbox', { name: 'Carcaça Trincada / Quebrada', exact: true })).toHaveCount(0);
});
