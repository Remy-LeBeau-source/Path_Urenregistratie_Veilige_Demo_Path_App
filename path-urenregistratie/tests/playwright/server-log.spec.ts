import { expect, request as playwrightRequest, test } from '@playwright/test';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

// Zelfde padresolutie als auth_configure_runtime_logging() (server/auth/
// session.php) en server_log_resolve_primary_path() (server/api/server-log.php)
// wanneer config.local.php geen eigen 'logging.error_log' zet -- wat lokaal en
// in CI het geval is. Rechtstreeks met Node bestanden klaarzetten is simpeler
// en minder foutgevoelig dan diezelfde resolutie nogmaals in PHP te herhalen.
const LOG_PATH = join(process.cwd(), '..', 'path-private', 'logs', 'php-error.log');

async function withSeededLog(lines: string[], run: () => Promise<void>): Promise<void> {
  await mkdir(join(process.cwd(), '..', 'path-private', 'logs'), { recursive: true });
  let existed = false;
  let original = '';
  try {
    original = await readFile(LOG_PATH, 'utf8');
    existed = true;
  } catch {
    existed = false;
  }
  await writeFile(LOG_PATH, lines.join('\n') + '\n', 'utf8');
  try {
    await run();
  } finally {
    if (existed) {
      await writeFile(LOG_PATH, original, 'utf8');
    } else {
      await rm(LOG_PATH, { force: true });
    }
  }
}

test.describe('server log api', () => {
  test('[LOG-H-001] beheerder kan recente serverfouten ophalen, meest recente eerst', async () => {
    // Gebruikersvraag (11 sep): een PHP-fout was tot nu toe alleen via SSH in
    // het logbestand te zien. Dit endpoint (server/api/server-log.php) maakt
    // de staart van dat al bestaande, al automatisch geroteerde bestand
    // (server/scripts/rotate-logs.php) voor het eerst zichtbaar in de app.
    const lines = ['Fout 1 (oudste)', 'Fout 2', 'Fout 3 (nieuwste)'];
    await withSeededLog(lines, async () => {
      const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
      const authApi = new AuthApi(ctx);
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

      const res = await ctx.get('/server/api/server-log.php');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.log_file).toBe('php-error.log');
      expect(body.lines.slice(0, 3)).toEqual(['Fout 3 (nieuwste)', 'Fout 2', 'Fout 1 (oudste)']);
      expect(body.has_more).toBe(false);

      await authApi.logout();
      await ctx.dispose();
    });
  });

  test('[LOG-H-002] bladeren (offset) toont de volgende regels ervoor, zonder duplicaten', async () => {
    const totaal = 250;
    const lines = Array.from({ length: totaal }, (_, i) => `Regel ${i + 1}`);
    await withSeededLog(lines, async () => {
      const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
      const authApi = new AuthApi(ctx);
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

      const eerste = await (await ctx.get('/server/api/server-log.php?limit=200')).json();
      expect(eerste.ok).toBe(true);
      expect(eerste.count).toBe(200);
      expect(eerste.has_more).toBe(true);
      expect(eerste.lines[0]).toBe(`Regel ${totaal}`);
      expect(eerste.lines[199]).toBe(`Regel ${totaal - 199}`);

      const verder = await (await ctx.get('/server/api/server-log.php?limit=200&offset=200')).json();
      expect(verder.ok).toBe(true);
      expect(verder.count).toBe(50);
      expect(verder.has_more).toBe(false);
      expect(verder.lines[0]).toBe(`Regel ${totaal - 200}`);
      expect(verder.lines[49]).toBe('Regel 1');
      expect(new Set([...eerste.lines, ...verder.lines]).size).toBe(totaal);

      await authApi.logout();
      await ctx.dispose();
    });
  });

  test('[LOG-H-003] een leeg of ontbrekend logbestand levert een schone lege staat op', async () => {
    await rm(LOG_PATH, { force: true });
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const res = await ctx.get('/server/api/server-log.php');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.count).toBe(0);
    expect(body.has_more).toBe(false);
    expect(body.lines).toEqual([]);

    await authApi.logout();
    await ctx.dispose();
  });

  test('[LOG-N-004] medewerker mag serverfouten niet inzien', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));

    const res = await ctx.get('/server/api/server-log.php');
    expect(res.status()).toBe(403);

    await authApi.logout();
    await ctx.dispose();
  });

  test('[LOG-N-005] anonieme gebruiker krijgt 401 op serverfouten', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const res = await ctx.get('/server/api/server-log.php');
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('[LOG-N-006] serverfoutenlog weigert POST', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const csrf = await ctx.get('/server/auth/csrf.php');
    const token = String((await csrf.json()).csrf_token || '');
    const res = await ctx.post('/server/api/server-log.php', { headers: { 'X-CSRF-Token': token }, data: {} });
    expect(res.status()).toBe(405);

    await authApi.logout();
    await ctx.dispose();
  });
});

test.describe('server log ui', () => {
  test('[LOG-H-007] Instellingen > Systeem toont serverfouten en kan verder terugladen', async ({ page }) => {
    const totaal = 220;
    const lines = Array.from({ length: totaal }, (_, i) => `Regel ${i + 1}`);
    await withSeededLog(lines, async () => {
      const login = new LoginPage(page);
      await test.step('Given een beheerder is beveiligd ingelogd', async () => {
        await login.open();
        await login.loginAsAdmin();
      });

      await test.step('When de beheerder Instellingen > Systeem opent', async () => {
        await page.locator('button[data-view="settings"]').click();
        await page.locator('[data-scroll-target="settings-system"]').click();
        await expect(page.locator('#server-log-count-pill')).toHaveText('200 regels · php-error.log');
      });

      await test.step('Then staat de nieuwste regel bovenaan en is Meer laden zichtbaar', async () => {
        const list = page.locator('#server-log-list');
        await expect(list.locator('.server-log-list-line')).toHaveCount(200);
        await expect(list.locator('.server-log-list-line').first()).toHaveText(`Regel ${totaal}`);
        await expect(page.locator('#server-log-load-more')).toBeVisible();
      });

      await test.step('And Meer laden voegt de volgende regels toe zonder de eerdere te verliezen', async () => {
        await page.locator('#server-log-load-more').click();
        await expect(page.locator('#server-log-count-pill')).toHaveText('220 regels · php-error.log');
        const list = page.locator('#server-log-list');
        await expect(list.locator('.server-log-list-line')).toHaveCount(220);
        await expect(list.locator('.server-log-list-line').last()).toHaveText('Regel 1');
        await expect(page.locator('#server-log-load-more')).toBeHidden();
      });
    });
  });

  test('[LOG-H-008] een leeg foutenlog toont de rustige lege staat', async ({ page }) => {
    await rm(LOG_PATH, { force: true });
    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();

    await page.locator('button[data-view="settings"]').click();
    await page.locator('[data-scroll-target="settings-system"]').click();
    await expect(page.locator('#server-log-count-pill')).toHaveText('Geen fouten');
    await expect(page.locator('#server-log-empty')).toBeVisible();
    await expect(page.locator('#server-log-load-more')).toBeHidden();
  });
});
