import { expect, type APIRequestContext } from '@playwright/test';

type CustomerTimesheetWriteAction =
  | 'save_draft'
  | 'submit'
  | 'approve'
  | 'request_resubmit'
  | 'mark_sent'
  | 'mark_sent_to_broker'
  | 'mark_skipped'
  | 'restore_missing';

type WritePayload = {
  action: CustomerTimesheetWriteAction;
  period: string;
  employeeId?: number;
  assignmentId?: number;
  reviewNote?: string;
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
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.csrf_token).toBeTruthy();
    return body.csrf_token as string;
  }

  async read(period: string, employeeId?: number, assignmentId?: number) {
    const params = new URLSearchParams({ period });
    if (employeeId) params.set('employee_id', String(employeeId));
    if (assignmentId) params.set('assignment_id', String(assignmentId));

    const response = await this.request.get('/server/api/customer-timesheets.php?' + params.toString());
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async download(period: string, employeeId?: number, assignmentId?: number) {
    const params = new URLSearchParams({ action: 'download', period });
    if (employeeId) params.set('employee_id', String(employeeId));
    if (assignmentId) params.set('assignment_id', String(assignmentId));

    const response = await this.request.get('/server/api/customer-timesheets.php?' + params.toString());
    return {
      status: response.status(),
      contentType: response.headers()['content-type'] || '',
      body: await response.body(),
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

    const response = payload.file
      ? await this.request.post('/server/api/customer-timesheets.php', {
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
      : await this.request.post('/server/api/customer-timesheets.php', {
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

    return {
      status: response.status(),
      body,
    };
  }
}
