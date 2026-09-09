import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('Empresa persiste alterações e abas sem edição não exibem a barra geral de salvar', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();

  const form = page.locator('form.settings-form');
  const saveBar = form.locator('.actions');
  const tradeName = `ARL Empresa E2E ${Date.now()}`;

  await expect(page.locator('.arl-settings-tab[data-section="company"]')).toHaveClass(/active/);
  await expect(form.getByRole('note')).toContainText('não são impressos nos PDFs porque o papel timbrado já traz essas informações');
  const streetWidth = await form.getByLabel('Endereço').evaluate((el) => el.getBoundingClientRect().width);
  const stateWidth = await form.getByLabel('Estado').evaluate((el) => el.getBoundingClientRect().width);
  const postalWidth = await form.getByLabel('CEP (somente números)').evaluate((el) => el.getBoundingClientRect().width);
  expect(streetWidth).toBeGreaterThan(stateWidth);
  expect(streetWidth).toBeGreaterThan(postalWidth);
  const secondary = form.locator('.company-secondary-fields');
  const complement = secondary.locator('input[name="complement"]');
  const instagram = secondary.locator('input[name="instagram"]');
  const googleReview = secondary.locator('input[name="google_review"]');
  await expect(secondary).not.toHaveAttribute('open', '');
  await expect(complement).toBeHidden();
  await expect(instagram).toBeHidden();
  await expect(googleReview).toBeHidden();
  await secondary.getByText('Informações complementares', { exact: true }).click();
  await expect(complement).toBeVisible();
  await expect(instagram).toBeVisible();
  await expect(googleReview).toBeVisible();
  await expect(saveBar).toBeVisible();
  await form.getByLabel('Nome fantasia').fill(tradeName);

  const savedResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/settings') && response.request().method() === 'PUT',
  );
  await form.getByRole('button', { name: 'Salvar configurações' }).click();
  expect((await savedResponse).status()).toBe(200);
  await expect(form.getByText('Configurações salvas com segurança.')).toBeVisible();
  await expect(form.getByLabel('Nome fantasia')).toHaveValue(tradeName);

  await page.reload();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await expect(page.locator('form.settings-form').getByLabel('Nome fantasia')).toHaveValue(tradeName);

  await page.locator('.arl-settings-tab[data-section="notifications"]').click();
  await expect(page.locator('form.settings-form .actions')).toBeHidden();

  await page.locator('.arl-settings-tab[data-section="storage"]').click();
  await expect(page.locator('form.settings-form .actions')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Fotos e Armazenamento' })).toBeVisible();
});

test('configurações mantém somente o termo na aba Documentos', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.locator('.arl-settings-tab[data-section="documents"]').click();

  const termTab = page.getByRole('tab', { name: 'Termo de recebimento' });
  const termEditor = page.getByLabel('Texto do termo de recebimento');
  const budgetEditor = page.getByLabel('Texto institucional do orçamento');

  await expect(termTab).toHaveAttribute('aria-selected', 'true');
  await expect(termEditor).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Orçamento', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Modelos de laudos' })).toHaveCount(0);
  await expect(budgetEditor).toBeHidden();
  await expect(termEditor).toHaveJSProperty('scrollHeight', await termEditor.evaluate((el) => el.scrollHeight));
  expect(Math.round(await termEditor.evaluate((el) => el.getBoundingClientRect().height))).toBeGreaterThanOrEqual(220);

  await expect(page.getByRole('heading', { name: 'Modelos de laudos', exact: true })).toBeHidden();
});

test('configurações oculta integralmente Mensagens da navegação', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await expect(page.locator('.arl-settings-tab[data-section="messages"]')).toHaveCount(0);
  await expect(page.locator('.arl-opening-message-panel')).toBeHidden();
  await expect(page.locator('.arl-message-subnav [data-msg-tab="opening"]')).toHaveCount(0);
  await expect(page.getByLabel('Mensagem de acompanhamento')).toBeHidden();
  await expect(page.locator('.arl-message-subnav')).toBeHidden();
  await expect(page.locator('.arl-post-message-panel')).toBeHidden();
});

test('configurações exibe somente as oito abas permitidas em uma linha', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  const tabs = page.locator('.arl-settings-tab');
  await expect(tabs).toHaveCount(8);
  await expect(tabs.locator('b')).toHaveText(['Empresa', 'Identidade', 'Documentos', 'Garantia', 'Notificações', 'Backup', 'Sistema', 'Armazenamento']);
  const tops = await tabs.evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  for (const hidden of ['orders', 'messages', 'finance']) {
    await expect(page.locator(`.arl-settings-tab[data-section="${hidden}"]`)).toHaveCount(0);
  }

  await expect(page.locator('.arl-order-subtabs')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Equipamentos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Fabricantes', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Checklist de Entrada', exact: true })).toHaveCount(0);
  await page.locator('.arl-settings-tab[data-section="warranty"]').click();
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
