import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { appConfig } from '../fixtures/appConfig';

type LockPayload = {
  action: 'lock';
  timesheetId: number;
  subtotal?: number;
  vatAmount?: number;
  total?: number;
};

export class InvoiceApi {
  constructor(private readonly request: APIRequestContext) {}

  async readByPeriod(period: string) {
    const response = await this.request.get(`/server/api/invoices.php?period=${encodeURIComponent(period)}`);
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async lock(payload: LockPayload) {
    const csrfResponse = await this.request.get('/server/auth/csrf.php');
    if (!csrfResponse.ok()) {
      throw new Error(`[InvoiceApi] CSRF token ophalen mislukt (HTTP ${csrfResponse.status()}) voor lock.`);
    }
    const csrfBody = await csrfResponse.json();
    const csrfToken = String((csrfBody && csrfBody.csrf_token) || '').trim();
    if (!csrfToken) {
      throw new Error('[InvoiceApi] CSRF token ontbreekt voor lock.');
    }

    const response = await this.request.post('/server/api/invoices.php', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {
        action: payload.action,
        timesheet_id: payload.timesheetId,
        // Deze velden worden bewust meegegeven in tests om te bewijzen dat server-side berekening leidend is.
        subtotal: payload.subtotal,
        vat_amount: payload.vatAmount,
        total: payload.total,
      },
    });

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async lockWithoutSession(payload: LockPayload) {
    const isolated = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    try {
      const csrfResponse = await isolated.get('/server/auth/csrf.php');
      if (!csrfResponse.ok()) {
        throw new Error(`[InvoiceApi] CSRF token ophalen zonder sessie mislukt (HTTP ${csrfResponse.status()}).`);
      }
      const csrfBody = await csrfResponse.json();
      const csrfToken = String((csrfBody && csrfBody.csrf_token) || '').trim();
      if (!csrfToken) {
        throw new Error('[InvoiceApi] CSRF token ontbreekt in anonieme context.');
      }

      const response = await isolated.post('/server/api/invoices.php', {
        headers: { 'X-CSRF-Token': csrfToken },
        data: {
          action: payload.action,
          timesheet_id: payload.timesheetId,
          subtotal: payload.subtotal,
          vat_amount: payload.vatAmount,
          total: payload.total,
        },
      });

      return {
        status: response.status(),
        body: await response.json(),
      };
    } finally {
      await isolated.dispose();
    }
  }
}
