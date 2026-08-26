import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { expect, request as playwrightRequest, test as base } from '@playwright/test';
import { AuthApi } from '../api/AuthApi';
import { appConfig, requirePassword } from './appConfig';

const execFileAsync = promisify(execFile);
const DOCUMENT_BUCKETS = ['invoices', 'customer-timesheets'] as const;

type StateFile = {
  bucket: string;
  storage_key: string;
  safe_key: boolean;
  exists: boolean;
  bytes: number;
  is_pdf: boolean;
};

export type E2EState = {
  ok: true;
  database: string;
  run_id: string;
  fingerprint: string;
  table_fingerprints: Record<string, string>;
  table_counts: Record<string, number>;
  marker: string;
  marker_matches: { total: number; matches: Array<{ table: string; column: string; count: number }> };
  scenario_counts: Record<string, number>;
  orphans: { total: number; relations: Array<Record<string, string | number>> };
  documents: { invalid: number; files: StateFile[] };
};

export type E2EIsolation = {
  marker: string;
  baseline: E2EState;
  inspect: () => Promise<E2EState>;
  assertScenarioRowsExist: (requiredTables: string[]) => Promise<E2EState>;
};

function resolvePhpPath(): string {
  const configured = path.join(process.cwd(), 'server', '.php-path');
  if (existsSync(configured)) {
    const value = readFileSync(configured, 'utf8').trim();
    if (value) return value;
  }
  return process.platform === 'win32' ? 'php.exe' : 'php';
}

function requiredPrivateRoot(): string {
  const configured = String(process.env.PATH_APP_PRIVATE_ROOT || '').trim();
  if (!configured) {
    throw new Error('E2E-isolatie vereist PATH_APP_PRIVATE_ROOT van de beheerde runner.');
  }
  const resolved = path.resolve(configured);
  const tempRoot = path.resolve(tmpdir()) + path.sep;
  if (
    !resolved.startsWith(tempRoot)
    || !path.basename(resolved).startsWith('path-urenregistratie-playwright-')
  ) {
    throw new Error(`E2E-isolatie weigert onverwachte private opslag: ${resolved}`);
  }
  return resolved;
}

function assertTestDatabaseContract(): string {
  const database = String(
    process.env.PATH_APP_DB_NAME
    || process.env.PLAYWRIGHT_DB_NAME
    || process.env.DB_NAME
    || '',
  ).trim();
  if (!database.toLowerCase().endsWith('_test')) {
    throw new Error(`E2E-isolatie weigert database ${database || '(leeg)'}; de naam moet op _test eindigen.`);
  }
  return database;
}

function clearDocumentBuckets(): void {
  const root = requiredPrivateRoot();
  for (const bucket of DOCUMENT_BUCKETS) {
    const target = path.resolve(root, bucket);
    if (!target.startsWith(root + path.sep)) {
      throw new Error(`E2E-isolatie weigert onverwachte documentmap: ${target}`);
    }
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
  }
}

function listFilesRecursively(directory: string, root = directory): string[] {
  if (!existsSync(directory)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFilesRecursively(absolute, root));
    } else if (entry.isFile()) {
      result.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  return result;
}

function privateDocumentFiles(): string[] {
  const root = requiredPrivateRoot();
  return DOCUMENT_BUCKETS.flatMap(bucket => (
    listFilesRecursively(path.join(root, bucket)).map(file => `${bucket}/${file}`)
  )).sort();
}

async function resetSharedBaseline(): Promise<void> {
  clearDocumentBuckets();
  const context = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
  try {
    const auth = new AuthApi(context);
    await auth.login(
      appConfig.adminEmail,
      requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'),
    );
    const csrfToken = await auth.csrfToken();
    const response = await context.post('/server/api/test-reset.php', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: { confirm: 'RESET_SHARED_TEST_BASELINE' },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok() || body?.ok !== true) {
      throw new Error(`TEST-baselineherstel faalde (HTTP ${response.status()}): ${JSON.stringify(body)}`);
    }
  } finally {
    await context.dispose();
  }
}

async function inspectState(marker: string): Promise<E2EState> {
  assertTestDatabaseContract();
  requiredPrivateRoot();
  const execution = await execFileAsync(
    resolvePhpPath(),
    ['server/scripts/e2e-state-inspect.php', `--marker=${marker}`],
    { cwd: process.cwd(), windowsHide: true, env: process.env },
  );
  const parsed = JSON.parse(String(execution.stdout || '{}')) as E2EState;
  if (parsed.ok !== true) {
    throw new Error(`E2E-state-inspect gaf geen geldig resultaat: ${execution.stdout}`);
  }
  return parsed;
}

function markerFor(testInfo: import('@playwright/test').TestInfo): string {
  const caseId = testInfo.title.match(/\[(E2E-(?:H|N)-\d{3})\]/)?.[1] || 'E2E-UNMAPPED';
  const unique = `${caseId}-${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}`;
  return unique.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

async function attachJson(testInfo: import('@playwright/test').TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(value, null, 2), 'utf8'),
    contentType: 'application/json',
  });
}

function expectedDocumentFiles(state: E2EState): string[] {
  return [...new Set(state.documents.files
    .map(file => `${file.bucket}/${String(file.storage_key).replace(/\\/g, '/')}`))]
    .sort();
}

export const test = base.extend<{ e2eIsolation: E2EIsolation }>({
  e2eIsolation: [async ({ page }, use, testInfo) => {
    assertTestDatabaseContract();
    const marker = markerFor(testInfo);
    let baseline: E2EState;

    await base.step('DB-voorwaarde: schone _test-baseline en unieke private opslag', async () => {
      await resetSharedBaseline();
      baseline = await inspectState(marker);
      expect(baseline.database.toLowerCase()).toMatch(/_test$/);
      expect(baseline.run_id).toMatch(/^path-urenregistratie-playwright-/);
      expect(baseline.marker_matches.total).toBe(0);
      expect(baseline.orphans.total).toBe(0);
      expect(baseline.documents.invalid).toBe(0);
      expect(privateDocumentFiles()).toEqual(expectedDocumentFiles(baseline));
    });

    const isolation: E2EIsolation = {
      marker,
      baseline: baseline!,
      inspect: () => inspectState(marker),
      assertScenarioRowsExist: async (requiredTables) => {
        const state = await inspectState(marker);
        for (const table of requiredTables) {
          expect(
            Number(state.scenario_counts[table] || 0),
            `${table} hoort rijen voor marker ${marker} te bevatten`,
          ).toBeGreaterThan(0);
        }
        expect(state.orphans.total).toBe(0);
        return state;
      },
    };

    try {
      await use(isolation);
    } finally {
      // Stop polling/bootstrap requests before resetting shared state. Otherwise a
      // still-open app page can race the reset and recreate state after cleanup.
      await page.goto('about:blank').catch(() => undefined);

      await base.step('DB-diagnostiek: writes en bestanden vóór cleanup vastleggen', async () => {
        try {
          const current = await inspectState(marker);
          await attachJson(testInfo, 'e2e-state-before-cleanup.json', {
            ...current,
            private_document_files: privateDocumentFiles(),
          });
        } catch (error) {
          await attachJson(testInfo, 'e2e-state-before-cleanup-error.json', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      await base.step('DB-nacontrole: baseline herstellen zonder testdata, wezen of losse PDF’s', async () => {
        await resetSharedBaseline();
        const after = await inspectState(marker);
        const driftedTables = Object.keys(baseline!.table_fingerprints)
          .filter(table => after.table_fingerprints[table] !== baseline!.table_fingerprints[table]);
        await attachJson(testInfo, 'e2e-state-after-cleanup.json', {
          ...after,
          drifted_tables: driftedTables,
          private_document_files: privateDocumentFiles(),
        });
        expect(
          after.table_fingerprints,
          `Na cleanup wijken deze tabellen van de baseline af: ${driftedTables.join(', ') || '(geen)'}`,
        ).toEqual(baseline!.table_fingerprints);
        expect(after.fingerprint).toBe(baseline!.fingerprint);
        expect(after.table_counts).toEqual(baseline!.table_counts);
        expect(after.marker_matches).toEqual({ total: 0, matches: [] });
        expect(Object.values(after.scenario_counts).every(value => Number(value) === 0)).toBe(true);
        expect(after.orphans.total).toBe(0);
        expect(after.documents.invalid).toBe(0);
        expect(privateDocumentFiles()).toEqual(expectedDocumentFiles(after));
      });
    }
  }, { auto: true }],
});

export { expect };
