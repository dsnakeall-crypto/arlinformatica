import { expect, test } from '@playwright/test';
import { api, login } from './helpers';

const defaults = {
  theme_primary: '#087443',
  theme_sidebar: '#063B2D',
  theme_accent: '#28BD65',
};

const customTheme = {
  theme_primary: '#B42318',
  theme_sidebar: '#2B1110',
  theme_accent: '#F5B700',
};

test('tema global pode ser alterado nas Configurações e persiste após recarregar', async ({ page }) => {
  await login(page);
  try {
    await page.getByRole('button', { name: 'Configurações' }).click();
    await expect(page.locator('#theme-settings')).toBeVisible();

    const setColor = async (id: string, value: string) => {
      await page.locator(id).evaluate((element, next) => {
        const input = element as HTMLInputElement;
        input.value = String(next);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
    };

    await setColor('#theme-primary', customTheme.theme_primary);
    await setColor('#theme-sidebar', customTheme.theme_sidebar);
    await setColor('#theme-accent', customTheme.theme_accent);

    const saved = page.waitForResponse((response) => response.url().endsWith('/api/theme') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Salvar cores' }).click();
    expect((await saved).status()).toBe(200);
    await expect(page.locator('.theme-status')).toContainText('Cores salvas para toda a empresa');

    const applied = await page.evaluate(() => ({
      primary: getComputedStyle(document.documentElement).getPropertyValue('--arl-primary').trim(),
      sidebar: getComputedStyle(document.documentElement).getPropertyValue('--arl-sidebar').trim(),
      accent: getComputedStyle(document.documentElement).getPropertyValue('--arl-accent').trim(),
    }));
    expect(applied).toEqual({ primary: customTheme.theme_primary, sidebar: customTheme.theme_sidebar, accent: customTheme.theme_accent });

    const reloadedTheme = page.waitForResponse((response) => response.url().endsWith('/api/theme') && response.request().method() === 'GET');
    await page.reload();
    const themeResponse = await reloadedTheme;
    expect(themeResponse.status()).toBe(200);
    expect(await themeResponse.json()).toEqual(customTheme);
    await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
    await page.waitForFunction(
      (expected) => getComputedStyle(document.documentElement).getPropertyValue('--arl-primary').trim() === expected,
      customTheme.theme_primary,
    );
    const persisted = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--arl-primary').trim());
    expect(persisted).toBe(customTheme.theme_primary);
  } finally {
    const reset = await api(page, '/theme', 'PUT', defaults);
    expect(reset.status).toBe(200);
    await page.reload();
  }
});
