import type { APIRequestContext } from '@playwright/test';

export class AuthApi {
  constructor(private readonly request: APIRequestContext) {}

  async csrfToken() {
    const response = await this.request.get('/server/auth/csrf.php');
    if (!response.ok()) {
      throw new Error(`[AuthApi] CSRF token ophalen mislukt (HTTP ${response.status()}). Nodig voor write/logout calls.`);
    }
    const body = await response.json();
    const token = String(body && body.csrf_token || '').trim();
    if (!token) {
      throw new Error('[AuthApi] CSRF endpoint gaf geen csrf_token terug.');
    }
    return token;
  }

  async login(email: string, password: string) {
    const csrfToken = await this.csrfToken();
    const response = await this.request.post('/server/auth/login.php', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: { email, password },
    });
    const body = await response.json();
    if (!response.ok()) {
      const message = String(body && body.message || body && body.error || 'onbekende loginfout');
      throw new Error(`[AuthApi] Login mislukt voor ${email} (HTTP ${response.status()}): ${message}`);
    }
    return body;
  }

  async me() {
    const response = await this.request.get('/server/auth/me.php');
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async logout() {
    const csrfToken = await this.csrfToken();
    const response = await this.request.post('/server/auth/logout.php', {
      headers: { 'X-CSRF-Token': csrfToken },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok()) {
      const message = String(body && body.message || body && body.error || 'onbekende logoutfout');
      throw new Error(`[AuthApi] Logout mislukt (HTTP ${response.status()}): ${message}`);
    }
    return body;
  }
}
