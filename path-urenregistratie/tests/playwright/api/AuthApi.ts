import { expect, type APIRequestContext } from '@playwright/test';

export class AuthApi {
  constructor(private readonly request: APIRequestContext) {}

  async csrfToken() {
    const response = await this.request.get('/server/auth/csrf.php');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.csrf_token).toBeTruthy();
    return body.csrf_token as string;
  }

  async login(email: string, password: string) {
    const csrfToken = await this.csrfToken();
    const response = await this.request.post('/server/auth/login.php', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: { email, password },
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
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
    expect(response.ok()).toBeTruthy();
    return response.json();
  }
}
