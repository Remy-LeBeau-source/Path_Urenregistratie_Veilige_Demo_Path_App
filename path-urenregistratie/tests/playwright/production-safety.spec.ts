import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AuthApi } from './api/AuthApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const PERIOD_RANGE_START_YEAR = 3000;
const PERIOD_RANGE_MONTHS = 7000 * 12;

function candidatePeriods(): string[] {
  const startIndex = Date.now() % PERIOD_RANGE_MONTHS;

  return Array.from({ length: 240 }, (_, offset) => {
    const index = (startIndex + offset) % PERIOD_RANGE_MONTHS;
    const year = PERIOD_RANGE_START_YEAR + Math.floor(index / 12);
    const month = (index % 12) + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  });
}

function buildDayEntries(period: string, first: number, second: number) {
  return [
    { workDate: `${period}-01`, hours: first, description: 'Safety test dag 1' },
    { workDate: `${period}-02`, hours: second, description: 'Safety test dag 2' },
  ];
}

async function findWritablePeriod(timesheetApi: TimesheetApi): Promise<string> {
  for (const period of candidatePeriods()) {
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
  const coreAuthMigrationPath = join(process.cwd(), 'server', 'migrations', '003_auth_schema.sql');
  const demoAuthMigrationPaths = [
    join(process.cwd(), 'server', 'migrations', '004_demo_employee_auth_seed.sql'),
    join(process.cwd(), 'server', 'migrations', '005_demo_auth_hashes_for_existing_seed_users.sql'),
  ];

  let configExample = '';
  let configLocalExample = '';
  let coreAuthMigration = '';
  let demoAuthMigrations = '';

  await test.step('Given de productieconfig-templatebestanden worden ingelezen', async () => {
    configExample = await readFile(configExamplePath, 'utf8');
    configLocalExample = await readFile(configLocalExamplePath, 'utf8');
    coreAuthMigration = await readFile(coreAuthMigrationPath, 'utf8');
    demoAuthMigrations = (await Promise.all(demoAuthMigrationPaths.map(path => readFile(path, 'utf8')))).join('\n');
  });

  await test.step('Then staan demo-migraties standaard uit in productieconfig', async () => {
    expect(configExample).toMatch(/'environment'\s*=>\s*'production'/);
    expect(configExample).toMatch(/'allow_demo_migrations'\s*=>\s*false/);
    expect(configExample).toMatch(/'app_origin'\s*=>\s*'https:\/\//);

    expect(configLocalExample).toMatch(/'environment'\s*=>\s*'production'/);
    expect(configLocalExample).toMatch(/'allow_demo_migrations'\s*=>\s*false/);
    expect(configLocalExample).toMatch(/'app_origin'\s*=>\s*'https:\/\//);

    expect(coreAuthMigration).not.toMatch(/admin@example\.invalid|employee\.demo@example\.invalid/);
    expect(coreAuthMigration).not.toMatch(/\b(?:INSERT|UPDATE)\s+(?:INTO\s+)?users\b/i);
    expect(demoAuthMigrations).toMatch(/employee\.demo@example\.invalid/);
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

  await test.step('Then staat mail.enabled standaard op false en is SMTP relay voorbereid zonder activering', async () => {
    const src = await readFile(join(process.cwd(), 'server', 'config.example.php'), 'utf8');
    expect(src).toMatch(/'enabled'\s*=>\s*false/);
    expect(src).toMatch(/'transport'\s*=>\s*'smtp_relay'/);
    expect(src).toMatch(/'host'\s*=>\s*'smtp-relay\.gmail\.com'/);
    expect(src).toMatch(/'port'\s*=>\s*587/);
    expect(src).toMatch(/'encryption'\s*=>\s*'starttls'/);
  });
});

test('[SAFE-N-005] live login verbergt lokale accountkeuze en valt gesloten uit zonder authservice', async ({ page }) => {
  await test.step('Given de loginpagina als productiepresentatie wordt opgebouwd', async () => {
    await page.goto(appConfig.baseUrl);
    await expect(page.locator('#auth-login-submit')).toBeEnabled({ timeout: 15_000 });
    expect(await page.evaluate(() => {
      const runtime = window as typeof window & { localAccountToolsAllowed: (hostname: string) => boolean };
      return runtime.localAccountToolsAllowed('uren.pathconsultancy.nl');
    })).toBe(false);
    await page.evaluate(() => {
      const runtime = window as typeof window & { applyLoginPresentation: (allowed: boolean) => void };
      runtime.applyLoginPresentation(false);
    });
  });

  await test.step('Then zijn demoaccounts en lokale uitleg niet zichtbaar', async () => {
    await expect(page.locator('#local-account-login-tools')).toBeHidden();
    await expect(page.locator('#local-login-note')).toBeHidden();
    await expect(page.locator('#login-environment-label')).toHaveText('Beveiligde omgeving');
    await expect(page.locator('#login-title')).toHaveText('Inloggen');
    await expect(page.locator('#login-intro')).toContainText('zakelijke e-mailadres');
    await expect(page.locator('#auth-login-form')).toBeVisible();
  });

  await test.step('And zonder authservice blijft productie fail-closed', async () => {
    await page.evaluate(() => {
      const runtime = window as typeof window & { applyAuthUiMode: (mode: string) => void; applyLoginPresentation: (allowed: boolean) => void };
      runtime.applyAuthUiMode('unavailable');
      runtime.applyLoginPresentation(false);
    });
    await expect(page.locator('#auth-login-submit')).toBeDisabled();
    await expect(page.locator('#auth-login-feedback')).toContainText('tijdelijk niet bereikbaar');
    await expect(page.locator('#local-account-login-tools')).toBeHidden();
  });
});

test('[SAFE-N-006] destructieve DB-testsetup weigert productie en niet-testdatabases', async () => {
  await test.step('Given de Playwright-bootstrap en directe DB-smoke worden gecontroleerd', async () => {});

  await test.step('Then vereist de bootstrap een herkenbare testdatabase of geïsoleerde lokale CI-database', async () => {
    const source = await readFile(join(process.cwd(), 'scripts', 'bootstrap-playwright-db.mjs'), 'utf8');
    expect(source).toContain('namedTestDatabase');
    expect(source).toContain('isolatedCiDatabase');
    expect(source).toContain('productionContext');
    expect(source).toContain('Refusing destructive Playwright database bootstrap');
    expect(source).toContain("databaseName === 'path_urenregistratie'");
    expect(source).toContain("environmentSignals.includes('test')");
    expect(source).toContain("environmentSignals.includes('production')");
  });

  await test.step('And gebruikt de CRUD-smoke dezelfde fail-closed scheiding', async () => {
    const source = await readFile(join(process.cwd(), 'scripts', 'run-db-crud-smoke.mjs'), 'utf8');
    const ciWorkflow = await readFile(join(process.cwd(), '..', '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(source).toContain('namedTestDatabase');
    expect(source).toContain('isolatedCiDatabase');
    expect(source).toContain('productionContext');
    expect(source).toContain('DB CRUD smoke is not allowed');
    expect(source).toContain("config.database === 'path_urenregistratie'");
    expect(source).toContain("environmentSignals.includes('test')");
    expect(source).toContain("environmentSignals.includes('production')");
    expect(ciWorkflow).toMatch(/Run DB CRUD smoke[\s\S]*PATH_APP_ENVIRONMENT:\s*test[\s\S]*PLAYWRIGHT_STAGE:\s*test/);
  });
});

test('[SAFE-N-007] productieconfigurator verwerkt DB-secret uitsluitend interactief en fail-closed', async () => {
  await test.step('Given de CLI-only productieconfigurator wordt gelezen', async () => {});

  await test.step('Then vereist configuratie expliciete uitvoering, bevestiging en verborgen invoer', async () => {
    const source = await readFile(join(process.cwd(), 'server', 'scripts', 'configure-production.php'), 'utf8');
    const cliBootstrap = await readFile(join(process.cwd(), 'server', 'scripts', 'cli-bootstrap.php'), 'utf8');
    expect(source).toContain("require_once __DIR__ . '/cli-bootstrap.php'");
    expect(cliBootstrap).toContain("PHP_SAPI !== 'cli'");
    expect(source).toContain("stream_isatty(STDIN)");
    expect(source).toContain("shell_exec('stty -echo')");
    expect(source).toContain("($options['execute'] ?? false) !== true");
    expect(source).toContain("($options['confirm'] ?? '') !== 'CONFIGURE_PRODUCTION'");
    expect(source).toContain("isset($options['password'])");
  });

  await test.step('And valideert hij DB en private storage vóór een atomische 0600-write met mail uit', async () => {
    const source = await readFile(join(process.cwd(), 'server', 'scripts', 'configure-production.php'), 'utf8');
    expect(source).toContain("$pdo->query('SELECT 1')");
    expect(source).toContain('ops_is_outside_webroot($privateRoot)');
    expect(source).toContain("['', '/invoices', '/customer-timesheets', '/backups', '/logs']");
    expect(source).toContain("'enabled' => false");
    expect(source).toContain('rename($temporaryPath, $configPath)');
    expect(source).toContain('chmod($configPath, 0600)');
    expect(source).not.toMatch(/password_in_arguments_supported'\s*=>\s*true/);
  });
});

test('[SAFE-H-005] SMTP-dispatch en operationele scripts blijven fail-closed', async () => {
  await test.step('Given de transport-, dispatch- en productiepreflightbron wordt gelezen', async () => {});

  await test.step('Then zijn TLS, dry-run, private storage, HSTS en niet-mutatieve checks afgedwongen', async () => {
    const root = process.cwd();
    const smtp = await readFile(join(root, 'server', 'mail', 'smtp.php'), 'utf8');
    const dispatch = await readFile(join(root, 'server', 'mail', 'dispatch.php'), 'utf8');
    const preflight = await readFile(join(root, 'server', 'scripts', 'production-preflight.php'), 'utf8');
    const requestReset = await readFile(join(root, 'server', 'auth', 'request-reset.php'), 'utf8');
    const provisionAccount = await readFile(join(root, 'server', 'scripts', 'provision-account.php'), 'utf8');
    const configureProduction = await readFile(join(root, 'server', 'scripts', 'configure-production.php'), 'utf8');
    const config = await readFile(join(root, 'server', 'config.example.php'), 'utf8');

    expect(smtp).toContain('STREAM_CRYPTO_METHOD_TLS_CLIENT');
    expect(smtp).toContain("'verify_peer_name' => true");
    expect(smtp).not.toContain('AUTH LOGIN');
    expect(dispatch).toContain('dry_run = 0');
    expect(dispatch).toContain('status = "processing"');
    expect(dispatch).toContain('invoice_and_customer_timesheet');
    expect(preflight).toContain("'writes_performed' => false");
    expect(requestReset).toContain("$environment !== 'production'");
    expect(provisionAccount).toContain('Passwords in command arguments are forbidden');
    expect(provisionAccount).toContain('force_password_change = 1');
    expect(provisionAccount).toContain(':password_hash, 1)');
    expect(configureProduction).toContain('Database passwords in command arguments are forbidden');
    expect(config).toMatch(/'hsts_enabled'\s*=>\s*false/);
    expect(config).toContain('../path-private');
  });
});
