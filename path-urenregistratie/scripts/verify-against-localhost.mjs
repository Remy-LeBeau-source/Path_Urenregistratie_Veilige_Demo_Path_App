// Verifies the SAME app the operator sees in their own browser: the persistent
// localhost server on port 8080, backed by the real local database, instead of
// the disposable _test database every other Playwright run uses.
//
// Why this exists: when a fix is verified only against the isolated test
// database, "it works here" and "it doesn't work in my browser" can both be
// true at once (stale browser cache, different data, extensions). This script
// closes that gap by driving the operator's actual environment.
//
// Because it writes to the real database, every account it creates is removed
// again in a finally-block, and every created row is prefixed so leftovers from
// a hard crash are always identifiable and safe to delete.
//
//   node scripts/verify-against-localhost.mjs
//
import { chromium } from 'playwright';
import mysql from 'mysql2/promise';

const BASE_URL = process.env.VERIFY_BASE_URL || 'http://localhost:8080';
const ADMIN_EMAIL = process.env.VERIFY_ADMIN_EMAIL || 'gio@example.invalid';
const ADMIN_PASSWORD = process.env.VERIFY_ADMIN_PASSWORD || 'LocalDemoAdmin2026';
const MARKER = 'verify-localhost';

const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '0000',
  database: 'path_urenregistratie',
};

const results = [];
function check(label, actual, expected) {
  const ok = actual === expected;
  results.push({ label, actual, expected, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (verwacht ${expected}, kreeg ${actual})`);
  return ok;
}

async function cleanupMarkedAccounts() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await conn.query(
      "SELECT id FROM users WHERE email LIKE ?",
      [`%${MARKER}%`]
    );
    if (rows.length === 0) return 0;
    const ids = rows.map(r => r.id);
    // Remove dependants first so foreign keys never block the cleanup.
    await conn.query(
      'DELETE amr FROM assignment_mail_routes amr JOIN assignments a ON a.id = amr.assignment_id JOIN employees e ON e.id = a.employee_id WHERE e.user_id IN (?)',
      [ids]
    );
    await conn.query('DELETE a FROM assignments a JOIN employees e ON e.id = a.employee_id WHERE e.user_id IN (?)', [ids]);
    await conn.query('DELETE FROM employees WHERE user_id IN (?)', [ids]);
    await conn.query('DELETE FROM users WHERE id IN (?)', [ids]);
    return ids.length;
  } finally {
    await conn.end();
  }
}

const preCleaned = await cleanupMarkedAccounts();
if (preCleaned > 0) console.log(`Opgeruimd vóór start: ${preCleaned} achtergebleven testaccount(s).`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
page.on('pageerror', err => consoleErrors.push(String(err.message || err)));

const suffix = Date.now().toString().slice(-7);
const employeeName = `VerifyMedewerker ${suffix}`;
const employeeEmail = `${MARKER}-emp-${suffix}@example.invalid`;
const adminName = `VerifyBeheerder ${suffix}`;
const adminEmail = `${MARKER}-adm-${suffix}@example.invalid`;

const activeCount = () => page.locator('#team-active-account-count').innerText().then(Number);

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#auth-login-submit:not([disabled])', { timeout: 20000 });

  const version = (await page.locator('.demo-badge').first().innerText()).trim();
  console.log(`Geserveerde versie op ${BASE_URL}: ${version}`);

  await page.fill('#auth-login-email', ADMIN_EMAIL);
  await page.fill('#auth-login-password', ADMIN_PASSWORD);
  await page.click('#auth-login-submit');
  await page.waitForSelector('#app-shell:not([hidden])', { timeout: 20000 });

  await page.click('[data-view="employees"]');
  await page.waitForSelector('#team-active-account-count', { timeout: 20000 });
  await page.waitForTimeout(1500);
  const start = await activeCount();
  console.log(`Startaantal actieve accounts: ${start}`);

  // 1. Adding an employee increments by exactly one.
  await page.click('#add-employee');
  await page.waitForSelector('#edit-name', { timeout: 10000 });
  await page.fill('#edit-name', employeeName);
  await page.fill('#edit-account-email', employeeEmail);
  await page.fill('#edit-role', 'Consultant');
  await page.fill('#edit-client', 'Verifyklant');
  await page.fill('#edit-project', `VER-${suffix}`);
  await page.fill('#edit-broker', 'Verifybroker');
  await page.fill('#edit-broker-email', 'broker@example.invalid');
  await page.click('#modal-confirm');
  await page.locator('#modal').waitFor({ state: 'hidden', timeout: 15000 });
  await page.waitForTimeout(1200);
  check('Medewerker toevoegen telt precies 1 op', await activeCount(), start + 1);

  // 2. Adding an admin increments by exactly one.
  await page.click('#add-admin');
  await page.waitForSelector('#edit-admin-name', { timeout: 10000 });
  await page.fill('#edit-admin-name', adminName);
  await page.fill('#edit-admin-email', adminEmail);
  await page.click('#modal-confirm');
  await page.locator('#modal').waitFor({ state: 'hidden', timeout: 15000 });
  await page.waitForTimeout(1200);
  check('Beheerder toevoegen telt precies 1 op', await activeCount(), start + 2);

  // 3. A real page reload must keep both of them visible.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app-shell:not([hidden])', { timeout: 20000 });
  await page.click('[data-view="employees"]');
  await page.waitForTimeout(2500);
  check('Na F5 blijft het aantal gelijk', await activeCount(), start + 2);
  check(
    'Na F5 staat de nieuwe medewerker er nog',
    await page.locator('#employee-grid').innerText().then(t => t.includes(employeeName)),
    true
  );
  check(
    'Na F5 staat de nieuwe beheerder er nog',
    await page.locator('#administrator-list').innerText().then(t => t.includes(adminName)),
    true
  );

  // 4. Reusing an existing email must not create anything.
  await page.click('#add-admin');
  await page.waitForSelector('#edit-admin-name', { timeout: 10000 });
  await page.fill('#edit-admin-name', `Andere naam ${suffix}`);
  await page.fill('#edit-admin-email', employeeEmail);
  await page.click('#modal-confirm');
  await page.waitForTimeout(2500);
  check('Bestaand e-mailadres maakt geen extra account', await activeCount(), start + 2);

  check('Geen JavaScript-fouten in de pagina', consoleErrors.length, 0);
  if (consoleErrors.length) console.log('Console-fouten:', consoleErrors);
} catch (err) {
  console.log('SCRIPTFOUT:', err.stack || err.message);
  results.push({ label: 'script voltooid zonder fout', ok: false });
} finally {
  await browser.close();
  const removed = await cleanupMarkedAccounts();
  console.log(`Opgeruimd na afloop: ${removed} testaccount(s).`);
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} controles geslaagd tegen ${BASE_URL}`);
if (failed.length) {
  console.log('MISLUKT:', failed.map(f => f.label).join(', '));
  process.exit(1);
}
