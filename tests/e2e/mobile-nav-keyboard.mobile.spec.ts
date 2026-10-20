import { expect, test } from '@playwright/test';
import { login } from './helpers';

// Browser simulation covers geometry and the visualViewport reaction.
// Final acceptance of the physical iOS keyboard remains a manual check.
test('barra ARL compacta preserva 5 ações e compensa teclado virtual', async ({ page }) => {
  await login(page);
  const bar = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  const labels = ['Painel', 'Clientes', 'Abrir OS', 'Gastos', 'Menu'];
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(bar.locator('button')).toHaveCount(5);
    for (const label of labels) await expect(bar.getByRole('button', { name: label })).toBeVisible();
    const metrics = await bar.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return {
        height: rect.height,
        width: rect.width,
        right: rect.right,
        left: rect.left,
        bottomGap: innerHeight - rect.bottom,
        position: getComputedStyle(element).position,
      };
    });
    expect(metrics.position).toBe('fixed');
    expect(metrics.height).toBeLessThan(105);
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(width + 1);
    expect(metrics.bottomGap).toBeGreaterThanOrEqual(7);
    expect(metrics.bottomGap).toBeLessThanOrEqual(9);
  }

  await bar.getByRole('button', { name: 'Abrir OS' }).click();
  const field = page.locator('.shell main textarea').first();
  await expect(field).toBeVisible();
  await field.focus();

  // Imitate iOS keyboard changing only the visual viewport, not the layout viewport.
  await page.evaluate(() => {
    const viewport = window.visualViewport;
    if (!viewport) throw new Error('visualViewport not supported');
    Object.defineProperty(viewport, 'height', { configurable: true, get: () => window.innerHeight - 320 });
    Object.defineProperty(viewport, 'offsetTop', { configurable: true, get: () => 0 });
    viewport.dispatchEvent(new Event('resize'));
  });
  await expect.poll(() => bar.evaluate(element =>
    Number.parseFloat(element.style.getPropertyValue('--arl-mobile-keyboard-offset')),
  )).toBe(320);

  await page.evaluate(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    delete (viewport as unknown as { height?: number }).height;
    delete (viewport as unknown as { offsetTop?: number }).offsetTop;
    viewport.dispatchEvent(new Event('resize'));
  });
  await field.blur();
  await expect.poll(() => bar.evaluate(element =>
    Number.parseFloat(element.style.getPropertyValue('--arl-mobile-keyboard-offset')),
  )).toBe(0);
});

test('câmera nativa fica disponível quando getUserMedia é bloqueado no HTTP local', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
  });
  await login(page);
  const nav = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await nav.getByRole('button', { name: 'Abrir OS' }).click();
  await page.getByRole('button', { name: /Usar câmera/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Capturar foto' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('A câmera ao vivo exige HTTPS. Use a câmera nativa do celular.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Tirar foto no celular' })).toBeVisible();
  const native = dialog.locator('input[type="file"]');
  await expect(native).toHaveAttribute('capture', 'environment');
  await expect(native).toHaveAttribute('accept', 'image/*');

  await native.setInputFiles({
    name: 'foto-camera.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+lC1sAAAAASUVORK5CYII=', 'base64'),
  });
  await expect(dialog).toHaveCount(0);
  await expect(page.getByAltText('Prévia da foto 1')).toBeVisible();
});
