import { expect, request as playwrightRequest, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const execFileAsync = promisify(execFile);

async function getCSRF(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const r = await ctx.get('/server/auth/csrf.php');
  return String(((await r.json()) as { csrf_token?: string }).csrf_token ?? '');
}

async function postAuth(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  path: string,
  body: Record<string, unknown>
) {
  const token = await getCSRF(ctx);
  const r = await ctx.post(path, {
    headers: { 'X-CSRF-Token': token },
    data: body,
  });
  return { status: r.status(), body: await r.json() };
}

test.describe('password reset api', () => {

  test('[PWD-H-001] request-reset retourneert token in demo-modus', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });

    await test.step('Given een geldig e-mailadres van een actieve gebruiker', async () => {});

    let token = '';
    await test.step('When request-reset wordt aangeroepen', async () => {
      const res = await postAuth(ctx, '/server/auth/request-reset.php', { email: appConfig.adminEmail });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.dry_run).toBe(true);
      expect(typeof res.body.token).toBe('string');
      expect((res.body.token as string).length).toBeGreaterThan(30);
      token = res.body.token as string;
    });

    await test.step('Then kan het token worden gebruikt om wachtwoord te resetten', async () => {
      const newPass = 'NieuwWachtwoord!2026';
      const resetRes = await postAuth(ctx, '/server/auth/reset-password.php', {
        token,
        new_password: newPass,
      });
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.ok).toBe(true);

      // Restore original password so other tests keep working.
      const restoreTokenRes = await postAuth(ctx, '/server/auth/request-reset.php', { email: appConfig.adminEmail });
      expect(restoreTokenRes.status).toBe(200);
      expect(restoreTokenRes.body.ok).toBe(true);
      expect(typeof restoreTokenRes.body.token).toBe('string');
      const restoreRes = await postAuth(ctx, '/server/auth/reset-password.php', {
        token: restoreTokenRes.body.token as string,
        new_password: requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'),
      });
      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.ok).toBe(true);
    });

    await ctx.dispose();
  });

  test('[PWD-H-002] onbekend e-mailadres retourneert ook ok=true (geen email-enumeration)', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });

    await test.step('Given een niet-bestaand e-mailadres', async () => {});

    await test.step('When request-reset wordt aangeroepen', async () => {
      const res = await postAuth(ctx, '/server/auth/request-reset.php', { email: 'doesnotexist@example.invalid' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // No token returned for non-existent user.
      expect(res.body.token).toBeUndefined();
    });

    await ctx.dispose();
  });

  test('[PWD-H-003] me.php bevat force_password_change veld', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('Then bevat me.php het force_password_change veld', async () => {
      const me = await ctx.get('/server/auth/me.php');
      expect(me.status()).toBe(200);
      const body = await me.json();
      expect(body.authenticated).toBe(true);
      expect(typeof body.user.force_password_change).toBe('boolean');
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[PWD-H-004] ingelogde gebruiker kan het eigen wachtwoord veilig wijzigen', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    const originalPassword = requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD');
    const temporaryPassword = 'Tijdelijk-Anders!2026';
    let changed = false;

    try {
      await test.step('Given een ingelogde beheerder', async () => {
        await authApi.login(appConfig.adminEmail, originalPassword);
      });

      await test.step('When het huidige en een sterk nieuw wachtwoord worden verstuurd', async () => {
        const result = await postAuth(ctx, '/server/auth/change-password.php', {
          current_password: originalPassword,
          new_password: temporaryPassword,
        });
        expect(result.status).toBe(200);
        expect(result.body.ok).toBe(true);
        changed = true;
      });

      await test.step('Then kan het wachtwoord via dezelfde beveiligde flow worden teruggezet', async () => {
        const restore = await postAuth(ctx, '/server/auth/change-password.php', {
          current_password: temporaryPassword,
          new_password: originalPassword,
        });
        expect(restore.status).toBe(200);
        expect(restore.body.ok).toBe(true);
        changed = false;
      });
    } finally {
      if (changed) {
        await postAuth(ctx, '/server/auth/change-password.php', {
          current_password: temporaryPassword,
          new_password: originalPassword,
        });
      }
      await ctx.dispose();
    }
  });

  test('[PWD-H-005] medewerker stelt via een eenmalige e-maillink zelf een wachtwoord in', async ({ page }) => {
    const ctx = page.context().request;
    const originalPassword = requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD');
    const temporaryPassword = 'NieuweToegang!2026';
    let changed = false;

    try {
      let token = '';
      await test.step('Given een resetlink voor een actieve medewerker is aangemaakt', async () => {
        const tokenRes = await postAuth(ctx, '/server/auth/request-reset.php', { email: appConfig.employeeEmail });
        expect(tokenRes.status).toBe(200);
        expect(tokenRes.body.ok).toBe(true);
        expect(tokenRes.body.token).toMatch(/^[a-f0-9]{64}$/);
        token = tokenRes.body.token as string;
      });

      await test.step('When de medewerker de link opent en tweemaal hetzelfde sterke wachtwoord invult', async () => {
        await page.goto(`${appConfig.baseUrl}/index.html#reset-password=${token}`);
        await expect(page).not.toHaveURL(/reset-password=/);
        await expect(page.locator('#auth-reset-complete-form')).toBeVisible();
        await page.locator('#auth-reset-new-password').fill(temporaryPassword);
        await page.locator('#auth-reset-confirm-password').fill(temporaryPassword);
        await page.locator('#auth-reset-complete-submit').click();
      });

      await test.step('Then is het wachtwoord gewijzigd en kan dezelfde link niet opnieuw worden gebruikt', async () => {
        await expect(page.locator('#auth-reset-complete-feedback')).toContainText('Je wachtwoord is ingesteld');
        changed = true;
        const reused = await postAuth(ctx, '/server/auth/reset-password.php', { token, new_password: temporaryPassword });
        expect(reused.status).toBe(409);
        expect(reused.body.error).toBe('token-already-used');
      });
    } finally {
      if (changed) {
        const restoreToken = await postAuth(ctx, '/server/auth/request-reset.php', { email: appConfig.employeeEmail });
        if (typeof restoreToken.body.token === 'string') {
          await postAuth(ctx, '/server/auth/reset-password.php', {
            token: restoreToken.body.token,
            new_password: originalPassword,
          });
        }
      }
    }
  });

  test('[PWD-H-006] TEST-links zijn herhaalbaar zonder normale misbruikbegrenzing te verzwakken', async () => {
    let result: {
      ok?: boolean;
      writes_performed?: boolean;
      network_connections?: number;
      checks?: Record<string, boolean>;
    } = {};

    await test.step('Given gewone en speciale TEST-beveiligingsmails als aparte equivalentieklassen gelden', async () => {
      const execution = await execFileAsync('php', ['server/scripts/mail-acceptance-policy-check.php'], {
        cwd: process.cwd(),
        windowsHide: true,
      });
      result = JSON.parse(execution.stdout);
      expect(result.ok).toBe(true);
      expect(result.writes_performed).toBe(false);
      expect(result.network_connections).toBe(0);
    });

    await test.step('When herhaling, foutafhandeling en omgevingsscheiding volgens de beslissingstabel worden doorgerekend', async () => {
      expect(result.checks?.test_security_scenarios_repeatable).toBe(true);
      expect(result.checks?.normal_delivery_keeps_bounded_retry).toBe(true);
      expect(result.checks?.acceptance_failure_is_single_shot).toBe(true);
      expect(result.checks?.fixed_invitation_recipient).toBe(true);
      expect(result.checks?.ordinary_test_mail_redirects_to_sink).toBe(true);
      expect(result.checks?.ordinary_password_reset_redirects_to_sink).toBe(true);
      expect(result.checks?.staff_invitation_uses_fixed_recipient).toBe(true);
      expect(result.checks?.production_invitation_keeps_account_recipient).toBe(true);
      expect(result.checks?.production_never_redirects).toBe(true);
    });

    await test.step('Then alleen de twee vaste TEST-accounts een nieuwe linkcyclus mogen starten', async () => {
      const source = await readFile(join(process.cwd(), 'server', 'mail', 'acceptance.php'), 'utf8');
      expect(source).toContain("$origin === 'https://uren-test.pathconsultancy.nl'");
      expect(source).toContain("$scenario['recipient']");
      expect(source).toContain('DELETE FROM password_reset_tokens WHERE user_id = :id');
      const staffSource = await readFile(join(process.cwd(), 'server', 'api', 'staff.php'), 'utf8');
      expect(staffSource.match(/\$config, 'invitation'\)/g)).toHaveLength(2);
    });
  });

  test('[PWD-N-010] twee verschillende wachtwoorden worden in de GUI niet verstuurd', async ({ page }) => {
    await test.step('Given een syntactisch geldige eenmalige resetlink is geopend', async () => {
      await page.goto(`${appConfig.baseUrl}/index.html#reset-password=${'a'.repeat(64)}`);
      await expect(page.locator('#auth-reset-complete-form')).toBeVisible();
    });

    await test.step('When twee verschillende sterke wachtwoorden worden ingevuld', async () => {
      await page.locator('#auth-reset-new-password').fill('SterkWachtwoord!1');
      await page.locator('#auth-reset-confirm-password').fill('SterkWachtwoord!2');
      await page.locator('#auth-reset-complete-submit').click();
    });

    await test.step('Then blijft de gebruiker op het formulier met een duidelijke validatiemelding', async () => {
      await expect(page.locator('#auth-reset-complete-feedback')).toHaveText('De wachtwoorden zijn niet gelijk.');
      await expect(page.locator('#auth-reset-complete-form')).toBeVisible();
      await expect(page.locator('#auth-reset-complete-submit')).toBeEnabled();
    });
  });

  test('[PWD-N-011] elf tekens ligt onder de wachtwoordgrens van twaalf', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const tokenRes = await postAuth(ctx, '/server/auth/request-reset.php', { email: appConfig.adminEmail });
    const response = await postAuth(ctx, '/server/auth/reset-password.php', {
      token: tokenRes.body.token as string,
      new_password: '12345678901',
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('password-too-short');
    await ctx.dispose();
  });

  test('[PWD-N-004] reset-password met ongeldig token geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });

    await test.step('When reset-password wordt aangeroepen met neptoken', async () => {
      const res = await postAuth(ctx, '/server/auth/reset-password.php', {
        token: 'invalide-token-bestaat-niet',
        new_password: 'NieuwWachtwoord!2026',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid-token');
    });

    await ctx.dispose();
  });

  test('[PWD-N-005] reset-password onder twaalf tekens geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });

    await test.step('Given een geldig reset-token', async () => {});

    await test.step('When reset-password wordt aangeroepen met een wachtwoord onder twaalf tekens', async () => {
      const tokenRes = await postAuth(ctx, '/server/auth/request-reset.php', { email: appConfig.adminEmail });
      const token = tokenRes.body.token as string;

      const res = await postAuth(ctx, '/server/auth/reset-password.php', {
        token,
        new_password: 'kort',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('password-too-short');

      // Revoke that token cleanly (request a new one to supersede it).
      await postAuth(ctx, '/server/auth/request-reset.php', { email: appConfig.adminEmail });
    });

    await ctx.dispose();
  });

  test('[PWD-N-006] hergebruik van al-gebruikt token geeft 409', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });

    await test.step('Given een geldig token dat al gebruikt is', async () => {});

    await test.step('When hetzelfde token nogmaals wordt gebruikt', async () => {
      const tokenRes = await postAuth(ctx, '/server/auth/request-reset.php', { email: appConfig.adminEmail });
      const token = tokenRes.body.token as string;
      const newPass = requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD');

      // Use it once successfully.
      const first = await postAuth(ctx, '/server/auth/reset-password.php', { token, new_password: newPass });
      expect(first.status).toBe(200);

      // Try using it again.
      const second = await postAuth(ctx, '/server/auth/reset-password.php', { token, new_password: newPass });
      expect(second.status).toBe(409);
      expect(second.body.error).toBe('token-already-used');
    });

    await ctx.dispose();
  });

  test('[PWD-N-007] login wordt geblokkeerd na 5 mislukte pogingen (rate-limit)', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });

    await test.step('Given een account met 5+ mislukte loginpogingen', async () => {
      // Use a non-existent email to avoid locking out the real test account.
      for (let i = 0; i < 5; i++) {
        await postAuth(ctx, '/server/auth/login.php', {
          email: 'ratelimit-test@example.invalid',
          password: 'wrongpassword',
        });
      }
    });

    await test.step('Then wordt de 6e poging geblokkeerd met 429', async () => {
      const res = await postAuth(ctx, '/server/auth/login.php', {
        email: 'ratelimit-test@example.invalid',
        password: 'wrongpassword',
      });
      expect(res.status).toBe(429);
      expect(res.body.error).toBe('too-many-attempts');
    });

    await ctx.dispose();
  });

  test('[PWD-N-008] request-reset weigert GET', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const response = await ctx.get('/server/auth/request-reset.php');
    const body = await response.json();
    expect(response.status()).toBe(405);
    expect(body.error).toBe('method-not-allowed');
    await ctx.dispose();
  });

  test('[PWD-N-009] request-reset met leeg e-mailadres geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const response = await postAuth(ctx, '/server/auth/request-reset.php', { email: '' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid-payload');
    await ctx.dispose();
  });

  test('[PWD-H-012] een aangevraagde reset wordt ook echt verzonden, niet alleen in de wachtrij gezet', async () => {
    // Regression: every other queueing path dispatched immediately in the
    // guarded TEST sandbox, but the reset/invitation path only enqueued. On
    // TEST that left reset mails stuck at status "queued" with zero attempts,
    // so no reset link ever arrived.
    const source = await readFile(
      join(process.cwd(), 'server', 'auth', 'password-reset-service.php'),
      'utf8'
    );

    await test.step('Given de resetservice de verzendfunctie beschikbaar heeft', async () => {
      expect(source).toContain("require_once __DIR__ . '/../mail/dispatch.php'");
    });

    await test.step('Then wordt een gequeuede reset direct gedispatcht, na de commit en zonder de token ongeldig te maken', async () => {
      expect(source).toContain('mail_dispatch_created($pdo, [[\'id\' => $deliveryId]], $config)');
      const dispatchIndex = source.indexOf('mail_dispatch_created(');
      const commitIndex = source.indexOf('$pdo->commit();');
      expect(commitIndex).toBeGreaterThan(0);
      expect(dispatchIndex).toBeGreaterThan(commitIndex);
      // A failing send must not throw away an already-issued token.
      expect(source).toContain('Password-reset mail could not be dispatched');
    });
  });

  // Walks the exact route a real new colleague takes, for both roles: the admin
  // creates the account with an invitation, the invitation is actually
  // dispatched (not left queued), the person sets a password through the
  // one-time link, gets an unmistakable confirmation, and can then log in.
  for (const role of ['beheerder', 'medewerker'] as const) {
    test(`[PWD-H-013] nieuwe ${role} wordt aangemaakt, krijgt een verzonden uitnodiging, stelt een wachtwoord in en kan inloggen`, async ({ page }) => {
      const ctx = page.context().request;
      const suffix = Date.now().toString().slice(-7);
      const isAdmin = role === 'beheerder';
      const name = `Ketentest ${role} ${suffix}`;
      const email = `keten-${role}-${suffix}@example.invalid`;
      const chosenPassword = 'RuimVoldoendeLang2026!';
      let userId = 0;

      await test.step(`Given de administrator een nieuwe ${role} aanmaakt met uitnodiging`, async () => {
        const authApi = new AuthApi(ctx);
        await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

        const payload = isAdmin
          ? { action: 'upsert_admin', sendInvitation: true, admin: { name, email, active: true } }
          : {
              action: 'upsert_employee',
              sendInvitation: true,
              employee: {
                name, email, role: 'Consultant', startDate: '2026-08-01', active: true,
                client: 'Ketenklant', broker: 'Ketenbroker', brokerEmail: 'broker@example.invalid',
                projectCode: `KETEN-${suffix}`,
              },
              mailRecipients: [],
            };

        const created = await postAuth(ctx, '/server/api/staff.php', payload);
        expect(created.status, JSON.stringify(created.body)).toBe(200);
        expect(created.body.ok).toBe(true);
        // Access stays pending until the person sets their own password.
        expect(created.body.invitation_pending).toBe(true);
        userId = Number(created.body.user_id);
        expect(userId).toBeGreaterThan(0);
      });

      await test.step('When de uitgenodigde persoon de eenmalige link opent en een wachtwoord instelt', async () => {
        const tokenRes = await postAuth(ctx, '/server/auth/request-reset.php', { email });
        expect(tokenRes.status).toBe(200);
        expect(tokenRes.body.token).toMatch(/^[a-f0-9]{64}$/);

        // The invited person arrives without a session; the admin session used
        // to create the account would otherwise show the app instead of the
        // reset screen.
        await postAuth(ctx, '/server/auth/logout.php', {});

        await page.goto(`${appConfig.baseUrl}/index.html#reset-password=${tokenRes.body.token}`);
        // The token is consumed from the hash during boot; wait for that before
        // asserting on the form, otherwise this races the app's own startup.
        await expect(page).not.toHaveURL(/reset-password=/);
        await expect(page.locator('#auth-reset-complete-form')).toBeVisible();
        await page.locator('#auth-reset-new-password').fill(chosenPassword);
        await page.locator('#auth-reset-confirm-password').fill(chosenPassword);
        await page.locator('#auth-reset-complete-submit').click();
      });

      await test.step('Then verschijnt een duidelijke bevestiging met een knop om in te loggen', async () => {
        const feedback = page.locator('#auth-reset-complete-feedback');
        await expect(feedback).toBeVisible();
        await expect(feedback).toContainText('Gelukt!');
        await expect(feedback).toHaveClass(/is-success/);
        // The screen must not switch away on its own; the person decides.
        await expect(page.locator('#auth-reset-goto-login')).toBeVisible();
        await expect(page.locator('#auth-reset-complete-submit')).toBeHidden();
      });

      await test.step('And die knop brengt de persoon naar het inlogscherm', async () => {
        await page.locator('#auth-reset-goto-login').click();
        await expect(page.locator('#auth-login-form')).toBeVisible();
        await expect(page.locator('#auth-reset-complete-form')).toBeHidden();
      });

      await test.step(`And de nieuwe ${role} kan daarna echt inloggen met dat wachtwoord`, async () => {
        const login = await postAuth(ctx, '/server/auth/login.php', { email, password: chosenPassword });
        expect(login.status, JSON.stringify(login.body)).toBe(200);
        expect(login.body.ok).toBe(true);
        expect(String(login.body.user?.email || '').toLowerCase()).toBe(email.toLowerCase());
        expect(String(login.body.user?.role || '')).toBe(isAdmin ? 'administrator' : 'employee');
        await postAuth(ctx, '/server/auth/logout.php', {});
      });
    });
  }
  test('[PWD-H-014] wachtwoord-vergeten op het inlogscherm verraadt niet welke e-mailadressen bestaan', async ({ page }) => {
    // The self-service route a locked-out person actually takes. The server
    // already answers identically for known and unknown addresses to prevent
    // account enumeration, but nothing proved the screen keeps that promise --
    // a different message for an unknown address would leak the whole user list
    // to anyone with a browser.
    const feedbackFor = async (email: string): Promise<string> => {
      await page.goto('/');
      await expect(page.locator('#login-screen')).toBeVisible();

      await page.locator('#auth-forgot-password').click();
      await expect(page.locator('#auth-reset-form')).toBeVisible();
      await expect(page.locator('#auth-login-form')).toBeHidden();
      await expect(page.locator('#auth-forgot-password')).toBeHidden();

      await page.locator('#auth-reset-email').fill(email);
      await page.locator('#auth-reset-submit').click();

      const feedback = page.locator('#auth-reset-feedback');
      await expect(feedback).toBeVisible();
      await expect(feedback).not.toHaveText('Verzoek wordt verstuurd...');
      return (await feedback.textContent() || '').trim();
    };

    let knownFeedback = '';
    let unknownFeedback = '';

    await test.step('When een bestaand adres een resetverzoek doet', async () => {
      knownFeedback = await feedbackFor(appConfig.adminEmail);
      expect(knownFeedback.length).toBeGreaterThan(0);
    });

    await test.step('And een onbekend adres exact hetzelfde verzoek doet', async () => {
      unknownFeedback = await feedbackFor('bestaat-echt-niet-' + Date.now() + '@pathconsultancy.nl');
    });

    await test.step('Then is de melding woordelijk gelijk en noemt die het adres niet', async () => {
      // A dry-run response embeds a per-request token, so compare the part that
      // would carry the leak rather than the volatile token itself.
      const withoutToken = (text: string) => text.split(' · Token:')[0].trim();
      expect(withoutToken(unknownFeedback)).toBe(withoutToken(knownFeedback));
      expect(knownFeedback).not.toContain(appConfig.adminEmail);
      expect(unknownFeedback.toLowerCase()).not.toContain('onbekend adres');
      expect(unknownFeedback.toLowerCase()).not.toContain('bestaat niet');
    });
  });

  test('[PWD-N-015] het resetscherm neemt het ingevulde adres over, weigert een leeg adres en laat terugkeren naar inloggen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#login-screen')).toBeVisible();

    await test.step('Given een ingevuld inlogadres', async () => {
      await page.locator('#auth-login-email').fill('vergeten@pathconsultancy.nl');
    });

    await test.step('When de gebruiker op Wachtwoord vergeten klikt', async () => {
      await page.locator('#auth-forgot-password').click();
      await expect(page.locator('#auth-reset-form')).toBeVisible();
    });

    await test.step('Then is het adres overgenomen zodat het niet opnieuw getypt hoeft te worden', async () => {
      await expect(page.locator('#auth-reset-email')).toHaveValue('vergeten@pathconsultancy.nl');
    });

    await test.step('When het adres wordt gewist en het formulier toch wordt verstuurd', async () => {
      // Explicitly cleared: the screen carries the login address over, so an
      // empty field is only reachable when someone wipes it on purpose.
      await page.locator('#auth-reset-email').fill('');
      await page.locator('#auth-reset-submit').click();
    });

    await test.step('Then komt er een expliciete melding en wordt er niets verstuurd', async () => {
      await expect(page.locator('#auth-reset-feedback')).toBeVisible();
      await expect(page.locator('#auth-reset-feedback')).toHaveText('Vul een e-mailadres in.');
    });

    await test.step('And brengt Terug naar inloggen de gebruiker terug bij het inlogformulier zonder oude melding', async () => {
      await page.locator('#auth-reset-cancel').click();
      await expect(page.locator('#auth-login-form')).toBeVisible();
      await expect(page.locator('#auth-reset-form')).toBeHidden();
      await expect(page.locator('#auth-forgot-password')).toBeVisible();
      await expect(page.locator('#auth-login-email')).toBeVisible();
      await expect(page.locator('#auth-reset-feedback')).toBeHidden();
    });
  });
  test('[PWD-N-016] productie toont nooit dry-run-jargon aan iemand die zijn wachtwoord kwijt is', async ({ page }) => {
    // Seen live on production: someone requesting a reset got
    // \"Resetverzoek verstuurd (dry-run). Token: (zie server) · Geldig tot:
    // onbekend\". Production reports dry_run because real delivery is
    // deliberately off, but it returns no token -- so the branch printed
    // developer jargon and a placeholder to a real user. Mock exactly the
    // production response shape.
    await page.route('**/server/auth/request-reset.php', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, dry_run: true, delivery_available: false }),
    }));

    await page.goto('/');
    await expect(page.locator('#login-screen')).toBeVisible();

    await test.step('When iemand op productie een resetverzoek doet', async () => {
      await page.locator('#auth-forgot-password').click();
      await page.locator('#auth-reset-email').fill('kwijt@pathconsultancy.nl');
      await page.locator('#auth-reset-submit').click();
    });

    await test.step('Then krijgt die een bruikbare instructie zonder jargon of nep-token', async () => {
      const feedback = page.locator('#auth-reset-feedback');
      await expect(feedback).toBeVisible();
      await expect(feedback).toHaveText('Neem contact op met Backoffice om je toegang veilig te herstellen.');
      await expect(feedback).not.toContainText('dry-run');
      await expect(feedback).not.toContainText('Token');
      await expect(feedback).not.toContainText('zie server');
      await expect(feedback).not.toContainText('onbekend');
    });
  });
});
