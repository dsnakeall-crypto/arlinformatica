import { expect, test } from '@playwright/test';
import { api, login } from './helpers';

const corporateTheme = {
  theme_primary: '#C9001C',
  theme_sidebar: '#09080A',
  theme_accent: '#FF2443',
};

test('identidade visual ARL é fixa e não expõe seletor de cores nas Configurações', async ({ page }) => {
  await login(page);

  const applied = await page.evaluate(() => ({
    primary: getComputedStyle(document.documentElement).getPropertyValue('--arl-primary').trim().toUpperCase(),
    sidebar: getComputedStyle(document.documentElement).getPropertyValue('--arl-sidebar').trim().toUpperCase(),
    accent: getComputedStyle(document.documentElement).getPropertyValue('--arl-accent').trim().toUpperCase(),
  }));
  expect(applied).toEqual({
    primary: corporateTheme.theme_primary,
    sidebar: corporateTheme.theme_sidebar,
    accent: corporateTheme.theme_accent,
  });

  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await expect(page.locator('#theme-settings')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Salvar cores/i })).toHaveCount(0);

  const attempted = await api(page, '/theme', 'PUT', {
    theme_primary: '#123456',
    theme_sidebar: '#654321',
    theme_accent: '#ABCDEF',
  });
  expect(attempted.status).toBe(200);
  expect(attempted.body).toEqual(corporateTheme);

  await page.reload();
  const persisted = await page.evaluate(() => ({
    primary: getComputedStyle(document.documentElement).getPropertyValue('--arl-primary').trim().toUpperCase(),
    sidebar: getComputedStyle(document.documentElement).getPropertyValue('--arl-sidebar').trim().toUpperCase(),
    accent: getComputedStyle(document.documentElement).getPropertyValue('--arl-accent').trim().toUpperCase(),
  }));
  expect(persisted).toEqual({
    primary: corporateTheme.theme_primary,
    sidebar: corporateTheme.theme_sidebar,
    accent: corporateTheme.theme_accent,
  });
});
