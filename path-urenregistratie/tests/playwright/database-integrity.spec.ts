import { expect, test } from '@playwright/test';
import mysql from 'mysql2/promise';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

// De e2e-runner zet PATH_APP_DB_* / PLAYWRIGHT_DB_* voor de geïsoleerde
// testdatabase. Deze suite leest daar rechtstreeks uit -- puur SELECT, geen
// schrijfacties op de kerntabellen -- om te bewaken dat de app geen weesrijen of
// gebroken verwijzingen achterlaat.
function dbConfig() {
  const database = String(
    process.env.PATH_APP_DB_NAME || process.env.PLAYWRIGHT_DB_NAME || process.env.DB_NAME || '',
  ).trim();
  return {
    host: process.env.PATH_APP_DB_HOST || process.env.PLAYWRIGHT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.PATH_APP_DB_PORT || process.env.PLAYWRIGHT_DB_PORT || process.env.DB_PORT || 3306),
    user: process.env.PATH_APP_DB_USER || process.env.PLAYWRIGHT_DB_USER || process.env.DB_USER || 'root',
    password: process.env.PATH_APP_DB_PASSWORD || process.env.PLAYWRIGHT_DB_PASSWORD || process.env.DB_PASSWORD || 'root',
    database,
  };
}

async function withDb<T>(fn: (conn: mysql.Connection) => Promise<T>): Promise<T> {
  const cfg = dbConfig();
  expect(cfg.database.toLowerCase().endsWith('_test'), `databasenaam moet op _test eindigen, is "${cfg.database}"`).toBe(true);
  const conn = await mysql.createConnection(cfg);
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

async function countRows(conn: mysql.Connection, sql: string): Promise<number> {
  const [rows] = await conn.query(sql);
  return Number((rows as Array<Record<string, unknown>>)[0]?.aantal ?? 0);
}

test.describe('database integriteit', () => {
  // Elke child-verwijzing die in de app kan ontstaan, mag alleen naar een
  // bestaande parent wijzen. Een NULL is toegestaan waar de kolom dat toelaat.
  const wees = [
    ['time_entries → timesheets', 'SELECT COUNT(*) aantal FROM time_entries te LEFT JOIN timesheets t ON t.id = te.timesheet_id WHERE t.id IS NULL'],
    ['timesheet_corrections → timesheets', 'SELECT COUNT(*) aantal FROM timesheet_corrections c LEFT JOIN timesheets t ON t.id = c.timesheet_id WHERE t.id IS NULL'],
    ['timesheets → periods', 'SELECT COUNT(*) aantal FROM timesheets t LEFT JOIN periods p ON p.id = t.period_id WHERE p.id IS NULL'],
    ['timesheets → employees', 'SELECT COUNT(*) aantal FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id WHERE e.id IS NULL'],
    ['timesheets → assignments', 'SELECT COUNT(*) aantal FROM timesheets t LEFT JOIN assignments a ON a.id = t.assignment_id WHERE a.id IS NULL'],
    ['customer_timesheets → periods', 'SELECT COUNT(*) aantal FROM customer_timesheets ct LEFT JOIN periods p ON p.id = ct.period_id WHERE p.id IS NULL'],
    ['customer_timesheets → employees', 'SELECT COUNT(*) aantal FROM customer_timesheets ct LEFT JOIN employees e ON e.id = ct.employee_id WHERE e.id IS NULL'],
    ['customer_timesheets → assignments', 'SELECT COUNT(*) aantal FROM customer_timesheets ct LEFT JOIN assignments a ON a.id = ct.assignment_id WHERE a.id IS NULL'],
    ['invoices → timesheets', 'SELECT COUNT(*) aantal FROM invoices i LEFT JOIN timesheets t ON t.id = i.timesheet_id WHERE t.id IS NULL'],
    ['invoices → companies', 'SELECT COUNT(*) aantal FROM invoices i LEFT JOIN companies c ON c.id = i.company_id WHERE c.id IS NULL'],
    ['assignments → employees', 'SELECT COUNT(*) aantal FROM assignments a LEFT JOIN employees e ON e.id = a.employee_id WHERE e.id IS NULL'],
    ['assignment_mail_routes → assignments', 'SELECT COUNT(*) aantal FROM assignment_mail_routes r LEFT JOIN assignments a ON a.id = r.assignment_id WHERE a.id IS NULL'],
    ['assignment_mail_routes → mail_recipients', 'SELECT COUNT(*) aantal FROM assignment_mail_routes r LEFT JOIN mail_recipients m ON m.id = r.mail_recipient_id WHERE m.id IS NULL'],
    ['email_deliveries → users', 'SELECT COUNT(*) aantal FROM email_deliveries d LEFT JOIN users u ON u.id = d.user_id WHERE d.user_id IS NOT NULL AND u.id IS NULL'],
    ['announcement_recipients → announcements', 'SELECT COUNT(*) aantal FROM announcement_recipients ar LEFT JOIN announcements a ON a.id = ar.announcement_id WHERE a.id IS NULL'],
    ['announcement_recipients → users', 'SELECT COUNT(*) aantal FROM announcement_recipients ar LEFT JOIN users u ON u.id = ar.user_id WHERE u.id IS NULL'],
    ['employees → users', 'SELECT COUNT(*) aantal FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.user_id IS NOT NULL AND u.id IS NULL'],
  ] as const;

  test('[DB-H-002] geen enkele kerntabel bevat een weesverwijzing', async () => {
    await withDb(async conn => {
      for (const [label, sql] of wees) {
        const aantal = await countRows(conn, sql);
        expect(aantal, `${label}: ${aantal} weesrij(en)`).toBe(0);
      }
    });
  });

  test('[DB-H-003] de afhankelijke tabellen hebben de beloofde ON DELETE CASCADE', async () => {
    await withDb(async conn => {
      const [rows] = await conn.query(
        `SELECT rc.TABLE_NAME AS child, rc.REFERENCED_TABLE_NAME AS parent, rc.DELETE_RULE AS regel
         FROM information_schema.REFERENTIAL_CONSTRAINTS rc
         WHERE rc.CONSTRAINT_SCHEMA = DATABASE()`,
      );
      const regels = new Map(
        (rows as Array<{ child: string; parent: string; regel: string }>).map(r => [`${r.child}->${r.parent}`, r.regel]),
      );
      // Deze drie horen mee te verdwijnen met hun ouder; anders blijven er
      // regels of dagregels achter bij het verwijderen van een urenstaat/opdracht.
      expect(regels.get('time_entries->timesheets')).toBe('CASCADE');
      expect(regels.get('timesheet_corrections->timesheets')).toBe('CASCADE');
      expect(regels.get('assignment_mail_routes->assignments')).toBe('CASCADE');
      // En een factuur mag juist NIET stil met de urenstaat verdwijnen.
      expect(regels.get('invoices->timesheets')).not.toBe('CASCADE');
    });
  });

  test('[DB-N-005] een verwijderde medewerker zonder historie laat geen weesrijen achter', async ({ request }) => {
    const authApi = new AuthApi(request);
    const suffix = Date.now().toString().slice(-7);
    const email = `db-wees-${suffix}@example.invalid`;
    let userId = 0;

    await test.step('Given een net aangemaakte medewerker met opdracht en mailroute', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const csrf = await request.get('/server/auth/csrf.php');
      const token = String((await csrf.json()).csrf_token || '');
      const created = await request.post('/server/api/staff.php', {
        headers: { 'X-CSRF-Token': token },
        data: {
          action: 'upsert_employee', sendInvitation: false,
          employee: {
            name: `DB Weestest ${suffix}`, email, role: 'Consultant', startDate: '2026-08-01', active: true,
            client: 'Weesklant', broker: 'Weesbroker', brokerEmail: 'broker@example.invalid', projectCode: `WEES-${suffix}`,
          },
          mailRecipients: [],
        },
      });
      const body = await created.json();
      expect(created.status(), JSON.stringify(body)).toBe(200);
      userId = Number(body.user_id);
      expect(userId).toBeGreaterThan(0);
    });

    await test.step('When de beheerder de medewerker deactiveert en definitief verwijdert', async () => {
      const post = async (data: Record<string, unknown>) => {
        const csrf = await request.get('/server/auth/csrf.php');
        const token = String((await csrf.json()).csrf_token || '');
        return request.post('/server/api/users.php', { headers: { 'X-CSRF-Token': token }, data });
      };
      expect((await post({ action: 'deactivate', user_id: userId })).status()).toBe(200);
      const del = await post({ action: 'delete', user_id: userId });
      expect(del.status(), JSON.stringify(await del.json())).toBe(200);
    });

    await test.step('Then bestaat er geen enkele rij meer die naar die medewerker verwijst', async () => {
      await withDb(async conn => {
        const [urows] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
        expect((urows as unknown[]).length, 'de gebruikersrij hoort weg te zijn').toBe(0);
        for (const [label, sql] of wees) {
          const aantal = await countRows(conn, sql);
          expect(aantal, `${label}: ${aantal} weesrij(en) na verwijderen`).toBe(0);
        }
      });
      // En het verwijderen staat in het auditlog.
      const audit = await request.get('/server/api/audit-log.php?entity_type=user');
      const auditBody = await audit.json();
      expect(auditBody.items.some((row: { event_type: string; entity_id: string }) =>
        row.event_type === 'user.deleted_without_history' && Number(row.entity_id) === userId)).toBe(true);
      await authApi.logout();
    });
  });

  // DB-H-003 controleert alleen de information_schema-metadata (staat de regel
  // er als tekst?), niet dat de database die regel ook echt uitvoert. Dit
  // verwijdert rechtstreeks in de database, buiten de app om, en bewijst dat
  // de kindrijen daadwerkelijk verdwijnen -- puur op naam van de constraint zelf,
  // niet door opruimcode van de app (de app ruimt zelf al netjes op, zie
  // DB-N-005, maar dat bewijst niets over de database-CASCADE zelf).
  test('[DB-H-004] het rechtstreeks verwijderen van een urenstaat of opdracht in de database neemt de kindrijen echt mee (ON DELETE CASCADE, niet alleen de metadata)', async ({ request }) => {
    const authApi = new AuthApi(request);
    const suffix = Date.now().toString().slice(-7);
    const email = `db-cascade-${suffix}@example.invalid`;
    let userId = 0;
    let assignmentId = 0;
    let timesheetId = 0;

    await test.step('Given een geïsoleerde medewerker met opdracht, een urenstaat met een dagregel/correctie, en een mailroute op de opdracht', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const post = async (path: string, data: Record<string, unknown>) => {
        const csrf = await request.get('/server/auth/csrf.php');
        const token = String((await csrf.json()).csrf_token || '');
        return request.post(path, { headers: { 'X-CSRF-Token': token }, data });
      };
      const created = await post('/server/api/staff.php', {
        action: 'upsert_employee', sendInvitation: false,
        employee: {
          name: `DB Cascade ${suffix}`, email, role: 'Consultant', startDate: '2026-08-01', active: true,
          client: 'Cascadeklant', broker: 'Cascadebroker', brokerEmail: 'broker@example.invalid', projectCode: `CASC-${suffix}`,
        },
        mailRecipients: [],
      });
      const body = await created.json();
      expect(created.status(), JSON.stringify(body)).toBe(200);
      userId = Number(body.user_id);
      expect(userId).toBeGreaterThan(0);

      await withDb(async conn => {
        const [empRows] = await conn.query('SELECT id, company_id FROM employees WHERE user_id = ?', [userId]);
        const employee = (empRows as Array<{ id: number; company_id: number }>)[0];
        const [assignRows] = await conn.query('SELECT id FROM assignments WHERE employee_id = ? ORDER BY id DESC LIMIT 1', [employee.id]);
        assignmentId = Number((assignRows as Array<{ id: number }>)[0]?.id || 0);
        expect(assignmentId).toBeGreaterThan(0);

        const year = 3000 + (Date.now() % 900);
        const [periodResult] = await conn.query(
          'INSERT INTO periods (company_id, year, month, status) VALUES (?, ?, ?, "open")',
          [employee.company_id, year, 1],
        );
        const periodId = (periodResult as mysql.ResultSetHeader).insertId;

        const [tsResult] = await conn.query(
          'INSERT INTO timesheets (period_id, employee_id, assignment_id, status) VALUES (?, ?, ?, "draft")',
          [periodId, employee.id, assignmentId],
        );
        timesheetId = (tsResult as mysql.ResultSetHeader).insertId;

        await conn.query(
          'INSERT INTO time_entries (timesheet_id, work_date, entry_type, hours) VALUES (?, ?, "billable", 8)',
          [timesheetId, `${year}-01-06`],
        );
        await conn.query(
          'INSERT INTO timesheet_corrections (timesheet_id, requested_by, correction_message) VALUES (?, ?, ?)',
          [timesheetId, userId, 'Cascadetest'],
        );

        const [recipientResult] = await conn.query(
          'INSERT INTO mail_recipients (company_id, recipient_category, display_name, email) VALUES (?, "other", ?, ?)',
          [employee.company_id, `Cascade ontvanger ${suffix}`, `cascade-ontvanger-${suffix}@example.invalid`],
        );
        const recipientId = (recipientResult as mysql.ResultSetHeader).insertId;
        await conn.query(
          'INSERT INTO assignment_mail_routes (assignment_id, mail_recipient_id, enabled) VALUES (?, ?, 1)',
          [assignmentId, recipientId],
        );

        const [checkRows] = await conn.query(
          `SELECT
            (SELECT COUNT(*) FROM time_entries WHERE timesheet_id = ?) AS entries,
            (SELECT COUNT(*) FROM timesheet_corrections WHERE timesheet_id = ?) AS corrections,
            (SELECT COUNT(*) FROM assignment_mail_routes WHERE assignment_id = ?) AS routes`,
          [timesheetId, timesheetId, assignmentId],
        );
        const check = (checkRows as Array<{ entries: number; corrections: number; routes: number }>)[0];
        expect(Number(check.entries), 'de dagregel moet er staan vóór de proef').toBe(1);
        expect(Number(check.corrections), 'de correctie moet er staan vóór de proef').toBe(1);
        expect(Number(check.routes), 'de mailroute moet er staan vóór de proef').toBe(1);
      });
    });

    await test.step('When de urenstaat rechtstreeks in de database wordt verwijderd, buiten de app om', async () => {
      await withDb(async conn => {
        await conn.query('DELETE FROM timesheets WHERE id = ?', [timesheetId]);
      });
    });

    await test.step('Then heeft de database zelf de dagregel en de correctie meegenomen', async () => {
      await withDb(async conn => {
        const [rows] = await conn.query(
          `SELECT
            (SELECT COUNT(*) FROM time_entries WHERE timesheet_id = ?) AS entries,
            (SELECT COUNT(*) FROM timesheet_corrections WHERE timesheet_id = ?) AS corrections`,
          [timesheetId, timesheetId],
        );
        const row = (rows as Array<{ entries: number; corrections: number }>)[0];
        expect(Number(row.entries), 'time_entries hoort door ON DELETE CASCADE mee te zijn verdwenen').toBe(0);
        expect(Number(row.corrections), 'timesheet_corrections hoort door ON DELETE CASCADE mee te zijn verdwenen').toBe(0);
      });
    });

    await test.step('And heeft het rechtstreeks verwijderen van de opdracht ook de mailroute meegenomen', async () => {
      await withDb(async conn => {
        await conn.query('DELETE FROM assignments WHERE id = ?', [assignmentId]);
        const [rows] = await conn.query('SELECT COUNT(*) AS aantal FROM assignment_mail_routes WHERE assignment_id = ?', [assignmentId]);
        expect(Number((rows as Array<{ aantal: number }>)[0]?.aantal || 0), 'assignment_mail_routes hoort door ON DELETE CASCADE mee te zijn verdwenen').toBe(0);
      });
    });

    await test.step('Cleanup: de wegwerpmedewerker deactiveren en verwijderen', async () => {
      const post = async (data: Record<string, unknown>) => {
        const csrf = await request.get('/server/auth/csrf.php');
        const token = String((await csrf.json()).csrf_token || '');
        return request.post('/server/api/users.php', { headers: { 'X-CSRF-Token': token }, data });
      };
      await post({ action: 'deactivate', user_id: userId });
      const del = await post({ action: 'delete', user_id: userId });
      expect.soft(del.status(), 'opruimen: de wegwerpmedewerker hoort verwijderd te kunnen worden').toBe(200);
      await authApi.logout();
    });
  });
});
