import assert from 'node:assert/strict';

const baseUrl = String(process.env.TEST_PUBLIC_BASE_URL || '').replace(/\/$/, '');
assert.equal(baseUrl, 'https://uren-test.pathconsultancy.nl', 'Public auth smoke may target only the dedicated TEST host');

const accounts = [
  {
    email: 'gio@example.invalid',
    password: String(process.env.TEST_PUBLIC_ADMIN_PASSWORD || ''),
    role: 'administrator',
  },
  {
    email: 'stasjo@example.invalid',
    password: String(process.env.TEST_PUBLIC_EMPLOYEE_PASSWORD || ''),
    role: 'employee',
  },
];

function sessionCookie(response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  return String(values[0] || '').split(';', 1)[0];
}

for (const account of accounts) {
  assert.ok(account.password.length >= 12, `Missing protected TEST password for ${account.role}`);

  const csrfResponse = await fetch(`${baseUrl}/server/auth/csrf.php`, {
    headers: { Accept: 'application/json' },
    redirect: 'error',
  });
  assert.equal(csrfResponse.status, 200, `CSRF bootstrap failed for ${account.role}`);
  const cookie = sessionCookie(csrfResponse);
  const csrf = await csrfResponse.json();
  assert.ok(cookie && csrf.csrf_token, `Secure TEST session bootstrap is incomplete for ${account.role}`);

  const loginResponse = await fetch(`${baseUrl}/server/auth/login.php`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.csrf_token,
      Cookie: cookie,
    },
    body: JSON.stringify({ email: account.email, password: account.password }),
    redirect: 'error',
  });
  const login = await loginResponse.json();
  assert.equal(loginResponse.status, 200, `Public TEST login failed for ${account.role}`);
  assert.equal(login.ok, true, `Public TEST login did not confirm success for ${account.role}`);
  assert.equal(login.user?.role, account.role, `Public TEST returned the wrong role for ${account.role}`);
  console.log(`Public TEST login verified: ${account.role}`);
}

