import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { config as loadDotEnv } from 'dotenv';

// Load tracked defaults first, then local overrides.
if (existsSync('.env')) {
  loadDotEnv({ path: '.env' });
}

const stage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
if (stage && !['dev', 'tst1', 'acc', 'prod'].includes(stage)) {
  console.error('E2E precheck failed: PLAYWRIGHT_STAGE must be one of dev, tst1, acc, prod.');
  process.exit(1);
}
if (stage) {
  const stageEnvPath = `environments/${stage}.env`;
  if (existsSync(stageEnvPath)) {
    loadDotEnv({ path: stageEnvPath, override: true });
  }
}

if (existsSync('.env.local')) {
  loadDotEnv({ path: '.env.local', override: true });
}

const requiredEnvVars = [
  'PLAYWRIGHT_ADMIN_PASSWORD',
  'PLAYWRIGHT_EMPLOYEE_PASSWORD',
];

const missing = requiredEnvVars.filter((name) => !String(process.env[name] || '').trim());

if (missing.length > 0) {
  console.error('E2E precheck failed: missing required environment variables.');
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  console.error('Set these in your shell or in .env.local before running npm run test:e2e.');
  process.exit(1);
}

const baseUrl = String(process.env.PATH_APP_BASE_URL || 'http://localhost:8000').trim();

try {
  const response = await fetch(baseUrl, { method: 'GET' });
  if (!response.ok) {
    console.error(`E2E precheck failed: ${baseUrl} returned HTTP ${response.status}.`);
    process.exit(1);
  }
} catch {
  console.error(`E2E precheck failed: cannot reach ${baseUrl}. Start the local server first.`);
  process.exit(1);
}

console.log(`E2E precheck ok: ${baseUrl} reachable and required env vars are set.`);

const rawArgs = process.argv.slice(2);
const extraArgs = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const result = spawnSync(
  'npx',
  ['playwright', 'test', ...extraArgs],
  {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  },
);

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
