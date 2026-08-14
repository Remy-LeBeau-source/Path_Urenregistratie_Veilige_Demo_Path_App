import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const workflow = await readFile(join(root, '..', '.github', 'workflows', 'release-pipeline.yml'), 'utf8');
const runner = await readFile(join(root, 'scripts', 'deploy-production-transip.sh'), 'utf8');
const remote = await readFile(join(root, 'scripts', 'deploy-production-remote.sh'), 'utf8');
const combined = `${runner}\n${remote}`;

assert.match(workflow, /deploy-prod:\s*[\s\S]*needs:\s*\[prod, live-docs\]/, 'PROD deployment must wait for regression and Living Docs');
assert.match(workflow, /environment:\s*prod/, 'PROD deployment must use the protected prod environment');
assert.match(workflow, /secrets\.TRANSIP_SSH_PRIVATE_KEY/, 'SSH private key must come from GitHub Secrets');
assert.match(workflow, /secrets\.TRANSIP_SSH_KNOWN_HOSTS/, 'Pinned host keys must come from GitHub Secrets');
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/, 'Only main may deploy automatically');

for (const required of [
  'StrictHostKeyChecking=yes',
  'sha256sum',
  'database-backup.php',
  'server/migrate.php',
  'production-preflight.php --config=server/config.local.php --live',
  'Pending production mail prevents deployment',
  'Production mail or acceptance window is still enabled',
  'rollback_on_error',
  'opcache_reset',
  'rm -f -- "$helper_path"',
  'curl_status',
  'server/health.php',
]) {
  assert.ok(combined.includes(required), `Missing deployment safeguard: ${required}`);
}

assert.doesNotMatch(combined, /BEGIN (?:OPENSSH|RSA|EC) PRIVATE KEY/, 'Private keys may never be embedded');
assert.doesNotMatch(combined, /DB_PASSWORD\s*=|password\s*=\s*['"][^'"]+['"]/, 'Database passwords may never be embedded');
assert.doesNotMatch(remote, /rm\s+-rf/, 'The remote deploy must never recursively delete production paths');

console.log('Automatische PROD-deploy contractcheck: geslaagd');
