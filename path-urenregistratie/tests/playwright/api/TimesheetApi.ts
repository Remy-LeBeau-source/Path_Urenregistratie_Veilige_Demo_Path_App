import { expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { appConfig } from '../fixtures/appConfig';

type WriteAction = 'save_draft' | 'submit';

type DayEntry = {
  workDate: string;
  hours: number;
  description?: string;
};

type WritePayload = {
  action: WriteAction;
  period: string;
  employeeId?: number;
  contractualHours: number;
  billableHours: number;
  leaveHours?: number;
  sicknessHours?: number;
  dayEntries: DayEntry[];
};

export class TimesheetApi {
  constructor(private readonly request: APIRequestContext) {}

  private toServerPayload(payload: WritePayload) {
    return {
      action: payload.action,
      period: payload.period,
      employee_id: payload.employeeId,
      contractual_hours: payload.contractualHours,
      billable_hours: payload.billableHours,
      leave_hours: payload.leaveHours ?? 0,
      sickness_hours: payload.sicknessHours ?? 0,
      day_entries: payload.dayEntries.map((entry) => ({
        work_date: entry.workDate,
        hours: entry.hours,
        description: entry.description ?? 'Playwright testinvoer',
      })),
    };
  }

  async write(payload: WritePayload) {
    const csrfResponse = await this.request.get('/server/auth/csrf.php');
    expect(csrfResponse.ok()).toBeTruthy();
    const csrfBody = await csrfResponse.json();
    expect(csrfBody.csrf_token).toBeTruthy();

    const response = await this.request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': csrfBody.csrf_token as string },
      data: this.toServerPayload(payload),
    });

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async writeWithoutCsrf(payload: WritePayload) {
    const response = await this.request.post('/server/api/timesheets.php', {
      data: this.toServerPayload(payload),
    });

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async writeWithoutSession(payload: WritePayload) {
    const isolated = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    try {
      const csrfResponse = await isolated.get('/server/auth/csrf.php');
      expect(csrfResponse.ok()).toBeTruthy();
      const csrfBody = await csrfResponse.json();

      const response = await isolated.post('/server/api/timesheets.php', {
        headers: { 'X-CSRF-Token': csrfBody.csrf_token as string },
        data: this.toServerPayload(payload),
      });

      return {
        status: response.status(),
        body: await response.json(),
      };
    } finally {
      await isolated.dispose();
    }
  }

  async read(period: string, employeeId?: number) {
    const suffix = employeeId ? `?period=${encodeURIComponent(period)}&employee_id=${employeeId}` : `?period=${encodeURIComponent(period)}`;
    const response = await this.request.get(`/server/api/timesheets.php${suffix}`);
    return {
      status: response.status(),
      body: await response.json(),
    };
  }
}
