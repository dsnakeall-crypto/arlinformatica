import { expect, type Page } from '@playwright/test';

export const password = 'E2e-Segura-2026!';

export async function login(page: Page, login = 'e2e.master') {
  await page.goto('/');
  const result = await page.evaluate(async ({ login, password }) => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch('/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
      body: JSON.stringify({ login, password }),
    });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  }, { login, password });
  expect(result.status, JSON.stringify(result.body)).toBe(200);
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Notificações', exact: true })).toBeVisible();
}

export async function api(page: Page, path: string, method = 'GET', body?: unknown) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { path, method, body });
}

export function uniqueDocument(seed = Date.now()) {
  const raw = String(seed).replace(/\D/g, '');
  const digits = raw.padStart(9, '0').slice(-9);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  const d1 = ((sum * 10) % 11) % 10;
  sum = 0;
  const ten = digits + d1;
  for (let i = 0; i < 10; i++) sum += Number(ten[i]) * (11 - i);
  return ten + (((sum * 10) % 11) % 10);
}
