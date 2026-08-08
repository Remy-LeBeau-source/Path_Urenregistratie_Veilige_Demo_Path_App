import { expect, type APIRequestContext } from '@playwright/test';

export class AuthApi {
  constructor(private readonly request: APIRequestContext) {}

  async login(email: string, password: string) {
    const response = await this.request.post('/server/auth/login.php', {
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
    const response = await this.request.post('/server/auth/logout.php');
    expect(response.ok()).toBeTruthy();
    return response.json();
  }
}
