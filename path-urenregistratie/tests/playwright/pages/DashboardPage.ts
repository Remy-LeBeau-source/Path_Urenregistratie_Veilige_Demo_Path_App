import { expect, type Page } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async assertAdminDashboardVisible(): Promise<void> {
    await expect(this.page.locator('#page-title')).toHaveText(/Dashboard|Urenoverzicht/);
    await expect(this.page.locator('button[data-view="approvals"]')).toBeVisible();
    await expect(this.page.locator('button[data-view="invoices"]')).toBeVisible();
  }

  async assertEmployeeDashboardVisible(): Promise<void> {
    // De begroeting staat op desktop in Klassiek in Vandaag (#vd-kop-label,
    // referentie medewerker-gui.html) en elders nog in de oude hero. Welke van de
    // twee zichtbaar is hangt af van skin en breedte; er hoort er altijd één te zijn.
    await expect(this.page.locator('#vd-kop-label:visible, #employee-dashboard-greeting:visible').first()).toHaveText(/^Goede(morgen|middag|navond)/);
    await expect(this.page.locator('button[data-view="approvals"]')).toBeHidden();
    await expect(this.page.locator('button[data-view="announcements"]')).toBeHidden();
  }
}
