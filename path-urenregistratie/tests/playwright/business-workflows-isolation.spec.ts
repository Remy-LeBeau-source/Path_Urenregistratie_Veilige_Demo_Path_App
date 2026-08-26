import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/e2eIsolation';
import { LoginPage } from './pages/LoginPage';

async function openView(page: Page, view: string): Promise<void> {
  await page.locator(`button[data-view="${view}"]:visible`).first().click();
  await expect(page.locator(`#view-${view}`)).toHaveClass(/is-active/);
}

test('[E2E-H-022] iedere case laat database en private opslag aantoonbaar schoon achter', async ({
  page,
  e2eIsolation,
}) => {
  const loginPage = new LoginPage(page);
  const marker = e2eIsolation.marker;
  const email = `${marker}@example.invalid`;
  const name = `Isolatie ${marker}`;
  let writeCount = 0;

  page.on('response', response => {
    if (response.url().includes('/server/api/staff.php') && response.request().method() === 'POST') {
      writeCount += 1;
    }
  });

  await test.step('Given een schone _test-baseline zonder marker, wezen of losse documenten', async () => {
    expect(e2eIsolation.baseline.marker_matches.total).toBe(0);
    expect(e2eIsolation.baseline.orphans.total).toBe(0);
    expect(e2eIsolation.baseline.documents.invalid).toBe(0);
  });

  await test.step('When Backoffice via de zichtbare GUI gemarkeerde account-, medewerker- en opdrachtdata opslaat', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await openView(page, 'employees');
    await page.locator('#add-employee').click();

    await page.locator('#edit-name').fill(name);
    await page.locator('#edit-account-email').fill(email);
    await page.locator('#edit-role').fill(`Consultant ${marker}`);
    await page.locator('#edit-start-date').fill('2026-08-01');
    await page.locator('#edit-contract').fill(`Contract ${marker}`);
    await page.locator('#edit-weekly-hours').fill('36');
    await page.locator('#edit-client').fill(`Klant ${marker}`);
    await page.locator('#edit-project').fill(marker);
    await page.locator('#edit-broker').fill(`Broker ${marker}`);
    await page.locator('#edit-broker-email').fill(`${marker}-broker@example.invalid`);
    await page.locator('#edit-invoice-recipient-name').fill(`Ontvanger ${marker}`);
    await page.locator('#edit-broker-invoice-address').fill(`Teststraat 22\n2200 TT Teststad ${marker}`);
    await page.locator('#edit-invoice-project').fill(`Factuurproject ${marker}`);
    await page.locator('#edit-rate').fill('122.50');
    await page.locator('#edit-subject').fill(`Onderwerp ${marker}`);
    await page.locator('#edit-body').fill(`Bericht ${marker}`);

    const invitation = page.locator('#edit-invite');
    if (await invitation.isEnabled()) await invitation.uncheck();

    const write = page.waitForResponse(response => (
      response.url().includes('/server/api/staff.php')
      && response.request().method() === 'POST'
      && response.ok()
    ));
    await page.locator('#modal-confirm').click();
    const writeResponse = await write;
    const writeBody = await writeResponse.json() as Record<string, unknown>;
    expect(writeBody.ok).toBe(true);
    expect(Number(writeBody.user_id)).toBeGreaterThan(0);
    expect(Number(writeBody.employee_id)).toBeGreaterThan(0);
    expect(Number(writeBody.assignment_id)).toBeGreaterThan(0);
    await expect(page.locator('#modal')).toBeHidden();
  });

  await test.step('Then zijn GUI-readback en gekoppelde databaserijen exact aantoonbaar', async () => {
    expect(writeCount).toBe(1);
    const card = page.locator('#employee-grid .employee-card').filter({ hasText: name });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(email);
    await card.locator('[data-edit-routing]').click();
    await expect(page.locator('#edit-name')).toHaveValue(name);
    await expect(page.locator('#edit-account-email')).toHaveValue(email);
    await expect(page.locator('#edit-contract')).toHaveValue(`Contract ${marker}`);
    await expect(page.locator('#edit-project')).toHaveValue(marker);
    await expect(page.locator('#edit-subject')).toHaveValue(`Onderwerp ${marker}`);
    await expect(page.locator('#edit-body')).toHaveValue(`Bericht ${marker}`);
    await page.locator('#modal-cancel').click();

    const state = await e2eIsolation.assertScenarioRowsExist(['users', 'employees', 'assignments']);
    expect(state.marker_matches.total).toBeGreaterThan(0);
    expect(state.orphans.total).toBe(0);
  });

  await test.step('And de automatische teardown bewijst hierna baseline, nul markers en nul losse PDF-bestanden', async () => {
    // De fixture voert deze controle na deze stap uit en voegt beide DB-snapshots
    // als JSON aan het Playwright-resultaat toe, ook wanneer de test zelf faalt.
    expect(e2eIsolation.marker).toBe(marker);
  });
});
