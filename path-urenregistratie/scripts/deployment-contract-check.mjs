import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const workflow = await readFile(join(root, '..', '.github', 'workflows', 'release-pipeline.yml'), 'utf8');
const pilotMergeQueue = await readFile(join(root, '..', '.github', 'workflows', 'pilot-merge-queue.yml'), 'utf8');
const runner = await readFile(join(root, 'scripts', 'deploy-production-transip.sh'), 'utf8');
const remote = await readFile(join(root, 'scripts', 'deploy-production-remote.sh'), 'utf8');
const combined = `${runner}\n${remote}`;
const testRunner = await readFile(join(root, 'scripts', 'deploy-test-transip.sh'), 'utf8');
const testRemote = await readFile(join(root, 'scripts', 'deploy-test-remote.sh'), 'utf8');
const testResetCli = await readFile(join(root, 'server', 'scripts', 'reset-test-baseline.php'), 'utf8');
const testResetLibrary = await readFile(join(root, 'server', 'lib', 'test-reset.php'), 'utf8');
const testCombined = `${testRunner}\n${testRemote}`;
const liveDocsJob = workflow.match(/\n  live-docs:[\s\S]*?(?=\n  acc:)/)?.[0] ?? '';

function runBaselineCli(args) {
  const result = spawnSync('php', ['server/scripts/reset-test-baseline.php', ...args], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(result.error, undefined, 'Guarded TEST baseline CLI must be executable');
  return { status: result.status, payload: JSON.parse(String(result.stdout || '{}')) };
}

assert.match(workflow, /deploy-prod:\s*[\s\S]*needs:\s*\[prod, live-docs\]/, 'PROD deployment must wait for regression and Living Docs');
assert.match(workflow, /environment:\s*prod/, 'PROD deployment must use the protected prod environment');
assert.match(workflow, /secrets\.TRANSIP_SSH_PRIVATE_KEY/, 'SSH private key must come from GitHub Secrets');
assert.match(workflow, /secrets\.TRANSIP_SSH_KNOWN_HOSTS/, 'Pinned host keys must come from GitHub Secrets');
assert.match(workflow, /github\.ref == 'refs\/heads\/main'/, 'Only main may deploy automatically');
assert.equal(
  (workflow.match(/extensions:\s*pdo_mysql, gd, fileinfo/g) || []).length,
  5,
  'Every PHP regression job must provide the image-to-PDF runtime extensions',
);

for (const required of [
  'StrictHostKeyChecking=yes',
  'sha256sum',
  'database-backup.php',
  'server/migrate.php',
  'production-preflight.php --config=server/config.local.php --live',
  'Pending production mail prevents deployment',
  'Production acceptance-test mail window is still enabled',
  'rollback_on_error',
  'opcache_reset',
  'chmod 644 "$helper_path"',
  'PROD OPcache refresh unavailable; continuing to authoritative public smoke',
  'rm -f -- "$helper_path"',
  'curl_status',
  'Production public health response is invalid or unhealthy',
  'Production public health check passed',
  'server/health.php',
]) {
  assert.ok(combined.includes(required), `Missing deployment safeguard: ${required}`);
}

assert.doesNotMatch(combined, /BEGIN (?:OPENSSH|RSA|EC) PRIVATE KEY/, 'Private keys may never be embedded');
assert.doesNotMatch(combined, /DB_PASSWORD\s*=|password\s*=\s*['"][^'"]+['"]/, 'Database passwords may never be embedded');
assert.doesNotMatch(remote, /rm\s+-rf/, 'The remote deploy must never recursively delete production paths');
assert.match(remote, /move_directory_contents "\$live_root" "\$rollback_root"/, 'PROD document-root contents must move into rollback');
assert.match(remote, /move_directory_contents "\$app_root" "\$live_root"/, 'PROD release contents must move into the stable document root');
assert.doesNotMatch(remote, /mv "\$live_root" "\$rollback_root"/, 'PROD document-root inode must remain stable during cutover');
assert.match(runner, /':\(exclude\)pilot'/, 'PROD archive must exclude the TEST-only pilot directory');
assert.match(runner, /tar -tzf "\$archive"[\s\S]*\^path-urenregistratie\/pilot\//, 'PROD archive must verify that no pilot path slipped through');
assert.doesNotMatch(testRunner, /:\(exclude\)pilot/, 'TEST archive must continue to publish the pilot pages');

assert.match(workflow, /deploy-test:\s*[\s\S]*needs:\s*test/, 'TEST deployment must wait for TEST regression');
assert.match(workflow, /deploy-test:\s*[\s\S]*environment:\s*test/, 'TEST deployment must use the test environment');
assert.match(workflow, /prod-gate:\s*[\s\S]*needs:\s*\[test, deploy-test\]/, 'PROD approval gate must wait for public TEST deployment');
assert.match(workflow, /\n  prod:\s*[\s\S]*needs:\s*\[test, deploy-test, prod-gate\]/, 'PROD promotion must wait for the single approval gate');
assert.match(workflow, /test:\s*[\s\S]*?if:\s*\$\{\{ always\(\) && needs\.validate\.result == 'success' \}\}/, 'A dispatched main release must continue to TEST after the push notification is skipped');
assert.match(workflow, /live-docs:\s*[\s\S]*?Download mergeable release reports[\s\S]*?playwright merge-reports/, 'Living Docs must reuse mergeable release artifacts instead of starting another browser suite');
assert.doesNotMatch(workflow, /live-docs:\s*[\s\S]*?Run E2E tests for docs/, 'Living Docs may not repeat the complete Playwright suite');
assert.doesNotMatch(liveDocsJob, /services:\s*\n|setup-php|playwright install|Start PHP server|config\.local\.php/, 'Living Docs must remain report-only and may not provision a database, PHP runtime or browsers');
assert.match(workflow, /prod-gate:\s*[\s\S]*?needs:\s*\[test, deploy-test\][\s\S]*?always\(\)[\s\S]*?needs\.deploy-test\.result == 'success'/, 'Manual PROD promotion must remain available only after successful TEST deployment');
assert.match(pilotMergeQueue, /listJobsForWorkflowRun/, 'Pilot merge queue must inspect active release jobs, not only workflow status');
assert.match(pilotMergeQueue, /Deploy Test to TransIP[\s\S]*conclusion === 'success'/, 'Pilot merge queue may ignore a waiting production gate only after TEST deploy succeeded');
assert.match(pilotMergeQueue, /openJobs\.every\(\(job\) => job\.name\.startsWith\('Promote Prod'\)\)/, 'Pilot merge queue must only ignore manual Promote Prod waits, not active validation or TEST deploy jobs');
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
  'TEST mail is neither closed nor protected by the exact sandbox allowlist',
  'test_mail_window=guarded',
  'wait_for_test_vhost',
  'TEST vhost does not yet serve its configured document root',
  'rollback_on_error',
  '[[ -d "$root/server" ]] || return 0',
  'TEST OPcache refresh unavailable; continuing to public smoke',
  'move_directory_contents "$live_root" "$rollback_root"',
  'move_directory_contents "$app_root" "$live_root"',
  'path_health_checks_are_ok($payload["checks"])',
  'TEST public health checks passed',
  'server/health.php',
]) {
  assert.ok(testCombined.includes(required), `Missing TEST deployment safeguard: ${required}`);
}
assert.match(workflow, /Verify public TEST account logins[\s\S]*test-public-auth-smoke\.mjs/, 'TEST deployment must verify both public login roles');
assert.match(workflow, /live-docs:\s*[\s\S]*?name:\s*Publish Live Docs[\s\S]*?timeout-minutes:\s*10/, 'Release Living Docs artifact job must stop within ten minutes');
assert.match(workflow, /TEST_PUBLIC_ADMIN_PASSWORD:\s*\$\{\{ secrets\.PLAYWRIGHT_ADMIN_PASSWORD \}\}/, 'Public TEST admin password must come from a protected environment secret');
assert.match(workflow, /TEST_PUBLIC_EMPLOYEE_PASSWORD:\s*\$\{\{ secrets\.PLAYWRIGHT_EMPLOYEE_PASSWORD \}\}/, 'Public TEST employee password must come from a protected environment secret');
assert.match(
  testRemote,
  /\$expected = \["giovanno\.maatsen@pathconsultancy\.nl", "kenrich\.lieveld@pathconsultancy\.nl", "marcderoon@pathconsultancy\.nl", "stasjovanbakel@pathconsultancy\.nl", "brian\.hek@pathconsultancy\.nl", "shawn\.nahar@pathconsultancy\.nl"\];/,
  'Guarded TEST delivery must use exactly the primary sink, its acceptance CC recipient and the four named testers',
);
assert.doesNotMatch(
  testRemote,
  /\$expected = \["giovanno\.maatsen@pathconsultancy\.nl"\];/,
  'The TEST deployment guard must not regress to the stale one-recipient allowlist',
);
assert.doesNotMatch(
  testRemote,
  /\$expected = \["giovanno\.maatsen@pathconsultancy\.nl", "kenrich\.lieveld@pathconsultancy\.nl", "stasjovanbakel@pathconsultancy\.nl"\];/,
  'The TEST deployment guard must not regress to the stale three-recipient allowlist',
);
assert.match(
  testRemote,
  /\(\$mail\["test_sink_cc_recipient"\] \?\? ""\) === "kenrich\.lieveld@pathconsultancy\.nl"/,
  'Guarded TEST delivery must verify the exact acceptance CC recipient',
);
assert.match(
  testRemote,
  /\(\$acceptance\["invitation_recipient"\] \?\? ""\) === "giovanno\.maatsen@pathconsultancy\.nl"/,
  'TEST invitations must be redirected to the guarded sink recipient',
);
const publicAuthSmoke = await readFile(join(root, 'scripts', 'test-public-auth-smoke.mjs'), 'utf8');
assert.doesNotMatch(publicAuthSmoke, /LocalDemo(?:Admin|Employee)2026/, 'Public TEST login smoke may not hardcode passwords');
assert.match(
  testRemote,
  /database-backup\.php[\s\S]*server\/migrate\.php[\s\S]*reset-test-baseline\.php[\s\S]*test-preflight\.php --config=server\/config\.local\.php --live[\s\S]*cutover_started=1/,
  'TEST must restore and verify the guarded shared baseline after migrate and before cutover',
);
assert.match(
  testRemote,
  /php server\/scripts\/reset-test-baseline\.php\s*\\\s*--config="\$canonical_config"\s*\\\s*--execute\s*\\\s*--confirm=RESET_SHARED_TEST_BASELINE/,
  'TEST deploy must execute the guarded baseline CLI with its canonical config and exact confirmation',
);
for (const required of [
  '/data/sites/web/pathconsultancynl/private/path-uren-test/config.local.php',
  'RESET_SHARED_TEST_BASELINE',
  "test_reset_is_available($config, 'uren-test.pathconsultancy.nl')",
  "$reset['verified_demo_accounts']",
]) {
  assert.ok(testResetCli.includes(required), `Missing guarded TEST baseline CLI safeguard: ${required}`);
}
assert.match(testResetLibrary, /TEST_RESET_REMOTE_DATABASE_HOST\s*=\s*'pathco-urentest\.db\.transip\.me'/, 'Remote TEST reset must pin the database host');
assert.match(testResetLibrary, /TEST_RESET_REMOTE_DATABASE_PORT\s*=\s*3306/, 'Remote TEST reset must pin the database port');
assert.match(testResetLibrary, /TEST_RESET_REMOTE_DATABASE\s*=\s*'pathco_Urentest'/, 'Remote TEST reset must pin the isolated database');
assert.match(testResetLibrary, /TEST_RESET_REMOTE_DATABASE_USER\s*=\s*'pathco_UrenTestUser'/, 'Remote TEST reset must pin the database user');
assert.match(testResetLibrary, /\$effectiveDatabase\s*=\s*auth_db_from_config\(\$config\)/, 'Remote TEST reset must validate the effective database after environment overrides');
assert.match(testResetLibrary, /TEST_RESET_REMOTE_PRIVATE_ROOT\s*=\s*'\/data\/sites\/web\/pathconsultancynl\/private\/path-uren-test'/, 'Remote TEST reset must pin private storage');
assert.match(testResetLibrary, /test_reset_should_preserve_demo_credentials[\s\S]*!test_reset_remote_contract_is_exact/, 'Only local\/CI resets may preserve runtime demo hashes');
assert.match(testResetLibrary, /test_reset_verify_remote_demo_credentials\(\$pdo, \$config\)[\s\S]*\$pdo->commit\(\)/, 'Canonical demo credentials must be verified inside the reset transaction');
assert.match(testResetCli, /'writes_performed'\s*=>\s*\$error instanceof TestResetPostCommitException/, 'Post-commit reset failures must report that writes occurred');
const baselineUsage = runBaselineCli([]);
assert.equal(baselineUsage.status, 0, 'Baseline CLI usage mode must remain non-mutative and successful');
assert.deepEqual(
  { mode: baselineUsage.payload.mode, writes: baselineUsage.payload.writes_performed, validated: baselineUsage.payload.validation_performed },
  { mode: 'usage', writes: false, validated: false },
  'Baseline CLI usage output must explicitly say that no validation or writes occurred',
);
const rejectedConfirmation = runBaselineCli(['--execute', '--confirm=WRONG']);
assert.equal(rejectedConfirmation.status, 1, 'Baseline CLI must reject the wrong confirmation');
assert.equal(rejectedConfirmation.payload.writes_performed, false, 'Wrong confirmation must fail before writes');
const rejectedConfigPath = runBaselineCli([
  '--execute',
  '--confirm=RESET_SHARED_TEST_BASELINE',
  '--config=server/config.test.example.php',
]);
assert.equal(rejectedConfigPath.status, 1, 'Baseline CLI must reject a non-canonical config path');
assert.equal(rejectedConfigPath.payload.writes_performed, false, 'Wrong config path must fail before writes');
assert.match(
  publicAuthSmoke,
  /loginAccount\(accounts\[0\]\)[\s\S]*resetSharedBaseline[\s\S]*for \(const account of accounts\)[\s\S]*loginAccount\(account\)/,
  'Public TEST smoke must re-authenticate administrator and employee after the shared reset',
);
assert.doesNotMatch(testCombined, /LocalDemo(?:Admin|Employee)2026/, 'TEST deploy transport must not contain demo credentials');
assert.doesNotMatch(testCombined, /pathco_Urenuru|uren\.pathconsultancy\.nl(?![\w-])/, 'TEST deploy must never target PROD identifiers');
assert.doesNotMatch(testCombined, /BEGIN (?:OPENSSH|RSA|EC) PRIVATE KEY/, 'TEST private keys may never be embedded');
assert.doesNotMatch(testRemote, /\bseq\b/, 'TEST deploy must use Bash built-ins available on the TransIP shell');
assert.doesNotMatch(testRemote, /mv "\$live_root" "\$rollback_root"/, 'TEST document-root inode must remain stable during cutover');
assert.doesNotMatch(testRemote, /rm\s+-rf/, 'The remote TEST deploy must never recursively delete TEST paths');

console.log('Automatische TEST- en PROD-deploy contractcheck: geslaagd');
