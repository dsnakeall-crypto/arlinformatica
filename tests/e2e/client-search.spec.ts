import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('Nova OS pesquisa clientes desde a primeira letra e refina a cada caractere', async ({ page }) => {
  await login(page);

  const document = uniqueDocument(20260905);
  const created = await api(page, '/clients', 'POST', {
    name: 'Alpha Busca E2E',
    document,
    phone: '35999997777',
    postal_code: '37500000',
    street: 'Rua da Busca',
    number: '10',
    district: 'Centro',
    city: 'Itajubá',
    state: 'MG',
    complement: '',
  });
  expect(created.status).toBe(201);

  await page.getByRole('button', { name: 'Nova OS', exact: true }).first().click();
  const search = page.locator('.arl-client-search input');
  await expect(search).toBeVisible();

  const firstLetterResponse = page.waitForResponse((response) => response.url().includes('/api/clients?q=A&per_page=100') && response.ok());
  await search.fill('A');
  await firstLetterResponse;
  const result = page.locator('.arl-client-results button').filter({ hasText: 'Alpha Busca E2E' });
  await expect(result).toBeVisible();

  const refinedResponse = page.waitForResponse((response) => response.url().includes('/api/clients?q=Al&per_page=100') && response.ok());
  await search.fill('Al');
  await refinedResponse;
  await expect(result).toBeVisible();

  await result.click();
  await expect(page.locator('.selected-client-summary')).toContainText('Alpha Busca E2E');
});
