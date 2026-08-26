import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { config as loadDotEnv } from 'dotenv';

function resolvePhpPath() {
  const phpPathFile = path.join(process.cwd(), 'server', '.php-path');
  if (existsSync(phpPathFile)) {
    const phpPath = readFileSync(phpPathFile, 'utf8').trim();
    if (phpPath) {
      return phpPath;
    }
  }
  return process.platform === 'win32' ? 'php.exe' : 'php';
}

function loadEnvFiles() {
  const root = process.cwd();
  const envFiles = [path.join(root, '.env'), path.join(root, '.env.local')];
  const stage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
  if (stage && ['dev', 'test', 'acc', 'prod'].includes(stage)) {
    envFiles.push(path.join(root, 'environments', `${stage}.env`));
  } else if (!process.env.PATH_APP_DB_NAME && !process.env.PLAYWRIGHT_DB_NAME && !process.env.DB_NAME) {
    envFiles.push(path.join(root, 'environments', 'test.env'));
  }
  for (const envFile of envFiles) {
    if (existsSync(envFile)) {
      loadDotEnv({ path: envFile, override: false });
    }
  }
}

function resolveDatabaseName(env) {
  return String(env.PATH_APP_DB_NAME || env.PLAYWRIGHT_DB_NAME || env.DB_NAME || '').trim();
}

function normalizeLocalBaseUrl(value) {
  const url = new URL(String(value || 'http://127.0.0.1:8000').trim());
  // The managed PHP server binds IPv4. Keeping `localhost` lets browsers prefer
  // ::1 and accidentally talk to a stale, unrelated IPv6 PHP process.
  if (url.hostname === 'localhost') {
    url.hostname = '127.0.0.1';
  }
  return url.toString().replace(/\/$/, '');
}

async function waitForHealth(baseUrl, timeoutMs = 60_000) {
  const startedAt = Date.now();
  let lastError = 'startup-not-yet-ready';
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(new URL('/server/health.php', baseUrl).toString(), { method: 'GET' });
      if (response.ok) {
        return response;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for PHP health endpoint at ${baseUrl}; last error: ${lastError}`);
}

async function assertServerPortAvailable(baseUrl) {
  const target = new URL(baseUrl);
  const port = Number(target.port || (target.protocol === 'https:' ? 443 : 80));
  const host = target.hostname === 'localhost' ? '127.0.0.1' : target.hostname;

  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', error => {
      reject(new Error(`E2E precheck failed: ${host}:${port} is already in use. Stop the existing server before running Playwright. (${error.code || error.message})`));
    });
    probe.listen(port, host, () => probe.close(resolve));
  });
}

async function main() {
  loadEnvFiles();

  const stage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
  const effectiveStage = stage || 'dev';
  if (stage && !['dev', 'test', 'acc', 'prod'].includes(stage)) {
    throw new Error('E2E precheck failed: PLAYWRIGHT_STAGE must be one of dev, test, acc, prod.');
  }

  const requiredEnvVars = ['PLAYWRIGHT_ADMIN_PASSWORD', 'PLAYWRIGHT_EMPLOYEE_PASSWORD'];
  const missing = requiredEnvVars.filter((name) => !String(process.env[name] || '').trim());
  if (missing.length > 0) {
    throw new Error(`E2E precheck failed: missing required environment variables.\n- ${missing.join('\n- ')}`);
  }

  const resolvedDatabaseName = resolveDatabaseName(process.env);
  if (!process.env.CI && effectiveStage !== 'prod' && resolvedDatabaseName && !resolvedDatabaseName.endsWith('_test')) {
    throw new Error(`E2E precheck failed: local Playwright runs require a test database name ending in _test, got ${resolvedDatabaseName}.`);
  }

  const baseUrl = normalizeLocalBaseUrl(process.env.PATH_APP_BASE_URL);
  const phpPath = resolvePhpPath();
  const serverAddress = '127.0.0.1:8000';

  await assertServerPortAvailable(baseUrl);

  console.log(`E2E precheck ok: ${baseUrl} will be served by a runner-managed PHP server using DB ${resolvedDatabaseName || '(default)'}.`);

  const bootstrapEnv = {
    ...process.env,
    PLAYWRIGHT_STAGE: effectiveStage,
    PATH_APP_ENVIRONMENT: 'test',
    PATH_APP_ALLOW_DEMO_MIGRATIONS: '1',
    PLAYWRIGHT_ALLOW_DEMO_MIGRATIONS: '1',
  };

  const bootstrapDb = spawnSync(process.execPath, ['scripts/bootstrap-playwright-db.mjs'], {
    stdio: 'inherit',
    env: bootstrapEnv,
  });
  if (bootstrapDb.status !== 0) {
    throw new Error(`Database bootstrap failed with exit code ${bootstrapDb.status ?? 1}.`);
  }

  const allurePrepare = spawnSync(process.execPath, ['scripts/prepare-allure-results.mjs'], {
    stdio: 'inherit',
    env: bootstrapEnv,
  });
  if (allurePrepare.status !== 0) {
    throw new Error(`Allure prep failed with exit code ${allurePrepare.status ?? 1}.`);
  }

  // Iedere runner krijgt zijn eigen private opslag. Zo kan een eerdere UI-run
  // nooit een achtergebleven PDF aan een volgende case "lenen". De map wordt pas
  // verwijderd nadat Playwright UI én de beheerde PHP-server zijn afgesloten.
  const privateRoot = mkdtempSync(path.join(tmpdir(), 'path-urenregistratie-playwright-'));
  const runId = path.basename(privateRoot);

  const serverEnv = {
    ...process.env,
    PATH_APP_DB_NAME: resolvedDatabaseName,
    PLAYWRIGHT_DB_NAME: resolvedDatabaseName,
    PATH_APP_ENVIRONMENT: 'test',
    PLAYWRIGHT_STAGE: effectiveStage,
    PATH_APP_ALLOW_DEMO_MIGRATIONS: '1',
    PLAYWRIGHT_ALLOW_DEMO_MIGRATIONS: '1',
    PATH_APP_BASE_URL: baseUrl,
    PATH_APP_PRIVATE_ROOT: privateRoot,
    PATH_APP_E2E_RUN_ID: runId,
  };

  const testRuntimeEnv = {
    ...process.env,
    PATH_APP_DB_NAME: resolvedDatabaseName,
    PLAYWRIGHT_DB_NAME: resolvedDatabaseName,
    PATH_APP_ENVIRONMENT: 'test',
    PLAYWRIGHT_STAGE: effectiveStage,
    PATH_APP_ALLOW_DEMO_MIGRATIONS: '1',
    PLAYWRIGHT_ALLOW_DEMO_MIGRATIONS: '1',
    PATH_APP_BASE_URL: baseUrl,
    PATH_APP_PRIVATE_ROOT: privateRoot,
    PATH_APP_E2E_RUN_ID: runId,
  };

  if (effectiveStage !== 'prod') {
    const stagePrefix = effectiveStage.toUpperCase();
    const stageAdminEmailKey = `${stagePrefix}_PLAYWRIGHT_ADMIN_EMAIL`;
    const stageEmployeeEmailKey = `${stagePrefix}_PLAYWRIGHT_EMPLOYEE_EMAIL`;
    const stageAdminPasswordKey = `${stagePrefix}_PLAYWRIGHT_ADMIN_PASSWORD`;
    const stageEmployeePasswordKey = `${stagePrefix}_PLAYWRIGHT_EMPLOYEE_PASSWORD`;

    const adminPassword = String(process.env.PLAYWRIGHT_ADMIN_PASSWORD || '').trim();
    const employeePassword = String(process.env.PLAYWRIGHT_EMPLOYEE_PASSWORD || '').trim();

    bootstrapEnv.PLAYWRIGHT_ADMIN_EMAIL = 'gio@example.invalid';
    bootstrapEnv.PLAYWRIGHT_EMPLOYEE_EMAIL = 'stasjo@example.invalid';
    bootstrapEnv[stageAdminEmailKey] = 'gio@example.invalid';
    bootstrapEnv[stageEmployeeEmailKey] = 'stasjo@example.invalid';
    if (adminPassword) {
      bootstrapEnv[stageAdminPasswordKey] = adminPassword;
    }
    if (employeePassword) {
      bootstrapEnv[stageEmployeePasswordKey] = employeePassword;
    }

    testRuntimeEnv.PLAYWRIGHT_ADMIN_EMAIL = 'gio@example.invalid';
    testRuntimeEnv.PLAYWRIGHT_EMPLOYEE_EMAIL = 'stasjo@example.invalid';
    testRuntimeEnv[stageAdminEmailKey] = 'gio@example.invalid';
    testRuntimeEnv[stageEmployeeEmailKey] = 'stasjo@example.invalid';
    if (adminPassword) {
      testRuntimeEnv[stageAdminPasswordKey] = adminPassword;
    }
    if (employeePassword) {
      testRuntimeEnv[stageEmployeePasswordKey] = employeePassword;
    }
  }

  if (effectiveStage === 'test') {
    if (!String(testRuntimeEnv.TEST_PLAYWRIGHT_ADMIN_EMAIL || '').trim()) {
      testRuntimeEnv.TEST_PLAYWRIGHT_ADMIN_EMAIL = 'gio@example.invalid';
    }
    if (!String(testRuntimeEnv.TEST_PLAYWRIGHT_EMPLOYEE_EMAIL || '').trim()) {
      testRuntimeEnv.TEST_PLAYWRIGHT_EMPLOYEE_EMAIL = 'stasjo@example.invalid';
    }
    if (!String(testRuntimeEnv.TEST_PLAYWRIGHT_ADMIN_PASSWORD || '').trim() && String(testRuntimeEnv.PLAYWRIGHT_ADMIN_PASSWORD || '').trim()) {
      testRuntimeEnv.TEST_PLAYWRIGHT_ADMIN_PASSWORD = String(testRuntimeEnv.PLAYWRIGHT_ADMIN_PASSWORD);
    }
    if (!String(testRuntimeEnv.TEST_PLAYWRIGHT_EMPLOYEE_PASSWORD || '').trim() && String(testRuntimeEnv.PLAYWRIGHT_EMPLOYEE_PASSWORD || '').trim()) {
      testRuntimeEnv.TEST_PLAYWRIGHT_EMPLOYEE_PASSWORD = String(testRuntimeEnv.PLAYWRIGHT_EMPLOYEE_PASSWORD);
    }
  }

  // De ingebouwde PHP-server handelt standaard een verzoek tegelijk af. Het opstarten
  // van de app vuurt er een reeks achter elkaar af (csrf, me, bootstrap, dashboard,
  // facturen, mailwachtrij), en die staan dan in de rij achter elkaar. Onder belasting
  // duurde dat af en toe langer dan de wachttijd van een case, met een enkele
  // wisselvallige val tot gevolg terwijl er niets mis was.
  //
  // Meer werkers lost dat bij de bron op. Het is een POSIX-voorziening (fork), dus op
  // Windows heeft het geen effect; daar helpt alleen de ruimere opstartwachttijd in
  // LoginPage.
  if (process.platform !== 'win32' && !serverEnv.PHP_CLI_SERVER_WORKERS) {
    serverEnv.PHP_CLI_SERVER_WORKERS = '4';
  }

  const serverProcess = spawn(phpPath, ['-S', serverAddress, '-t', '.'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: serverEnv,
  });

  try {
    const healthResponse = await waitForHealth(baseUrl);
    const healthBody = await healthResponse.text();
    console.log(`PHP server ready at ${baseUrl} with health payload: ${healthBody.replace(/\s+/g, ' ').slice(0, 220)}`);
    let healthPayload;
    try {
      healthPayload = JSON.parse(healthBody);
    } catch {
      throw new Error('E2E precheck failed: PHP health endpoint returned invalid JSON.');
    }
    const connectedDatabase = String(healthPayload?.checks?.database_connection?.database || '').trim();
    if (resolvedDatabaseName && connectedDatabase !== resolvedDatabaseName) {
      throw new Error(
        `E2E precheck failed: health endpoint connected to ${connectedDatabase || '(unknown)'} instead of ${resolvedDatabaseName}.`,
      );
    }

    const rawArgs = process.argv.slice(2);
    const extraArgs = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
    const groupRaw = String(process.env.PLAYWRIGHT_GROUP || '').trim().toLowerCase();

    const groupToGrep = {
      // Vier lagen, elk met een eigen naam en een eigen knop:
      //
      //   db   los script, npm run test:db:crud, cases DB-*
      //   api  het contract van de eindpunten, zonder scherm
      //   e2e  de volledige keten: uren, goedkeuren, factuur, mail
      //   ui   wat je op het scherm ziet, desktop en telefoon
      //
      // De e2e-laag bestond al als eigen bestand met een eigen feature, maar was
      // niet apart te draaien. Een nieuwe case die de hele keten doorloopt hoort
      // E2E- te heten, zodat hij hier vanzelf in valt.
      e2e: '\\[E2E-',
      auth: '\\[AUTH-',
      security: '\\[(SEC|SAFE)-',
      dashboard: '\\[DASH-',
      invoices: '\\[INV-',
      roles: '\\[ROLE-',
      timesheets: '\\[(TS-API|TS-REV)-',
      customer: '\\[CTS-API-',
      'customer-timesheets': '\\[CTS-API-',
      api: '\\[(AUTH|SEC|ROLE|TS-API|TS-REV-API|CTS-API)-',
      ui: '\\[(DASH|INV|TS-REV-UI)-',
      'ui-desktop': '\\[(DASH|INV|TS-REV-UI)-',
      'ui-mobile': '\\[MOB-',
      mobile: '\\[MOB-',
      happy: '-H-',
      negative: '-N-',
      phase10: '\\[CTS-API-',
      phase11: '\\[INV-',
    };

    function hasExplicitGrep(args) {
      return args.some((arg, index) => arg === '--grep' || arg === '-g' || (arg.startsWith('--grep=') && index >= 0));
    }

    const runtimeArgs = [...extraArgs];

    if (groupRaw !== '' && !hasExplicitGrep(runtimeArgs)) {
      const groups = groupRaw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

      const unknown = groups.filter((group) => !groupToGrep[group]);
      if (unknown.length > 0) {
        throw new Error(`E2E precheck failed: unknown PLAYWRIGHT_GROUP value(s): ${unknown.join(', ')}. Allowed values: ${Object.keys(groupToGrep).join(', ')}`);
      }

      if (groups.length > 0) {
        const regex = groups.map((group) => groupToGrep[group]).join('|');
        const grepArg = process.platform === 'win32' ? `"${regex}"` : regex;
        runtimeArgs.push('--grep', grepArg);
        console.log(`E2E group filter active (PLAYWRIGHT_GROUP=${groupRaw}): ${regex}`);
      }
    }

    const result = spawnSync('npx', ['playwright', 'test', ...runtimeArgs], {
      stdio: 'inherit',
      env: testRuntimeEnv,
      shell: process.platform === 'win32',
    });

    if (typeof result.status === 'number') {
      process.exitCode = result.status;
      return;
    }

    process.exitCode = 1;
  } finally {
    if (serverProcess.exitCode === null) {
      serverProcess.kill();
      await new Promise((resolve) => serverProcess.once('exit', resolve));
    }
    const resolvedPrivateRoot = path.resolve(privateRoot);
    const resolvedTempRoot = path.resolve(tmpdir()) + path.sep;
    if (
      !resolvedPrivateRoot.startsWith(resolvedTempRoot)
      || !path.basename(resolvedPrivateRoot).startsWith('path-urenregistratie-playwright-')
    ) {
      throw new Error(`Refusing to clean unexpected Playwright private root: ${resolvedPrivateRoot}`);
    }
    rmSync(resolvedPrivateRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
