import { expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { appConfig, requirePassword } from './appConfig';

// Ruimt accounts op die een case heeft aangemaakt en actief heeft laten staan.
//
// Vóór de case wordt vastgelegd welke accounts actief zijn; na de case wordt elk
// account dat er actief bij is gekomen via Teambeheer gedeactiveerd (users.php).
// De app telt een medewerker met een gedeactiveerd account ook als inactief.
//
// Waarom: admin-writes.spec maakte in een reeks cases medewerkers en beheerders
// aan zonder op te ruimen. Elke latere beheerderslogin haalde voor die
// medewerkers alle maanden op, zodat specs die direct daarna draaiden trager
// werden (EQ-H-020 zag zijn melding pas na 5 seconden; TW-1, 19 sep).
//
// Een mislukte opruiming is een zachte fout: de case wordt rood, maar de
// oorspronkelijke uitkomst van de case blijft zichtbaar.

type Json = Record<string, unknown>;

async function beheerContext(): Promise<APIRequestContext> {
  const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
  const csrf = await (await ctx.get('/server/auth/csrf.php')).json() as Json;
  const login = await ctx.post('/server/auth/login.php', {
    headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') },
    data: { email: appConfig.adminEmail, password: requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD') },
  });
  if (!login.ok()) {
    await ctx.dispose();
    throw new Error(`opruimen: Backoffice kon niet inloggen (HTTP ${login.status()})`);
  }
  return ctx;
}

async function actieveAccounts(ctx: APIRequestContext): Promise<Json[]> {
  const bootstrap = await (await ctx.get('/server/api/bootstrap.php')).json() as Json;
  return ((bootstrap.users as Json[]) || []).filter(user => Number(user.active) === 1);
}

export async function actieveAccountIds(): Promise<Set<number>> {
  const ctx = await beheerContext();
  try {
    return new Set((await actieveAccounts(ctx)).map(user => Number(user.id)));
  } finally {
    await ctx.dispose();
  }
}

export async function deactiveerNieuweAccounts(vooraf: Set<number>): Promise<void> {
  const ctx = await beheerContext();
  try {
    const nieuw = (await actieveAccounts(ctx)).filter(user => !vooraf.has(Number(user.id)));
    for (const user of nieuw) {
      const csrf = await (await ctx.get('/server/auth/csrf.php')).json() as Json;
      const res = await ctx.post('/server/api/users.php', {
        headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') },
        data: { action: 'deactivate', user_id: Number(user.id) },
      });
      expect.soft(res.status(), `opruimen: account ${String(user.id)} (${String(user.role)}) hoort gedeactiveerd te worden`).toBe(200);
    }
  } finally {
    await ctx.dispose();
  }
}
