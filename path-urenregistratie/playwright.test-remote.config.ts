import { defineConfig, devices } from '@playwright/test';

// Losse config om Playwright tegen de LIVE TEST-site te draaien in plaats van
// een lokaal opgezette server. Bewust geen webServer, geen DB-bootstrap: dit
// raakt de echte deploy op TransIP. De bijbehorende spec is read-only.
const BASE = process.env.TEST_REMOTE_BASE_URL || 'https://uren-test.pathconsultancy.nl';

export default defineConfig({
  testDir: './tests/remote',
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    headless: false,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
