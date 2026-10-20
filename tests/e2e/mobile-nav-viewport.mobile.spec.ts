import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('barra não acompanha o teclado iOS e retorna ao rodapé ao fechar', async ({ page }) => {
  // Fixture visualViewport: apenas simula as métricas do teclado. Aceite nativo já aprovado no iPhone.
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  });
  await login(page);
  const nav = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
  await nav.getByRole('button', { name: 'Abrir OS' }).click();
  const input = page.locator('main textarea').first();
  await expect(input).toBeVisible();
  await input.focus();
  const baseline = await page.evaluate(() => window.innerHeight);
  for (const [height, offsetTop] of [[450, 0], [360, 70], [540, 0], [410, 35]]) {
    await page.evaluate(({ height, offsetTop }) => {
      const viewport = window.visualViewport!;
      Object.assign(viewport, { height, offsetTop });
      viewport.dispatchEvent(new Event('resize'));
      viewport.dispatchEvent(new Event('scroll'));
    }, { height, offsetTop });
    await expect.poll(async () => nav.evaluate(element =>
      Number.parseFloat(element.style.getPropertyValue('--arl-mobile-keyboard-offset')),
    )).toBe(Math.max(0, baseline - height - offsetTop));
  }
  await page.evaluate(height => {
    Object.assign(window.visualViewport!, { height, offsetTop: 0 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  }, baseline);
  await input.blur();
  await expect.poll(async () => nav.evaluate(element =>
    Number.parseFloat(element.style.getPropertyValue('--arl-mobile-keyboard-offset')),
  )).toBe(0);
  await expect.poll(async () => nav.evaluate(element =>
    Math.abs((window.innerHeight - element.getBoundingClientRect().bottom) - Number.parseFloat(getComputedStyle(element).bottom)),
  )).toBeLessThan(1.5);
});

test('barra fixa: rolagens repetidas, rotas ARL, rotação, fim da página e visual 3D', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page);
  let scrolled = false;
  for (const path of ['/', '/clients', '/new', '/orders', '/finance', '/services', '/products', '/suppliers', '/settings', '/users', '/post-sale']) {
    await page.goto(path);
    const nav = page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' });
    await expect(nav).toBeVisible();
    await expect(nav.locator('button')).toHaveCount(5);
    await expect(page.locator('main h1, main h2').first()).toBeVisible();
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 664 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      for (const y of [0, 300, 900, 0, 900, 300, 0, 99999]) {
        await page.evaluate(y => window.scrollTo(0, y), y);
        await expect.poll(() => nav.evaluate(element => Math.abs((window.visualViewport!.offsetTop + window.visualViewport!.height - element.getBoundingClientRect().bottom) - Number.parseFloat(getComputedStyle(element).bottom)))).toBeLessThan(1.5);
        const metrics = await nav.evaluate(element => ({
          position: getComputedStyle(element).position,
          y: scrollY,
          radius: getComputedStyle(element.querySelector('.arl-nav-icon-disc')!).borderRadius,
          shadow: getComputedStyle(element.querySelector('.arl-nav-icon-disc')!).boxShadow,
        }));
        scrolled ||= metrics.y > 200;
        expect(metrics.position).toBe('fixed');
        expect(metrics.radius).toBe('50%');
        expect(metrics.shadow).not.toBe('none');
      }
    }
    if (path === '/new') {
      await page.addStyleTag({ content: '.arl-global-mobile-nav .arl-nav-caption{font-size:26px!important}' });
      // getComputedStyle serializa menos casas decimais que DOMRect: comparar centésimos de px.
      await expect.poll(() => nav.evaluate(element => Math.round((parseFloat(getComputedStyle(document.querySelector('.shell>main')!).paddingBottom) - element.getBoundingClientRect().height) * 100) / 100)).toBeGreaterThanOrEqual(12);
      const last = page.locator('main button:visible').last();
      await last.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect.poll(async () => (await last.boundingBox())!.y + (await last.boundingBox())!.height - (await nav.boundingBox())!.y).toBeLessThanOrEqual(0);
    }
  }
  expect(scrolled).toBe(true);
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('/new');
  await expect(page.getByRole('navigation', { name: 'Navegação Mobile / Tablet' }).locator('button')).toHaveCount(5);
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.screenshot({ path: 'output/mobile-nav-viewport-final.png' });
});
