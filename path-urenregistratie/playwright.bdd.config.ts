import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'tests/bdd/features/*.feature',
  featuresRoot: 'tests/bdd/features',
  steps: 'tests/bdd/steps/*.ts',
  outputDir: '.features-gen',
  missingSteps: 'fail-on-gen',
  arityCheck: true,
});

export default defineConfig({
  testDir,
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
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-bdd', open: 'never' }],
  ],
  projects: [
    {
      name: 'bdd-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
