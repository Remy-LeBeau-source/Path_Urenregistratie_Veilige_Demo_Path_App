import { expect, type Page } from '@playwright/test';
import { appConfig, requirePassword } from '../fixtures/appConfig';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto(appConfig.baseUrl);
    await this.waitForAuthModeReady();
    // waitForAuthModeReady() only checks that the auth backend answered, not
    // who it says is logged in. Under heavy load a session from a step just
    // before this one can still resolve as valid for a moment, auto-logging
    // the browser straight back into the app shell instead of the login
    // screen -- login() then fails confusingly deep inside itself. Assert the
    // actual destination here, with room for a slow-but-correct check.
    await expect(this.page.locator('#login-screen')).toBeVisible({ timeout: 15_000 });
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
    // The app's logout() is async (requestAuthLogout → .finally → logoutLocal).
    // Wait explicitly for the login screen to appear before returning.
    await expect(this.page.locator('#login-screen')).toBeVisible({ timeout: 15_000 });
    await expect(this.page.locator('#auth-login-submit')).toBeVisible({ timeout: 15_000 });
  }

  async assertLoggedOut(): Promise<void> {
    await expect(this.page.locator('#login-screen')).toBeVisible();
    await expect(this.page.locator('#auth-login-submit')).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
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
    }, undefined, { timeout: 12_000 });

    const result = await outcome.jsonValue() as { type: 'success' | 'error'; message: string };
    if (result.type === 'error') {
      throw new Error('Login faalde: ' + (result.message || 'Onbekende loginfout'));
    }
  }

  private async waitForAuthModeReady(): Promise<void> {
    const indicator = this.page.locator('#auth-mode-indicator');
    const submit = this.page.locator('#auth-login-submit');

    // Klaar zijn betekent: je kunt inloggen. Dat is de knop, niet het tekstje
    // ernaast. Hier stond eerst een eis dat de indicator zichtbaar moest zijn
    // voordat er verder werd gekeken, en die viel af en toe om op een trage
    // machine -- terwijl het inlogscherm gewoon werkte. Een test die omvalt zonder
    // dat er iets mis is, kost je het vertrouwen in de hele suite.
    await expect(submit).toBeEnabled({ timeout: 20_000 });

    // De indicator wordt daarna nog wel nagelopen, want hij vertelt in welke modus
    // je zit -- en op productie mag daar nooit "Lokale demo-modus" staan. Alleen de
    // volgorde is omgedraaid: eerst werkt het, dan pas wat het erover zegt.
    await expect(indicator).toContainText(
      /Auth-modus actief|Lokale demo-modus actief|Controle van auth-sessie wordt uitgevoerd\./,
      { timeout: 10_000 }
    );
  }
}
