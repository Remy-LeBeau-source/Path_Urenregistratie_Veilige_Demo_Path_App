import 'dotenv/config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  workers: 1,
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
  use: {
    baseURL: process.env.PATH_APP_BASE_URL || 'http://localhost:8000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
});
