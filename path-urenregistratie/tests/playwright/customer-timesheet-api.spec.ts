import { expect, test } from '@playwright/test';
import { jsPDF } from 'jspdf';
import { AuthApi } from './api/AuthApi';
import { CustomerTimesheetApi } from './api/CustomerTimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';
import { attachBusinessScreenshot } from './reporting/uiAttachments';

const CANDIDATE_PERIODS = Array.from({ length: 240 }, (_, index) => {
  const year = 2130 + Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
});

test('[CTS-API-H-012] admin kan een ontbrekende klanturenstaat extern bevestigen en terugzetten', async ({ request }) => {
  const authApi = new AuthApi(request);
  const customerApi = new CustomerTimesheetApi(request);
  const period = '2199-11';
  const employeeId = 4;

  await test.step('Given de beheerder is ingelogd bij een periode zonder klanturenstaatrecord', async () => {
    const login = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    expect(login.user.role).toBe('administrator');
    const initial = await customerApi.read(period, employeeId);
    expect(initial.status).toBe(200);
    expect(initial.body.found).toBe(false);
  });

  await test.step('When de beheerder eerst zonder en daarna met verplichte reden extern bevestigt', async () => {
    const invalid = await customerApi.write({ action: 'confirm_external', period, employeeId });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('invalid-payload');
    const confirmed = await customerApi.write({
      action: 'confirm_external',
      period,
      employeeId,
      reviewNote: 'Uren per e-mail goedgekeurd',
    });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.customer_timesheet.status).toBe('skipped');
    expect(confirmed.body.customer_timesheet.review_note).toBe('Extern bevestigd: Uren per e-mail goedgekeurd');
    expect(confirmed.body.audit_event).toBe('customer_timesheet.externally_confirmed');
  });

  await test.step('Then de bevestiging auditbaar leesbaar is en door de beheerder kan worden teruggedraaid', async () => {
    const read = await customerApi.read(period, employeeId);
    expect(read.body.found).toBe(true);
    expect(read.body.customer_timesheet.status).toBe('skipped');
    expect(read.body.customer_timesheet.reviewed_by).toBeTruthy();
    expect(read.body.customer_timesheet.reviewed_at).toBeTruthy();
    const restored = await customerApi.write({ action: 'restore_missing', period, employeeId });
    expect(restored.status).toBe(200);
    expect(restored.body.customer_timesheet.status).toBe('missing');
    await authApi.logout();
  });
});

const CORRUPT_JPEG_BUFFER = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2ODApLCBxdWFsaXR5ID0gODUK/9sAQwAFAwQEBAMFBAQEBQUFBgcMCAcHBwcPCwsJDBEPEhIRDxERExYcFxMUGhURERghGBodHR8fHxMXIiQiHiQcHh8e/9sAQwEFBQUHBgcOCAgOHhQRFB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4e/8AAEQgABAAEAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A5WiiivmT9wP/2Q==',
  'base64',
);
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const OVERSIZED_DIMENSION_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAF3EAAAABCAIAAAAAAAAA',
  'base64',
);
const readablePdf = new jsPDF({ unit: 'mm', format: 'a4' });
readablePdf.setFontSize(16);
readablePdf.text('Klanturenstaat API-test', 20, 25);
readablePdf.setFontSize(11);
readablePdf.text('Volledige leesbare PDF-fixture met paginaboom en xref-tabel.', 20, 38);
const TINY_PDF_BUFFER = Buffer.from(readablePdf.output('arraybuffer'));

async function findWritablePeriod(api: CustomerTimesheetApi): Promise<string> {
  for (const period of CANDIDATE_PERIODS) {
    const read = await api.read(period, undefined, undefined, { attach: false });
    if (read.status !== 200 || !read.body?.ok) {
      continue;
    }

    if (!read.body.found) {
      return period;
    }

    const status = String(read.body.customer_timesheet?.status || '');
    if (['missing', 'draft', 'resubmit', 'received', 'skipped'].includes(status)) {
      return period;
    }
  }

  throw new Error('No writable customer-timesheet period found in 240 candidate months.');
}

async function findEmptyPeriod(api: CustomerTimesheetApi): Promise<string> {
  for (const period of CANDIDATE_PERIODS) {
    const read = await api.read(period, undefined, undefined, { attach: false });
    if (read.status === 200 && read.body?.ok && read.body.found === false) {
      return period;
    }
  }

  throw new Error('No empty customer-timesheet period found in 240 candidate months.');
}

test.describe('customer timesheet api', () => {
  test('[CTS-API-H-009] brokerroute koppelt de officiële klanturenstaat aan dezelfde medewerker en periode', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    const before = await customerApi.read('2026-07', 1);
    expect(before.status).toBe(200);
    expect(before.body.customer_timesheet.status).toBe('approved');

    const sent = await customerApi.write({
      action: 'send_to_broker',
      period: '2026-07',
      employeeId: 1,
      subject: 'Klanturenstaat Marc de Roon – juli 2026 voor dossier',
      body: 'Goedemiddag,\n\nHierbij ontvangt u de klanturenstaat van Marc de Roon over juli 2026.\n\nMet vriendelijke groet,\n\nPath Backoffice\nPath Consultancy',
    });
    expect(sent.status).toBe(200);
    expect(sent.body.ok).toBe(true);
    expect(sent.body.customer_timesheet.status).toBe('sent_to_broker');
    expect(Number(sent.body.delivery_id)).toBeGreaterThan(0);

    const queueResponse = await request.get('/server/api/email-queue.php');
    expect(queueResponse.status()).toBe(200);
    const queue = await queueResponse.json();
    const delivery = queue.items.find((item: Record<string, unknown>) => Number(item.id) === Number(sent.body.delivery_id));
    expect(delivery).toBeTruthy();
    expect(delivery.channel).toBe('broker');
    expect(delivery.attachment_policy).toBe('customer_timesheet');
    expect(delivery.invoice_number).toBe('IND-2026-juli');
    expect(delivery.subject_snapshot).toBe('Klanturenstaat Marc de Roon – juli 2026 voor dossier');

    await authApi.logout();
  });

  test('[CTS-API-H-001] employee uploadt klanturenstaat, dient in en downloadt; admin kan goedkeuren en resubmit vragen', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    let period = '';
    let employeeId = 0;
    let assignmentId = 0;

    await test.step('Given de medewerker is ingelogd in auth-modus', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
    });

    await test.step('When de medewerker een concept uploadt en indient', async () => {
      period = await findWritablePeriod(customerApi);

      const draft = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'klanturenstaat.pdf',
          mimeType: 'application/pdf',
          buffer: TINY_PDF_BUFFER,
        },
      });

      expect(draft.status).toBe(200);
      expect(draft.body.ok).toBe(true);
      expect(draft.body.customer_timesheet.status).toBe('draft');

      const submit = await customerApi.write({
        action: 'submit',
        period,
      });

      expect(submit.status).toBe(200);
      expect(submit.body.ok).toBe(true);
      expect(submit.body.customer_timesheet.status).toBe('received');

      employeeId = Number(submit.body.employee_id || 0);
      assignmentId = Number(submit.body.assignment_id || 0);
      expect(employeeId).toBeGreaterThan(0);
      expect(assignmentId).toBeGreaterThan(0);
    });

    await test.step('Then de medewerker kan het ingediende document teruglezen en downloaden', async () => {
      const readBack = await customerApi.read(period);
      expect(readBack.status).toBe(200);
      expect(readBack.body.ok).toBe(true);
      expect(readBack.body.found).toBe(true);
      expect(readBack.body.customer_timesheet.status).toBe('received');

      const download = await customerApi.download(period);
      expect(download.status).toBe(200);
      expect(download.contentType).toContain('application/pdf');
      expect(download.body.byteLength).toBeGreaterThan(5);
    });

    await test.step('And cleanup: wissel naar administrator-context voor reviewstappen', async () => {
      await authApi.logout();
    });

    await test.step('Given de administrator is ingelogd voor reviewbesluiten', async () => {
      const adminLogin = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      expect(adminLogin.user.role).toBe('administrator');
    });

    await test.step('When de administrator approve en request_resubmit uitvoert', async () => {
      const approve = await customerApi.write({
        action: 'approve',
        period,
        employeeId,
        assignmentId,
      });
      expect(approve.status).toBe(200);
      expect(approve.body.ok).toBe(true);
      expect(approve.body.customer_timesheet.status).toBe('approved');

      const approveAgain = await customerApi.write({
        action: 'approve',
        period,
        employeeId,
        assignmentId,
      });
      expect(approveAgain.status).toBe(409);
      expect(approveAgain.body.ok).toBe(false);
      expect(approveAgain.body.error).toBe('invalid-customer-timesheet-transition');
      expect(approveAgain.body.message).toBe('Alleen een ingediende klanturenstaat kan worden goedgekeurd.');

      const resubmit = await customerApi.write({
        action: 'request_resubmit',
        period,
        employeeId,
        assignmentId,
        reviewNote: 'Upload graag de definitieve versie met handtekening.',
      });
      expect(resubmit.status).toBe(200);
      expect(resubmit.body.ok).toBe(true);
      expect(resubmit.body.customer_timesheet.status).toBe('resubmit');
      expect(String(resubmit.body.customer_timesheet.review_note || '')).toContain('definitieve versie');
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-N-006] employee kan geen klanturenstaat voor andere medewerker wijzigen', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    await test.step('Given de medewerker is ingelogd', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
    });

    await test.step('When de medewerker schrijft met een andere employee_id', async () => {
      const period = await findWritablePeriod(customerApi);
      const forbidden = await customerApi.write({
        action: 'save_draft',
        period,
        employeeId: 999999,
        file: {
          name: 'klanturenstaat.pdf',
          mimeType: 'application/pdf',
          buffer: TINY_PDF_BUFFER,
        },
      });

      expect(forbidden.status).toBe(403);
      expect(forbidden.body.ok).toBe(false);
      expect(forbidden.body.error).toBe('forbidden-employee-scope');
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-N-007] employee kan geen admin reviewactie uitvoeren op klanturenstaat', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    let period = '';
    let employeeId = 0;
    let assignmentId = 0;

    await test.step('Given de medewerker is ingelogd met een ingediende klanturenstaat', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');

      period = await findWritablePeriod(customerApi);

      const draft = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'klanturenstaat.pdf',
          mimeType: 'application/pdf',
          buffer: TINY_PDF_BUFFER,
        },
      });
      expect(draft.status).toBe(200);

      const submit = await customerApi.write({ action: 'submit', period });
      expect(submit.status).toBe(200);
      expect(submit.body.customer_timesheet.status).toBe('received');
      employeeId = Number(submit.body.employee_id || 0);
      assignmentId = Number(submit.body.assignment_id || 0);
      expect(employeeId).toBeGreaterThan(0);
      expect(assignmentId).toBeGreaterThan(0);
    });

    await test.step('When de medewerker approve probeert uit te voeren', async () => {
      const forbiddenApprove = await customerApi.write({
        action: 'approve',
        period,
        employeeId,
        assignmentId,
      });
      expect(forbiddenApprove.status).toBe(403);
      expect(forbiddenApprove.body.ok).toBe(false);
      expect(forbiddenApprove.body.error).toBe('forbidden-action');
    });

    await test.step('Then de medewerker ook geen request_resubmit mag uitvoeren', async () => {
      const forbiddenResubmit = await customerApi.write({
        action: 'request_resubmit',
        period,
        employeeId,
        assignmentId,
        reviewNote: 'Employee mag dit niet doen',
      });
      expect(forbiddenResubmit.status).toBe(403);
      expect(forbiddenResubmit.body.ok).toBe(false);
      expect(forbiddenResubmit.body.error).toBe('forbidden-action');
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-H-004] employee kan mark_skipped registreren en restore_missing terugdraaien', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    let period = '';

    await test.step('Given de medewerker is ingelogd in een lege maand zonder klanturenstaatrecord', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
      period = await findEmptyPeriod(customerApi);
      const initial = await customerApi.read(period);
      expect(initial.status).toBe(200);
      expect(initial.body.found).toBe(false);
    });

    await test.step('When de medewerker eerst zonder en daarna met reden rechtstreeks gemaild registreert', async () => {
      const invalid = await customerApi.write({ action: 'mark_skipped', period });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error).toBe('invalid-payload');

      const skipped = await customerApi.write({
        action: 'mark_skipped',
        period,
        reviewNote: 'Al rechtstreeks verstuurd buiten de app',
      });
      expect(skipped.status).toBe(200);
      expect(skipped.body.ok).toBe(true);
      expect(skipped.body.customer_timesheet.status).toBe('skipped');
      expect(skipped.body.customer_timesheet.review_note).toBe('Al rechtstreeks verstuurd buiten de app');
    });

    await test.step('Then readback de nieuwe rij toont en restore_missing terugzet naar missing', async () => {
      const readback = await customerApi.read(period);
      expect(readback.status).toBe(200);
      expect(readback.body.found).toBe(true);
      expect(readback.body.customer_timesheet.status).toBe('skipped');
      const restored = await customerApi.write({
        action: 'restore_missing',
        period,
      });
      expect(restored.status).toBe(200);
      expect(restored.body.ok).toBe(true);
      expect(restored.body.customer_timesheet.status).toBe('missing');
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-H-013] medewerker registreert rechtstreeks gemaild zichtbaar vanuit een lege actuele maand', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.clock.setFixedTime(new Date('2026-09-02T10:00:00.000Z'));

    await test.step('Given de medewerker in september start zonder klanturenstaatrecord', async () => {
      await loginPage.open();
      await loginPage.loginAsEmployee();
      const initialResponse = await page.request.get('/server/api/customer-timesheets.php?period=2026-09');
      const initial = await initialResponse.json();
      expect(initialResponse.status()).toBe(200);
      expect(initial.found).toBe(false);
      await expect(page.locator('#period-label')).toHaveText('September 2026');
      await expect(page.locator('#employee-customer-timesheet-title')).toHaveText('Klanturenstaat staat nog open');
      await expect(page.locator('#employee-customer-timesheet-skip')).toBeVisible();
    });

    await test.step('When de medewerker de zichtbare registratie met verplichte reden afrondt', async () => {
      await page.locator('#employee-customer-timesheet-skip').click();
      await expect(page.locator('#modal-title')).toContainText('September 2026');
      await expect(page.locator('#customer-timesheet-skip-reason')).toHaveValue('De klanturenstaat is al rechtstreeks naar Path Backoffice gemaild.');
      const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && /customer-timesheets\.php$/.test(response.url()));
      await page.locator('#modal-confirm').click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      await expect(page.locator('#toast')).toContainText('rechtstreeks gemaild geregistreerd');
      await expect(page.locator('#employee-customer-timesheet-title')).toHaveText('Als rechtstreeks gemaild geregistreerd');
      await expect(page.locator('#employee-customer-timesheet-skip')).toHaveText('Alsnog uploaden');
    });

    await test.step('Then serverreadback en F5 dezelfde status tonen en herstel opnieuw werkt', async () => {
      const readbackResponse = await page.request.get('/server/api/customer-timesheets.php?period=2026-09');
      const readback = await readbackResponse.json();
      expect(readback.found).toBe(true);
      expect(readback.customer_timesheet.status).toBe('skipped');

      await page.reload();
      await expect(page.locator('#app-shell')).toBeVisible();
      await expect(page.locator('#period-label')).toHaveText('September 2026');
      await expect(page.locator('#employee-customer-timesheet-title')).toHaveText('Als rechtstreeks gemaild geregistreerd');
      await expect(page.locator('#employee-customer-timesheet-status')).toHaveText('Al rechtstreeks gemaild');

      const restorePromise = page.waitForResponse(response => response.request().method() === 'POST' && /customer-timesheets\.php$/.test(response.url()));
      await page.locator('#employee-customer-timesheet-skip').click();
      const restored = await restorePromise;
      expect(restored.status()).toBe(200);
      await expect(page.locator('#employee-customer-timesheet-title')).toHaveText('Klanturenstaat staat nog open');
      const restoredBody = await restored.json();
      expect(restoredBody.customer_timesheet.status).toBe('missing');
      await loginPage.logout();
    });
  });

  test('[CTS-API-N-005] employee krijgt 400 bij ongeldig bestandstype', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    let period = '';

    await test.step('Given de medewerker is ingelogd', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
      period = await findWritablePeriod(customerApi);
    });

    await test.step('When de medewerker een tekstbestand uploadt als klanturenstaat', async () => {
      const invalidUpload = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'not-allowed.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('geen geldig type', 'utf8'),
        },
      });

      expect(invalidUpload.status).toBe(400);
      expect(invalidUpload.body.ok).toBe(false);
      expect(invalidUpload.body.error).toBe('invalid-upload');
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-H-005] JPG- en PNG-upload worden als inline bekijkbare PDF opgeslagen', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    // Minimal valid 4x4 JPEG, generated locally via PHP GD to guarantee a real, decodable image.
    const tinyJpegBase64 =
      '/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2ODApLCBxdWFsaXR5ID0gODUK/9sAQwAFAwQEBAMFBAQEBQUFBgcMCAcHBwcPCwsJDBEPEhIRDxERExYcFxMUGhURERghGBodHR8fHxMXIiQiHiQcHh8e/9sAQwEFBQUHBgcOCAgOHhQRFB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4e/8AAEQgABAAEAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A5WiiivmT9wP/2Q==';
    const tinyJpegBuffer = Buffer.from(tinyJpegBase64, 'base64');

    let period = '';

    await test.step('Given de medewerker is ingelogd', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
      period = await findWritablePeriod(customerApi);
    });

    await test.step('When de medewerker een JPG uploadt als concept-klanturenstaat', async () => {
      const draft = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'klanturenstaat-foto.jpg',
          mimeType: 'image/jpeg',
          buffer: tinyJpegBuffer,
        },
      });

      expect(draft.status).toBe(200);
      expect(draft.body.ok).toBe(true);
      expect(draft.body.customer_timesheet.status).toBe('draft');
    });

    await test.step('Then is de JPG als inline bekijkbare PDF met een PDF-bestandsnaam opgeslagen', async () => {
      const readBack = await customerApi.read(period);
      expect(readBack.status).toBe(200);
      expect(readBack.body.customer_timesheet.mime_type).toBe('application/pdf');
      expect(readBack.body.customer_timesheet.storage_key).toMatch(/\.pdf$/i);
      expect(readBack.body.customer_timesheet.stored_file_name).toMatch(/\.pdf$/i);

      const download = await customerApi.download(period);
      expect(download.status).toBe(200);
      expect(download.contentType).toContain('application/pdf');
      expect(download.contentDisposition).toMatch(/^inline;/i);
      expect(download.contentDisposition).toMatch(/filename="[^"]+\.pdf"/i);
      expect(download.contentDisposition).not.toMatch(/\.jpe?g"/i);
      expect(download.cacheControl).toContain('no-store');
      expect(download.contentTypeOptions).toBe('nosniff');
      expect(download.body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(download.body.subarray(-32).toString('latin1')).toContain('%%EOF');
    });

    await test.step('When de medewerker het concept vervangt door een PNG', async () => {
      const draft = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'klanturenstaat-scan.png',
          mimeType: 'image/png',
          buffer: TINY_PNG_BUFFER,
        },
      });

      expect(draft.status).toBe(200);
      expect(draft.body.ok).toBe(true);
      expect(draft.body.customer_timesheet.status).toBe('draft');
    });

    await test.step('Then is ook de PNG als inline bekijkbare PDF opgeslagen', async () => {
      const readBack = await customerApi.read(period);
      expect(readBack.status).toBe(200);
      expect(readBack.body.customer_timesheet.original_file_name).toBe('klanturenstaat-scan.png');
      expect(readBack.body.customer_timesheet.mime_type).toBe('application/pdf');
      expect(readBack.body.customer_timesheet.storage_key).toMatch(/\.pdf$/i);
      expect(readBack.body.customer_timesheet.stored_file_name).toMatch(/\.pdf$/i);

      const download = await customerApi.download(period);
      expect(download.status).toBe(200);
      expect(download.contentType).toContain('application/pdf');
      expect(download.contentDisposition).toMatch(/^inline;/i);
      expect(download.contentDisposition).toMatch(/filename="[^"]+\.pdf"/i);
      expect(download.contentDisposition).not.toMatch(/\.png"/i);
      expect(download.cacheControl).toContain('no-store');
      expect(download.contentTypeOptions).toBe('nosniff');
      expect(download.body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(download.body.subarray(-32).toString('latin1')).toContain('%%EOF');
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-H-006] medewerker uploadt zichtbaar een afbeelding en kan die na nieuwe login bekijken', async ({ page }) => {
    const authApi = new AuthApi(page.request);
    const customerApi = new CustomerTimesheetApi(page.request);
    const loginPage = new LoginPage(page);
    const period = '2199-12';
    const uploadName = 'klanturenstaat-opnieuw-inloggen.png';

    await test.step('Given de medewerker via de zichtbare upload een PNG als concept opslaat', async () => {
      await page.clock.setFixedTime(new Date('2199-12-15T12:00:00Z'));
      await loginPage.open();
      await loginPage.loginAsEmployee();
      await page.locator('#period-year-picker').fill('2199');
      await page.locator('#period-month-picker').click();
      await page.locator('[data-period-month="12"][data-month-control="#period-month-picker"]').click();
      await expect(page.locator('#period-picker')).toHaveValue(period);
      await page.locator('button[data-view="timesheet"]').click();
      await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);

      const uploadPanel = page.locator('#customer-timesheet-upload-panel');
      await expect(uploadPanel).toContainText('PDF blijft ongewijzigd; JPG en PNG worden automatisch als PDF opgeslagen.');
      await expect(uploadPanel.locator('label', { has: page.locator('#customer-timesheet-file') })).toContainText('PDF, JPG of PNG');
      await page.locator('#customer-timesheet-file').setInputFiles({
        name: uploadName,
        mimeType: 'image/png',
        buffer: TINY_PNG_BUFFER,
      });
      await expect(page.locator('#customer-timesheet-action-help')).toContainText('Bestand gekozen');
      await expect(page.locator('#customer-timesheet-save-draft')).toBeEnabled();
      await page.locator('#customer-timesheet-save-draft').click();
      await expect(page.locator('#toast')).toContainText('Concept opgeslagen');
      await expect(page.locator('#customer-timesheet-current')).toContainText(uploadName);
      await loginPage.logout();
    });

    await test.step('When dezelfde medewerker opnieuw inlogt en via de zichtbare maandkeuze dezelfde periode opent', async () => {
      await loginPage.loginAsEmployee();
      await page.locator('#period-year-picker').fill('2199');
      await page.locator('#period-month-picker').click();
      await page.locator('[data-period-month="12"][data-month-control="#period-month-picker"]').click();
      await expect(page.locator('#period-picker')).toHaveValue(period);
      await page.locator('button[data-view="timesheet"]').click();
      await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    });

    await test.step('Then verschijnt het serverdocument en levert Klanturenstaat bekijken een inline PDF-response', async () => {
      const currentDocument = page.locator('#customer-timesheet-current');
      await expect(currentDocument).toContainText(uploadName);
      await expect(currentDocument).toContainText('omgezet naar PDF');
      const viewButton = currentDocument.locator('[data-view-customer-timesheet]');
      await expect(viewButton).toBeVisible();
      await expect(viewButton).toHaveText('Klanturenstaat bekijken');
      await attachBusinessScreenshot(page, 'Klanturenstaat · Afbeeldingsupload zichtbaar na nieuwe login');

      const responsePromise = page.context().waitForEvent('response', {
        predicate: response => response.url().includes('/server/api/customer-timesheets.php?action=download')
          && response.url().includes('period=2199-12'),
      });
      await viewButton.click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type'] || '').toContain('application/pdf');
      expect(response.headers()['content-disposition'] || '').toMatch(/^inline;.*\.pdf"$/i);
      expect(response.headers()['cache-control'] || '').toContain('no-store');
      expect(response.headers()['x-content-type-options'] || '').toBe('nosniff');
    });

    await test.step('And cleanup: zet de geïsoleerde toekomstcase terug naar ontbrekend en log uit', async () => {
      const skipped = await customerApi.write({
        action: 'mark_skipped',
        period,
        reviewNote: 'Automatische testcleanup voor geïsoleerde toekomstperiode.',
      });
      expect(skipped.status).toBe(200);
      expect(skipped.body.customer_timesheet.status).toBe('skipped');
      const restored = await customerApi.write({ action: 'restore_missing', period });
      expect(restored.status).toBe(200);
      expect(restored.body.customer_timesheet.status).toBe('missing');
      await loginPage.logout();
    });
  });

  test('[CTS-API-N-008] employee krijgt 400 bij een te grote klanturenstaat-upload', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    let period = '';

    await test.step('Given de medewerker is ingelogd', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
      period = await findWritablePeriod(customerApi);
    });

    await test.step('When de medewerker een PDF van ruim boven de 2 MB-limiet uploadt', async () => {
      const oversizedBuffer = Buffer.concat([
        Buffer.from('%PDF-1.4\n% oversized test file\n', 'utf8'),
        Buffer.alloc(3 * 1024 * 1024, 0x41), // 3 MB of filler bytes, well over the 2 MB server-side limit
      ]);

      const oversizedUpload = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'te-groot-bestand.pdf',
          mimeType: 'application/pdf',
          buffer: oversizedBuffer,
        },
      });

      expect(oversizedUpload.status).toBe(400);
      expect(oversizedUpload.body.ok).toBe(false);
      expect(oversizedUpload.body.error).toBe('invalid-upload');
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-N-009] corrupte of te grote afbeelding en nep-PDF worden geweigerd zonder bestaand concept te vervangen', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    let period = '';
    let before: Awaited<ReturnType<CustomerTimesheetApi['read']>>;

    await test.step('Given de medewerker is ingelogd en de bestaande klanturenstaat is vastgelegd', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
      period = await findWritablePeriod(customerApi);
      before = await customerApi.read(period);
      expect(before.status).toBe(200);
    });

    await test.step('When de medewerker corrupte bytes met een JPG-bestandsnaam uploadt', async () => {
      const invalidUpload = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'corrupte-klanturenstaat.jpg',
          mimeType: 'image/jpeg',
          buffer: CORRUPT_JPEG_BUFFER,
        },
      });

      expect(invalidUpload.status).toBe(400);
      expect(invalidUpload.body.ok).toBe(false);
      expect(invalidUpload.body.error).toBe('invalid-upload');
    });

    await test.step('And een afbeelding boven de veilige dimensiegrens wordt geweigerd', async () => {
      const oversizedDimensions = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'te-brede-klanturenstaat.png',
          mimeType: 'image/png',
          buffer: OVERSIZED_DIMENSION_PNG_BUFFER,
        },
      });

      expect(oversizedDimensions.status).toBe(400);
      expect(oversizedDimensions.body.ok).toBe(false);
      expect(oversizedDimensions.body.error).toBe('invalid-upload');
    });

    await test.step('Then worden tekstbytes met alleen een PDF-bestandsnaam ook geweigerd', async () => {
      const disguisedPdf = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'geen-echte-klanturenstaat.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('dit is geen geldig PDF-bestand', 'utf8'),
        },
      });

      expect(disguisedPdf.status).toBe(400);
      expect(disguisedPdf.body.ok).toBe(false);
      expect(disguisedPdf.body.error).toBe('invalid-upload');
      expect(String(disguisedPdf.body.message || '')).toContain('PDF-bestand');
    });

    await test.step('Then blijft het bestaande document ongewijzigd', async () => {
      const after = await customerApi.read(period);
      expect(after.status).toBe(200);
      expect(after.body.found).toBe(before.body.found);
      expect(after.body.customer_timesheet?.storage_key || '').toBe(before.body.customer_timesheet?.storage_key || '');
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });
});

