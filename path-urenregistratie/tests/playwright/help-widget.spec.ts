import { expect, test } from '@playwright/test';
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
    await expect(messages.nth(2)).toContainText('Vul verlof en ziekte rechts bij de maandsamenvatting in');
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
