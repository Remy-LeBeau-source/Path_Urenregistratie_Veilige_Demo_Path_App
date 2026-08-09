const baseUrl = String(process.env.PATH_APP_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const expectedAdminPassword = String(process.env.PLAYWRIGHT_ADMIN_PASSWORD || '');
const expectedEmployeePassword = String(process.env.PLAYWRIGHT_EMPLOYEE_PASSWORD || '');

function fail(message) {
  console.error(`Login hints preflight failed: ${message}`);
  process.exit(1);
}

if (!expectedAdminPassword || !expectedEmployeePassword) {
  fail('required credential environment variables are missing.');
}

let response;
try {
  response = await fetch(`${baseUrl}/server/auth/local-login-hints.php`, {
    headers: { Accept: 'application/json' },
  });
} catch {
  fail('endpoint is unreachable.');
}

if (response.status !== 200) {
  fail(`endpoint returned HTTP ${response.status}.`);
}

let body;
try {
  body = await response.json();
} catch {
  fail('endpoint did not return valid JSON.');
}

if (body?.ok !== true || body?.enabled !== true) {
  fail('endpoint is not enabled.');
}
if (typeof body.adminPassword !== 'string' || body.adminPassword.length === 0) {
  fail('admin hint is missing.');
}
if (typeof body.employeePassword !== 'string' || body.employeePassword.length === 0) {
  fail('employee hint is missing.');
}
if (body.adminPassword !== expectedAdminPassword || body.employeePassword !== expectedEmployeePassword) {
  fail('hints do not match the test environment.');
}

console.log('Login hints preflight passed: endpoint enabled and both hints match the test environment.');