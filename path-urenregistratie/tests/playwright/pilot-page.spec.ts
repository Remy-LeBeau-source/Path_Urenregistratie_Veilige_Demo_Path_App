import { expect, test } from '@playwright/test';

// Beide pilotpagina's zijn bewust STATISCHE 1-op-1 reproducties van de
// 1414/1919-mockups (design-mockups/1414-path-bento-space/*.jpg):
//   pilot/1919-medewerker.html  -> medewerker-dashboard.jpg, met een lichte
//     interactielaag (1919-medewerker-ui.js): maandkeuze en uren invullen.
//   pilot/1919-beheerder.html   -> beheerder-maandoverzicht.jpg ("Path
//     Storyline — Admin"), volledig statisch, geen <script>.
// Vaste mockup-data, geen live server, geen schrijfacties, geen gedeelde
// app-code. De app op / blijft ongemoeid.

test('[PILOT-H-001] beide pilotpagina’s leven naast een ongewijzigde app', async ({ page }) => {
  await test.step('Given de webroot met de app op /', async () => { /* de app blijft de baseline */ });

  await test.step('When de medewerker- en Backoffice-pilot als eigen URL worden opgevraagd', async () => {
    expect((await page.goto('/pilot/1919-medewerker.html'))?.status()).toBe(200);
  });

  await test.step('Then dragen ze de pilot-vlag/marker en delen ze geen code met de app', async () => {
    await expect(page.locator('.pilot-flag')).toContainText('nieuwe medewerkerportal');
    await expect(page.locator('body')).toHaveAttribute('data-pilot-design', 'combo-1414-1919');
    await expect(page.locator('a[href="/"]')).toHaveCount(0);
    await expect(page.locator('script[src*="assets/app.js"], link[href*="assets/styles.css"]')).toHaveCount(0);

    expect((await page.goto('/pilot/1919-beheerder.html'))?.status()).toBe(200);
    await expect(page.locator('.pilot-flag')).toContainText('nieuwe Backofficeportal');
    await expect(page.locator('body')).toHaveAttribute('data-pilot-design', 'combo-1414-1919');
    await expect(page.locator('script[src*="assets/app.js"]')).toHaveCount(0);
  });

  await test.step('And de bestaande app blijft er onaangeroerd naast draaien', async () => {
    await page.goto('/');
    await expect(page.locator('#login-screen')).toBeVisible();
  });
});

test('[PILOT-H-002] medewerker-pilot toont de 1414-look met werkende maand en invoer', async ({ page }) => {
  await test.step('Given de medewerker-pilot', async () => {
    await page.goto('/pilot/1919-medewerker.html');
  });

  await test.step('When de pagina is geladen', async () => {
    await expect(page.locator('.hero h1')).toHaveText('Begin met je uren');
  });

  await test.step('Then staat september met week 36 klaar om in te vullen en de wekenmeter op nul', async () => {
    await expect(page.locator('.monthpick .mlabel')).toHaveText('September 2026');
    await expect(page.locator('.week .wknav b')).toHaveText('Week 36');
    // Weekstrook: 7 dagen; ma/di/wo/do gevuld met de mockup-uren, wo actief, vr–zo leeg (zonder voorgevulde nul).
    const days = page.locator('.week li');
    await expect(days).toHaveCount(7);
    await expect(days.nth(0).locator('.hin')).toHaveValue('8,00');
    await expect(days.nth(2)).toHaveClass(/on/);
    await expect(days.nth(3).locator('.hin')).toHaveValue('7,30');
    await expect(days.nth(4).locator('.hin')).toHaveValue('');
    await expect(days.nth(4).locator('.hin')).toHaveAttribute('placeholder', '0,00');
    await expect(page.locator('.week .total .tval')).toHaveText('30,30');
    // Voortgangsmeter telt ingediende weken; nog geen enkele week ingediend.
    await expect(page.locator('.gauge .ring .num')).toHaveText('0');
    await expect(page.locator('.gauge .ring .of')).toContainText('/ 5');
    await expect(page.locator('.gauge .pct')).toHaveText('0%');
    // Klanturenstaatkaart: september is nog niet verstuurd, dus geen vinkje.
    await expect(page.locator('.kt')).toHaveAttribute('data-state', 'pending');
    await expect(page.locator('.kt .txt p')).toContainText('Nog niet verstuurd');
    // Vier-stappen-strook.
    await expect(page.locator('.steps li b')).toHaveText([
      'Uren invullen', 'Indienen', 'Controle Backoffice', 'Klanturenstaat',
    ]);
  });
});

test('[PILOT-H-006] medewerker-pilot: uren invullen zonder voorgevulde nul, week indienen opent de volgende week', async ({ page }) => {
  await test.step('Given de medewerker-pilot met september open', async () => {
    await page.goto('/pilot/1919-medewerker.html');
  });

  const vr = page.locator('.week li').nth(4);

  await test.step('When een lege dag wordt ingevuld, bijgesteld en de week wordt ingediend', async () => {
    await expect(vr.locator('.hin')).toHaveValue('');
    await vr.locator('.hin').click();
    await vr.locator('.hin').pressSequentially('6');
    await vr.locator('.hin').blur();
    await expect(vr.locator('.hin')).toHaveValue('6,00');
    await expect(page.locator('.week .total .tval')).toHaveText('36,30');
    await vr.locator('.st.pls').click();
    await expect(vr.locator('.hin')).toHaveValue('6,50');
    await page.getByRole('button', { name: 'Indienen ter controle' }).click();
  });

  await test.step('Then springt de pilot naar week 37, die weer invulbaar is, en telt de meter mee', async () => {
    await expect(page.locator('.week .wknav b')).toHaveText('Week 37');
    await expect(page.locator('.week .hin')).toHaveCount(7);
    await expect(page.locator('.gauge .pct')).toHaveText('20%');
    await page.locator('.week .wprev').click();
    await expect(page.locator('.week .wknav b')).toHaveText('Week 36');
    await expect(page.locator('.week .done')).toContainText('Backoffice controleert');
  });
});

test('[PILOT-H-007] medewerker-pilot: afgeronde maand toont vergrendelde weken en verzonden klanturenstaat', async ({ page }) => {
  await test.step('Given de medewerker-pilot', async () => {
    await page.goto('/pilot/1919-medewerker.html');
    await expect(page.locator('.monthpick .mlabel')).toHaveText('September 2026');
  });

  await test.step('When augustus wordt gekozen in de maandkeuze', async () => {
    await page.locator('.monthpick').click();
    await page.locator('.monthmenu li[data-key="2026-08"]').click();
  });

  await test.step('Then staan alle weken vast en toont de klanturenstaat het verzonden-vinkje', async () => {
    await expect(page.locator('.monthpick .mlabel')).toHaveText('Augustus 2026');
    await expect(page.locator('.week .hin')).toHaveCount(0);
    await expect(page.locator('.week li').nth(0).locator('.h')).toHaveText('8,00');
    await expect(page.locator('.gauge .ring .num')).toHaveText('5');
    await expect(page.locator('.gauge .pct')).toHaveText('100%');
    await page.locator('.week .wnext').click();
    await expect(page.locator('.week .hin')).toHaveCount(0);
    await expect(page.locator('.kt')).toHaveAttribute('data-state', 'sent');
    await expect(page.locator('.kt .txt p')).toHaveText('Gereed en verzonden via e-mail.');
    await expect(page.locator('.kt .check')).toBeVisible();
  });
});

test('[PILOT-H-003] Backoffice-pilot reproduceert de 1414/1919-ADMIN-mockup 1-op-1', async ({ page }) => {
  await test.step('Given de statische Backoffice-pilot', async () => {
    expect((await page.goto('/pilot/1919-beheerder.html'))?.status()).toBe(200);
  });

  await test.step('When de pagina is geladen', async () => {
    await expect(page.locator('.pilot-flag')).toContainText('nieuwe Backofficeportal');
  });

  await test.step('Then staan de mockup-onderdelen in beeld met de vaste mockup-data', async () => {
    await expect(page.locator('.lede h1')).toHaveText('Verhalen per medewerker');
    await expect(page.locator('.pipeline .stage')).toHaveCount(5);
    await expect(page.locator('.pipeline .stage b')).toHaveText([
      'Uren', 'Klanturenstaat', 'Extern bevestigen', 'Factuur', 'Voltooid',
    ]);
    await expect(page.locator('.queue .emp-row')).toHaveCount(4);
    await expect(page.locator('.queue .emp-row').first()).toContainText('Shawn–Douglas Nahar');
    await expect(page.locator('.queue .emp-row').first()).toContainText('In behandeling');
  });
});

test('[PILOT-H-004] Backoffice-pilot: geselecteerde rij krijgt een subtiele markering, geen groene balk links', async ({ page }) => {
  await test.step('Given de Backoffice-pilot', async () => {
    await page.goto('/pilot/1919-beheerder.html');
  });

  await test.step('When de wachtrij wordt getoond', async () => {
    await expect(page.locator('.queue .emp-row')).toHaveCount(4);
  });

  await test.step('Then is precies één rij gemarkeerd zonder verticale groene balk, met opgelichte horizontale proceslijn', async () => {
    await expect(page.locator('.queue .emp-row.is-selected')).toHaveCount(1);
    await expect(page.locator('.queue .emp-row').first()).toHaveClass(/is-selected/);
    const borderLeft = await page.locator('.queue .emp-row.is-selected').evaluate(
      (el) => getComputedStyle(el).borderLeftWidth,
    );
    expect(borderLeft).toBe('0px');
    await expect(page.locator('.queue .emp-row.is-selected .track .seg.on').first()).toBeVisible();
  });
});

test('[PILOT-H-005] Backoffice-pilot: verhaalpaneel toont de vier story-kaarten met statuspillen en de vervolgknop', async ({ page }) => {
  await test.step('Given de Backoffice-pilot met een geselecteerde medewerker', async () => {
    await page.goto('/pilot/1919-beheerder.html');
  });

  await test.step('When het verhaalpaneel wordt getoond', async () => {
    await expect(page.locator('.story .card')).toHaveCount(4);
  });

  await test.step('Then dragen de kaarten de mockup-status en staat de vervolgknop klaar', async () => {
    await expect(page.locator('.story .card').first().locator('.pill')).toHaveText('Gereed');
    await expect(page.locator('.story .card.warn .pill')).toHaveText('Actie vereist');
    await expect(page.locator('.story .card.paused h3')).toHaveText('Factuurconcept gepauzeerd');
    await expect(page.locator('.story .card.paused .reason select')).toBeVisible();
    await expect(page.locator('.story-cta button')).toContainText('Verhaal vervolgen: extern bevestigen');
  });
});

test('[PILOT-N-001] elke pilot-URL toont alleen de onderdelen van zijn eigen rol', async ({ page }) => {
  await test.step('Given de medewerker-pilot', async () => {
    await page.goto('/pilot/1919-medewerker.html');
  });

  await test.step('When medewerker- en Backoffice-pilot naast elkaar worden bekeken', async () => {
    await expect(page.locator('.hero h1')).toHaveText('Begin met je uren');
  });

  await test.step('Then heeft de medewerker geen Backoffice-pijplijn en is de Backoffice-pilot als zodanig gemarkeerd', async () => {
    await expect(page.getByText('Extern bevestigen', { exact: true })).toHaveCount(0);

    await page.goto('/pilot/1919-beheerder.html');
    await expect(page.locator('.pilot-flag')).toContainText('nieuwe Backofficeportal');
    await expect(page.locator('.pilot-flag')).toContainText('niet de echte app');
    await expect(page.locator('.pipeline')).toContainText('Extern bevestigen');
  });
});

test('[PILOT-N-002] beide pilots blijven zonder horizontale overflow op telefoon', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await test.step('Given een telefoonviewport', async () => { /* 390 x 844 */ });

  await test.step('When beide pilots worden geopend', async () => {
    await page.goto('/pilot/1919-medewerker.html');
  });

  await test.step('Then past alles binnen de breedte en zijn tapdoelen minimaal 42px', async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect((await page.locator('.hero .go').boundingBox())?.height || 0).toBeGreaterThanOrEqual(42);

    await page.goto('/pilot/1919-beheerder.html');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect((await page.locator('.queue .emp-row').first().boundingBox())?.height || 0).toBeGreaterThanOrEqual(42);
  });
});
