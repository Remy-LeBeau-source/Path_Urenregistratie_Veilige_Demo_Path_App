import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { AuthApi } from './api/AuthApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const PERIOD_RANGE_START_YEAR = 3000;
const PERIOD_RANGE_MONTHS = 7000 * 12;
const execFileAsync = promisify(execFile);

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
      await expect(page.locator('#auth-login-feedback')).toContainText('E-mail en testwachtwoord voorgeselecteerd.');
    } else {
      await expect(page.locator('#auth-login-password')).toHaveValue('');
      await expect(page.locator('#auth-login-feedback')).toContainText('E-mail voorgeselecteerd. Vul je wachtwoord in.');
    }
  });
});

test('[SAFE-H-012] TEST toont accountkeuze met autofill en een afgeschermde gedeelde reset', async ({ page }) => {
  await test.step('Given lokale, TEST- en PROD-hosts als aparte equivalentieklassen worden beoordeeld', async () => {
    await page.goto(appConfig.baseUrl);
    const permissions = await page.evaluate(() => {
      const runtime = window as typeof window & {
        localAccountToolsAllowed: (hostname: string) => boolean;
        testAccountToolsAllowed: (hostname: string) => boolean;
        isLocalAuthHintsHost: (hostname: string) => boolean;
      };
      return {
        localReset: runtime.localAccountToolsAllowed('localhost'),
        testReset: runtime.localAccountToolsAllowed('uren-test.pathconsultancy.nl'),
        testPicker: runtime.testAccountToolsAllowed('uren-test.pathconsultancy.nl'),
        prodPicker: runtime.testAccountToolsAllowed('uren.pathconsultancy.nl'),
        testHints: runtime.isLocalAuthHintsHost('uren-test.pathconsultancy.nl'),
      };
    });
    expect(permissions).toEqual({
      localReset: true,
      testReset: false,
      testPicker: true,
      prodPicker: false,
      testHints: true,
    });
  });

  await test.step('When de exacte TEST-presentatie zonder lokale resetrechten wordt getoond', async () => {
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        applyLoginPresentation: (accounts: boolean, reset: boolean) => void;
      };
      runtime.applyLoginPresentation(true, false);
    });
  });

  await test.step('Then blijven TEST-bediening en presentatie zichtbaar zonder PROD-rechten te verruimen', async () => {
    await expect(page.locator('#local-account-login-tools')).toBeVisible();
    await expect(page.locator('#login-environment-label')).toHaveText('Veilige testomgeving');
    await expect(page.locator('#login-title')).toHaveText('Welkom bij Path Uren & Facturatie');
    await expect(page.locator('#login-intro')).toContainText('Deze testomgeving');
    await expect(page.locator('#quick-reset-demo')).toBeHidden();
    await expect(page.locator('#reset-demo')).toBeHidden();
    const appSource = await readFile(join(process.cwd(), 'assets', 'app.js'), 'utf8');
    const hintsSource = await readFile(join(process.cwd(), 'server', 'auth', 'local-login-hints.php'), 'utf8');
    const resetApi = await readFile(join(process.cwd(), 'server', 'api', 'test-reset.php'), 'utf8');
    expect(appSource).toContain('uren-test.pathconsultancy.nl');
    expect(appSource).toContain('RESET_SHARED_TEST_BASELINE');
    expect(hintsSource).toContain("auth_environment_from_config($config) === 'test'");
    expect(hintsSource).toContain("auth_app_origin_from_config($config) === 'https://uren-test.pathconsultancy.nl'");
    expect(resetApi).toContain("auth_require_role(['administrator', 'employee']");
    expect(resetApi).toContain('security_require_csrf_token()');
    expect(resetApi).toContain('RESET_SHARED_TEST_BASELINE');
    const resetPolicyExecution = await execFileAsync('php', ['server/scripts/test-reset-policy-check.php'], {
      cwd: process.cwd(),
      windowsHide: true,
    });
    const resetPolicy = JSON.parse(resetPolicyExecution.stdout);
    expect(resetPolicy.ok).toBe(true);
    expect(resetPolicy.writes_performed).toBe(false);
    expect(resetPolicy.checks?.exact_test_host_allowed).toBe(true);
    expect(resetPolicy.checks?.production_blocked).toBe(true);
    expect(resetPolicy.checks?.twelve_action_baseline_contract).toBe(true);
  });
});

test('[SAFE-H-014] gedeelde TEST-reset herstelt alleen de exacte veilige 12-actiebaseline', async () => {
  let result: { ok?: boolean; writes_performed?: boolean; checks?: Record<string, boolean> } = {};

  await test.step('Given TEST, PROD, verkeerde host en ontbrekend demorecht als beslissingstabel zijn gedefinieerd', async () => {
    const execution = await execFileAsync('php', ['server/scripts/test-reset-policy-check.php'], {
      cwd: process.cwd(),
      windowsHide: true,
    });
    result = JSON.parse(execution.stdout);
    expect(result.ok).toBe(true);
    expect(result.writes_performed).toBe(false);
  });

  await test.step('When alle toegestane en verboden resetovergangen niet-mutatief worden doorgerekend', async () => {
    expect(result.checks?.exact_test_host_allowed).toBe(true);
    expect(result.checks?.production_blocked).toBe(true);
    expect(result.checks?.raw_production_environment_cannot_be_overridden).toBe(true);
    expect(result.checks?.spoofed_test_host_on_production_blocked).toBe(true);
    expect(result.checks?.wrong_host_on_test_blocked).toBe(true);
    expect(result.checks?.wrong_origin_on_test_blocked).toBe(true);
    expect(result.checks?.missing_demo_permission_blocked).toBe(true);
    expect(result.checks?.mispointed_test_database_host_blocked).toBe(true);
    expect(result.checks?.mispointed_test_database_port_blocked).toBe(true);
    expect(result.checks?.mispointed_test_database_blocked).toBe(true);
    expect(result.checks?.mispointed_test_database_user_blocked).toBe(true);
    expect(result.checks?.mispointed_test_private_root_blocked).toBe(true);
    expect(result.checks?.public_test_preserves_only_acceptance_credentials).toBe(true);
    expect(result.checks?.local_test_preserves_runtime_demo_credentials).toBe(true);
  });

  await test.step('Then seed, accounts, auditrelatie en exact twaalf open acties herstelbaar blijven', async () => {
    expect(result.checks?.baseline_contains_demo_seed).toBe(true);
    expect(result.checks?.acceptance_accounts_restored).toBe(true);
    expect(result.checks?.twelve_action_baseline_contract).toBe(true);
    expect(result.checks?.reset_audit_avoids_stale_actor_fk).toBe(true);
    expect(result.checks?.foreign_keys_restored).toBe(true);
    expect(result.checks?.both_acceptance_credentials_required_before_remote_reset).toBe(true);
    expect(result.checks?.remote_demo_credentials_verified).toBe(true);
    expect(result.checks?.post_commit_failure_reported_as_write).toBe(true);
    expect(result.checks?.cli_usage_mode_is_explicitly_informational).toBe(true);
  });
});

test('[SAFE-H-015] TEST-deploy herstelt en verifieert de vaste accountbaseline vóór cutover', async () => {
  let deploy = '';
  let resetCli = '';
  let resetLibrary = '';
  let publicAuthSmoke = '';

  await test.step('Given de bewaakte TEST-baseline-CLI en deploybron zijn ingelezen', async () => {
    deploy = await readFile(join(process.cwd(), 'scripts', 'deploy-test-remote.sh'), 'utf8');
    resetCli = await readFile(join(process.cwd(), 'server', 'scripts', 'reset-test-baseline.php'), 'utf8');
    resetLibrary = await readFile(join(process.cwd(), 'server', 'lib', 'test-reset.php'), 'utf8');
    publicAuthSmoke = await readFile(join(process.cwd(), 'scripts', 'test-public-auth-smoke.mjs'), 'utf8');

    expect(deploy).toContain('reset-test-baseline.php');
    expect(resetCli).toContain("require_once __DIR__ . '/../lib/test-reset.php'");
    expect(resetCli).toContain('RESET_SHARED_TEST_BASELINE');
    expect(resetCli).toContain('/data/sites/web/pathconsultancynl/private/path-uren-test/config.local.php');
  });

  await test.step('When backup, migratie, baselineherstel, live-preflight en cutover in vaste volgorde staan', async () => {
    const backupIndex = deploy.indexOf('database-backup.php');
    const migrateIndex = deploy.indexOf('server/migrate.php');
    const resetIndex = deploy.indexOf('reset-test-baseline.php');
    const preflightIndex = deploy.indexOf('test-preflight.php --config=server/config.local.php --live');
    const cutoverIndex = deploy.indexOf('cutover_started=1');

    expect(backupIndex).toBeGreaterThanOrEqual(0);
    expect(migrateIndex).toBeGreaterThan(backupIndex);
    expect(resetIndex).toBeGreaterThan(migrateIndex);
    expect(preflightIndex).toBeGreaterThan(resetIndex);
    expect(cutoverIndex).toBeGreaterThan(preflightIndex);
    expect(deploy).toMatch(/php server\/scripts\/reset-test-baseline\.php\s*\\\s*--config="\$canonical_config"\s*\\\s*--execute\s*\\\s*--confirm=RESET_SHARED_TEST_BASELINE/);
  });

  await test.step('Then zijn TEST-database, private opslag en beide loginrollen vóór vrijgave bewezen', async () => {
    expect(resetLibrary).toContain("TEST_RESET_REMOTE_DATABASE_HOST = 'pathco-urentest.db.transip.me'");
    expect(resetLibrary).toContain('TEST_RESET_REMOTE_DATABASE_PORT = 3306');
    expect(resetLibrary).toContain("TEST_RESET_REMOTE_DATABASE = 'pathco_Urentest'");
    expect(resetLibrary).toContain("TEST_RESET_REMOTE_DATABASE_USER = 'pathco_UrenTestUser'");
    expect(resetLibrary).toContain("TEST_RESET_REMOTE_PRIVATE_ROOT = '/data/sites/web/pathconsultancynl/private/path-uren-test'");
    expect(resetLibrary).toContain('test_reset_should_preserve_demo_credentials');
    expect(resetLibrary.indexOf('$verifiedDemoAccounts = test_reset_verify_remote_demo_credentials')).toBeLessThan(resetLibrary.indexOf('$pdo->commit()'));
    expect(resetCli).toContain("$reset['verified_demo_accounts']");
    expect(resetCli).toContain('$error instanceof TestResetPostCommitException');
    expect(publicAuthSmoke).toMatch(/loginAccount\(accounts\[0\]\)[\s\S]*resetSharedBaseline/);
    expect(publicAuthSmoke).toMatch(/for \(const account of accounts\)[\s\S]*loginAccount\(account\)/);
    expect(publicAuthSmoke).toContain("reset.reset?.verified_demo_accounts, 6");
    expect(publicAuthSmoke).not.toMatch(/LocalDemo(?:Admin|Employee)2026/);
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

test('[SAFE-H-009] productie-health accepteert een schone database zonder demodata', async () => {
  await test.step('Given het healthbeleid voor productie en test wordt uitgevoerd', async () => {});

  await test.step('Then vereist alleen de testomgeving demodata en blijven echte fouten zichtbaar', async () => {
    const policyPath = join(process.cwd(), 'server', 'lib', 'health_policy.php');
    const { stdout } = await execFileAsync('php', [
      '-r',
      '$p=require $argv[1]; echo json_encode(['
        + '"production_requires_demo"=>path_health_requires_demo_seed("production"),'
        + '"test_requires_demo"=>path_health_requires_demo_seed("test"),'
        + '"clean_checks_ok"=>path_health_checks_are_ok([["ok"=>true],["count"=>0]]),'
        + '"failed_checks_ok"=>path_health_checks_are_ok([["ok"=>true],["ok"=>false]])]);',
      policyPath,
    ]);
    const result = JSON.parse(stdout) as Record<string, boolean>;

    expect(result.production_requires_demo).toBe(false);
    expect(result.test_requires_demo).toBe(true);
    expect(result.clean_checks_ok).toBe(true);
    expect(result.failed_checks_ok).toBe(false);

    const healthSource = await readFile(join(process.cwd(), 'server', 'health.php'), 'utf8');
    expect(healthSource).toContain('if (path_health_requires_demo_seed($healthEnv))');
  });

  await test.step('And maakt de migratie de state-afhankelijkheid gereed vóór de eerste healthcheck', async () => {
    const migrateSource = await readFile(join(process.cwd(), 'server', 'migrate.php'), 'utf8');
    const migrationSource = await readFile(join(process.cwd(), 'server', 'migrations', '015_runtime_state_health.sql'), 'utf8');
    expect(migrateSource).toContain('015_runtime_state_health.sql');
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS `app_state`');
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

test('[SAFE-N-008] lokale productieconfig is via HTTP expliciet geblokkeerd', async () => {
  await test.step('Given de Apache-beveiliging voor de servermap wordt gelezen', async () => {});

  await test.step('Then zijn alle configvarianten inclusief config.local.php fail-closed geblokkeerd', async () => {
    const src = await readFile(join(process.cwd(), 'server', '.htaccess'), 'utf8');
    expect(src).toContain('<FilesMatch "^config(?:\\.local|\\.example)?\\.php$">');
    expect(src).toContain('Require all denied');
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
    const resetService = await readFile(join(root, 'server', 'auth', 'password-reset-service.php'), 'utf8');
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
    expect(resetService).toContain('mail_real_delivery_allowed_for_environment($config)');
    expect(resetService).toContain("mail_validate_delivery_recipients($config, $effective['recipient'], $effective['cc'])");
    expect(resetService).toContain("'/index.html#reset-password='");
    expect(resetService).toContain("'delivery_available' => auth_password_reset_delivery_available($config)");
    expect(resetService).toContain('AUTH_PASSWORD_RESET_MAX_REQUESTS = 3');
    expect(dispatch).toContain('[beveiligingslink verwijderd na verzending]');
    expect(dispatch).toContain('mail_validate_delivery_recipients');
    expect(provisionAccount).toContain('Passwords in command arguments are forbidden');
    expect(provisionAccount).toContain('force_password_change = 1');
    expect(provisionAccount).toContain(':password_hash, 1)');
    expect(provisionAccount).toContain('auth_create_password_reset');
    expect(provisionAccount).toContain("'invite_queued' => $inviteQueued");
    expect(provisionAccount).toContain('SMTP relay must be enabled and valid');
    expect(requestReset).toContain('auth_password_reset_public_response');
    expect(requestReset).not.toContain("$response['token']");
    expect(configureProduction).toContain('Database passwords in command arguments are forbidden');
    expect(config).toMatch(/'hsts_enabled'\s*=>\s*false/);
    expect(config).toContain('../path-private');
  });
});

test('[SAFE-H-010] echte TEST-mail vereist opt-in en een ontvangers-whitelist', async () => {
  await test.step('Given het uitvoerbare TEST-mailbeleid wordt gecontroleerd', async () => {});

  let result: { ok?: boolean; writes_performed?: boolean; network_connections?: number; checks?: Record<string, boolean> } = {};
  await test.step('When de productie-, test- en developmentconfiguraties worden doorgerekend', async () => {
    const execution = await execFileAsync('php', ['server/scripts/mail-environment-policy-check.php'], {
      cwd: process.cwd(),
      windowsHide: true,
    });
    result = JSON.parse(execution.stdout);
  });

  await test.step('Then blijft TEST gesloten zonder whitelist en kan alleen de toegestane ontvanger door', async () => {
    expect(result.ok).toBe(true);
    expect(result.writes_performed).toBe(false);
    expect(result.network_connections).toBe(0);
    expect(result.checks?.production_enabled_without_allowlist).toBe(true);
    expect(result.checks?.test_without_guard_is_blocked).toBe(true);
    expect(result.checks?.guarded_test_is_enabled).toBe(true);
    expect(result.checks?.allowlisted_recipient_is_allowed).toBe(true);
    expect(result.checks?.other_recipient_is_blocked).toBe(true);
    expect(result.checks?.cc_outside_allowlist_is_blocked).toBe(true);
    expect(result.checks?.development_remains_blocked).toBe(true);
    expect(result.checks?.guarded_test_reset_uses_real_delivery).toBe(true);
    expect(result.checks?.closed_test_reset_returns_local_token).toBe(true);
  });
});

test('[SAFE-H-013] TEST-mailsandbox opent atomisch voor twee toegestane TEST-ontvangers (sink + CC)', async () => {
  let result: { ok?: boolean; mode?: string; writes_performed?: boolean; allowed_recipients?: string[]; test_accounts?: string[] } = {};
  const expectedRecipients = [
    'giovanno.maatsen@pathconsultancy.nl',
    'kenrich.lieveld@pathconsultancy.nl',
  ];
  const expectedAccounts = [
    'giovanno.maatsen@pathconsultancy.nl',
    'kenrich.lieveld@pathconsultancy.nl',
  ];

  await test.step('Given twee toegestane TEST-ontvangers (primaire sink + CC) en twee bijbehorende accounts zijn gedefinieerd', async () => {
    expect(expectedRecipients).toHaveLength(2);
    expect(expectedAccounts).toHaveLength(2);
  });

  await test.step('When de TEST-mailsandboxconfigurator zonder uitvoerbevestiging wordt gestart', async () => {
    const execution = await execFileAsync('php', ['server/scripts/configure-test-mail-sandbox.php'], {
      cwd: process.cwd(),
      windowsHide: true,
    });
    result = JSON.parse(execution.stdout);
  });

  await test.step('Then blijft de check niet-mutatief en scheidt hij de mailsink van de TEST-accounts', async () => {
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('check');
    expect(result.writes_performed).toBe(false);
    expect(result.allowed_recipients).toEqual(expectedRecipients);
    expect(result.test_accounts).toEqual(expectedAccounts);
  });

  await test.step('And zijn bevestiging, accounttransactie, backup, atomische write en deployguard aantoonbaar afgedwongen', async () => {
    const configurator = await readFile(join(process.cwd(), 'server', 'scripts', 'configure-test-mail-sandbox.php'), 'utf8');
    const preflight = await readFile(join(process.cwd(), 'server', 'scripts', 'test-preflight.php'), 'utf8');
    const deploy = await readFile(join(process.cwd(), 'scripts', 'deploy-test-remote.sh'), 'utf8');
    expect(configurator).toContain('ENABLE_TEST_MAIL_SANDBOX');
    expect(configurator).toContain('/data/sites/web/pathconsultancynl/private/path-uren-test/config.local.php');
    expect(configurator).toContain("copy($configPath, $backupPath)");
    expect(configurator).toContain("rename($temporaryPath, $configPath)");
    expect(configurator).toContain("$config['mail']['test_delivery_enabled'] = true");
    expect(configurator).toContain("$config['mail']['test_redirect_all'] = true");
    expect(configurator).toContain("$config['mail']['test_sink_recipient'] = $businessRecipient");
    expect(configurator).toContain("$config['mail']['test_sink_cc_recipient'] = $secondaryTestAccount");
    expect(configurator).toContain('$pdo->beginTransaction()');
    expect(configurator).toContain('password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT)');
    expect(configurator).toContain('$pdo->rollBack()');
    expect(preflight).toContain('mail_fail_closed_or_exactly_guarded');
    expect(preflight).toContain('guarded_mail_accounts_active');
    expect(deploy).toContain('TEST mail is neither closed nor protected by the exact sandbox allowlist');
    expect(deploy).toContain('test_mail_window=guarded');
    const mailConfig = await readFile(join(process.cwd(), 'server', 'mail', 'config.php'), 'utf8');
    const dispatch = await readFile(join(process.cwd(), 'server', 'mail', 'dispatch.php'), 'utf8');
    const acceptance = await readFile(join(process.cwd(), 'server', 'mail', 'acceptance.php'), 'utf8');
    expect(mailConfig).toContain('function mail_effective_delivery');
    expect(mailConfig).toContain('[TEST voor ');
    expect(dispatch).toContain("$effective['recipient']");
    expect(acceptance).toContain('function mail_acceptance_repeatable_security_flow');
    expect(acceptance).toContain('DELETE FROM password_reset_tokens WHERE user_id = :id');
  });
});

test('[SAFE-H-006] eerste productieorganisatie wordt gevalideerd en zonder overschrijven ingericht', async () => {
  let source = '';

  await test.step('Given de CLI-only productiebedrijfs-bootstrap wordt gelezen', async () => {
    source = await readFile(join(process.cwd(), 'server', 'scripts', 'provision-company.php'), 'utf8');
    expect(source).toContain("require_once __DIR__ . '/cli-bootstrap.php'");
    expect(source).not.toMatch(/example\.invalid|demo-bv|Demo BV/);
  });

  await test.step('Then vereist de bootstrap productie, expliciete bevestiging en geldige bedrijfsgegevens', async () => {
    expect(source).toContain("($options['execute'] ?? false) !== true");
    expect(source).toContain("($options['confirm'] ?? '') !== 'PROVISION_COMPANY'");
    expect(source).toContain("$environment !== 'production'");
    expect(source).toContain("($config['allow_demo_migrations'] ?? true) !== false");
    expect(source).toContain("$profile === 'path-consultancy'");
    expect(source).toContain("$profile === 'custom'");
    expect(source).toContain("/^\\d{8}$/");
    expect(source).toContain("/^NL\\d{9}B\\d{2}$/");
    expect(source).toContain("/^NL\\d{2}[A-Z]{4}\\d{10}$/");
  });

  await test.step('And maakt hij alleen een lege database aan, logt de handeling en overschrijft nooit afwijkende data', async () => {
    expect(source).toContain('$pdo->beginTransaction()');
    expect(source).toContain('FROM companies ORDER BY id FOR UPDATE');
    expect(source).toContain('Refusing to provision: multiple companies already exist.');
    expect(source).toContain('Refusing to overwrite an existing company with different data.');
    expect(source).toContain("'action' => 'unchanged'");
    expect(source).toContain('company.production_provisioned');
    expect(source).toContain('$pdo->rollBack()');
  });
});

test('[SAFE-H-011] groene main-pipeline rolt exact dezelfde release veilig uit naar productie', async () => {
  let workflow = '';
  let runner = '';
  let remote = '';

  await test.step('Given het automatische TransIP-deploycontract wordt ingelezen', async () => {
    workflow = await readFile(join(process.cwd(), '..', '.github', 'workflows', 'release-pipeline.yml'), 'utf8');
    runner = await readFile(join(process.cwd(), 'scripts', 'deploy-production-transip.sh'), 'utf8');
    remote = await readFile(join(process.cwd(), 'scripts', 'deploy-production-remote.sh'), 'utf8');
    expect(workflow).toContain('deploy-prod:');
    expect(runner).toContain('StrictHostKeyChecking=yes');
    expect(remote).toContain('rollback_on_error');
  });

  await test.step('When validatie, TEST, PROD-regressie en Living Docs groen zijn', async () => {
    expect(workflow).toMatch(/deploy-prod:\s*[\s\S]*needs:\s*\[prod, live-docs\]/);
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain('needs.prod.result == \'success\'');
    expect(workflow).toContain('needs.live-docs.result == \'success\'');
  });

  await test.step('Then wordt alleen main met checksum, backup, migratie en live-smoke uitgerold', async () => {
    expect(runner).toContain('sha256sum');
    expect(remote).toContain('database-backup.php');
    expect(remote).toContain('server/migrate.php');
    expect(remote).toContain('production-preflight.php --config=server/config.local.php --live');
    expect(remote).toContain('server/health.php');
    expect(workflow).toContain('secrets.TRANSIP_SSH_PRIVATE_KEY');
  });

  await test.step('And blijft mail gesloten en wordt bij een fout automatisch teruggerold', async () => {
    expect(remote).toContain('Production mail or acceptance window is still enabled.');
    expect(remote).toContain('Pending production mail prevents deployment');
    expect(remote).toContain('move_directory_contents "$live_root" "$failed_root"');
    expect(remote).toContain('move_directory_contents "$rollback_root" "$live_root"');
    expect(remote).toContain('opcache_reset');
    expect(remote).toContain('chmod 644 "$helper_path"');
    expect(remote).toContain('PROD OPcache refresh unavailable; continuing to authoritative public smoke');
    expect(remote).toContain('rm -f -- "$helper_path"');
    expect(remote).toContain('curl_status');
    expect(remote).not.toContain('rm -rf');
  });
});
