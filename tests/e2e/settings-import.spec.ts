import { expect, test } from '@playwright/test';
import { login, uniqueDocument } from './helpers';

test('Configurações importa CSV e mostra resumo, duplicidade e erros', async ({ page }) => {
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.locator('[data-section="system"]').click();
  const card = page.getByRole('region', { name: 'Importar clientes por CSV' });
  const document = uniqueDocument();
  const buffer = Buffer.from(`\uFEFFNome;CPF/CNPJ;Endereço;Número;Bairro;Cidade;UF;CEP;Celular\r\nJosé CSV;${document};;;;;;;11999991234\r\nDuplicado;${document};;;;;;;11999991234\r\nSem documento;;;;;;;;11999991234\r\n`);
  await card.getByLabel('Arquivo CSV de clientes').setInputFiles({ name: 'clientes.csv', mimeType: 'text/csv', buffer });
  await card.getByRole('button', { name: 'Importar clientes', exact: true }).click();
  await expect(card.getByRole('status')).toContainText('Linhas lidas: 3 · Clientes criados: 1 · Ignorados por duplicidade: 1 · Erros: 1');
  await expect(card.getByRole('status')).toContainText('Linha 4: CPF/CNPJ é obrigatório.');
  await page.screenshot({ path: 'test-results/settings-import-desktop.png', fullPage: true });
  await card.getByLabel('Arquivo CSV de clientes').setInputFiles({ name: 'errado.csv', mimeType: 'text/csv', buffer: Buffer.from('Nome;Documento\r\n') });
  await card.getByRole('button', { name: 'Importar clientes', exact: true }).click();
  await expect(card.getByRole('alert')).toContainText('Cabeçalho inválido');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox').selectOption('mobile');
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  const closeMenu = page.getByRole('button', { name: 'Fechar menu', exact: true });
  await expect(closeMenu).toBeInViewport();
  await closeMenu.click();
  await expect(page.locator('aside')).not.toHaveClass(/open/);
  await expect(card.getByRole('button', { name: 'Importar clientes', exact: true })).toBeVisible();
  const bounds = await card.evaluate(element => ({ width: element.clientWidth, content: element.scrollWidth }));
  expect(bounds.content).toBeLessThanOrEqual(bounds.width + 1);
  await page.screenshot({ path: 'test-results/settings-import-mobile.png', fullPage: true });
});

test('Administrador não vê a importação de clientes', async ({ page }) => {
  await login(page, 'e2e.admin');
  await page.locator('aside').getByRole('button', { name: 'Configurações', exact: true }).click();
  await expect(page.getByLabel('Nome fantasia')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Importar clientes por CSV' })).toHaveCount(0);
});
