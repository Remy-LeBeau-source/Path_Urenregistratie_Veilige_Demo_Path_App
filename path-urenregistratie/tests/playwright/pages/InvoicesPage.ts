import { expect, type Page } from '@playwright/test';

export class InvoicesPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.locator('button[data-view="invoices"]').click();
    await expect(this.page.locator('#page-title')).toHaveText('Facturen');
  }

  async assertRowsVisible(): Promise<void> {
    const detailToggle = this.page.locator('#invoice-detail-toggle');
    const rows = this.page.locator('#invoice-rows tr');
    if (await detailToggle.isVisible()) {
      const expanded = await detailToggle.getAttribute('aria-expanded');
      if (expanded !== 'true') {
        await detailToggle.click();
      }
    }
    await expect(rows.first()).toBeVisible();
  }

  async selectPeriod(period: string): Promise<void> {
    await this.page.locator(`[data-invoice-overview-period="${period}"]`).click();
    const detailToggle = this.page.locator('#invoice-detail-toggle');
    if (await detailToggle.isVisible()) {
      const expanded = await detailToggle.getAttribute('aria-expanded');
      if (expanded !== 'true') {
        await detailToggle.click();
      }
    }
    await expect(this.page.locator('#month-batch-label')).toContainText(period === '2026-07' ? 'Juli 2026' : 'Augustus 2026');
  }
}
