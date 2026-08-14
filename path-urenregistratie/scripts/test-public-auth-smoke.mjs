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

const hintsResponse = await fetch(`${baseUrl}/server/auth/local-login-hints.php`, {
  headers: { Accept: 'application/json' },
  redirect: 'error',
});
assert.equal(hintsResponse.status, 200, 'Public TEST login hints are unavailable');
const hints = await hintsResponse.json();
assert.equal(hints.ok, true, 'Public TEST login hints did not confirm success');
assert.equal(hints.enabled, true, 'Public TEST automatic login fill is disabled');
assert.equal(hints.adminPassword, accounts[0].password, 'Public TEST admin autofill differs from the protected credential');
assert.equal(hints.employeePassword, accounts[1].password, 'Public TEST employee autofill differs from the protected credential');
console.log('Public TEST automatic login fill verified');

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

  if (account.role === 'administrator') {
    const authenticatedCookie = sessionCookie(loginResponse) || cookie;
    const resetResponse = await fetch(`${baseUrl}/server/api/test-reset.php`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf.csrf_token,
        Cookie: authenticatedCookie,
      },
      body: JSON.stringify({ confirm: 'RESET_SHARED_TEST_BASELINE' }),
      redirect: 'error',
    });
    const reset = await resetResponse.json();
    assert.equal(resetResponse.status, 200, 'Public TEST baseline reset failed');
    assert.equal(reset.ok, true, 'Public TEST baseline reset did not confirm success');
    assert.equal(reset.reset?.users, 8, 'Public TEST reset must restore six demo and two acceptance accounts');
    assert.equal(reset.reset?.employees, 4, 'Public TEST reset must restore four demo employees');
    assert.equal(reset.reset?.open_actions, 12, 'Public TEST reset must restore the twelve-action baseline');
    console.log('Public TEST shared baseline reset verified');
  }
}
