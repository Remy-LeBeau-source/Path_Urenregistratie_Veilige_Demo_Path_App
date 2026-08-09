import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { appConfig } from '../fixtures/appConfig';
import { attachApiExchange } from '../reporting/apiAttachments';

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

    const endpoint = '/server/api/timesheets.php';
    const requestBody = this.toServerPayload(payload);
    const response = await this.request.post(endpoint, {
      headers: { 'X-CSRF-Token': csrfToken },
      data: requestBody,
    });
    const body = await response.json();
    await attachApiExchange({ method: 'POST', endpoint, requestBody, responseStatus: response.status(), responseBody: body });

    return {
      status: response.status(),
      body,
    };
  }

  async writeWithoutCsrf(payload: WritePayload) {
    const endpoint = '/server/api/timesheets.php';
    const requestBody = this.toServerPayload(payload);
    const response = await this.request.post(endpoint, {
      data: requestBody,
    });
    const body = await response.json();
    await attachApiExchange({ method: 'POST', endpoint, requestBody, responseStatus: response.status(), responseBody: body });

    return {
      status: response.status(),
      body,
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

      const endpoint = '/server/api/timesheets.php';
      const requestBody = this.toServerPayload(payload);
      const response = await isolated.post(endpoint, {
        headers: { 'X-CSRF-Token': csrfToken },
        data: requestBody,
      });
      const body = await response.json();
      await attachApiExchange({ method: 'POST', endpoint, requestBody, responseStatus: response.status(), responseBody: body });

      return {
        status: response.status(),
        body,
      };
    } finally {
      await isolated.dispose();
    }
  }

  async read(period: string, employeeId?: number, options: { attach?: boolean } = {}) {
    const suffix = employeeId ? `?period=${encodeURIComponent(period)}&employee_id=${employeeId}` : `?period=${encodeURIComponent(period)}`;
    const endpoint = `/server/api/timesheets.php${suffix}`;
    const response = await this.request.get(endpoint);
    const body = await response.json();
    if (options.attach !== false) {
      await attachApiExchange({ method: 'GET', endpoint, responseStatus: response.status(), responseBody: body });
    }
    return {
      status: response.status(),
      body,
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

    const endpoint = '/server/api/timesheets.php';
    const requestBody = this.toReviewServerPayload(payload);
    const response = await this.request.post(endpoint, {
      headers: { 'X-CSRF-Token': csrfToken },
      data: requestBody,
    });
    const body = await response.json();
    await attachApiExchange({ method: 'POST', endpoint, requestBody, responseStatus: response.status(), responseBody: body });

    return {
      status: response.status(),
      body,
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
