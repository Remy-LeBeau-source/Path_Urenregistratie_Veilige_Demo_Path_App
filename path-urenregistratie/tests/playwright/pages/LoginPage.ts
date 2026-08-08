import { expect, type Page } from '@playwright/test';
import { appConfig, requirePassword } from '../fixtures/appConfig';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto(appConfig.baseUrl);
  }

  async loginAsAdmin(): Promise<void> {
    await this.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  }

  async loginAsEmployee(): Promise<void> {
    await this.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
  }

  async logout(): Promise<void> {
    const desktop = this.page.locator('#switch-role');
    const mobile = this.page.locator('#mobile-switch-role');

    if (await desktop.isVisible()) {
      await desktop.click();
    } else if (await mobile.isVisible()) {
      await mobile.click();
    } else {
      throw new Error('Geen zichtbare logout/switch-role knop gevonden.');
    }
  }

  async assertLoggedOut(): Promise<void> {
    await expect(this.page.locator('#login-screen')).toBeVisible();
    await expect(this.page.locator('#auth-login-submit')).toBeVisible();
  }

  private async login(email: string, password: string): Promise<void> {
    await expect(this.page.locator('#login-screen')).toBeVisible();
    await this.page.locator('#auth-login-email').fill(email);
    await this.page.locator('#auth-login-password').fill(password);
    await this.page.locator('#auth-login-submit').click();
    await expect(this.page.locator('#app-shell')).toBeVisible();
  }
}
