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

// De users.id die bij een getoonde medewerkersnaam hoort. Onafhankelijk van de
// app opgehaald (rechtstreeks uit bootstrap), zodat de controle niet dezelfde
// vertaling gebruikt als de code die getoetst wordt.
async function gebruikerIdVanNaam(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  naam: string
) {
  const bootstrap = await ctx.get('/server/api/bootstrap.php');
  const body = await bootstrap.json();
  // Rechtstreeks uit de employees-tabel: daar staat full_name naast user_id, en
  // dat is precies de koppeling die de app moet maken. Zo controleert de test
  // niet met dezelfde vertaling die getoetst wordt.
  const medewerker = (body.employees as Array<{ full_name?: string; user_id?: number }>)
    .find(item => String(item.full_name || '').trim() === naam);
  expect(medewerker, `medewerker "${naam}" moet in bootstrap staan`).toBeTruthy();
  const gebruikerId = Number(medewerker!.user_id);
  expect(gebruikerId, `medewerker "${naam}" moet aan een gebruiker gekoppeld zijn`).toBeGreaterThan(0);
  return gebruikerId;
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

  // Regression: een correctie voegt een nieuwe announcements-rij + eigen
  // notificaties toe en zet alleen superseded_by_id op het origineel -- de
  // oorspronkelijke notificatie zelf werd nergens opgeruimd. De medewerker
  // zag daardoor zowel de oude als de nieuwe tekst in Mijn mededelingen,
  // terwijl de hulptekst ("Eerdere mededelingen") expliciet belooft dat een
  // gecorrigeerd bericht alleen de nieuwste versie toont.
  test('[ANN-H-008] een correctie laat de medewerker alleen de nieuwste tekst zien, niet de oorspronkelijke', async ({ page }) => {
    const ctx = page.request;
    const authApi = new AuthApi(ctx);
    const loginPage = new LoginPage(page);
    const suffix = Date.now().toString().slice(-7);
    const title = `Correctietest ${suffix}`;
    const oldMessage = `Oude tekst met een fout (${suffix}).`;
    const newMessage = `Gecorrigeerde tekst zonder fout (${suffix}).`;
    let originalId = 0;
    let correctedId = 0;

    await test.step('Given de beheerder verstuurt een origineel bericht naar de vaste testmedewerker', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const recipientId = await standardEmployeeUserId(ctx);
      const sent = await postAnnouncement(ctx, {
        action: 'send',
        title,
        message: oldMessage,
        recipient_user_ids: [recipientId],
      });
      expect(sent.status, JSON.stringify(sent.body)).toBe(200);
      originalId = Number(sent.body.announcement_id ?? sent.body.id ?? 0);
      expect(originalId).toBeGreaterThan(0);
    });

    await test.step('When de beheerder een correctie verstuurt met nieuwe tekst', async () => {
      const corrected = await postAnnouncement(ctx, {
        action: 'send',
        title,
        message: newMessage,
        correction_of_id: originalId,
      });
      expect(corrected.status, JSON.stringify(corrected.body)).toBe(200);
      correctedId = Number(corrected.body.announcement_id ?? corrected.body.id ?? 0);
      expect(correctedId).toBeGreaterThan(0);
      await authApi.logout();
    });

    await test.step('Then ziet de medewerker alleen de gecorrigeerde tekst, niet de oude', async () => {
      await loginPage.open();
      await loginPage.loginAsEmployee();
      await page.locator('button[data-view="employee-announcements"]').click();
      const list = page.locator('#employee-announcement-list');
      await expect(list).toContainText(newMessage);
      await expect(list).not.toContainText(oldMessage);
      await loginPage.logout();
    });

    // Cleanup via dezelfde intrekken+verbergen-route als ANN-H-007: dat
    // verwijdert de notificatie-rij echt (niet alleen "gelezen"), zodat de
    // vaste testmedewerker (gedeelde DB) geen permanente extra kaart
    // overhoudt -- NOT-H-011 rekent op een exact totaalaantal mededelingen
    // voor dit account.
    await test.step('And cleanup: trek de gecorrigeerde mededeling in en verberg deze bij medewerkers', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const withdrawn = await postAnnouncement(ctx, {
        action: 'withdraw',
        announcement_id: correctedId,
        withdrawal_reason: `Testreden opruimen (${suffix}).`,
      });
      expect(withdrawn.status, JSON.stringify(withdrawn.body)).toBe(200);
      const hidden = await postAnnouncement(ctx, { action: 'hide', announcement_id: correctedId });
      expect(hidden.status, JSON.stringify(hidden.body)).toBe(200);
      expect(hidden.body.ok).toBe(true);
      await authApi.logout();
    });
  });

  // Deze case bestaat omdat elke andere mededelingen-case de POST zelf opbouwt
  // met een users.id uit bootstrap. Daardoor werd het clientpad -- vinkje in het
  // scherm, writeAnnouncementToApi, server -- nergens gedraaid, en juist daar
  // zat een verwisseling: de vinkjes dragen employees.id, de server verwacht
  // users.id. In een echte database lopen die uiteen (employees 1/2/3/4 horen
  // bij users 3/4/5/6), dus een bericht voor de ene medewerker werd bij de
  // andere persoon bezorgd, soms bij een beheerder. Er ging geen belletje af,
  // want announcements.php controleert alleen dat het bestaande users.id's
  // binnen hetzelfde bedrijf zijn. Zelfde fout-klasse als AUTH-H-025.
  //
  // De test kiest daarom bewust via de interface en controleert daarna bij de
  // server wie er is vastgelegd. Een test die de POST nabouwt kan deze fout per
  // definitie niet zien.
  test('[ANN-H-009] een via het scherm gekozen medewerker wordt ook bij de server als die medewerker bewaard', async ({ page }) => {
    // Aparte, zelf ingelogde context voor de servercontroles. Bewust niet
    // page.request: die deelt de sessie van de pagina en liep hier vast, en
    // bovendien hoort de controle onafhankelijk te zijn van wat de pagina zelf
    // aan het doen is.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    const loginPage = new LoginPage(page);
    const suffix = Date.now().toString().slice(-7);
    const title = `Ontvangerproef ${suffix}`;
    let verwachtGebruikerId = 0;
    let medewerkerNaam = '';

    await test.step('Given de beheerder opent een nieuwe mededeling en kiest zelf de ontvangers', async () => {
      verwachtGebruikerId = await standardEmployeeUserId(ctx);
      await loginPage.open();
      await loginPage.loginAsAdmin();
      await page.locator('[data-view="announcements"]:visible').first().click();
      await expect(page.locator('#view-announcements')).toHaveClass(/is-active/);
      await page.locator("#add-announcement").click();
      await expect(page.locator('#announcement-title')).toBeVisible();
      // Een <select> in een dialoog wordt opgewaardeerd tot een keuzemenu-widget
      // en de native select is dan hidden; bedienen gaat via de trigger en de
      // optieknoppen (zelfde patroon als bij #pref-skin in skin.spec.ts).
      await page.locator('#announcement-audience-trigger').click();
      await page.locator('[data-standard-choice-target="announcement-audience"][data-standard-choice-value="selected"]').click();
      await expect(page.locator('#announcement-recipient-choices')).toBeVisible();
    });

    await test.step('When precies een medewerker wordt aangevinkt en het bericht wordt geplaatst', async () => {
      // Bewust de eerste medewerker in de lijst, en daarna de verwachting
      // afleiden uit diezelfde persoon. Eerst stond hier de vaste
      // testmedewerker als verwachting terwijl de test de eerste in de lijst
      // aanvinkte -- dan vergelijk je twee verschillende mensen en faalt de
      // test terwijl de app het goed doet.
      const keuze = page.locator('.recipient-choice').first();
      medewerkerNaam = ((await keuze.locator('strong').textContent()) || '').trim();
      expect(medewerkerNaam, 'er moet een medewerker aan te vinken zijn').not.toBe('');
      verwachtGebruikerId = await gebruikerIdVanNaam(ctx, medewerkerNaam);
      await keuze.locator('[data-announcement-recipient]').check();
      await page.locator('#announcement-title').fill(title);
      await page.locator('#announcement-message').fill(`Bericht voor precies een ontvanger (${suffix}).`);
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#modal')).toBeHidden({ timeout: 15_000 });
    });

    await test.step('Then heeft de server die medewerker als ontvanger, en niet iemand anders', async () => {
      await expect.poll(async () => {
        const lijst = await listAnnouncements(ctx);
        if (lijst.status !== 200) return 'status-' + lijst.status;
        const bericht = (lijst.body.items as Array<{ title: string; recipient_user_ids?: number[] }> | undefined)
          ?.find(item => item.title === title);
        if (!bericht) return 'bericht-nog-niet-zichtbaar';
        return JSON.stringify((bericht.recipient_user_ids || []).map(Number));
      }, {
        message: `de mededeling voor ${medewerkerNaam} hoort bij users.id ${verwachtGebruikerId} te liggen`,
        timeout: 15_000,
      }).toBe(JSON.stringify([verwachtGebruikerId]));
    });

    await ctx.dispose();
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
