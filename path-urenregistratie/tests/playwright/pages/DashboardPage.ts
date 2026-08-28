import { expect, type Page } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async assertAdminDashboardVisible(): Promise<void> {
    await expect(this.page.locator('#page-title')).toHaveText(/Dashboard|Urenoverzicht/);
    await expect(this.page.locator('button[data-view="approvals"]')).toBeVisible();
    await expect(this.page.locator('button[data-view="invoices"]')).toBeVisible();
  }

  async assertEmployeeDashboardVisible(): Promise<void> {
    await expect(this.page.locator('#employee-dashboard-next')).toBeVisible();
    await expect(this.page.locator('button[data-view="approvals"]')).toBeHidden();
    await expect(this.page.locator('button[data-view="announcements"]')).toBeHidden();
  }
}
