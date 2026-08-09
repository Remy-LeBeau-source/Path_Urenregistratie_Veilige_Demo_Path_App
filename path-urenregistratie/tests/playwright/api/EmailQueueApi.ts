import { type APIRequestContext } from '@playwright/test';
import { appConfig } from '../fixtures/appConfig';

type ListParams = { status?: 'queued' | 'sent' | 'failed'; limit?: number };

export class EmailQueueApi {
  constructor(private readonly request: APIRequestContext) {}

  async list(params: ListParams = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.limit)  qs.set('limit', String(params.limit));
    const url = `/server/api/email-queue.php${qs.toString() ? '?' + qs.toString() : ''}`;
    const response = await this.request.get(url);
    return { status: response.status(), body: await response.json() };
  }

  async enqueue(invoiceId: number) {
    const csrf = await this.request.get('/server/auth/csrf.php');
    const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
    const response = await this.request.post('/server/api/email-queue.php', {
      headers: { 'X-CSRF-Token': token },
      data: { action: 'enqueue', invoice_id: invoiceId },
    });
    return { status: response.status(), body: await response.json() };
  }

  async retry(deliveryId: number) {
    const csrf = await this.request.get('/server/auth/csrf.php');
    const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
    const response = await this.request.post('/server/api/email-queue.php', {
      headers: { 'X-CSRF-Token': token },
      data: { action: 'retry', delivery_id: deliveryId },
    });
    return { status: response.status(), body: await response.json() };
  }

  async enqueueWithoutSession(invoiceId: number) {
    const isolatedCtx = await (await import('@playwright/test')).request.newContext({ baseURL: appConfig.baseUrl });
    try {
      const csrf = await isolatedCtx.get('/server/auth/csrf.php');
      const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
      const response = await isolatedCtx.post('/server/api/email-queue.php', {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'enqueue', invoice_id: invoiceId },
      });
      return { status: response.status(), body: await response.json() };
    } finally {
      await isolatedCtx.dispose();
    }
  }
}
