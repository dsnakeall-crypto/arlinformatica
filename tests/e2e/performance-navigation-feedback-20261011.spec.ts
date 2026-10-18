import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { login } from './helpers';

test('Mede feedback visual dos dez menus sem espera artificial no tempo de clique', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.evaluate(() => {
    localStorage.setItem('arl-layout-mode', 'desktop');
    localStorage.setItem('arl-appearance-v1', JSON.stringify({ mode: 'clean', color: 'red' }));
  });
  await page.reload();
  const nav = page.getByRole('navigation', { name: 'Menu principal' });
  await expect(nav).toBeVisible();
  await page.evaluate(() => {
    (window as any).__arlLongTasks = [];
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) (window as any).__arlLongTasks.push({ start: entry.startTime, ms: entry.duration });
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch { /* Browser without longtask observer */ }
    }
  });
  const report: Array<{ module: string; feedbackMs: number; navigationMs: number; apiCalls: number; longestApiMs: number; longTasks: number }> = [];
  for (const label of ['Painel','Ordens','Clientes','Serviços','Produtos','Fornecedores','Financeiro','Controle de Gasto','Pós-Venda','Configurações']) {
    const button = nav.getByRole('button', { name: label, exact: true });
    await expect(button).toBeVisible();
    const requests: number[] = [];
    const started = new Map<object, number>();
    const onRequest = (req: any) => { if (req.url().includes('/api/')) started.set(req, Date.now()); };
    const onFinished = (req: any) => { if (started.has(req)) requests.push(Date.now() - started.get(req)!); };
    page.on('request', onRequest);
    page.on('requestfinished', onFinished);
    page.on('requestfailed', onFinished);
    const from = Date.now();
    await button.click();
    await expect(button).toHaveClass(/active/);
    const feedbackMs = Date.now() - from;
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const navigationMs = Date.now() - from;
    await page.waitForTimeout(400); // collection period, excluded from navigationMs
    const longTasks = await page.evaluate(() => (window as any).__arlLongTasks.length as number);
    report.push({ module: label, feedbackMs, navigationMs, apiCalls: requests.length, longestApiMs: Math.max(0, ...requests), longTasks });
    page.off('request', onRequest);
    page.off('requestfinished', onFinished);
    page.off('requestfailed', onFinished);
  }
  mkdirSync('output/performance-audit-20261011', { recursive: true });
  writeFileSync('output/performance-audit-20261011/navigation-feedback-local.json', JSON.stringify(report, null, 2));
  console.log('ARL_FEEDBACK_PROFILE', JSON.stringify(report));
  expect(report).toHaveLength(10);
});
