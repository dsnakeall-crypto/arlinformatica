import { expect, test } from '@playwright/test';
import { api, login } from './helpers';

const defaults = {
  theme_primary: '#087443',
  theme_sidebar: '#063B2D',
  theme_accent: '#28BD65',
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

    await setColor('#theme-primary', '#B42318');
    await setColor('#theme-sidebar', '#2B1110');
    await setColor('#theme-accent', '#F5B700');

    const saved = page.waitForResponse((response) => response.url().endsWith('/api/theme') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Salvar cores' }).click();
    expect((await saved).status()).toBe(200);
    await expect(page.locator('.theme-status')).toContainText('Cores salvas para toda a empresa');

    const applied = await page.evaluate(() => ({
      primary: getComputedStyle(document.documentElement).getPropertyValue('--arl-primary').trim(),
      sidebar: getComputedStyle(document.documentElement).getPropertyValue('--arl-sidebar').trim(),
      accent: getComputedStyle(document.documentElement).getPropertyValue('--arl-accent').trim(),
    }));
    expect(applied).toEqual({ primary: '#B42318', sidebar: '#2B1110', accent: '#F5B700' });

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
    const persisted = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--arl-primary').trim());
    expect(persisted).toBe('#B42318');
  } finally {
    const reset = await api(page, '/theme', 'PUT', defaults);
    expect(reset.status).toBe(200);
    await page.reload();
  }
});
