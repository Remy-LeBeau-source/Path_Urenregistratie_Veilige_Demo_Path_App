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
    const read = await timesheetApi.read(period, undefined, { attach: false });
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

test('[SAFE-H-001] login picker vult alleen lokaal demo-wachtwoord in wanneer hints beschikbaar zijn', async ({ page, request }) => {
  let localHintsEnabled = false;
  let hintedAdminPassword = '';

  await test.step('Given de lokale login-hints worden gecontroleerd', async () => {
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
  });

  await test.step('When de gebruiker de admin-loginkeuze opent', async () => {
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
  });

  await test.step('Then wordt alleen in lokale hintmodus een demo-wachtwoord voorgeselecteerd', async () => {
    await expect(page.locator('#auth-login-email')).not.toHaveValue('');

    if (localHintsEnabled) {
      await expect(page.locator('#auth-login-password')).toHaveValue(hintedAdminPassword || requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      await expect(page.locator('#auth-login-feedback')).toContainText('E-mail en lokaal demo-wachtwoord voorgeselecteerd.');
    } else {
      await expect(page.locator('#auth-login-password')).toHaveValue('');
      await expect(page.locator('#auth-login-feedback')).toContainText('E-mail voorgeselecteerd. Vul je wachtwoord in.');
    }
  });
});

test('[SAFE-N-001] frontend source bevat geen plaintext demo-credentials', async ({ request }) => {
  let source = '';

  await test.step('Given de frontend source wordt opgehaald', async () => {
    const response = await request.get('/assets/app.js');
    expect(response.ok()).toBeTruthy();
    source = await response.text();
  });

  await test.step('Then bevat de frontend geen plaintext demo-credentials', async () => {
    expect(source).not.toContain('DemoTempAdmin!2026');
    expect(source).not.toContain('DemoTempEmployee!2026');
  });
});

test('[SAFE-N-002] writes zonder csrf blijven geblokkeerd', async ({ request }) => {
  const authApi = new AuthApi(request);
  const timesheetApi = new TimesheetApi(request);

  await test.step('Given een ingelogde medewerker', async () => {
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
  });

  await test.step('When een write-call zonder csrf-header wordt verstuurd', async () => {
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
});

test('[SAFE-H-002] timesheet writeflow blijft werkend (draft + submit)', async ({ request }) => {
  const authApi = new AuthApi(request);
  const timesheetApi = new TimesheetApi(request);

  let period = '';
  let draftVersion = 0;

  await test.step('Given een ingelogde medewerker met schrijfbare periode', async () => {
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    period = await findWritablePeriod(timesheetApi);
    expect(period).toMatch(/^\d{4}-\d{2}$/);
  });

  await test.step('When de medewerker save_draft uitvoert', async () => {
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
    draftVersion = Number(draft.body?.timesheet?.version || 0);
    expect(draftVersion).toBeGreaterThan(0);
  });

  await test.step('Then submit met expected_version blijft werkend', async () => {
    const submit = await timesheetApi.write({
      action: 'submit',
      period,
      expectedVersion: draftVersion,
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
});

test('[SAFE-N-003] productieconfig zet demo-migraties standaard uit', async () => {
  const configExamplePath = join(process.cwd(), 'server', 'config.example.php');
  const configLocalExamplePath = join(process.cwd(), 'server', 'config.local.php.example');

  let configExample = '';
  let configLocalExample = '';

  await test.step('Given de productieconfig-templatebestanden worden ingelezen', async () => {
    configExample = await readFile(configExamplePath, 'utf8');
    configLocalExample = await readFile(configLocalExamplePath, 'utf8');
  });

  await test.step('Then staan demo-migraties standaard uit in productieconfig', async () => {
    expect(configExample).toMatch(/'environment'\s*=>\s*'production'/);
    expect(configExample).toMatch(/'allow_demo_migrations'\s*=>\s*false/);
    expect(configExample).toMatch(/'app_origin'\s*=>\s*'https:\/\//);

    expect(configLocalExample).toMatch(/'environment'\s*=>\s*'production'/);
    expect(configLocalExample).toMatch(/'allow_demo_migrations'\s*=>\s*false/);
    expect(configLocalExample).toMatch(/'app_origin'\s*=>\s*'https:\/\//);
  });
});

test('[SAFE-H-003] health.php bevat productieguard die technische details onderdrukt', async () => {
  await test.step('Given de health.php broncode wordt gelezen', async () => {});

  await test.step('Then bevat health.php een productieguard die host en databasenaam wegfiltert', async () => {
    const src = await readFile(join(process.cwd(), 'server', 'health.php'), 'utf8');
    expect(src).toContain("'production'");
    expect(src).toContain('ok');
    // Guard must suppress host/db details in production mode.
    expect(src).toMatch(/production.*ob_clean|production.*\[\s*'ok'/s);
  });
});

test('[SAFE-N-004] install.php en migrate.php bevatten productieguards', async () => {
  await test.step('Given install.php en migrate.php worden gelezen', async () => {});

  await test.step('Then bevatten beide bestanden een HTTP-blokkering voor productieomgeving', async () => {
    const install = await readFile(join(process.cwd(), 'server', 'install.php'), 'utf8');
    const migrate = await readFile(join(process.cwd(), 'server', 'migrate.php'), 'utf8');

    expect(install).toContain("'production'");
    expect(install).toContain('403');
    expect(install).toContain('PHP_SAPI');

    expect(migrate).toContain("'production'");
    expect(migrate).toContain('403');
    expect(migrate).toContain('PHP_SAPI');
  });
});

test('[SAFE-H-004] config.example.php bevat mail.enabled=false als standaard', async () => {
  await test.step('Given config.example.php wordt gelezen', async () => {});

  await test.step('Then staat mail.enabled standaard op false', async () => {
    const src = await readFile(join(process.cwd(), 'server', 'config.example.php'), 'utf8');
    expect(src).toMatch(/'enabled'\s*=>\s*false/);
    expect(src).toMatch(/'transport'\s*=>\s*'dry_run'/);
  });
});
