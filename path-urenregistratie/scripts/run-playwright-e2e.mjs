import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { config as loadDotEnv } from 'dotenv';

// Load tracked defaults first, then local overrides.
if (existsSync('.env')) {
  loadDotEnv({ path: '.env' });
}

const stage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
if (stage && !['dev', 'test', 'acc', 'prod'].includes(stage)) {
  console.error('E2E precheck failed: PLAYWRIGHT_STAGE must be one of dev, test, acc, prod.');
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
const groupRaw = String(process.env.PLAYWRIGHT_GROUP || '').trim().toLowerCase();

const groupToGrep = {
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
    console.error(`E2E precheck failed: unknown PLAYWRIGHT_GROUP value(s): ${unknown.join(', ')}`);
    console.error(`Allowed values: ${Object.keys(groupToGrep).join(', ')}`);
    process.exit(1);
  }

  if (groups.length > 0) {
    const regex = groups.map((group) => groupToGrep[group]).join('|');
    runtimeArgs.push('--grep', `"${regex}"`);
    console.log(`E2E group filter active (PLAYWRIGHT_GROUP=${groupRaw}): ${regex}`);
  }
}

const result = spawnSync(
  'npx',
  ['playwright', 'test', ...runtimeArgs],
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
