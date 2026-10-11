import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { api, login, uniqueDocument } from './helpers';

/**
 * Auditoria geométrica da reforma mobile (plano 09/10/2026, Fase 1/7).
 * Abre cada tela já carregada em larguras reais e registra overflow, elementos fora da tela,
 * alvos de toque < 44 px e botões só de ícone sem nome acessível. AUDIT_LABEL=antes|depois.
 */
const label = process.env.AUDIT_LABEL || 'depois';
const dir = 'output/reforma-20261009/auditoria-' + label;
const widths = [320, 360, 375, 390, 414, 430, 768, 1024];

async function measure(page: Page) {
  return page.evaluate(() => {
    const vw = innerWidth;
    const visible = (el: Element) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden],[aria-hidden="true"]'); };
    const name = (el: Element) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
    const scope = [...document.querySelectorAll('main *, [role="dialog"] *, nav *')].filter(el => !el.closest('aside:not(.open)') && visible(el));
    const outside = scope.filter(el => { const r = el.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1; }).filter(el => !el.closest('[class*="scroll"], .cg-table-wrap, table, [data-scroll-x]')).map(name);
    const targets = scope.filter(el => el.matches('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab]'));
    const small = targets.filter(el => { const r = el.getBoundingClientRect(); return el.matches('input[type=checkbox], input[type=radio]') ? false : r.height < 44 && r.width < 200 || r.height < 36; }).map(name);
    const unnamed = targets.filter(el => el.matches('button,[role=button]') && !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title') && !el.getAttribute('aria-labelledby')).map(el => el.outerHTML.slice(0, 80));
    const clipped = scope.filter(el => el.children.length === 0 && (el.textContent || '').trim() && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible').map(name);
    return { overflowX: document.documentElement.scrollWidth > vw + 1, scrollWidth: document.documentElement.scrollWidth, outside: [...new Set(outside)].slice(0, 15), small: [...new Set(small)], smallCount: small.length, unnamed: [...new Set(unnamed)].slice(0, 10), clipped: [...new Set(clipped)].slice(0, 15) };
  });
}

test('auditoria mobile de todas as telas carregadas', async ({ page }) => {
  test.setTimeout(900_000);
  fs.mkdirSync(dir, { recursive: true });
  await login(page);
  const stamp = Date.now();
  const client = await api(page, '/clients', 'POST', { name: 'Cliente Auditoria Mobile Nome Bem Comprido Para Testar Quebra ' + stamp, document: uniqueDocument(stamp), phone: '35999995555', postal_code: '37160000', street: 'Rua das Palmeiras Imperiais do Bairro Alto', number: '1234', district: 'Jardim das Acácias', city: 'Campos Gerais', state: 'MG' });
  expect(client.status).toBe(201);
  const equipment = (await api(page, '/catalogs/equipment')).body;
  const order = await api(page, '/orders', 'POST', { client_id: client.body.id, equipment_type_id: equipment[0].id, attendance_type: 'external', reported_problem: 'Notebook não liga após queda de energia; cliente relata cheiro de queimado e tela piscando antes de desligar.', checklist: [] });
  expect(order.status).toBe(201);
  const routes: [string, string, string][] = [
    ['home', '/', '.arl-mobile-home, main'],
    ['ordens', '/orders', 'main'],
    ['os-detalhe', '/orders/' + order.body.id, 'main'],
    ['clientes', '/clients', 'main'],
    ['nova-os', '/new', 'main'],
    ['financeiro', '/finance', 'main'],
    ['pos-venda', '/post-sale', 'main'],
    ['servicos', '/services', 'main'],
    ['produtos', '/products', 'main'],
    ['fornecedores', '/suppliers', 'main'],
    ['configuracoes', '/settings', 'main'],
    ['gastos', '/expense-control', 'main'],
  ];
  const report: Record<string, unknown> = {};
  for (const [key, url, ready] of routes) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width >= 768 ? 1024 : 800 });
      await page.goto(url);
      await page.locator(ready).first().waitFor();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300); // auditoria: estabilizar fontes/imagens antes de medir (não é asserção de teste funcional)
      report[key + '@' + width] = await measure(page);
      if ([320, 390, 768].includes(width)) await page.screenshot({ path: `${dir}/${key}-${width}.png`, fullPage: true });
    }
  }
  fs.writeFileSync(`${dir}/medidas.json`, JSON.stringify(report, null, 1));
});
