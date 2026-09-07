import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('Mesa de Chamados permanece no menu e OS Finalizadas continua acessível em Ordens', async ({ page }) => {
  await login(page);

  const deskButton = page.locator('aside').getByRole('button', { name: 'Mesa de Chamados' });
  await expect(deskButton, 'Contrato de navegação: Mesa de Chamados não pode desaparecer do menu').toBeVisible();
  await deskButton.click();
  await expect(page.getByRole('heading', { name: 'Mesa de Chamados', exact: true }), 'Contrato de navegação: botão da Mesa deve abrir a tela operacional').toBeVisible();
  await expect(page.getByRole('heading', { name: 'Em Análise', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aguardando', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Em Serviço', exact: true }), 'Contrato de navegação: Mesa deve preservar a coluna Em Serviço').toBeVisible();

  await page.locator('aside').getByRole('button', { name: 'Ordens de Serviço' }).click();
  await expect(page.getByRole('heading', { name: 'Ordens de Serviço' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'OS FINALIZADAS' })).toBeVisible();

  await page.getByRole('button', { name: 'OS FINALIZADAS' }).click();
  await expect(page.getByText('OS pagas, retiradas e preservadas no histórico.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'OS EM ANDAMENTO' })).toBeVisible();
});
