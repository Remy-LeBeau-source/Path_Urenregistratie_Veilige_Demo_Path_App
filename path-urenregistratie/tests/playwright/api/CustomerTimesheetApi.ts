import type { APIRequestContext } from '@playwright/test';
import { attachApiExchange } from '../reporting/apiAttachments';

type CustomerTimesheetWriteAction =
  | 'save_draft'
  | 'submit'
  | 'approve'
  | 'request_resubmit'
  | 'mark_sent'
  | 'mark_sent_to_broker'
  | 'send_to_broker'
  | 'mark_skipped'
  | 'restore_missing';

type WritePayload = {
  action: CustomerTimesheetWriteAction;
  period: string;
  employeeId?: number;
  assignmentId?: number;
  reviewNote?: string;
  subject?: string;
  body?: string;
  file?: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  };
};

export class CustomerTimesheetApi {
  constructor(private readonly request: APIRequestContext) {}

  async csrfToken() {
    const response = await this.request.get('/server/auth/csrf.php');
    if (!response.ok()) {
      throw new Error(`[CustomerTimesheetApi] CSRF token ophalen mislukt (HTTP ${response.status()}).`);
    }
    const body = await response.json();
    const token = String(body && body.csrf_token || '').trim();
    if (!token) {
      throw new Error('[CustomerTimesheetApi] CSRF endpoint gaf geen token terug.');
    }
    return token;
  }

  async read(period: string, employeeId?: number, assignmentId?: number, options: { attach?: boolean } = {}) {
    const params = new URLSearchParams({ period });
    if (employeeId) params.set('employee_id', String(employeeId));
    if (assignmentId) params.set('assignment_id', String(assignmentId));

    const endpoint = '/server/api/customer-timesheets.php?' + params.toString();
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

  async download(period: string, employeeId?: number, assignmentId?: number) {
    const params = new URLSearchParams({ action: 'download', period });
    if (employeeId) params.set('employee_id', String(employeeId));
    if (assignmentId) params.set('assignment_id', String(assignmentId));

    const endpoint = '/server/api/customer-timesheets.php?' + params.toString();
    const response = await this.request.get(endpoint);
    const body = await response.body();
    await attachApiExchange({ method: 'GET', endpoint, responseStatus: response.status(), responseBody: body });
    return {
      status: response.status(),
      contentType: response.headers()['content-type'] || '',
      body,
    };
  }

  async write(payload: WritePayload) {
    const csrfToken = await this.csrfToken();

    const base: Record<string, string> = {
      action: payload.action,
      period: payload.period,
    };
    if (payload.employeeId !== undefined) base.employee_id = String(payload.employeeId);
    if (payload.assignmentId !== undefined) base.assignment_id = String(payload.assignmentId);
    if (payload.reviewNote !== undefined) base.review_note = payload.reviewNote;
    if (payload.subject !== undefined) base.subject = payload.subject;
    if (payload.body !== undefined) base.body = payload.body;

    const endpoint = '/server/api/customer-timesheets.php';
    const requestBody = payload.file ? { ...base, file: payload.file } : base;
    const response = payload.file
      ? await this.request.post(endpoint, {
          headers: { 'X-CSRF-Token': csrfToken },
          multipart: {
            ...base,
            file: {
              name: payload.file.name,
              mimeType: payload.file.mimeType,
              buffer: payload.file.buffer,
            },
          },
        })
      : await this.request.post(endpoint, {
          headers: { 'X-CSRF-Token': csrfToken },
          form: base,
        });

    const bodyText = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = {
        ok: false,
        error: 'non-json-response',
        message: bodyText.slice(0, 600),
      };
    }
    await attachApiExchange({ method: 'POST', endpoint, requestBody, responseStatus: response.status(), responseBody: body });

    return {
      status: response.status(),
      body,
    };
  }
}
