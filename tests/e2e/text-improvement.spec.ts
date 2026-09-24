import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('melhora problema relatado e laudo final sem substituir o texto automaticamente', async ({ page }) => {
  await login(page);
  let fail = false;
  await page.route('**/api/text-improvements', async (route) => {
    if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Não foi possível melhorar o texto agora.' }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ suggestions: { simples: 'Texto simples.', tecnica: 'Texto técnico.' } }) });
  });
  await page.getByTestId('page-header').getByRole('button', { name: 'Nova OS' }).click();
  const problem = page.getByLabel('Problema relatado *');
  await problem.fill('texto original');
  const problemTools = problem.locator('..');
  await problemTools.getByRole('button', { name: 'Melhorar texto' }).click();
  await expect(problemTools.getByText('Texto simples.', { exact: true })).toBeVisible();
  await expect(problemTools.getByText('Texto técnico.', { exact: true })).toBeVisible();
  await problemTools.getByRole('button', { name: 'Manter o meu' }).click();
  await expect(problem).toHaveValue('texto original');
  await problemTools.getByRole('button', { name: 'Melhorar texto' }).click();
  await problemTools.getByText('Simples', { exact: true }).locator('..').getByRole('button', { name: 'Usar este' }).click();
  await expect(problem).toHaveValue('Texto simples.');
  fail = true;
  await problemTools.getByRole('button', { name: 'Melhorar texto' }).click();
  await expect(problemTools.getByText('Não foi possível melhorar o texto agora.', { exact: true })).toBeVisible();
  await expect(problem).toHaveValue('Texto simples.');

  const client = await api(page, '/clients', 'POST', { name: 'Cliente IA', document: uniqueDocument(Date.now()), phone: '35999995555', street: 'Rua IA' });
  const equipment = await api(page, '/catalogs/equipment');
  const order = await api(page, '/orders', 'POST', { client_id: client.body.id, equipment_type_id: equipment.body[0].id, attendance_type: 'bench', reported_problem: 'Relato inicial', checklist: [] });
  await page.getByRole('button', { name: 'Ordens' }).click();
  await page.getByRole('tablist', { name: 'Filtrar ordens' }).getByRole('button', { name: 'Todas', exact: true }).click();
  await page.locator('.order-row').filter({ hasText: 'Cliente IA' }).getByRole('button', { name: 'Ver OS' }).click();
  const report = page.locator('.arl-od-report textarea');
  await report.fill('laudo original');
  const reportTools = page.locator('.arl-od-report .arl-text-improvement');
  fail = false;
  await reportTools.getByRole('button', { name: 'Melhorar texto' }).click();
  await expect(reportTools.getByText('Texto simples.', { exact: true })).toBeVisible();
  await expect(reportTools.getByText('Texto técnico.', { exact: true })).toBeVisible();
  await reportTools.getByText('Técnica', { exact: true }).locator('..').getByRole('button', { name: 'Usar este' }).click();
  await expect(report).toHaveValue('Texto técnico.');
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  const finalization = page.getByRole('dialog', { name: 'FINALIZAÇÃO DA OS' });
  await expect(finalization).toBeVisible();
  await expect(finalization.getByRole('button', { name: 'Melhorar texto' })).toHaveCount(0);
  await expect(report).toHaveValue('Texto técnico.');
  expect(order.status).toBe(201);
});
