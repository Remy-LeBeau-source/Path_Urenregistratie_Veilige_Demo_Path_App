import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { setLeaveSickEntryEnabled } from './helpers/companySettings';
import { LoginPage } from './pages/LoginPage';

// Dekkingsronde: "Hulp & contact" had alleen een dunne mobile-only check
// (openen/topic-klik/sluiten in mobile-ui.spec.ts) en verder uitsluitend
// jsdom-dekking via scripts/smoke-test.mjs. De echte zoekfunctie op het
// bureaublad, en of het gesprek werkelijk sessie-only is (een echte
// paginaherlading, niet alleen een DOM-reset binnen hetzelfde scriptrun),
// hadden nog geen Playwright-regressie.

test('[HELP-H-001] medewerker zoekt een bekende vraag en krijgt het juiste antwoord met werkende knop', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker opent Hulp & contact', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#help-launcher').click();
    await expect(page.locator('#help-panel')).toBeVisible();
    await expect(page.locator('#help-messages .help-message').first()).toContainText('alleen tijdens deze sessie');
  });

  await test.step('When de medewerker "verlof" intypt en verstuurt', async () => {
    await page.locator('#help-input').fill('verlof');
    await page.locator('#help-form').locator('button[type="submit"]').click();
  });

  await test.step('Then verschijnt de eigen vraag en het juiste standaardantwoord met een knop naar Mijn uren', async () => {
    const messages = page.locator('#help-messages .help-message');
    await expect(messages).toHaveCount(3); // begroeting + eigen vraag + antwoord
    await expect(messages.nth(1)).toHaveClass(/user/);
    await expect(messages.nth(1)).toContainText('verlof');
    // Standaard staat de verlof/ziekte-schakelaar uit; het hulpantwoord noemt
    // dan de echte route (salarisadministratie / Backoffice), niet "vul rechts in".
    await expect(messages.nth(2)).toContainText('Verlof en ziekte staan hier uit');
    await expect(page.locator('#help-input')).toHaveValue(''); // het veld wordt na versturen geleegd
    await expect(messages.nth(2).locator('button[data-help-view="timesheet"]')).toHaveText('Open Mijn uren');
  });

  await test.step('When de medewerker op de knop klikt', async () => {
    await page.locator('#help-messages .help-message').nth(2).locator('button[data-help-view="timesheet"]').click();
  });

  await test.step('Then opent daadwerkelijk Mijn uren', async () => {
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
  });

  await loginPage.logout();
});

test('[HELP-N-001] het hulpgesprek overleeft geen paginaherlading, alleen "Gesprek wissen" binnen de sessie', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker heeft binnen het gesprek een vraag gesteld', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#help-launcher').click();
    await page.locator('#help-input').fill('waar zie ik mijn status');
    await page.locator('#help-form').locator('button[type="submit"]').click();
    await expect(page.locator('#help-messages .help-message')).toHaveCount(3);
  });

  await test.step('When de medewerker Gesprek wissen gebruikt', async () => {
    await page.locator('#help-clear').click();
  });

  await test.step('Then blijft alleen de begroeting over, met een melding dat het is gewist', async () => {
    await expect(page.locator('#toast')).toContainText('Het hulpgesprek is gewist');
    await expect(page.locator('#help-messages .help-message')).toHaveCount(1);
    await expect(page.locator('#help-messages .help-message').first()).toContainText('alleen tijdens deze sessie');
  });

  await test.step('When de medewerker opnieuw een vraag stelt en de pagina daarna echt herlaadt', async () => {
    await page.locator('#help-input').fill('waar zie ik mijn status');
    await page.locator('#help-form').locator('button[type="submit"]').click();
    await expect(page.locator('#help-messages .help-message')).toHaveCount(3);
    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();
  });

  await test.step('Then is het gesprek net zo leeg als bij een eerste opening, niet ergens onthouden', async () => {
    await page.locator('#help-launcher').click();
    await expect(page.locator('#help-messages .help-message')).toHaveCount(1);
    await expect(page.locator('#help-messages .help-message').first()).toContainText('alleen tijdens deze sessie');
    await expect(page.locator('#help-messages')).not.toContainText('waar zie ik mijn status');
  });

  await loginPage.logout();
});

// Regression: "Contact opnemen" bood eerst drie knoppen naast elkaar ("Open in
// Gmail", "Open in Outlook / mailapp", "Kopieer bericht") voor feitelijk één
// bedoeling -- een mailto-koppeling opent toch al wat de gebruiker zelf als
// e-mailapp heeft ingesteld. Nu nog maar één duidelijke mailknop plus kopiëren
// als vangnet.
test('[HELP-H-003] contact opnemen toont precies één mailknop en een kopieer-vangnet, geen dubbele keuze', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker opent Hulp & contact', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#help-launcher').click();
  });

  await test.step('When de medewerker het onderwerp Contact opnemen kiest', async () => {
    await page.locator('#help-suggestions button[data-help-topic="contact"]').click();
  });

  await test.step('Then staat er precies één mailto-knop en één kopieerknop, geen los Gmail-alternatief', async () => {
    const actions = page.locator('#help-messages .help-message').last().locator('.help-contact-actions');
    await expect(actions.locator('a, button')).toHaveCount(2);
    const mailLink = actions.locator('a');
    await expect(mailLink).toHaveCount(1);
    await expect(mailLink).toHaveText('Open e-mailapp');
    await expect(mailLink).toHaveAttribute('href', /^mailto:backoffice@pathconsultancy\.nl\?subject=/);
    const copyButton = actions.locator('button');
    await expect(copyButton).toHaveCount(1);
    await expect(copyButton).toHaveText('Kopieer bericht');
    await expect(page.locator('#help-messages')).not.toContainText('Gmail');
  });

  await loginPage.logout();
});

// Regression: het hulpantwoord bij "Verlof of ziekte" was een vaste tekst
// ("vul rechts bij de maandsamenvatting in") terwijl het echte gedrag afhangt
// van de beheerderschakelaar. Met de schakelaar uit kreeg de medewerker dus
// een instructie voor velden die uitstaan. Het antwoord is nu dynamisch.
test('[HELP-H-004] het hulpantwoord over verlof/ziekte volgt de beheerderschakelaar', async ({ page }) => {
  const loginPage = new LoginPage(page);

  const vraagVerlofAntwoord = async () => {
    await page.locator('#help-launcher').click();
    await page.locator('#help-input').fill('verlof');
    await page.locator('#help-form').locator('button[type="submit"]').click();
    return page.locator('#help-messages .help-message').last();
  };

  try {
    await test.step('Given de schakelaar staat uit (standaard) en de medewerker vraagt naar verlof', async () => {
      await loginPage.open();
      await loginPage.loginAsEmployee();
      await expect(await vraagVerlofAntwoord()).toContainText('Verlof en ziekte staan hier uit');
      await loginPage.logout();
    });

    await test.step('When de beheerder verlof/ziekte handmatig invullen aanzet', async () => {
      await loginPage.loginAsAdmin();
      await page.locator('button[data-view="settings"]').click();
      const toggle = page.locator('#setting-leave-sick-entry-enabled');
      await expect(toggle).not.toBeChecked();
      await toggle.click();
      const saved = page.waitForResponse(r => r.url().includes('/server/api/settings.php') && r.request().method() === 'POST');
      await page.locator('#save-settings').click();
      expect((await saved).status()).toBe(200);
      await loginPage.logout();
    });

    await test.step('Then krijgt de medewerker nu het antwoord dat wél naar de maandsamenvatting verwijst', async () => {
      await loginPage.loginAsEmployee();
      const antwoord = await vraagVerlofAntwoord();
      await expect(antwoord).toContainText('vul je rechts bij de maandsamenvatting in');
      await expect(antwoord).not.toContainText('staan hier uit');
      await loginPage.logout();
    });
  } finally {
    // Company-brede instelling in de gedeelde TEST-database weer op standaard
    // (uit), via de auth-API zodat dit ook opruimt als de try halverwege faalt.
    const authApi = new AuthApi(page.request);
    await authApi.logout().catch(() => null);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    await setLeaveSickEntryEnabled(page, false);
    await authApi.logout().catch(() => null);
  }
});

test('[HELP-H-002] het paneel opent en sluit met een vloeiende overgang, en meteen zonder animatievoorkeur', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker heeft geen voorkeur voor verminderde beweging ingesteld', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
  });

  await test.step('When de medewerker Hulp & contact opent', async () => {
    await page.locator('#help-launcher').click();
  });

  await test.step('Then krijgt het paneel de is-open-klasse en telt op als daadwerkelijk zichtbaar', async () => {
    const panel = page.locator('#help-panel');
    await expect(panel).toHaveClass(/is-open/);
    await expect(panel).toBeVisible();
    // De overgang duurt 180ms; pollen in plaats van één keer meten voorkomt dat
    // deze toets het paneel halverwege de overgang betrapt.
    await expect.poll(() => panel.evaluate(el => Number(getComputedStyle(el).opacity)), { timeout: 2000 }).toBeGreaterThan(0.9);
  });

  await test.step('When de medewerker het paneel sluit', async () => {
    await page.locator('#help-close').click();
  });

  await test.step('Then verdwijnt het paneel weer volledig, ook na de sluitovergang', async () => {
    await expect(page.locator('#help-panel')).toBeHidden();
    await expect(page.locator('#help-panel')).not.toHaveClass(/is-open/);
  });

  await loginPage.logout();
});

test('[HELP-N-002] met een voorkeur voor verminderde beweging sluit het paneel direct, zonder op een animatie te wachten', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker heeft verminderde beweging ingesteld en het paneel staat open', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#help-launcher').click();
    await expect(page.locator('#help-panel')).toBeVisible();
  });

  await test.step('When de medewerker het paneel sluit', async () => {
    await page.locator('#help-close').click();
  });

  await test.step('Then is het paneel direct verborgen, niet pas na de normale overgangsduur', async () => {
    // Regression: closeHelp() plant zonder reduced-motion een setTimeout van
    // 180ms voordat hidden echt gezet wordt. Met reduced-motion hoort dat
    // synchroon te gebeuren; deze toets zou bij een regressie nog correkt
    // "verborgen" zien binnen Playwright's eigen retry-venster maar toont het
    // verschil door het element direct, zonder wachttijd, te controleren.
    await expect(page.locator('#help-panel')).toBeHidden({ timeout: 50 });
  });

  await loginPage.logout();
});
