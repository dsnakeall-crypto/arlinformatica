import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('Financeiro busca apenas a seção aberta e atualiza o mês sem respostas antigas', async ({ page }) => {
  await login(page);
  const requests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/finance/')) requests.push(url.pathname + url.search);
  });
  await page.getByRole('button', { name: 'Financeiro', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Formas de pagamento', exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatch(/^\/api\/finance\/month\?period=/);
  await page.getByRole('button', { name: 'Mensal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Serviços e produtos', exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: 'Caixa Diário', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Caixa Diário automático', exact: true })).toBeVisible();
  expect(requests.filter(path => path === '/api/finance/daily')).toHaveLength(1);
  expect(requests.filter(path => path === '/api/finance/receivables')).toHaveLength(0);
  await page.getByRole('button', { name: 'A Receber', exact: true }).click();
  await expect(page.locator('.finance-receivables .finance-cards')).toBeVisible();
  expect(requests.filter(path => path === '/api/finance/receivables')).toHaveLength(1);
  await page.getByRole('button', { name: 'Relatórios', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gerar PDF privado' })).toBeVisible();
  expect(requests.filter(path => path.startsWith('/api/finance/month'))).toHaveLength(2);
  expect(requests.some(path => path === '/api/finance/overview')).toBe(false);

  // Release a deliberately late old-period response after the next period succeeds.
  let releaseOld!: () => void;
  const oldResponse = new Promise<void>(resolve => { releaseOld = resolve; });
  await page.route('**/api/finance/month?period=2025-01', async route => {
    await oldResponse;
    await route.fulfill({ json: { total_cents: 99999999, methods: {}, daily: {} } }).catch(() => undefined);
  });
  await page.route('**/api/finance/month?period=2025-02', route => route.fulfill({ json: { total_cents: 12345, methods: {}, daily: {} } }));
  await page.getByRole('button', { name: 'Visão Geral', exact: true }).click();
  const firstRequest = page.waitForRequest('**/api/finance/month?period=2025-01');
  await page.getByLabel('Mês exibido').fill('2025-01');
  await firstRequest;
  await page.getByLabel('Mês exibido').fill('2025-02');
  const hero = page.getByRole('region', { name: 'Resumo financeiro do mês' });
  await expect(hero).toContainText('R$ 123,45');
  releaseOld();
  await expect(hero).not.toContainText('999.999,99');
  await expect(page.getByRole('heading', { name: 'Formas de pagamento', exact: true })).toBeVisible();
});
