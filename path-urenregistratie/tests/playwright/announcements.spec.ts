import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

async function getCSRF(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const r = await ctx.get('/server/auth/csrf.php');
  return String(((await r.json()) as { csrf_token?: string }).csrf_token ?? '');
}

async function postAnnouncement(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  body: Record<string, unknown>
) {
  const token = await getCSRF(ctx);
  const r = await ctx.post('/server/api/announcements.php', {
    headers: { 'X-CSRF-Token': token },
    data: body,
  });
  return { status: r.status(), body: await r.json() };
}

async function listAnnouncements(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const r = await ctx.get('/server/api/announcements.php');
  return { status: r.status(), body: await r.json() };
}

async function firstEmployeeUserId(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const bootstrap = await ctx.get('/server/api/bootstrap.php');
  const body = await bootstrap.json();
  const employee = (body.users as Array<{ id: number; role: string; active: number }>)
    .find(user => user.role === 'employee' && Number(user.active) === 1);
  expect(employee, 'er moet minstens één actieve medewerker zijn').toBeTruthy();
  return Number(employee!.id);
}

// De vaste testmedewerker (appConfig.employeeEmail), zodat de mededeling
// terechtkomt bij precies het account waar de test daarna als medewerker op
// inlogt -- firstEmployeeUserId() geeft geen garantie welke medewerker dat is.
async function standardEmployeeUserId(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const bootstrap = await ctx.get('/server/api/bootstrap.php');
  const body = await bootstrap.json();
  const employee = (body.users as Array<{ id: number; email: string }>)
    .find(user => String(user.email).toLowerCase() === appConfig.employeeEmail.toLowerCase());
  expect(employee, 'de vaste testmedewerker moet bestaan').toBeTruthy();
  return Number(employee!.id);
}

test.describe('announcements api', () => {
  test('[ANN-H-001] beheerder verstuurt een mededeling aan een gekozen medewerker', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const suffix = Date.now().toString().slice(-7);
    const title = `Mededeling ${suffix}`;
    let announcementId = 0;

    await test.step('Given een actieve medewerker als ontvanger', async () => {
      const recipientId = await firstEmployeeUserId(ctx);
      expect(recipientId).toBeGreaterThan(0);

      await test.step('When de beheerder de mededeling verstuurt', async () => {
        const sent = await postAnnouncement(ctx, {
          action: 'send',
          title,
          message: `Bericht voor de acceptatie ${suffix}.`,
          recipient_user_ids: [recipientId],
          audience_label: 'Geselecteerde medewerkers',
        });
        expect(sent.status, JSON.stringify(sent.body)).toBe(200);
        expect(sent.body.ok).toBe(true);
        announcementId = Number(sent.body.announcement_id ?? sent.body.id ?? 0);
        expect(announcementId).toBeGreaterThan(0);
      });
    });

    await test.step('Then staat de mededeling met status "sent" in het overzicht', async () => {
      const list = await listAnnouncements(ctx);
      expect(list.status).toBe(200);
      const found = (list.body.items as Array<{ id: number; status: string; title: string }>)
        .find(item => Number(item.id) === announcementId);
      expect(found).toBeDefined();
      expect(found?.status).toBe('sent');
      expect(found?.title).toBe(title);
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ANN-H-002] een concept blijft intern en kan daarna definitief worden verwijderd', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const suffix = Date.now().toString().slice(-7);
    let draftId = 0;

    await test.step('Given de beheerder een concept opslaat', async () => {
      const recipientId = await firstEmployeeUserId(ctx);
      const draft = await postAnnouncement(ctx, {
        action: 'save_draft',
        title: `Concept ${suffix}`,
        message: 'Nog niet verzenden.',
        recipient_user_ids: [recipientId],
      });
      expect(draft.status, JSON.stringify(draft.body)).toBe(200);
      expect(draft.body.ok).toBe(true);
      draftId = Number(draft.body.announcement_id ?? draft.body.id ?? 0);
      expect(draftId).toBeGreaterThan(0);
    });

    await test.step('Then heeft het bericht status "draft" en is het niet verzonden', async () => {
      const list = await listAnnouncements(ctx);
      const found = (list.body.items as Array<{ id: number; status: string }>)
        .find(item => Number(item.id) === draftId);
      expect(found?.status).toBe('draft');
    });

    await test.step('And alleen een concept mag definitief worden verwijderd', async () => {
      const removed = await postAnnouncement(ctx, { action: 'delete_draft', announcement_id: draftId });
      expect(removed.status, JSON.stringify(removed.body)).toBe(200);
      expect(removed.body.ok).toBe(true);

      const list = await listAnnouncements(ctx);
      const stillThere = (list.body.items as Array<{ id: number }>)
        .find(item => Number(item.id) === draftId);
      expect(stillThere).toBeUndefined();
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ANN-H-003] intrekken met reden en daarna verbergen bij medewerkers', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const suffix = Date.now().toString().slice(-7);
    let announcementId = 0;

    await test.step('Given een verzonden mededeling', async () => {
      const recipientId = await firstEmployeeUserId(ctx);
      const sent = await postAnnouncement(ctx, {
        action: 'send',
        title: `Intrekbaar ${suffix}`,
        message: 'Deze wordt straks ingetrokken.',
        recipient_user_ids: [recipientId],
      });
      expect(sent.status, JSON.stringify(sent.body)).toBe(200);
      announcementId = Number(sent.body.announcement_id ?? sent.body.id ?? 0);
      expect(announcementId).toBeGreaterThan(0);
    });

    await test.step('When de beheerder intrekt met een reden', async () => {
      const withdrawn = await postAnnouncement(ctx, {
        action: 'withdraw',
        announcement_id: announcementId,
        withdrawal_reason: `Verkeerde datum genoemd (${suffix}).`,
      });
      expect(withdrawn.status, JSON.stringify(withdrawn.body)).toBe(200);
      expect(withdrawn.body.ok).toBe(true);
    });

    await test.step('Then staat het bericht als ingetrokken in de interne historie', async () => {
      const list = await listAnnouncements(ctx);
      const found = (list.body.items as Array<{ id: number; status: string }>)
        .find(item => Number(item.id) === announcementId);
      expect(found?.status).toBe('withdrawn');
    });

    await test.step('And alleen een ingetrokken bericht mag bij medewerkers worden verborgen', async () => {
      const hidden = await postAnnouncement(ctx, { action: 'hide', announcement_id: announcementId });
      expect(hidden.status, JSON.stringify(hidden.body)).toBe(200);
      expect(hidden.body.ok).toBe(true);
    });

    await authApi.logout();
    await ctx.dispose();
  });

  // Regression: de server zette bij "hide" alleen de bijbehorende notificaties
  // op gelezen. Dat verwijderde de mededeling nooit echt uit de bel/lijst van
  // de medewerker -- ANN-H-003 hierboven toetste alleen dat de server 200/ok
  // teruggaf, nooit het waargenomen effect bij de medewerker zelf. Deze case
  // pint het volledige contract: weg bij de medewerker (bel + Mijn
  // mededelingen), maar de rij zelf blijft in Backoffice' eigen overzicht.
  test('[ANN-H-007] "Bij medewerkers verwijderen" laat het bericht echt verdwijnen bij de medewerker, maar blijft intern zichtbaar', async ({ page }) => {
    const ctx = page.request;
    const authApi = new AuthApi(ctx);
    const loginPage = new LoginPage(page);
    const suffix = Date.now().toString().slice(-7);
    const title = `Verbergtest ${suffix}`;
    let announcementId = 0;
    let recipientId = 0;

    await test.step('Given de beheerder stuurt een mededeling naar de vaste testmedewerker', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      recipientId = await standardEmployeeUserId(ctx);
      const sent = await postAnnouncement(ctx, {
        action: 'send',
        title,
        message: `Bericht dat straks verborgen wordt (${suffix}).`,
        recipient_user_ids: [recipientId],
      });
      expect(sent.status, JSON.stringify(sent.body)).toBe(200);
      announcementId = Number(sent.body.announcement_id ?? sent.body.id ?? 0);
      expect(announcementId).toBeGreaterThan(0);
      await authApi.logout();
    });

    await test.step('Then ziet de medewerker het bericht in Mijn mededelingen', async () => {
      await loginPage.open();
      await loginPage.loginAsEmployee();
      await page.locator('button[data-view="employee-announcements"]').click();
      await expect(page.locator('#employee-announcement-list')).toContainText(title);
      await loginPage.logout();
    });

    await test.step('When de beheerder intrekt en daarna bij medewerkers verwijdert', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const withdrawn = await postAnnouncement(ctx, {
        action: 'withdraw',
        announcement_id: announcementId,
        withdrawal_reason: `Testreden (${suffix}).`,
      });
      expect(withdrawn.status, JSON.stringify(withdrawn.body)).toBe(200);
      const hidden = await postAnnouncement(ctx, { action: 'hide', announcement_id: announcementId });
      expect(hidden.status, JSON.stringify(hidden.body)).toBe(200);
      expect(hidden.body.ok).toBe(true);
      await authApi.logout();
    });

    await test.step('Then is het bericht bij de medewerker volledig verdwenen, ook na een herlading', async () => {
      await loginPage.loginAsEmployee();
      await page.locator('button[data-view="employee-announcements"]').click();
      await expect(page.locator('#employee-announcement-list')).not.toContainText(title);
      await page.reload();
      await expect(page.locator('#app-shell')).toBeVisible();
      await page.locator('button[data-view="employee-announcements"]').click();
      await expect(page.locator('#employee-announcement-list')).not.toContainText(title);
      await loginPage.logout();
    });

    await test.step('Then blijft de mededeling in het interne beheeroverzicht van Backoffice staan', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const list = await listAnnouncements(ctx);
      const found = (list.body.items as Array<{ id: number; status: string; hidden_from_employees: boolean; title: string }>)
        .find(item => Number(item.id) === announcementId);
      expect(found, 'de rij hoort voor Backoffice bewaard te blijven').toBeDefined();
      expect(found?.status).toBe('withdrawn');
      expect(found?.hidden_from_employees).toBe(true);
      expect(found?.title).toBe(title);
      await authApi.logout();
    });
  });

  test('[ANN-N-004] intrekken zonder reden wordt geweigerd', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const suffix = Date.now().toString().slice(-7);
    const recipientId = await firstEmployeeUserId(ctx);
    const sent = await postAnnouncement(ctx, {
      action: 'send',
      title: `Zonder reden ${suffix}`,
      message: 'Intrekken hoort een reden te vereisen.',
      recipient_user_ids: [recipientId],
    });
    const announcementId = Number(sent.body.announcement_id ?? sent.body.id ?? 0);

    await test.step('Then geeft intrekken zonder reden een nette 400 en blijft het bericht verzonden', async () => {
      const withdrawn = await postAnnouncement(ctx, {
        action: 'withdraw',
        announcement_id: announcementId,
        withdrawal_reason: '',
      });
      expect(withdrawn.status).toBe(400);
      expect(withdrawn.body.error).toBe('missing-withdrawal-reason');

      const list = await listAnnouncements(ctx);
      const found = (list.body.items as Array<{ id: number; status: string }>)
        .find(item => Number(item.id) === announcementId);
      expect(found?.status).toBe('sent');
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ANN-N-005] verzenden zonder titel, bericht of ontvanger wordt geweigerd', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    const recipientId = await firstEmployeeUserId(ctx);

    await test.step('Then wordt elk ontbrekend verplicht veld afzonderlijk gemeld', async () => {
      const noTitle = await postAnnouncement(ctx, {
        action: 'send', title: '', message: 'Tekst', recipient_user_ids: [recipientId],
      });
      expect(noTitle.status).toBe(400);
      expect(noTitle.body.error).toBe('missing-title');

      const noMessage = await postAnnouncement(ctx, {
        action: 'send', title: 'Titel', message: '', recipient_user_ids: [recipientId],
      });
      expect(noMessage.status).toBe(400);
      expect(noMessage.body.error).toBe('missing-message');

      const noRecipients = await postAnnouncement(ctx, {
        action: 'send', title: 'Titel', message: 'Tekst', recipient_user_ids: [],
      });
      expect(noRecipients.status).toBe(400);
      expect(noRecipients.body.error).toBe('missing-recipients');
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ANN-N-006] een medewerker kan zelf geen mededeling versturen en anoniem is alles dicht', async () => {
    const anonymous = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    await test.step('Then krijgt een anonieme aanroep 401', async () => {
      const list = await anonymous.get('/server/api/announcements.php');
      expect(list.status()).toBe(401);
    });
    await anonymous.dispose();

    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));

    await test.step('And een ingelogde medewerker mag zelf niets versturen', async () => {
      const attempt = await postAnnouncement(ctx, {
        action: 'send', title: 'Niet toegestaan', message: 'Poging', recipient_user_ids: [1],
      });
      expect(attempt.status).toBe(403);
    });

    await authApi.logout();
    await ctx.dispose();
  });
});
