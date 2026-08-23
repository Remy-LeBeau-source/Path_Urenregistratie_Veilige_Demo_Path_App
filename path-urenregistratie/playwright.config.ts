import { existsSync } from 'node:fs';
import { config as loadDotEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

if (existsSync('.env')) {
  loadDotEnv({ path: '.env' });
}

const stage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
if (stage && ['dev', 'test', 'acc', 'prod'].includes(stage)) {
  const stageEnvPath = `environments/${stage}.env`;
  if (existsSync(stageEnvPath)) {
    loadDotEnv({ path: stageEnvPath, override: false });
  }
}

if (existsSync('.env.local')) {
  // Explicit runner/CI variables must win over developer-local defaults.
  loadDotEnv({ path: '.env.local', override: false });
}

export default defineConfig({
  testDir: './tests/playwright',
  workers: 1,
  // 45 en niet 30 seconden. De ingebouwde PHP-server handelt een verzoek tegelijk af
  // (op Windows ook met werkers, want die zijn POSIX-only), en het opstarten van de app
  // vuurt er een reeks achter elkaar af. Een koude start kwam daardoor af en toe net
  // boven de 30 seconden uit, waarna een case viel terwijl er niets mis was. De ruimte
  // verzwakt geen enkele controle: elke assertie blijft ongewijzigd, ze krijgen alleen
  // de tijd die een geserialiseerde server nodig heeft.
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
  use: {
    baseURL: process.env.PATH_APP_BASE_URL || 'http://localhost:8000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'block',
    // App CSS zeroes out transitions/animations under prefers-reduced-motion; enabling it here removes
    // animation-driven visibility/stability delays (view switches, dropdown panels) from every test.
    reducedMotion: 'reduce',
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['./tests/playwright/reporting/FunctionalAllureReporter.ts'],
    ['allure-playwright', { outputFolder: 'allure-results', detail: false, suiteTitle: false }],
  ],
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      testIgnore: ['**/mobile-ui.spec.ts'],
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
      },
      testMatch: ['**/mobile-ui.spec.ts'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
      testMatch: ['**/mobile-ui.spec.ts'],
    },
  ],
});
