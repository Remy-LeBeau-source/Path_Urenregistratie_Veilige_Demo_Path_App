import { type APIRequestContext } from '@playwright/test';
import { appConfig } from '../fixtures/appConfig';
import { attachApiExchange } from '../reporting/apiAttachments';

type ListParams = { status?: 'queued' | 'sent' | 'failed'; limit?: number };

export class EmailQueueApi {
  constructor(private readonly request: APIRequestContext) {}

  async list(params: ListParams = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.limit)  qs.set('limit', String(params.limit));
    const url = `/server/api/email-queue.php${qs.toString() ? '?' + qs.toString() : ''}`;
    const response = await this.request.get(url);
    const body = await response.json();
    await attachApiExchange({ method: 'GET', endpoint: url, responseStatus: response.status(), responseBody: body });
    return { status: response.status(), body };
  }

  async enqueue(invoiceId: number) {
    const csrf = await this.request.get('/server/auth/csrf.php');
    const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
    const endpoint = '/server/api/email-queue.php';
    const requestBody = { action: 'enqueue', invoice_id: invoiceId };
    const response = await this.request.post(endpoint, {
      headers: { 'X-CSRF-Token': token },
      data: requestBody,
    });
    const body = await response.json();
    await attachApiExchange({ method: 'POST', endpoint, requestBody, responseStatus: response.status(), responseBody: body });
    return { status: response.status(), body };
  }

  async retry(deliveryId: number) {
    const csrf = await this.request.get('/server/auth/csrf.php');
    const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
    const endpoint = '/server/api/email-queue.php';
    const requestBody = { action: 'retry', delivery_id: deliveryId };
    const response = await this.request.post(endpoint, {
      headers: { 'X-CSRF-Token': token },
      data: requestBody,
    });
    const body = await response.json();
    await attachApiExchange({ method: 'POST', endpoint, requestBody, responseStatus: response.status(), responseBody: body });
    return { status: response.status(), body };
  }

  async enqueueWithoutSession(invoiceId: number) {
    const isolatedCtx = await (await import('@playwright/test')).request.newContext({ baseURL: appConfig.baseUrl });
    try {
      const csrf = await isolatedCtx.get('/server/auth/csrf.php');
      const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
      const endpoint = '/server/api/email-queue.php';
      const requestBody = { action: 'enqueue', invoice_id: invoiceId };
      const response = await isolatedCtx.post(endpoint, {
        headers: { 'X-CSRF-Token': token },
        data: requestBody,
      });
      const body = await response.json();
      await attachApiExchange({ method: 'POST', endpoint, requestBody, responseStatus: response.status(), responseBody: body });
      return { status: response.status(), body };
    } finally {
      await isolatedCtx.dispose();
    }
  }
}
