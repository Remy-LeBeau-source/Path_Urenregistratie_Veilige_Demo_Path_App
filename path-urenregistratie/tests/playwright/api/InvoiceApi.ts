import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { appConfig } from '../fixtures/appConfig';
import { attachApiExchange } from '../reporting/apiAttachments';

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
    const endpoint = `/server/api/invoices.php?period=${encodeURIComponent(period)}`;
    const response = await this.request.get(endpoint);
    const body = await response.json();
    await attachApiExchange({ method: 'GET', endpoint, responseStatus: response.status(), responseBody: body });
    return {
      status: response.status(),
      body,
    };
  }

  async downloadPdf(invoiceId: number) {
    const endpoint = `/server/api/invoices.php?action=download&invoice_id=${encodeURIComponent(String(invoiceId))}`;
    const response = await this.request.get(endpoint);
    const body = await response.body();
    await attachApiExchange({ method: 'GET', endpoint, responseStatus: response.status(), responseBody: body });
    return {
      status: response.status(),
      contentType: response.headers()['content-type'] || '',
      body,
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

    const endpoint = '/server/api/invoices.php';
    const requestBody = {
      action: payload.action,
      timesheet_id: payload.timesheetId,
      subtotal: payload.subtotal,
      vat_amount: payload.vatAmount,
      total: payload.total,
    };
    const response = await this.request.post(endpoint, {
      headers: { 'X-CSRF-Token': csrfToken },
      // Deze velden worden bewust meegegeven in tests om te bewijzen dat server-side berekening leidend is.
      data: requestBody,
    });
    const body = await response.json();
    await attachApiExchange({ method: 'POST', endpoint, requestBody, responseStatus: response.status(), responseBody: body });

    return {
      status: response.status(),
      body,
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

      const endpoint = '/server/api/invoices.php';
      const requestBody = {
        action: payload.action,
        timesheet_id: payload.timesheetId,
        subtotal: payload.subtotal,
        vat_amount: payload.vatAmount,
        total: payload.total,
      };
      const response = await isolated.post(endpoint, {
        headers: { 'X-CSRF-Token': csrfToken },
        data: requestBody,
      });
      const body = await response.json();
      await attachApiExchange({ method: 'POST', endpoint, requestBody, responseStatus: response.status(), responseBody: body });

      return {
        status: response.status(),
        body,
      };
    } finally {
      await isolated.dispose();
    }
  }
}
