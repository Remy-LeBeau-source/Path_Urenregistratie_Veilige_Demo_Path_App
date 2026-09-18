import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { openProfielmenu } from './pages/TopbarMenu';

// Avatarkiezer in het profielmenu (17 sep, handoff-opdracht). appConfig.employeeEmail
// en appConfig.adminEmail wijzen in de demodata naar met naam genoemde, vaste
// collega's (Stasjo van Bakel resp. Gio Maatsen) -- dus loginAsEmployee()/
// loginAsAdmin() zijn hier bewust ook de cases voor de vaste-avatartoewijzing,
// in plaats van een aparte accountkeuze nodig te hebben.

async function kiesVormgeving(page: import('@playwright/test').Page, waarde: 'classic' | 'new'): Promise<void> {
  await openProfielmenu(page);
  await page.locator('[data-profile-action="preferences"]').click();
  await expect(page.locator('#pref-skin-trigger')).toBeVisible();
  await page.locator('#pref-skin-trigger').click();
  await page.locator(`[data-standard-choice-target="pref-skin"][data-standard-choice-value="${waarde}"]`).click();
  await page.getByRole('button', { name: 'Voorkeuren opslaan' }).click();
}

async function avatarVoorIndex(page: import('@playwright/test').Page, index: number): Promise<string> {
  return page.evaluate((i) => (window as unknown as { PATH_AVATARS: string[] }).PATH_AVATARS[i], index);
}

test.describe('avatarkiezer in het profielmenu', () => {
  test('[AVATAR-H-001] een medewerker met een vaste naam krijgt automatisch zijn toegewezen avatar, zonder zelf te kiezen', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    await test.step('Given de medewerker inlogt zonder ooit een avatar gekozen te hebben', async () => {
      await loginPage.loginAsEmployee();
      await openProfielmenu(page);
    });

    await test.step('Then toont het profielmenu meteen zijn vaste, toegewezen avatar (nummer 1)', async () => {
      const verwacht = await avatarVoorIndex(page, 0);
      const bg = await page.locator('#profile-menu-avatar').evaluate(el => getComputedStyle(el).backgroundImage);
      expect(bg).toContain(verwacht.slice(20, 90));
    });
  });

  test('[AVATAR-H-002] een beheerder met een vaste naam krijgt automatisch zijn toegewezen avatar', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    await test.step('Given de beheerder inlogt zonder ooit een avatar gekozen te hebben', async () => {
      await loginPage.loginAsAdmin();
      await openProfielmenu(page);
    });

    await test.step('Then toont het profielmenu meteen zijn vaste, toegewezen avatar (nummer 96)', async () => {
      const verwacht = await avatarVoorIndex(page, 95);
      const bg = await page.locator('#profile-menu-avatar').evaluate(el => getComputedStyle(el).backgroundImage);
      expect(bg).toContain(verwacht.slice(20, 90));
    });
  });

  test('[AVATAR-H-003] de avatarkiezer opent naast de ongewijzigde menu-items en testfunctiebalk', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openProfielmenu(page);

    await test.step('Then bestaan alle bestaande menu-onderdelen nog steeds, ongewijzigd', async () => {
      await expect(page.locator('[data-profile-action="profile"]')).toHaveText('Mijn profiel');
      await expect(page.locator('[data-profile-action="password"]')).toHaveText('Wachtwoord wijzigen');
      await expect(page.locator('[data-profile-action="preferences"]')).toHaveText('Voorkeuren');
      await expect(page.locator('[data-profile-action="help"]')).toHaveText('Hulp & contact');
      await expect(page.locator('[data-profile-action="logout"]')).toHaveText('Uitloggen');
      await expect(page.locator('#profile-menu-testfuncties')).toBeVisible();
      await expect(page.locator('#profile-menu-versie')).toBeVisible();
    });

    await test.step('When op de knopkop (avatar, naam, rol) wordt getikt', async () => {
      await page.locator('#avatar-picker-trigger').click();
    });

    await test.step('Then klapt een raster van twaalf avatars open, met paginateller 1/10', async () => {
      await expect(page.locator('#avatar-picker-panel')).toBeVisible();
      await expect(page.locator('.avatar-picker-optie')).toHaveCount(12);
      await expect(page.locator('#avatar-picker-teller')).toHaveText('1/10');
      await expect(page.locator('#avatar-picker-prev')).toBeDisabled();
      await expect(page.locator('#avatar-picker-next')).toBeEnabled();
    });
  });

  test('[AVATAR-H-004] bladeren eindigt op precies vijf avatars met een uitgeschakelde volgende-knop', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openProfielmenu(page);
    await page.locator('#avatar-picker-trigger').click();
    await expect(page.locator('#avatar-picker-panel')).toBeVisible();

    await test.step('When negen keer op volgende wordt getikt (113 avatars = 9x12 + 5)', async () => {
      for (let i = 0; i < 9; i++) await page.locator('#avatar-picker-next').click();
    });

    await test.step('Then staat de teller op 10/10, met precies vijf avatars en een uitgeschakelde volgende-knop', async () => {
      await expect(page.locator('#avatar-picker-teller')).toHaveText('10/10');
      await expect(page.locator('.avatar-picker-optie')).toHaveCount(5);
      await expect(page.locator('#avatar-picker-next')).toBeDisabled();
      await expect(page.locator('#avatar-picker-prev')).toBeEnabled();
    });

    await test.step('And gaat één stap terug weer naar een volle pagina van twaalf', async () => {
      await page.locator('#avatar-picker-prev').click();
      await expect(page.locator('#avatar-picker-teller')).toHaveText('9/10');
      await expect(page.locator('.avatar-picker-optie')).toHaveCount(12);
    });
  });

  test('[AVATAR-H-005] een avatar kiezen is direct zichtbaar, sluit het menu niet, en blijft staan na een echte paginaherlading', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openProfielmenu(page);
    await page.locator('#avatar-picker-trigger').click();
    await expect(page.locator('#avatar-picker-panel')).toBeVisible();

    let gekozenAvatar = '';
    await test.step('When een andere avatar dan de huidige wordt aangetikt', async () => {
      gekozenAvatar = await avatarVoorIndex(page, 5);
      await page.locator('.avatar-picker-optie').nth(5).click();
    });

    await test.step('Then verschijnt de keuze meteen, blijft het menu open, en is er geen aparte opslaan-knop nodig', async () => {
      await expect(page.locator('#profile-menu')).toBeVisible();
      await expect(page.locator('.avatar-picker-optie.is-gekozen')).toHaveCount(1);
      await expect(page.locator('.avatar-picker-optie').nth(5)).toHaveClass(/is-gekozen/);
      const bg = await page.locator('#profile-menu-avatar').evaluate(el => getComputedStyle(el).backgroundImage);
      expect(bg).toContain(gekozenAvatar.slice(20, 90));
    });

    await test.step('And staat dezelfde avatar er nog na een echte paginaherlading', async () => {
      await page.reload();
      await openProfielmenu(page);
      const bg = await page.locator('#profile-menu-avatar').evaluate(el => getComputedStyle(el).backgroundImage);
      expect(bg).toContain(gekozenAvatar.slice(20, 90));
    });
  });

  test('[AVATAR-H-008] het openen van de avatarkiezer overleeft een scroll-event dat de eigen hoogtewijziging veroorzaakt', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openProfielmenu(page);
    // Het openen van het profielmenu zelf markeert ook al een hertekening
    // (toggleTopbarPopover -> markLayoutRender), met dezelfde 1500ms-genadeperiode.
    // Wie meteen doorklikt zit dus toevallig nog in die eerdere genade, en dat
    // maskeerde deze bug hier ook: pas na die periode ligt de bescherming echt bij
    // toggleAvatarPickerPanel() zelf. Net als in het echt (je kijkt eerst even).
    await page.waitForTimeout(1600);

    await test.step('When de avatarkiezer wordt geopend en dat, net als op mobiel, meteen een scroll-event oplevert', async () => {
      await page.locator('#avatar-picker-trigger').click();
      await expect(page.locator('#avatar-picker-panel')).toBeVisible();
      // Het raster maakt het profielmenu flink hoger. Op mobiel (vaste positionering
      // + eigen scrollbalk, of de adresbalk die meebeweegt) geeft dat een scroll-event
      // dat zonder markLayoutRender() het hele profielmenu weer dichtklapte, nog voor
      // je iets kon aantikken -- gemeld op mobiel (17 sep). Dit dwingt dat scroll-event
      // hier af, ongeacht of deze browser er zelf een afvuurt.
      await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    });

    await test.step('Then blijven het profielmenu en de avatarkiezer open', async () => {
      await expect(page.locator('#profile-menu')).toBeVisible();
      await expect(page.locator('#avatar-picker-panel')).toBeVisible();
      await expect(page.locator('.avatar-picker-optie')).toHaveCount(12);
    });
  });

  test('[AVATAR-N-001] het vinkje op de gekozen avatar is navy op mint, nooit wit', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openProfielmenu(page);
    await page.locator('#avatar-picker-trigger').click();
    await expect(page.locator('.avatar-picker-optie.is-gekozen')).toHaveCount(1);

    await test.step('Then is de achtergrond van het vinkje mint en de tekstkleur navy, geen wit', async () => {
      const stijl = await page.locator('.avatar-picker-vink').evaluate(el => {
        const cs = getComputedStyle(el);
        return { achtergrond: cs.backgroundColor, kleur: cs.color };
      });
      expect(stijl.achtergrond).toBe('rgb(58, 189, 157)');
      expect(stijl.kleur).toBe('rgb(13, 27, 56)');
      expect(stijl.kleur).not.toBe('rgb(255, 255, 255)');
    });
  });

  test('[AVATAR-H-006] namen buiten de vaste lijst krijgen elk een eigen, stabiele avatar, zonder geslacht te raden', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsEmployee();

    await test.step('Then geeft dezelfde naam altijd dezelfde avatar-index terug, ook bij afwijkende spatiëring/hoofdletters', async () => {
      const [eerste, tweede, metRuis] = await page.evaluate(() => {
        const w = window as unknown as { avatarIndexVoorNaam: (n: string) => number };
        return [
          w.avatarIndexVoorNaam('Test Persoon Een'),
          w.avatarIndexVoorNaam('Test Persoon Een'),
          w.avatarIndexVoorNaam('  TEST   persoon   een  '),
        ];
      });
      expect(eerste).toBe(tweede);
      expect(eerste).toBe(metRuis);
      expect(eerste).toBeGreaterThanOrEqual(0);
      expect(eerste).toBeLessThan(113);
    });

    await test.step('And blijven de zeven vaste collega-namen op hun afgesproken avatar staan, ook met afwijkende spatiëring/hoofdletters', async () => {
      const resultaat = await page.evaluate(() => {
        const w = window as unknown as { avatarIndexVoorNaam: (n: string) => number };
        return {
          marc: w.avatarIndexVoorNaam('marc DE roon'),
          stasjo: w.avatarIndexVoorNaam('  Stasjo van Bakel '),
          brian: w.avatarIndexVoorNaam('Brian Hek'),
          shawn: w.avatarIndexVoorNaam('Shawn-Douglas Nahar'),
          gio: w.avatarIndexVoorNaam('Gio Maatsen'),
          kenrich: w.avatarIndexVoorNaam('Kenrich Lieveld'),
          joyce: w.avatarIndexVoorNaam('Joyce van der Steenhoven'),
        };
      });
      expect(resultaat).toEqual({ marc: 2, stasjo: 0, brian: 35, shawn: 8, gio: 95, kenrich: 23, joyce: 83 });
    });
  });

  test('[AVATAR-H-007] de avatarkiezer werkt identiek in de Nieuw-vormgeving (Modern)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsAdmin();

    await test.step('Given de vormgeving op Nieuw staat', async () => {
      await kiesVormgeving(page, 'new');
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    });

    await test.step('When het profielmenu en de avatarkiezer worden geopend', async () => {
      await openProfielmenu(page);
      await page.locator('#avatar-picker-trigger').click();
    });

    await test.step('Then werkt de kiezer identiek: twaalf avatars, teller 1/10, en hetzelfde vinkje mint-op-navy', async () => {
      await expect(page.locator('.avatar-picker-optie')).toHaveCount(12);
      await expect(page.locator('#avatar-picker-teller')).toHaveText('1/10');
      await page.locator('.avatar-picker-optie').nth(3).click();
      const stijl = await page.locator('.avatar-picker-vink').evaluate(el => {
        const cs = getComputedStyle(el);
        return { achtergrond: cs.backgroundColor, kleur: cs.color };
      });
      expect(stijl.achtergrond).toBe('rgb(58, 189, 157)');
      expect(stijl.kleur).toBe('rgb(13, 27, 56)');
    });

    await test.step('And blijft het menu open, net als in Klassiek', async () => {
      await expect(page.locator('#profile-menu')).toBeVisible();
    });
  });
});
