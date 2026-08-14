import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const workflow = await readFile(join(root, '..', '.github', 'workflows', 'release-pipeline.yml'), 'utf8');
const runner = await readFile(join(root, 'scripts', 'deploy-production-transip.sh'), 'utf8');
const remote = await readFile(join(root, 'scripts', 'deploy-production-remote.sh'), 'utf8');
const combined = `${runner}\n${remote}`;
const testRunner = await readFile(join(root, 'scripts', 'deploy-test-transip.sh'), 'utf8');
const testRemote = await readFile(join(root, 'scripts', 'deploy-test-remote.sh'), 'utf8');
const testCombined = `${testRunner}\n${testRemote}`;

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

assert.match(workflow, /deploy-test:\s*[\s\S]*needs:\s*test/, 'TEST deployment must wait for TEST regression');
assert.match(workflow, /deploy-test:\s*[\s\S]*environment:\s*test/, 'TEST deployment must use the test environment');
assert.match(workflow, /prod:\s*[\s\S]*needs:\s*\[test, deploy-test\]/, 'PROD promotion must wait for public TEST deployment');
for (const required of [
  '/data/sites/web/pathconsultancynl/private/path-uren-test-deployments',
  '/data/sites/web/pathconsultancynl/private/path-uren-test',
  '/data/sites/web/pathconsultancynl/subsites/uren-test.pathconsultancy.nl',
  'https://uren-test.pathconsultancy.nl',
  'StrictHostKeyChecking=yes',
  'sha256sum',
  'database-backup.php',
  'server/migrate.php',
  'test-preflight.php --config=server/config.local.php --live',
  'TEST mail or acceptance window is still enabled',
  'wait_for_test_vhost',
  'TEST vhost does not yet serve its configured document root',
  'rollback_on_error',
  '[[ -d "$root/server" ]] || return 0',
  'TEST OPcache refresh unavailable; continuing to public smoke',
  'server/health.php',
]) {
  assert.ok(testCombined.includes(required), `Missing TEST deployment safeguard: ${required}`);
}
assert.doesNotMatch(testCombined, /pathco_Urenuru|uren\.pathconsultancy\.nl(?![\w-])/, 'TEST deploy must never target PROD identifiers');
assert.doesNotMatch(testCombined, /BEGIN (?:OPENSSH|RSA|EC) PRIVATE KEY/, 'TEST private keys may never be embedded');
assert.doesNotMatch(testRemote, /\bseq\b/, 'TEST deploy must use Bash built-ins available on the TransIP shell');
assert.doesNotMatch(testRemote, /rm\s+-rf/, 'The remote TEST deploy must never recursively delete TEST paths');

console.log('Automatische TEST- en PROD-deploy contractcheck: geslaagd');
