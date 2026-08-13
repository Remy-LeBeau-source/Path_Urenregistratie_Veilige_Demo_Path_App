import { spawnSync } from 'node:child_process';

const env = { ...process.env };
for (const key of [
  'PATH_APP_DB_HOST', 'PLAYWRIGHT_DB_HOST', 'DB_HOST',
  'PATH_APP_DB_PORT', 'PLAYWRIGHT_DB_PORT', 'DB_PORT',
  'PATH_APP_DB_USER', 'PLAYWRIGHT_DB_USER', 'DB_USER',
  'PATH_APP_DB_PASSWORD', 'PLAYWRIGHT_DB_PASSWORD', 'DB_PASSWORD',
  'PATH_APP_DB_NAME', 'PLAYWRIGHT_DB_NAME', 'DB_NAME',
]) {
  delete env[key];
}

Object.assign(env, {
  CI: 'true',
  PATH_APP_ENVIRONMENT: 'test',
  PLAYWRIGHT_STAGE: 'test',
  DB_HOST: 'ci-db.example.invalid',
  DB_PORT: '3307',
  DB_USER: 'ci-explicit-user',
  DB_PASSWORD: 'not-used-in-config-check',
  DB_NAME: 'ci_explicit_database',
  DB_CRUD_CONFIG_CHECK_ONLY: '1',
});

const result = spawnSync(process.execPath, ['scripts/run-db-crud-smoke.mjs'], {
  cwd: process.cwd(),
  env,
  encoding: 'utf8',
});

if (result.status !== 0) {
  throw new Error(`DB-configprecedence kon niet worden gecontroleerd:\n${result.stderr || result.stdout}`);
}

const actual = JSON.parse(result.stdout.trim());
const expected = {
  host: 'ci-db.example.invalid',
  port: 3307,
  user: 'ci-explicit-user',
  database: 'ci_explicit_database',
};

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Expliciete CI DB-config is overschreven. Verwacht ${JSON.stringify(expected)}, ontvangen ${JSON.stringify(actual)}.`);
}

console.log('DB-configprecedence groen: expliciete CI-variabelen winnen van stage-defaults.');
