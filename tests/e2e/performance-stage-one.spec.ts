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
