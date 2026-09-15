import { expect, test, type Request } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { bewaarUrenstaat } from './fixtures/urenstaatHerstel';

// Vaste regressiecases uit de seeded monkey-verkenning op de medewerker in
// Klassiek (tests/verkenning/klassiek-monkey.spec.ts, nacht van 14 op 15 sep).
// Een monkey vindt; deze cases houden vast. Elke case zet de toestand die de
// monkey toevallig bereikte doelbewust en deterministisch neer, zodat hij niet
// op timing of geluk leunt.

test('[KLV-N-002] het maandkeuzepaneel valt op geen enkele breedte buiten het scherm', async ({ page }) => {
  // Vondst seeds 1 en 12: op 768 en 1024 px stak #period-month-panel 38 tot 46 px
  // voorbij de rechterrand. Een maand die buiten beeld valt, kun je niet kiezen.
  // Grenswaarden rond de breekpunten (720/721, 820/821) plus gangbare breedtes.
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
  await test.step('Given een medewerker in Klassiek', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  const gemeten: string[] = [];
  for (const scherm of ['employee-dashboard', 'timesheet', 'historie']) for (const breedte of [390, 720, 721, 768, 820, 821, 1024, 1280, 1440]) {
    await test.step(`Then ligt het geopende paneel op ${scherm} bij ${breedte}px volledig binnen beeld`, async () => {
      await page.setViewportSize({ width: breedte, height: 900 });
      // Zelfde .nav-item: zijbalk op desktop, tabbalk onderin op de telefoon.
      await page.locator(`.nav-item[data-view="${scherm}"]:visible`).first().click();
      await expect(page.locator(`#view-${scherm}`)).toHaveClass(/is-active/);
      const knop = page.locator('#period-month-picker');
      // Niet elk scherm toont de maandkeuze op elke breedte; waar hij ontbreekt
      // valt er niets buiten beeld te vallen. Wel vastleggen dat er gemeten is.
      if (!(await knop.isVisible())) return;
      gemeten.push(`${scherm}@${breedte}`);
      await knop.click();
      const paneel = page.locator('#period-month-panel');
      await expect(paneel).toBeVisible();
      const vak = await paneel.boundingBox();
      expect(vak, 'paneel heeft een positie').not.toBeNull();
      expect(vak!.x, `linkerrand op ${breedte}px`).toBeGreaterThanOrEqual(0);
      expect(vak!.x + vak!.width, `rechterrand op ${breedte}px`).toBeLessThanOrEqual(breedte);
      await page.keyboard.press('Escape');
      await expect(paneel).toBeHidden();
    });
  }
  await test.step('And is de maandkeuze op minstens de desktopbreedtes van Mijn uren echt gemeten', async () => {
    expect(gemeten, gemeten.join(', ')).toEqual(expect.arrayContaining(['timesheet@1024', 'timesheet@1280']));
  });
});

test('[KLV-N-001] snel achter elkaar uren invullen botst nooit met de eigen, net opgeslagen versie', async ({ page }) => {
  // Vondst seed 5 (5 handelingen): 9 aanklikken en meteen doortypen gaf een 409
  // stale-version, "door iemand anders gewijzigd", terwijl er maar één
  // medewerker in één tabblad werkte. De volgorde die dat veroorzaakt, wordt
  // hier afgedwongen met een vastgehouden serverrespons:
  //   A onderweg -> B komt in de wachtrij -> A slaagt -> C komt binnen het
  //   debounce-venster van B.
  // C werd opgebouwd uit de lokale serverversie, die bij "A slaagt met B in de
  // wachtrij" niet werd bijgewerkt. C ging dus met een achterhaalde versie de
  // deur uit.
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
  const schrijfStatussen: number[] = [];
  let houdVast = false;
  let laatLos: () => void = () => undefined;

  await page.route('**/server/api/timesheets.php', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    if (houdVast) await new Promise<void>(resolve => { laatLos = resolve; });
    schrijfStatussen.push(response.status());
    await route.fulfill({ response });
  });

  await test.step('Given een medewerker op Mijn uren van een open maand', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('.nav-item[data-view="timesheet"]:visible').first().click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator('#hours-grid .hours-input:not([disabled]):visible').nth(2)).toBeVisible();
  });

  const herstel = await bewaarUrenstaat(page);
  const velden = page.locator('#hours-grid .hours-input:not([disabled]):visible');
  const oorspronkelijk = [await velden.nth(0).inputValue(), await velden.nth(1).inputValue(), await velden.nth(2).inputValue()];
  try {
    const isSchrijf = (r: Request) => r.url().includes('/server/api/timesheets.php') && r.method() === 'POST';

    await test.step('And de urenstaat staat al met een versie op de server', async () => {
      // Zonder serverversie stuurt de app geen expected_version mee en kan de
      // server dus nooit "achterhaald" melden: dan bewijst de case niets.
      await velden.nth(0).fill('1.5');
      await expect(page.locator('#hours-autosave-status')).toContainText('Gesynchroniseerd', { timeout: 20_000 });
      const versie = await page.evaluate(() => {
        const rt = window as unknown as { recordFor: (id: number) => { serverVersion: number | null }; currentEmployee: () => { id: number } };
        return Number(rt.recordFor(rt.currentEmployee().id).serverVersion || 0);
      });
      expect(versie).toBeGreaterThan(0);
      schrijfStatussen.length = 0;
    });

    await test.step('When de eerste invoer onderweg is en er intussen twee nieuwe invoeren volgen', async () => {
      houdVast = true;
      const eersteVerzoek = page.waitForRequest(isSchrijf);
      await velden.nth(0).fill('3.5');
      await eersteVerzoek;
      // A is onderweg en wordt vastgehouden: B komt in de wachtrij.
      await velden.nth(1).fill('6.5');
      houdVast = false;
      laatLos();
      // Wachten tot de app A echt heeft afgehandeld en B op zijn debounce-timer
      // staat. Eerder typen laat C nog in de wachtrij van A vallen, en die
      // route ging al goed -- dan bewijst de case niets.
      await page.waitForFunction(() => {
        const w = (0, eval)('writeRuntime') as { draftInFlight: boolean; draftTimer: unknown };
        return w.draftInFlight === false && w.draftTimer !== null;
      }, null, { timeout: 15_000, polling: 5 });
      // Binnen het debounce-venster van B: invoer C.
      await velden.nth(2).fill('2.5');
    });

    await test.step('Then slaagt elke opslag en staan alle drie de waarden daarna op de server', async () => {
      await expect.poll(() => schrijfStatussen.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
      await expect(page.locator('#hours-autosave-status')).toContainText('Gesynchroniseerd', { timeout: 20_000 });
      expect(schrijfStatussen.filter(status => status !== 200), `statussen: ${schrijfStatussen.join(', ')}`).toEqual([]);
      await page.unroute('**/server/api/timesheets.php');
      await page.reload();
      const naHerladen = page.locator('#hours-grid .hours-input:not([disabled]):visible');
      await expect(naHerladen.nth(2)).toBeVisible({ timeout: 20_000 });
      await expect(naHerladen.nth(0)).toHaveValue(/^3[.,]5$/);
      await expect(naHerladen.nth(1)).toHaveValue(/^6[.,]5$/);
      await expect(naHerladen.nth(2)).toHaveValue(/^2[.,]5$/);
    });
  } finally {
    // Ook de server terugzetten: deze case schrijft echt, en latere cases in
    // dezelfde run lezen die dagen.
    await page.unroute('**/server/api/timesheets.php').catch(() => undefined);
    const terug = page.locator('#hours-grid .hours-input:not([disabled]):visible');
    for (let i = 0; i < 3; i++) await terug.nth(i).fill(oorspronkelijk[i]).catch(() => undefined);
    await expect(page.locator('#hours-autosave-status')).toContainText('Gesynchroniseerd', { timeout: 20_000 }).catch(() => undefined);
    await herstel().catch(() => undefined);
  }
});
