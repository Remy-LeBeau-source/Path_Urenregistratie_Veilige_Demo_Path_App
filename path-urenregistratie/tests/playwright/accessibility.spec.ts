import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

// Basic keyboard/accessibility smoke coverage (Fase 15: "Basiscontrole op
// toetsenbordbediening en leesbaarheid"). Deliberately scoped: this checks that
// key controls are reachable/labelled, not a full WCAG audit.

test('[A11Y-H-001] loginformulier is volledig met het toetsenbord bruikbaar en correct gelabeld', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de loginpagina is geopend', async () => {
    await loginPage.open();
  });

  await test.step('Then hebben e-mail, wachtwoord en inlogknop een programmatisch gekoppeld label', async () => {
    await expect(page.locator('#auth-login-email')).toBeVisible();
    await expect(page.locator('#auth-login-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inloggen', exact: true })).toBeVisible();
  });

  await test.step('When er met Tab door het formulier wordt genavigeerd', async () => {
    await page.locator('#auth-login-email').focus();
    await expect(page.locator('#auth-login-email')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#auth-login-password')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Wachtwoord tonen', exact: true })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Inloggen', exact: true })).toBeFocused();
  });
});

test('[A11Y-H-002] admin-dashboard hoofdnavigatie is toetsenbordbereikbaar met herkenbare namen', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de administrator is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
  });

  await test.step('Then heeft elke hoofdnavigatieknop een herkenbare, unieke naam', async () => {
    const navButtons = page.locator('nav [data-view]');
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const button = navButtons.nth(index);
      const accessibleName = (await button.textContent())?.trim() ?? '';
      expect(accessibleName.length).toBeGreaterThan(0);
    }
  });

  await test.step('When de eerste hoofdnavigatieknop via het toetsenbord wordt bediend', async () => {
    const firstNavButton = page.locator('nav [data-view]').first();
    await firstNavButton.focus();
    await expect(firstNavButton).toBeFocused();
    await page.keyboard.press('Enter');
  });
});

test('[A11Y-H-003] lopende tekst blijft op een breed scherm leesbaar van regellengte', async ({ page }) => {
  // Gemeten op 1440px: het correctiebericht dat een medewerker moet lezen om te
  // weten wát hij moet aanpassen, liep over 172 tekens per regel. Boven ongeveer
  // 75 raakt je oog bij het terugspringen de volgende regel kwijt. Er stond
  // nergens een begrenzing op regellengte.
  await page.setViewportSize({ width: 1440, height: 900 });
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsAdmin();

  // Meten in pixels, niet in geschatte tekens. Het aantal tekens per regel hangt
  // af van het lettertype, en op een bouwmachine zonder de projectlettertypes valt
  // de browser terug op andere maten -- dan meet je het lettertype in plaats van de
  // regellengte. Dezelfde alinea kwam daar op 95 tekens uit in plaats van 75, en de
  // test faalde terwijl de CSS klopte.
  //
  // Een alinea van 75 tekens komt bij deze lettergroottes rond de 550px uit. De grens
  // ligt op 900px: ruim genoeg om lettertypeverschillen te overleven, streng genoeg
  // om te vangen dat een alinea de volle inhoudsbreedte van 1122px pakt.
  const MAX_ALINEABREEDTE = 900;
  const telTeBredeAlineas = async () => page.evaluate((grens) => {
    const teBreed: string[] = [];
    document.querySelectorAll('.view.is-active p, .view.is-active li').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const tekst = (el.textContent || '').trim();
      if (tekst.length < 90) return;
      if (rect.width > grens) {
        const e = el as HTMLElement;
        teBreed.push((e.id || e.className || e.tagName) + '=' + Math.round(rect.width) + 'px');
      }
    });
    return [...new Set(teBreed)];
  }, MAX_ALINEABREEDTE);

  for (const view of ['dashboard', 'announcements', 'settings'] as const) {
    await test.step(`Het scherm ${view} houdt zijn alinea's leesbaar`, async () => {
      await page.locator(`button[data-view="${view}"]`).first().click();
      await expect(page.locator(`#view-${view}`)).toHaveClass(/is-active/);
      const teBreed = await telTeBredeAlineas();
      expect(teBreed, `${view}: alinea's breder dan ${MAX_ALINEABREEDTE}px, dus te lange regels — ${teBreed.join(', ')}`).toEqual([]);
    });
  }
});

test('[A11Y-H-004] een geopende dialoog is met het toetsenbord te bedienen en te sluiten', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de administrator opent de voorbeeld-herstel-dialoog', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
    await page.locator('#quick-reset-demo').click();
    await expect(page.locator('#modal')).toBeVisible();
  });

  await test.step('Then is de sluitknop bereikbaar en gelabeld, en ligt de focus in de dialoog', async () => {
    const sluit = page.locator('#modal-close');
    await expect(sluit).toBeVisible();
    const naam = (await sluit.getAttribute('aria-label')) || (await sluit.textContent()) || '';
    expect(naam.trim().length, 'de sluitknop hoort een toegankelijke naam te hebben').toBeGreaterThan(0);
    const focusInModal = await page.evaluate(() => !!document.activeElement?.closest('#modal'));
    expect(focusInModal, 'na openen hoort de focus in de dialoog te liggen').toBe(true);
  });

  await test.step('When Escape wordt ingedrukt', async () => {
    await page.keyboard.press('Escape');
  });

  await test.step('Then sluit de dialoog en gaat de focus niet verloren op de body', async () => {
    await expect(page.locator('#modal')).toBeHidden();
    const focusOpBody = await page.evaluate(() => document.activeElement === document.body || document.activeElement === null);
    expect(focusOpBody, 'na sluiten mag de focus niet op de kale body vallen').toBe(false);
  });
});

test('[A11Y-H-005] elke interactieve elementsoort krijgt een zichtbare focusring', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsAdmin();
  await expect(page.locator('#app-shell')).toBeVisible();

  await test.step('Then geeft de basisregel een outline aan button, input, select, textarea, a, summary en tabindex', async () => {
    const css = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="stylesheet"]') as HTMLLinkElement | null;
      if (!link) return '';
      const res = await fetch(link.href);
      return res.text();
    });
    expect(css).toMatch(/a:focus-visible/);
    expect(css).toMatch(/\[tabindex\]:focus-visible/);
    expect(css).toMatch(/summary:focus-visible/);
  });

  await test.step('And een via het toetsenbord gefocuste navigatieknop toont echt een outline', async () => {
    const knop = page.locator('nav [data-view]').first();
    await knop.evaluate(el => (el as HTMLElement).focus());
    // Tab vanaf de knop en terug: de browser markeert het element dan als
    // toetsenbord-gefocust zodat :focus-visible aanslaat.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    const zichtbaar = await knop.evaluate(el => {
      const s = getComputedStyle(el);
      return el.matches(':focus-visible') && s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
    });
    expect(zichtbaar, 'een toetsenbord-gefocuste knop hoort een zichtbare outline te hebben').toBe(true);
  });
});
