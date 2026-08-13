import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { config as loadDotEnv } from 'dotenv';

const root = process.cwd();
const sqlPath = path.join(root, 'database', 'queries', 'crud-smoke.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

function loadEnvFiles() {
  // Shell/CI values are explicit operator input and must not be overwritten by
  // checked-in stage defaults while loading optional local configuration.
  const explicitEnvironment = { ...process.env };
  const envFiles = [path.join(root, '.env'), path.join(root, '.env.local')];
  const stage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
  if (stage && ['dev', 'test', 'acc', 'prod'].includes(stage)) {
    envFiles.push(path.join(root, 'environments', `${stage}.env`));
  } else if (!process.env.PATH_APP_DB_NAME && !process.env.PLAYWRIGHT_DB_NAME && !process.env.DB_NAME) {
    envFiles.push(path.join(root, 'environments', 'test.env'));
  }

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      loadDotEnv({ path: envFile, override: envFile.endsWith('.env.local') || envFile.includes('environments') });
    }
  }

  for (const [key, value] of Object.entries(explicitEnvironment)) {
    if (value !== undefined) process.env[key] = value;
  }

  const databaseSettingGroups = [
    ['PATH_APP_DB_HOST', 'PLAYWRIGHT_DB_HOST', 'DB_HOST'],
    ['PATH_APP_DB_PORT', 'PLAYWRIGHT_DB_PORT', 'DB_PORT'],
    ['PATH_APP_DB_USER', 'PLAYWRIGHT_DB_USER', 'DB_USER'],
    ['PATH_APP_DB_PASSWORD', 'PLAYWRIGHT_DB_PASSWORD', 'DB_PASSWORD'],
    ['PATH_APP_DB_NAME', 'PLAYWRIGHT_DB_NAME', 'DB_NAME'],
  ];
  for (const aliases of databaseSettingGroups) {
    const hasExplicitValue = aliases.some((key) => explicitEnvironment[key] !== undefined);
    if (!hasExplicitValue) continue;
    for (const key of aliases) {
      if (explicitEnvironment[key] === undefined) delete process.env[key];
    }
  }
}

loadEnvFiles();

let config = {
  host: process.env.PATH_APP_DB_HOST || process.env.PLAYWRIGHT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.PATH_APP_DB_PORT || process.env.PLAYWRIGHT_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.PATH_APP_DB_USER || process.env.PLAYWRIGHT_DB_USER || process.env.DB_USER || 'root',
  password: process.env.PATH_APP_DB_PASSWORD || process.env.PLAYWRIGHT_DB_PASSWORD || process.env.DB_PASSWORD || 'root',
  database: process.env.PATH_APP_DB_NAME || process.env.PLAYWRIGHT_DB_NAME || process.env.DB_NAME || 'path_urenregistratie',
  charset: 'utf8mb4',
  multipleStatements: true,
};

if (process.env.CI && !process.env.PATH_APP_DB_NAME && !process.env.PLAYWRIGHT_DB_NAME && !process.env.DB_NAME) {
  config.database = 'path_urenregistratie';
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
      config.database = dbMatch[1];
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

if (process.env.DB_CRUD_CONFIG_CHECK_ONLY === '1') {
  console.log(JSON.stringify({
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
  }));
  process.exit(0);
}

const environmentSignals = [process.env.PATH_APP_ENVIRONMENT, process.env.APP_ENV, process.env.NODE_ENV]
  .map((value) => String(value || '').trim().toLowerCase())
  .filter(Boolean);
const requestedStage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);
const namedTestDatabase = /_test$/i.test(config.database);
const isolatedCiDatabase = Boolean(process.env.CI)
  && environmentSignals.includes('test')
  && loopbackHosts.has(String(config.host || '').trim().toLowerCase())
  && config.database === 'path_urenregistratie';
const productionContext = environmentSignals.includes('production') || requestedStage === 'prod';
if (productionContext || (!namedTestDatabase && !isolatedCiDatabase)) {
  throw new Error(
    `DB CRUD smoke is not allowed for ${config.database || '(empty database name)'}. `
    + 'Use a database ending in _test, or the isolated loopback CI database.',
  );
}

const connection = await mysql.createConnection(config);

try {
  await connection.query('CREATE DATABASE IF NOT EXISTS path_urenregistratie');
} catch {
  // ignore bootstrap issues and rely on existing connection.
}

try {
  const [results] = await connection.query(sql);
  const resultSets = Array.isArray(results) ? results : [results];
  const finalRows = Array.isArray(resultSets[resultSets.length - 1]) ? resultSets[resultSets.length - 1] : [];
  const hasExpectedOutput = finalRows.some(row => row && typeof row === 'object' && Number(row.remaining_rows ?? row['remaining_rows']) === 0);
  if (!hasExpectedOutput) {
    throw new Error('DB-H-001 did not produce the expected cleanup result set.');
  }
  console.log('DB-H-001: CRUD smoke executed successfully.');
} catch (error) {
  console.error('DB-H-001 failed:', error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
