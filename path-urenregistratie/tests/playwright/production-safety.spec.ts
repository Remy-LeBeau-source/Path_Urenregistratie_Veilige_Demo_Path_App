import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AuthApi } from './api/AuthApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const CANDIDATE_PERIODS = Array.from({ length: 240 }, (_, index) => {
  const year = 2099 + Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
});

function buildDayEntries(period: string, first: number, second: number) {
  return [
    { workDate: `${period}-01`, hours: first, description: 'Safety test dag 1' },
    { workDate: `${period}-02`, hours: second, description: 'Safety test dag 2' },
  ];
}

async function findWritablePeriod(timesheetApi: TimesheetApi): Promise<string> {
  for (const period of CANDIDATE_PERIODS) {
    const read = await timesheetApi.read(period);
    if (read.status !== 200 || !read.body?.ok) {
      continue;
    }

    if (!read.body.found) {
      return period;
    }

    const status = String(read.body.timesheet?.status || '');
    if (status === 'draft' || status === 'correction') {
      return period;
    }
  }

  throw new Error('No writable test period found in 240 candidate months.');
}

test('login picker vult alleen lokaal demo-wachtwoord in wanneer hints beschikbaar zijn', async ({ page, request }) => {
  let localHintsEnabled = false;
  let hintedAdminPassword = '';

  try {
    const hintsResponse = await request.get('/server/auth/local-login-hints.php');
    if (hintsResponse.ok()) {
      const hintsBody = await hintsResponse.json();
      localHintsEnabled = hintsBody.ok === true && hintsBody.enabled === true;
      hintedAdminPassword = String(hintsBody.adminPassword || '');
    }
  } catch {
    localHintsEnabled = false;
  }

  await page.goto(appConfig.baseUrl);

  const indicator = page.locator('#auth-mode-indicator');
  await expect(indicator).toBeVisible({ timeout: 10_000 });
  await expect(indicator).not.toHaveText(/Controle van auth-sessie wordt uitgevoerd\./, { timeout: 12_000 });

  const adminTrigger = page.locator('#login-admin-trigger');
  await expect(adminTrigger).toBeEnabled();
  await adminTrigger.click();

  const firstAdmin = page.locator('#login-admin-choices button').first();
  await expect(firstAdmin).toBeVisible();
  await firstAdmin.click();

  await expect(page.locator('#auth-login-email')).not.toHaveValue('');

  if (localHintsEnabled) {
    await expect(page.locator('#auth-login-password')).toHaveValue(hintedAdminPassword || requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    await expect(page.locator('#auth-login-feedback')).toContainText('E-mail en lokaal demo-wachtwoord voorgeselecteerd.');
  } else {
    await expect(page.locator('#auth-login-password')).toHaveValue('');
    await expect(page.locator('#auth-login-feedback')).toContainText('E-mail voorgeselecteerd. Vul je wachtwoord in.');
  }
});

test('frontend source bevat geen plaintext demo-credentials', async ({ request }) => {
  const response = await request.get('/assets/app.js');
  expect(response.ok()).toBeTruthy();
  const source = await response.text();

  expect(source).not.toContain('DemoTempAdmin!2026');
  expect(source).not.toContain('DemoTempEmployee!2026');
});

test('writes zonder csrf blijven geblokkeerd', async ({ request }) => {
  const authApi = new AuthApi(request);
  const timesheetApi = new TimesheetApi(request);

  await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));

  const noCsrf = await timesheetApi.writeWithoutCsrf({
    action: 'save_draft',
    period: '2099-07',
    contractualHours: 160,
    billableHours: 8,
    dayEntries: buildDayEntries('2099-07', 4, 4),
  });

  expect(noCsrf.status).toBe(403);
  expect(noCsrf.body.ok).toBe(false);
});

test('timesheet writeflow blijft werkend (draft + submit)', async ({ request }) => {
  const authApi = new AuthApi(request);
  const timesheetApi = new TimesheetApi(request);

  await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
  const period = await findWritablePeriod(timesheetApi);

  const draft = await timesheetApi.write({
    action: 'save_draft',
    period,
    contractualHours: 160,
    billableHours: 12,
    leaveHours: 0,
    sicknessHours: 0,
    dayEntries: buildDayEntries(period, 8, 4),
  });

  expect(draft.status).toBe(200);
  expect(draft.body.ok).toBe(true);
  expect(draft.body.timesheet.status).toBe('draft');

  const submit = await timesheetApi.write({
    action: 'submit',
    period,
    contractualHours: 160,
    billableHours: 12,
    leaveHours: 0,
    sicknessHours: 0,
    dayEntries: buildDayEntries(period, 8, 4),
  });

  expect(submit.status).toBe(200);
  expect(submit.body.ok).toBe(true);
  expect(submit.body.timesheet.status).toBe('submitted');
});

test('productieconfig zet demo-migraties standaard uit', async () => {
  const configExamplePath = join(process.cwd(), 'server', 'config.example.php');
  const configLocalExamplePath = join(process.cwd(), 'server', 'config.local.php.example');

  const configExample = await readFile(configExamplePath, 'utf8');
  const configLocalExample = await readFile(configLocalExamplePath, 'utf8');

  expect(configExample).toMatch(/'environment'\s*=>\s*'production'/);
  expect(configExample).toMatch(/'allow_demo_migrations'\s*=>\s*false/);
  expect(configExample).toMatch(/'app_origin'\s*=>\s*'https:\/\//);

  expect(configLocalExample).toMatch(/'environment'\s*=>\s*'production'/);
  expect(configLocalExample).toMatch(/'allow_demo_migrations'\s*=>\s*false/);
  expect(configLocalExample).toMatch(/'app_origin'\s*=>\s*'https:\/\//);
});
