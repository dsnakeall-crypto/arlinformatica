import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('Configurações organiza cartões e Sistema; clientes alinham colunas em resoluções desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await login(page);
  const marker = `Alinhamento ${Date.now()}`;
  for (const [index, phone] of ['3538531558', '35988887777'].entries()) {
    const result = await api(page, '/clients', 'POST', {
      name: `${marker} ${index}`, document: uniqueDocument(Date.now() + index), phone,
      postal_code: '37160000', street: `Rua ${index}`, number: '1', district: 'Centro',
      city: 'Campos Gerais', state: 'MG', complement: '',
    });
    expect(result.status).toBe(201);
  }
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await page.getByLabel('Buscar clientes').fill(marker);
  const rows = page.locator('.clients-list-panel article.clients-row');
  await expect(rows).toHaveCount(2);
  for (const width of [1280, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const columns = await rows.evaluateAll(items => items.map(row =>
      Array.from(row.querySelectorAll('.clients-separator, .clients-phone, .clients-address')).map(el => {
        const r = el.getBoundingClientRect();
        const parent = row.getBoundingClientRect();
        return { x: r.x, centerY: r.y + r.height / 2 - parent.y - parent.height / 2,
          visible: getComputedStyle(el).display !== 'none' && r.width > 0 && r.height > 0 };
      }),
    ));
    console.log('E11_CLIENT_COLUMNS', JSON.stringify({width,columns}));
    expect(columns[0].length).toBe(5);
    columns[0].forEach((column, index) => {
      // Separadores ocultos têm retângulo (0,0) e não podem validar alinhamento.
      expect(column.visible).toBe(columns[1][index].visible);
      if (!column.visible) return;
      expect(Math.abs(column.x - columns[1][index].x)).toBeLessThan(1);
      expect(Math.abs(column.centerY)).toBeLessThan(1);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('tab', { name: 'Identidade', exact: true }).click();
  const cards = page.locator('.settings-two-column > .settings-subcard');
  await expect(cards).toHaveCount(2);
  const desktop = await cards.evaluateAll(items => items.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
  expect(desktop[0].y).toBe(desktop[1].y);
  expect(desktop[1].x).toBeGreaterThan(desktop[0].x);
  await page.getByRole('tab', { name: 'Mensagens', exact: true }).click();
  const toggle = page.getByRole('switch', { name: 'Abrir WhatsApp automaticamente após criar OS' });
  const checked = await toggle.isChecked();
  await toggle.setChecked(!checked);
  expect(await toggle.isChecked()).toBe(!checked);
  await toggle.setChecked(checked);
  await toggle.focus();
  await page.keyboard.press('Space');
  expect(await toggle.isChecked()).toBe(!checked);
  await page.keyboard.press('Space');
  expect(await toggle.isChecked()).toBe(checked);
  await expect(cards).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem('arl-layout-mode', 'mobile'));
  await page.reload();
  // 09/10/2026: no celular, Configurações abre por categorias em cartões, com retorno explícito.
  await page.getByRole('navigation', { name: 'Categorias de Configurações' }).locator('[data-section="messages"]').click();
  await expect(page.locator('.arl-settings-mobile-back')).toBeVisible();
  const mobile = await cards.evaluateAll(items => items.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
  expect(mobile[0].x).toBe(mobile[1].x);
  expect(mobile[1].y).toBeGreaterThan(mobile[0].y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
