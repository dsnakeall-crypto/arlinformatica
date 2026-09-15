import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT || '8011';
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: e2eBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', testIgnore: /mobile\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-chromium',
      testMatch: /mobile\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        storageState: {
          cookies: [],
          origins: [{
            origin: e2eBaseUrl,
            localStorage: [{ name: 'arl-layout-mode', value: 'mobile' }],
          }],
        },
      },
    },
  ],
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: `${e2eBaseUrl}/up`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
