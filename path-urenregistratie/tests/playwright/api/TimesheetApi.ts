import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { appConfig } from '../fixtures/appConfig';

type WriteAction = 'save_draft' | 'submit' | 'request_correction' | 'approve';

type DayEntry = {
  workDate: string;
  hours: number;
  description?: string;
};

type WritePayload = {
  action: WriteAction;
  period: string;
  employeeId?: number;
  expectedVersion?: number;
  correctionMessage?: string;
  contractualHours: number;
  billableHours: number;
  leaveHours?: number;
  sicknessHours?: number;
  dayEntries: DayEntry[];
};

type ReviewPayload = {
  action: 'request_correction' | 'approve';
  period: string;
  employeeId: number;
  expectedVersion: number;
  correctionMessage?: string;
};

export class TimesheetApi {
  constructor(private readonly request: APIRequestContext) {}

  private toServerPayload(payload: WritePayload) {
    const base = {
      action: payload.action,
      period: payload.period,
      employee_id: payload.employeeId,
      expected_version: payload.expectedVersion,
      correction_message: payload.correctionMessage,
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

    if (payload.action === 'request_correction' || payload.action === 'approve') {
      return {
        action: payload.action,
        period: payload.period,
        employee_id: payload.employeeId,
        expected_version: payload.expectedVersion,
        correction_message: payload.correctionMessage,
      };
    }

    return base;
  }

  private toReviewServerPayload(payload: ReviewPayload) {
    return {
      action: payload.action,
      period: payload.period,
      employee_id: payload.employeeId,
      expected_version: payload.expectedVersion,
      correction_message: payload.correctionMessage,
    };
  }

  async write(payload: WritePayload) {
    const csrfResponse = await this.request.get('/server/auth/csrf.php');
    if (!csrfResponse.ok()) {
      throw new Error(`[TimesheetApi] CSRF token ophalen mislukt (HTTP ${csrfResponse.status()}) voor write(${payload.action}).`);
    }
    const csrfBody = await csrfResponse.json();
    const csrfToken = String(csrfBody && csrfBody.csrf_token || '').trim();
    if (!csrfToken) {
      throw new Error(`[TimesheetApi] CSRF token ontbreekt voor write(${payload.action}).`);
    }

    const response = await this.request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': csrfToken },
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
      if (!csrfResponse.ok()) {
        throw new Error(`[TimesheetApi] CSRF token ophalen zonder sessie mislukt (HTTP ${csrfResponse.status()}).`);
      }
      const csrfBody = await csrfResponse.json();
      const csrfToken = String(csrfBody && csrfBody.csrf_token || '').trim();
      if (!csrfToken) {
        throw new Error('[TimesheetApi] CSRF token ontbreekt in anonieme context.');
      }

      const response = await isolated.post('/server/api/timesheets.php', {
        headers: { 'X-CSRF-Token': csrfToken },
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

  async requestCorrection(payload: ReviewPayload) {
    const csrfResponse = await this.request.get('/server/auth/csrf.php');
    if (!csrfResponse.ok()) {
      throw new Error(`[TimesheetApi] CSRF token ophalen mislukt (HTTP ${csrfResponse.status()}) voor ${payload.action}.`);
    }
    const csrfBody = await csrfResponse.json();
    const csrfToken = String(csrfBody && csrfBody.csrf_token || '').trim();
    if (!csrfToken) {
      throw new Error(`[TimesheetApi] CSRF token ontbreekt voor ${payload.action}.`);
    }

    const response = await this.request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: this.toReviewServerPayload(payload),
    });

    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async approve(payload: Omit<ReviewPayload, 'action'>) {
    return this.requestCorrection({
      action: 'approve',
      period: payload.period,
      employeeId: payload.employeeId,
      expectedVersion: payload.expectedVersion,
    });
  }
}
