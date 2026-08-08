import { expect, type APIRequestContext } from '@playwright/test';

export class ReadApi {
  constructor(private readonly request: APIRequestContext) {}

  async bootstrap() {
    const response = await this.request.get('/server/api/bootstrap.php');
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async dashboard() {
    const response = await this.request.get('/server/api/dashboard.php');
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async invoices() {
    const response = await this.request.get('/server/api/invoices.php');
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async invoicesByPeriod(period: string) {
    const response = await this.request.get(`/server/api/invoices.php?period=${period}`);
    expect(response.ok()).toBeTruthy();
    return response.json();
  }
}
