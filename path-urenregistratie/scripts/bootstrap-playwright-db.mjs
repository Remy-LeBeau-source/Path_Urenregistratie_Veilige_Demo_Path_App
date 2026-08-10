import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import mysql from 'mysql2/promise';
import { config as loadDotEnv } from 'dotenv';

const root = process.cwd();
const envFiles = [path.join(root, '.env'), path.join(root, '.env.local')];
const stage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
if (stage && ['dev', 'test', 'acc', 'prod'].includes(stage)) {
  envFiles.push(path.join(root, 'environments', `${stage}.env`));
} else if (!process.env.PATH_APP_DB_NAME && !process.env.PLAYWRIGHT_DB_NAME && !process.env.DB_NAME) {
  envFiles.push(path.join(root, 'environments', 'test.env'));
}
for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    loadDotEnv({ path: envFile, override: false });
  }
}

let config = {
  host: process.env.PATH_APP_DB_HOST || process.env.PLAYWRIGHT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.PATH_APP_DB_PORT || process.env.PLAYWRIGHT_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.PATH_APP_DB_USER || process.env.PLAYWRIGHT_DB_USER || process.env.DB_USER || 'root',
  password: process.env.PATH_APP_DB_PASSWORD || process.env.PLAYWRIGHT_DB_PASSWORD || process.env.DB_PASSWORD || 'root',
};

let databaseName = process.env.PATH_APP_DB_NAME || process.env.PLAYWRIGHT_DB_NAME || process.env.DB_NAME || '';
if (!databaseName) {
  const stage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
  if (stage === 'prod') {
    databaseName = 'path_urenregistratie';
  } else if (stage === 'ci' || process.env.CI) {
    databaseName = 'path_urenregistratie';
  } else {
    databaseName = 'path_urenregistratie_test';
  }
}

try {
  const localConfigPath = path.join(root, 'server', 'config.local.php');
  if (fs.existsSync(localConfigPath)) {
    const localConfigContent = fs.readFileSync(localConfigPath, 'utf8');
    const match = localConfigContent.match(/'host'\s*=>\s*'([^']+)'/);
    const dbMatch = localConfigContent.match(/'database'\s*=>\s*'([^']+)'/);
    const userMatch = localConfigContent.match(/'username'\s*=>\s*'([^']+)'/);
    const passMatch = localConfigContent.match(/'password'\s*=>\s*'([^']+)'/);
    if (match && !process.env.PATH_APP_DB_HOST && !process.env.PLAYWRIGHT_DB_HOST && !process.env.DB_HOST) {
      config.host = match[1];
    }
    if (dbMatch && !process.env.PATH_APP_DB_NAME && !process.env.PLAYWRIGHT_DB_NAME && !process.env.DB_NAME) {
      databaseName = dbMatch[1];
    }
    if (userMatch && !process.env.PATH_APP_DB_USER && !process.env.PLAYWRIGHT_DB_USER && !process.env.DB_USER) {
      config.user = userMatch[1];
    }
    if (passMatch && !process.env.PATH_APP_DB_PASSWORD && !process.env.PLAYWRIGHT_DB_PASSWORD && !process.env.DB_PASSWORD) {
      config.password = passMatch[1];
    }
  }
} catch {
  // fall back to env-based defaults
}

function resolvePhpPath() {
  const phpPathFile = path.join(root, 'server', '.php-path');
  if (fs.existsSync(phpPathFile)) {
    const phpPath = fs.readFileSync(phpPathFile, 'utf8').trim();
    if (phpPath) {
      return phpPath;
    }
  }
  return process.platform === 'win32' ? 'php.exe' : 'php';
}

function hashPasswordWithPhp(phpBinary, plainPassword) {
  const hashResult = spawnSync(
    phpBinary,
    ['-r', 'echo password_hash($argv[1], PASSWORD_DEFAULT);', plainPassword],
    { encoding: 'utf8' },
  );

  if (hashResult.status !== 0) {
    throw new Error('Could not generate password hash via PHP runtime.');
  }

  const hash = String(hashResult.stdout || '').trim();
  if (!hash) {
    throw new Error('Generated password hash was empty.');
  }

  return hash;
}

function stageScopedValue(stageName, key, fallback = '') {
  const normalizedStage = String(stageName || '').trim().toLowerCase();
  const stageKey = normalizedStage ? `${normalizedStage.toUpperCase()}_${key}` : '';
  if (stageKey) {
    const scoped = String(process.env[stageKey] || '').trim();
    if (scoped) {
      return scoped;
    }
  }

  const shared = String(process.env[key] || '').trim();
  if (shared) {
    return shared;
  }

  return fallback;
}

function dedupeNonEmpty(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

const connection = await mysql.createConnection(config);
const requestedStage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
const isTestDatabase = databaseName.endsWith('_test') || requestedStage === 'test';
try {
  if (isTestDatabase) {
    await connection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  }
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  console.log(`Prepared isolated Playwright database: ${databaseName}`);
} finally {
  await connection.end();
}

const phpPath = resolvePhpPath();
const migrationEnv = {
  ...process.env,
  PATH_APP_DB_HOST: config.host,
  PATH_APP_DB_PORT: String(config.port),
  PATH_APP_DB_NAME: databaseName,
  PATH_APP_DB_USER: config.user,
  PATH_APP_DB_PASSWORD: config.password,
  PATH_APP_ENVIRONMENT: 'test',
  PATH_APP_ALLOW_DEMO_MIGRATIONS: '1',
  PLAYWRIGHT_STAGE: 'test',
  PLAYWRIGHT_ALLOW_DEMO_MIGRATIONS: '1',
  PLAYWRIGHT_DB_HOST: config.host,
  PLAYWRIGHT_DB_PORT: String(config.port),
  PLAYWRIGHT_DB_NAME: databaseName,
  PLAYWRIGHT_DB_USER: config.user,
  PLAYWRIGHT_DB_PASSWORD: config.password,
};
const migration = spawnSync(phpPath, ['server/migrate.php'], {
  cwd: root,
  stdio: 'inherit',
  env: migrationEnv,
});
if (migration.status !== 0) {
  process.exit(migration.status ?? 1);
}

if (isTestDatabase) {
  const effectiveStage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase() || 'test';
  const adminPassword = stageScopedValue(effectiveStage, 'PLAYWRIGHT_ADMIN_PASSWORD');
  const employeePassword = stageScopedValue(effectiveStage, 'PLAYWRIGHT_EMPLOYEE_PASSWORD');
  const adminEmails = dedupeNonEmpty([
    stageScopedValue(effectiveStage, 'PLAYWRIGHT_ADMIN_EMAIL', 'gio@example.invalid'),
    'gio@example.invalid',
    'joyce@example.invalid',
    'admin@example.invalid',
  ]);
  const employeeEmails = dedupeNonEmpty([
    stageScopedValue(effectiveStage, 'PLAYWRIGHT_EMPLOYEE_EMAIL', 'stasjo@example.invalid'),
    'marc@example.invalid',
    'stasjo@example.invalid',
    'brian@example.invalid',
    'shawn@example.invalid',
    'employee.demo@example.invalid',
  ]);
  const adminHash = adminPassword ? hashPasswordWithPhp(phpPath, adminPassword) : '';
  const employeeHash = employeePassword ? hashPasswordWithPhp(phpPath, employeePassword) : '';

  const postMigrationConnection = await mysql.createConnection({
    ...config,
    database: databaseName,
  });

  try {
    // Keep local demo credentials reproducible across runs and remove lockout side effects from prior failures.
    if (adminHash) {
      const placeholders = adminEmails.map(() => '?').join(', ');
      await postMigrationConnection.query(
        `UPDATE users
         SET password_hash = ?
         WHERE email IN (${placeholders})
           AND role = 'administrator'`,
        [adminHash, ...adminEmails],
      );
    }

    if (employeeHash) {
      const placeholders = employeeEmails.map(() => '?').join(', ');
      await postMigrationConnection.query(
        `UPDATE users
         SET password_hash = ?
         WHERE email IN (${placeholders})
           AND role = 'employee'`,
        [employeeHash, ...employeeEmails],
      );
    }

    await postMigrationConnection.query('DELETE FROM auth_login_audit');
  } finally {
    await postMigrationConnection.end();
  }
}

console.log(`Migrated isolated Playwright database: ${databaseName}`);
