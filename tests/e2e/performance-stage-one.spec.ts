import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('Painel consulta a semana uma vez e usa total, não tamanho da página', async ({ page }) => {
  const calls: string[] = [];
  await page.route('**/api/orders?tab=closed_week&per_page=*', async route => {
    calls.push(route.request().url());
    await route.fulfill({ json: { data: [], total: 150 } });
  });
  await login(page);
  const completed = page.locator('.dashboard-cards article').filter({ hasText: 'Concluídos' });
  await expect(completed.locator('strong')).toHaveText('150');
  expect(calls).toHaveLength(1);
  expect(new URL(calls[0]).searchParams.get('per_page')).toBe('100');
});

test('Ordens aguarda 300 ms, cancela busca antiga e pesquisa na página 1', async ({ page }) => {
  await login(page);
  await page.clock.install();
  const calls: string[] = [];
  let releaseOld!: () => void;
  const oldGate = new Promise<void>(resolve => { releaseOld = resolve; });
  await page.route('**/api/orders?*', async route => {
    const term = new URL(route.request().url()).searchParams.get('q');
    calls.push(route.request().url());
    if (term === 'antiga') await oldGate;
    await route.fulfill({ json: { data: [], total: 0, current_page: 1, last_page: 1, per_page: 12, tab_counts: {} } });
  });
  await page.getByRole('button', { name: 'Ordens', exact: true }).click();
  await expect(page.getByText('Nenhuma ordem de serviço encontrada.', { exact: true })).toBeVisible();
  calls.length = 0;
  const search = page.getByPlaceholder('Número da OS ou nome do cliente…');
  await search.fill('a');
  await page.clock.runFor(200);
  await search.fill('antiga');
  await expect(search).toHaveValue('antiga');
  await page.clock.runFor(299);
  expect(calls).toHaveLength(0);
  await page.clock.runFor(1);
  await expect.poll(() => calls.length).toBe(1);
  await search.fill('nova');
  await page.clock.runFor(300);
  await expect.poll(() => calls.length).toBe(2);
  await expect(page.getByText('Nenhuma ordem de serviço encontrada.', { exact: true })).toBeVisible();
  releaseOld();
  expect(new URL(calls[1]).searchParams.get('q')).toBe('nova');
  expect(new URL(calls[1]).searchParams.get('page')).toBe('1');
  await expect(search).toHaveValue('nova');
});
