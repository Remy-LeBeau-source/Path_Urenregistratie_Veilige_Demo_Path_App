import { expect, type Page } from '@playwright/test';
import { appConfig, requirePassword } from '../fixtures/appConfig';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto(appConfig.baseUrl);
    await this.waitForAuthModeReady();
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
    await this.waitForAuthModeReady();
    await expect(this.page.locator('#auth-login-submit')).toBeEnabled();
    await this.page.locator('#auth-login-email').fill(email);
    await this.page.locator('#auth-login-password').fill(password);
    await this.page.locator('#auth-login-submit').click();

    const outcome = await this.page.waitForFunction(() => {
      const shell = document.querySelector('#app-shell');
      if (shell && !shell.hasAttribute('hidden')) return { type: 'success', message: '' };

      const submit = document.querySelector('#auth-login-submit');
      const feedback = document.querySelector('#auth-login-feedback');
      const submitEnabled = Boolean(submit && !submit.hasAttribute('disabled'));
      const message = String(feedback?.textContent || '').trim();
      if (submitEnabled && message && message !== 'Inloggen...') {
        return { type: 'error', message };
      }

      return null;
    }, { timeout: 12_000 });

    const result = await outcome.jsonValue() as { type: 'success' | 'error'; message: string };
    if (result.type === 'error') {
      throw new Error('Login faalde: ' + (result.message || 'Onbekende loginfout'));
    }
  }

  private async waitForAuthModeReady(): Promise<void> {
    const indicator = this.page.locator('#auth-mode-indicator');
    await expect(indicator).toBeVisible({ timeout: 10_000 });
    await expect(indicator).not.toHaveText(/Controle van auth-sessie wordt uitgevoerd\./, { timeout: 12_000 });
    await expect(indicator).toContainText(/Auth-modus actief|Lokale demo-modus actief/, { timeout: 5_000 });
  }
}
