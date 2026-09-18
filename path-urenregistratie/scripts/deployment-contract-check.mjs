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
// 18 sep: assets/employees-seed.js bevat financiële persoonsgegevens (tarief,
// contractvorm, bemiddelaargegevens) van de genoemde testers en mag daarom net
// als pilot/ nooit in de PROD-archive terechtkomen, wel op TEST.
assert.match(runner, /':\(exclude\)assets\/employees-seed\.js'/, 'PROD archive must exclude employees-seed.js (financial PII)');
assert.match(runner, /tar -tzf "\$archive"[\s\S]*\^path-urenregistratie\/assets\/employees-seed\\\.js\$/, 'PROD archive must verify that employees-seed.js did not slip through');
assert.doesNotMatch(testRunner, /:\(exclude\)assets\/employees-seed\.js/, 'TEST archive must continue to publish employees-seed.js');

assert.match(workflow, /deploy-test:\s*[\s\S]*needs:\s*test/, 'TEST deployment must wait for TEST regression');
assert.match(workflow, /deploy-test:\s*[\s\S]*environment:\s*test/, 'TEST deployment must use the test environment');
assert.match(workflow, /prod-gate:\s*[\s\S]*needs:\s*\[test, deploy-test\]/, 'PROD approval gate must wait for public TEST deployment');
assert.match(workflow, /\n  prod:\s*[\s\S]*needs:\s*\[test, deploy-test, prod-gate\]/, 'PROD promotion must wait for the single approval gate');
assert.match(workflow, /test:\s*[\s\S]*?if:\s*\$\{\{ always\(\) && needs\.validate\.result == 'success' \}\}/, 'A dispatched main release must continue to TEST after the push notification is skipped');
assert.match(workflow, /live-docs:\s*[\s\S]*?Download mergeable release reports[\s\S]*?playwright merge-reports/, 'Living Docs must reuse mergeable release artifacts instead of starting another browser suite');
assert.doesNotMatch(workflow, /live-docs:\s*[\s\S]*?Run E2E tests for docs/, 'Living Docs may not repeat the complete Playwright suite');
assert.doesNotMatch(liveDocsJob, /services:\s*\n|setup-php|playwright install|Start PHP server|config\.local\.php/, 'Living Docs must remain report-only and may not provision a database, PHP runtime or browsers');
assert.match(workflow, /prod-gate:\s*[\s\S]*?needs:\s*\[test, deploy-test\][\s\S]*?always\(\)[\s\S]*?needs\.deploy-test\.result == 'success'/, 'Manual PROD promotion must remain available only after successful TEST deployment');
// PROD-poort wekker (besluit Gio 15 sep): niet binnen 10 min goedgekeurd = run afbreken.
const wekkerStart = workflow.indexOf('\n  prod-gate-wekker:');
assert.ok(wekkerStart > 0, 'PROD gate timer job prod-gate-wekker must exist');
const wekkerJob = workflow.slice(wekkerStart, workflow.indexOf('\n  prod:', wekkerStart));
assert.match(wekkerJob, /name:\s*Promote Prod \(wekker\)/, 'PROD gate timer name must start with "Promote Prod" so the pilot merge queue does not wait on it');
assert.match(wekkerJob, /needs:\s*\[test, deploy-test\]/, 'PROD gate timer must start only after TEST deploy, like prod-gate, so cancelling never cuts a TEST rollout');
assert.match(wekkerJob, /needs\.deploy-test\.result == 'success'/, 'PROD gate timer must require a successful TEST deploy');
assert.doesNotMatch(wekkerJob, /\n    environment:/, 'PROD gate timer may not declare an environment (it must never request or grant approval itself)');
assert.match(wekkerJob, /actions:\s*write/, 'PROD gate timer needs actions: write to cancel the run');
assert.match(wekkerJob, /pending_deployments[\s\S]*environment\.name == "prod"[\s\S]*actions\/runs\/\$RUN_ID\/force-cancel/, 'PROD gate timer must force-cancel only while a prod deployment is still pending (plain cancel waited for the approval, release 34961082434)');
assert.doesNotMatch(wekkerJob, /actions\/runs\/\$RUN_ID\/cancel"/, 'PROD gate timer may not use plain cancel: it is only executed after the pending approval is handled');
assert.match(wekkerJob, /::error title=PROD-poort niet afgebroken::[\s\S]*exit 1/, 'PROD gate timer must fail visibly when the run is still waiting after force-cancel');
assert.match(wekkerJob, /WACHT_SECONDEN[^\n]*'600'/, 'PROD gate timer must default to 600 seconds');
// Besluit Gio (16 sep): alleen afbreken als er een nieuwere release wacht, niet blind na de wachttijd.
assert.match(wekkerJob, /main_sha="\$\(gh api "repos\/\$REPO\/commits\/main" --jq '\.sha'\)"/, 'PROD gate timer must compare the current tip of main against this run\'s commit to detect a newer release');
assert.match(wekkerJob, /if \[ "\$main_sha" != "\$RUN_SHA" \][\s\S]{0,400}force-cancel/, 'PROD gate timer must force-cancel only when main has moved on since this run started (a newer release is waiting behind it)');
assert.match(wekkerJob, /Geen nieuwere release, goedkeuring blijft open/, 'PROD gate timer must say explicitly that it is not cancelling when nothing newer is waiting');
assert.match(wekkerJob, /Geen nieuwere release binnen het tijdbudget[\s\S]{0,220}exit 0/, 'PROD gate timer must exit successfully (not cancel, not fail) when its time budget runs out without ever seeing a newer commit');
assert.match(wekkerJob, /sleep "\$HERHAAL_SECONDEN"/, 'PROD gate timer must keep re-checking periodically instead of a one-shot measurement, so the gate frees up once a later commit arrives');
assert.match(pilotMergeQueue, /listJobsForWorkflowRun/,'Pilot merge queue must inspect active release jobs, not only workflow status');
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
// 11 sep: de gedeelde baseline-reset zet de seed-medewerker meteen om naar
// zijn echte adres zodra de TEST-mailsandbox genoemde testers kent -- op de
// echte TransIP-omgeving is dat altijd het geval. Zonder deze env var logt de
// publieke inlogcontrole na de reset in op een adres dat net is verdwenen.
assert.match(workflow, /TEST_PUBLIC_EMPLOYEE_EMAIL:\s*stasjovanbakel@pathconsultancy\.nl/, 'Public TEST employee login must target the current real named-tester address, not the stale seed address');
assert.match(
  testRemote,
  /\$expected = \["giovanno\.maatsen@pathconsultancy\.nl", "kenrich\.lieveld@pathconsultancy\.nl", "td_bv@teqdirectors\.nl", "marcderoon@pathconsultancy\.nl", "stasjovanbakel@pathconsultancy\.nl", "brian\.hek@pathconsultancy\.nl", "shawn\.nahar@pathconsultancy\.nl"\];/,
  'Guarded TEST delivery must use exactly the primary sink, its acceptance CC recipient, the third admin account and the four named testers',
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
assert.match(publicAuthSmoke, /process\.env\.TEST_PUBLIC_EMPLOYEE_EMAIL \|\| 'stasjo@example\.invalid'/, 'Public auth smoke must read the employee email from the environment, with the bare seed address only as a local/CI fallback');
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
