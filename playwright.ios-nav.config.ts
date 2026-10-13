import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  projects: [{ name: 'ios-webkit-nav', testMatch: /mobile-nav-viewport\.mobile\.spec\.ts/, use: { ...devices['iPhone 13'], browserName: 'webkit' } }],
});
