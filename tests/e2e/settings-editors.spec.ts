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
  await expect(form.getByLabel('CNPJ (somente números)')).toHaveValue('18.588.208/0001-39');
  await expect(form.getByLabel('Telefone / WhatsApp')).toHaveValue('(35) 98828-5777');
  await expect(form.getByLabel('CEP (somente números)')).toHaveValue('37160-000');
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
  const response = await savedResponse;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toMatchObject({
    cnpj: '18588208000139',
    phone: '35988285777',
    postal_code: '37160000',
  });
  await expect(form.getByText('Configurações salvas com segurança.')).toBeVisible();
  await expect(form.getByLabel('Nome fantasia')).toHaveValue(tradeName);

  await page.reload();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  const reloadedForm = page.locator('form.settings-form');
  await expect(reloadedForm.getByLabel('Nome fantasia')).toHaveValue(tradeName);
  await expect(reloadedForm.getByLabel('CNPJ (somente números)')).toHaveValue('18.588.208/0001-39');
  await expect(reloadedForm.getByLabel('Telefone / WhatsApp')).toHaveValue('(35) 98828-5777');
  await expect(reloadedForm.getByLabel('CEP (somente números)')).toHaveValue('37160-000');

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

test('nova OS usa descrição manual e estado físico opcional independente do problema', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Nova OS', exact: true }).first().click();
  const manual = page.getByLabel('Equipamento *');
  await expect(manual).toBeVisible();
  await manual.fill('Impressora Epson L3250 + cabo USB + fonte');

  const condition = page.getByLabel('Estado físico do equipamento na entrada');
  await expect(condition).toBeVisible();
  await expect(condition).toHaveAttribute('spellcheck', 'true');
  await expect(condition).toHaveValue('');
  await condition.fill('Tampa riscada e bandeja com marca de queda');
  await expect(page.getByLabel('Problema relatado *')).toHaveValue('');
  await expect(page.locator('.os-form').getByText('CHECKLIST DE ENTRADA')).toHaveCount(0);
});

// Provoke separate mutation/animation frames so a late enhancer cannot restore panels.
async function assertNoLegacyPanelsAcrossObserverCycles(page: import('@playwright/test').Page) {
  const violations = await page.evaluate(async () => {
    const root = document.querySelector('[data-arl-settings-react="1"]')!;
    const unexpected: string[] = [];
    for (let cycle = 0; cycle < 12; cycle++) {
      const probe = document.createElement('span');
      root.append(probe);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (root.querySelector('.arl-opening-message-panel, .arl-post-message-panel, .arl-message-subnav')) unexpected.push(`cycle ${cycle}`);
      probe.remove();
    }
    return unexpected;
  });
  expect(violations).toEqual([]);
}

test('Empresa e Backup permanecem isolados após múltiplos ciclos dos observers', async ({ page }) => {
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Configurações', exact: true }).click();
  await expect(page.getByLabel('Nome fantasia')).toBeVisible();
  const root = page.locator('[data-arl-settings-react="1"]');
  for (const section of ['company', 'backup', 'documents', 'company']) {
    await page.locator(`.arl-settings-tab[data-section="${section}"]`).click();
    if (section === 'company') {
      await expect(root.locator('h2')).toHaveText(['Dados da Empresa']);
      await root.getByText('Informações complementares', { exact: true }).click();
      await expect(root.locator('input[name="instagram"]')).toBeVisible();
      await expect(root.locator('input[name="google_review"]')).toBeVisible();
      await expect(root.locator('textarea')).toHaveCount(0);
    } else if (section === 'backup') {
      await expect(root.getByRole('heading', { name: 'Backup e Restauração' })).toBeVisible();
      await expect(root.getByLabel('Nome fantasia')).toHaveCount(0);
    } else {
      await expect(root.getByLabel('Texto do termo de recebimento')).toBeVisible();
      await expect(root.getByRole('tab', { name: 'Mensagens ao cliente' })).toHaveCount(0);
    }
    await assertNoLegacyPanelsAcrossObserverCycles(page);
    await expect(root.locator('.arl-opening-message-panel, .arl-post-message-panel, .arl-message-subnav')).toHaveCount(0);
  }
});

test('Nova OS não cria seletor de equipamento nem fabricante após os observers', async ({ page }) => {
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Nova OS', exact: true }).click();
  const root = page.locator('[data-arl-new-order-react="1"]');
  const input = root.getByLabel('Equipamento *');
  const details = root.getByLabel('Fabricante / Modelo / Acessórios');
  await input.fill('Notebook + fonte + mouse');
  await details.fill('Dell Inspiron + carregador');
  await expect(root.getByRole('button', { name: 'Usar câmera', exact: false })).toBeVisible();
  for (let cycle = 0; cycle < 4; cycle++) {
    await input.fill(`Notebook + fonte + mouse ${cycle}`);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(root.getByLabel('Equipamento *', { exact: true })).toHaveCount(1);
    await expect(root.getByLabel('Fabricante', { exact: true })).toHaveCount(0);
    await expect(root.getByLabel('Fabricante / Modelo / Acessórios', { exact: true })).toHaveCount(1);
    await expect(root.locator('.arl-deep-catalog-input')).toHaveCount(0);
  }
  await expect(input).toHaveValue('Notebook + fonte + mouse 3');
  await expect(details).toHaveValue('Dell Inspiron + carregador');
});
