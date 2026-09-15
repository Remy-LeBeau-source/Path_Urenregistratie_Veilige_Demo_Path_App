import { existsSync } from 'node:fs';
import { config as loadDotEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// Verkenning: seeded monkey testing op de medewerker in Klassiek.
//
// Bewust los van playwright.config.ts en dus buiten de CI-regressie:
// - een monkey klikt ook op Indienen, Terugzetten en Opslaan; in de gedeelde
//   regressierun zou dat de toestand veranderen die latere cases verwachten;
// - de looptijd groeit met het aantal seeds, en de CI-shards zitten al krap.
// Wat de verkenner vindt, wordt een vaste, deterministische case in de gewone
// suite (met fix en tegenproef). Draaien via de gewone runner, die een eigen
// geïsoleerde database opzet:
//   node scripts/run-playwright-e2e.mjs --config=playwright.verkenning.config.ts
// Aantal seeds/stappen: MONKEY_SEEDS="1-20" MONKEY_STAPPEN=150.

if (existsSync('.env')) loadDotEnv({ path: '.env' });
if (existsSync('.env.local')) loadDotEnv({ path: '.env.local', override: false });

const e2eRunId = String(process.env.PATH_APP_E2E_RUN_ID || '').trim();

export default defineConfig({
  testDir: './tests/verkenning',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 15 * 60_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-verkenning', open: 'never' }]],
  outputDir: 'test-results-verkenning',
  use: {
    baseURL: process.env.PATH_APP_BASE_URL || 'http://localhost:8000',
    headless: true,
    actionTimeout: 5_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    extraHTTPHeaders: e2eRunId ? { 'X-Path-E2E-Run-Id': e2eRunId } : undefined,
  },
  projects: [
    { name: 'verkenning-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'verkenning-telefoon', use: { ...devices['Pixel 7'] } },
  ],
});
