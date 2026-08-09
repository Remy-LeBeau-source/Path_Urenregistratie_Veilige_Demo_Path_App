import type { APIRequestContext } from '@playwright/test';

export class ReadApi {
  constructor(private readonly request: APIRequestContext) {}

  private async readJson(path: string) {
    const response = await this.request.get(path);
    if (!response.ok()) {
      throw new Error(`[ReadApi] GET ${path} mislukt met HTTP ${response.status()}.`);
    }
    return response.json();
  }

  async bootstrap() {
    return this.readJson('/server/api/bootstrap.php');
  }

  async dashboard() {
    return this.readJson('/server/api/dashboard.php');
  }

  async invoices() {
    return this.readJson('/server/api/invoices.php');
  }

  async invoicesByPeriod(period: string) {
    return this.readJson(`/server/api/invoices.php?period=${period}`);
  }
}
