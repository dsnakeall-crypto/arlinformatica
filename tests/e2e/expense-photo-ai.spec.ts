import { test, expect } from '@playwright/test';
import { api, login } from './helpers';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const info = { enabled: true, model: 'gemini-3.1-pro-preview', monthly_reads: 20, used_reads: 0, monthly_micro_usd: 1000000, used_micro_usd: 0 };
const fixture = path.resolve('tests/fixtures/expense-invoice.png');

// Provider transport is simulated; the financial save below uses the real local API.
test('Gemini: consentimento, campos faltantes, revisão e cadastro real sem enviar chave ao navegador', async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const bank = (await api(page, '/expense-control/catalogs/institutions', 'POST', { name: 'AI ' + stamp, active: true, due_day: 12, color: '#c9002c' })).body;
  const type = (await api(page, '/expense-control/catalogs/types', 'POST', { name: 'Tipo AI ' + stamp, active: true })).body;
  await page.route('**/api/expense-control/photo-ai', route => route.fulfill({ json: info }));
  let calls = 0;
  await page.route('**/api/expense-control/photo-ai/read', async route => {
    calls++;
    expect(route.request().headers()).not.toHaveProperty('x-goog-api-key');
    expect(route.request().headers()['content-type']).toContain('multipart/form-data');
    await route.fulfill({ json: { purchases: [{ name: 'LOJA GELADEIRA', amount_cents: 12050, first_number: 3, installment_count: 10, purchased_on: '10/08', warnings: [], duplicate: false, source_line: '' }, { name: 'Compra pouco legível', amount_cents: null, first_number: 1, installment_count: 1, purchased_on: null, warnings: ['Confira o valor'], duplicate: false, source_line: '' }], warnings: [], source_hash: createHash('sha256').update(readFileSync(fixture)).digest('hex'), replayed: false, usage: { ...info, used_reads: 1, used_micro_usd: 30000 } } });
  });
  await page.getByRole('button', { name: 'Controle de Gasto', exact: true }).click();
  await page.getByRole('button', { name: 'Cadastrar por foto', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Gemini Pro' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByLabel('Foto da fatura', { exact: true }).setInputFiles(fixture);
  await expect(dialog.getByRole('button', { name: 'Ler com Gemini', exact: true })).toBeDisabled();
  expect(calls).toBe(0);
  await dialog.getByRole('checkbox', { name: /Autorizo enviar esta foto/ }).check();
  await page.screenshot({ path: 'output/gemini/escolha-desktop.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Ler com Gemini', exact: true }).click();
  await expect(dialog.locator('.cg-photo-row')).toHaveCount(2);
  await expect(dialog.getByRole('button', { name: 'Texto lido' })).toHaveCount(0);
  await expect(dialog.getByLabel('Valor da parcela da compra 2', { exact: true })).toHaveValue('');
  await expect(dialog.getByLabel('Conferi a compra 2', { exact: true })).toBeDisabled();
  await dialog.getByRole('combobox', { name: 'Instituição', exact: true }).selectOption(String(bank.id));
  await dialog.getByRole('combobox', { name: 'Tipo padrão', exact: true }).selectOption(String(type.id));
  await dialog.getByRole('combobox', { name: 'Responsável padrão', exact: true }).selectOption('shared');
  await dialog.getByLabel('Valor da parcela da compra 2', { exact: true }).fill('8990');
  await dialog.getByLabel('Conferi a compra 1', { exact: true }).check();
  await dialog.getByLabel('Conferi a compra 2', { exact: true }).check();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByRole('button', { name: 'Salvar 2 compras' })).toBeVisible();
  await page.screenshot({ path: 'output/gemini/revisao-mobile.png', fullPage: true });
  const response = page.waitForResponse(r => r.url().endsWith('/photo-imports') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Salvar 2 compras' }).click();
  const saved = await response;
  expect(saved.status()).toBe(201);
  const body = await saved.json();
  await expect(dialog).not.toBeVisible();
  expect((await api(page, '/expense-control/debts/' + body.debt_ids[0])).body.installments).toHaveLength(8);
  expect(calls).toBe(1);
});

test('Gemini: falha simulada permite leitura real no aparelho sem repetir chamada paga', async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  await page.route('**/api/expense-control/photo-ai', route => route.fulfill({ json: info }));
  let calls = 0;
  await page.route('**/api/expense-control/photo-ai/read', route => { calls++; return route.fulfill({ status: 503, json: { message: 'Gemini indisponível. Use a leitura no aparelho.' } }); });
  await page.getByRole('button', { name: 'Controle de Gasto', exact: true }).click();
  await page.getByRole('button', { name: 'Cadastrar por foto', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Gemini Pro' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByLabel('Foto da fatura', { exact: true }).setInputFiles(fixture);
  await dialog.getByRole('checkbox', { name: /Autorizo enviar esta foto/ }).check();
  await dialog.getByRole('button', { name: 'Ler com Gemini', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Gemini indisponível');
  await dialog.getByRole('button', { name: 'No aparelho' }).click();
  await dialog.getByRole('button', { name: 'Ler compras', exact: true }).click();
  await expect(dialog.locator('.cg-photo-row')).toHaveCount(2, { timeout: 90000 });
  await expect(dialog.getByLabel('Valor da parcela da compra 1', { exact: true })).toHaveValue('120,50');
  expect(calls).toBe(1);
});
