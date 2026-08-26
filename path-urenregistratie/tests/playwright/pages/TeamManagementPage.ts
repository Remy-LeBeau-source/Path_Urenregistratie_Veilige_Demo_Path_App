import { expect, type APIResponse, type Locator, type Page } from '@playwright/test';

export type RecipientRouteValues = {
  key: string;
  enabled?: boolean;
  invoiceAttachment?: boolean;
  subject?: string;
  body?: string;
};

export type NewRecipientValues = {
  category: 'accounting' | 'payroll' | 'other';
  name: string;
  email: string;
  enabled: boolean;
  invoiceAttachment: boolean;
  subject?: string;
  body?: string;
};

export type EmployeeFormValues = {
  name?: string;
  email?: string;
  role?: string;
  startDate?: string;
  contract?: string;
  weeklyHours?: number;
  client?: string;
  projectCode?: string;
  broker?: string;
  brokerEmail?: string;
  invoiceRecipientName?: string;
  brokerInvoiceAddress?: string;
  invoiceProject?: string;
  rate?: number;
  brokerEnabled?: boolean;
  brokerInvoiceAttachment?: boolean;
  brokerSubject?: string;
  brokerBody?: string;
  recipientRoutes?: RecipientRouteValues[];
  newRecipient?: NewRecipientValues;
  customerTimesheetExpected?: boolean;
  customerTimesheetDueWorkday?: 3 | 5 | 7 | 10;
  customerTimesheetBrokerEnabled?: boolean;
  customerTimesheetUseBrokerEmail?: boolean;
  customerTimesheetBrokerEmail?: string;
  invoiceWithoutCustomerTimesheetAllowed?: boolean;
  notificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  sendInvitation?: boolean;
  addAnother?: boolean;
};

export type StaffWrite = {
  response: APIResponse;
  request: Record<string, unknown>;
  body: Record<string, unknown>;
};

async function setChecked(locator: Locator, checked: boolean): Promise<void> {
  await expect(locator).toBeAttached();
  await locator.setChecked(checked);
  await expect(locator).toBeChecked({ checked });
}

export class TeamManagementPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.locator('button[data-view="employees"]:visible').first().click();
    await expect(this.page.locator('#view-employees')).toHaveClass(/is-active/);
    await expect(this.page.locator('#add-employee')).toBeVisible();
  }

  employeeCard(name: string): Locator {
    return this.page.locator('#employee-grid .employee-card').filter({ hasText: name });
  }

  adminRow(name: string): Locator {
    return this.page.locator('#administrator-list .administrator-row').filter({ hasText: name });
  }

  // Een klik kan landen voordat de app haar afhandeling eraan heeft gekoppeld. Dan
  // ziet Playwright een geslaagde klik op een knop die nog niets doet, en wacht
  // daarna tevergeefs op de dialoog. Op mobile-safari gebeurde dat structureel.
  // Doen wat een mens doet: gaat hij niet open, klik dan nog eens.

  /**
   * Kiest een waarde in een keuzelijst die door de app is vervangen door een eigen
   * widget.
   *
   * De echte <select> wordt daarbij verborgen (hidden, aria-hidden, tabindex -1),
   * en Playwright weigert terecht om op iets onzichtbaars te klikken. selectOption
   * bleef daar simpelweg op wachten tot de test omviel. Deze helper bedient de
   * widget zoals een gebruiker dat doet, en valt terug op de gewone select als er
   * geen widget is opgebouwd.
   */
  private async kiesInKeuzemenu(selectId: string, waarde: string): Promise<void> {
    const select = this.page.locator(`#${selectId}`);

    // De app kent twee eigen keuzemenus met verschillende markup. Welke van de twee
    // een veld gebruikt, is aan de app; de test hoort daar niet vanaf te weten.
    const triggers = [
      this.page.locator(`[data-standard-choice-control="${selectId}"]`),
      this.page.locator(`#${selectId}-trigger`),
    ];
    const opties = [
      this.page.locator(`[data-standard-choice-target="${selectId}"][data-standard-choice-value="${waarde}"]`),
      this.page.locator(`#${selectId}-choices [data-reminder-choice-value="${waarde}"]`),
    ];

    for (let i = 0; i < triggers.length; i++) {
      if (await triggers[i].count() === 0) continue;
      await expect(triggers[i]).toBeVisible();
      await triggers[i].click();
      await expect(opties[i], `optie ${waarde} hoort in ${selectId} te bestaan`).toBeVisible();
      await opties[i].click();
      await expect(select, `${selectId} hoort na de keuze op ${waarde} te staan`).toHaveValue(waarde);
      return;
    }

    // Geen eigen widget opgebouwd: dan is het gewoon een select.
    await select.selectOption(waarde);
  }

  private async openDialoog(opener: Locator): Promise<void> {
    const dialoog = this.page.locator('#modal');
    await expect(opener).toBeVisible();
    await expect(async () => {
      if (await dialoog.isHidden()) {
        await opener.click();
      }
      await expect(dialoog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000, intervals: [250, 500, 1_000] });
  }

  async startEmployee(): Promise<void> {
    await this.openDialoog(this.page.locator('#add-employee'));
    await expect(this.page.locator('#edit-name')).toBeVisible();
  }

  async openEmployee(name: string): Promise<Locator> {
    const card = this.employeeCard(name);
    await expect(card, `medewerker ${name} hoort exact eenmaal in de huidige lijst te staan`).toHaveCount(1);
    await this.openDialoog(card.locator('[data-edit-routing]'));
    await expect(this.page.locator('#edit-name')).toBeVisible();
    return card;
  }

  async reloadAndOpenEmployee(name: string): Promise<void> {
    await this.page.reload();
    await this.open();
    await this.openEmployee(name);
  }

  async fillEmployee(values: EmployeeFormValues): Promise<void> {
    const fills: Array<[keyof EmployeeFormValues, string]> = [
      ['name', '#edit-name'],
      ['email', '#edit-account-email'],
      ['role', '#edit-role'],
      ['startDate', '#edit-start-date'],
      ['contract', '#edit-contract'],
      ['client', '#edit-client'],
      ['projectCode', '#edit-project'],
      ['broker', '#edit-broker'],
      ['brokerEmail', '#edit-broker-email'],
      ['invoiceRecipientName', '#edit-invoice-recipient-name'],
      ['brokerInvoiceAddress', '#edit-broker-invoice-address'],
      ['invoiceProject', '#edit-invoice-project'],
      ['brokerSubject', '#edit-subject'],
      ['brokerBody', '#edit-body'],
      ['customerTimesheetBrokerEmail', '#edit-customer-timesheet-broker-email'],
    ];
    for (const [key, selector] of fills) {
      const value = values[key];
      if (typeof value === 'string') await this.page.locator(selector).fill(value);
    }
    if (values.weeklyHours !== undefined) {
      await this.page.locator('#edit-weekly-hours').fill(String(values.weeklyHours));
    }
    if (values.rate !== undefined) {
      await this.page.locator('#edit-rate').fill(String(values.rate));
    }

    if (values.brokerEnabled !== undefined) {
      await setChecked(this.page.locator('#edit-broker-enabled'), values.brokerEnabled);
    }
    if (values.brokerInvoiceAttachment !== undefined) {
      await setChecked(this.page.locator('#edit-broker-invoice'), values.brokerInvoiceAttachment);
    }

    for (const route of values.recipientRoutes || []) {
      const enabled = this.page.locator(`[data-mail-recipient-enabled="${route.key}"]`);
      if (route.enabled !== undefined) await setChecked(enabled, route.enabled);
      if (route.invoiceAttachment !== undefined) {
        await setChecked(
          this.page.locator(`[data-mail-recipient-invoice="${route.key}"]`),
          route.invoiceAttachment,
        );
      }
      if (route.subject !== undefined) {
        await this.page.locator(`[data-mail-recipient-subject="${route.key}"]`).fill(route.subject);
      }
      if (route.body !== undefined) {
        await this.page.locator(`[data-mail-recipient-body="${route.key}"]`).fill(route.body);
      }
    }

    if (values.newRecipient) {
      const recipient = values.newRecipient;
      await this.kiesInKeuzemenu('edit-new-recipient-category', recipient.category);
      await this.page.locator('#edit-new-recipient-name').fill(recipient.name);
      await this.page.locator('#edit-new-recipient-email').fill(recipient.email);
      await setChecked(this.page.locator('#edit-new-recipient-enabled'), recipient.enabled);
      await setChecked(this.page.locator('#edit-new-recipient-invoice'), recipient.invoiceAttachment);
      if (recipient.subject !== undefined) {
        await this.page.locator('#edit-new-recipient-subject').fill(recipient.subject);
      }
      if (recipient.body !== undefined) {
        await this.page.locator('#edit-new-recipient-body').fill(recipient.body);
      }
    }

    if (values.customerTimesheetExpected !== undefined) {
      await setChecked(this.page.locator('#edit-customer-timesheet-expected'), values.customerTimesheetExpected);
    }
    if (values.customerTimesheetDueWorkday !== undefined) {
      await this.kiesInKeuzemenu('edit-customer-timesheet-due-day', String(values.customerTimesheetDueWorkday));
    }
    if (values.customerTimesheetBrokerEnabled !== undefined) {
      await setChecked(
        this.page.locator('#edit-customer-timesheet-broker-enabled'),
        values.customerTimesheetBrokerEnabled,
      );
    }
    if (values.customerTimesheetUseBrokerEmail !== undefined) {
      await setChecked(
        this.page.locator('#edit-customer-timesheet-use-broker-email'),
        values.customerTimesheetUseBrokerEmail,
      );
      if (values.customerTimesheetBrokerEmail !== undefined) {
        await this.page.locator('#edit-customer-timesheet-broker-email')
          .fill(values.customerTimesheetBrokerEmail);
      }
    }
    if (values.invoiceWithoutCustomerTimesheetAllowed !== undefined) {
      await setChecked(
        this.page.locator('#edit-invoice-without-customer-timesheet'),
        values.invoiceWithoutCustomerTimesheetAllowed,
      );
    }
    if (values.notificationsEnabled !== undefined) {
      await setChecked(this.page.locator('#edit-notifications'), values.notificationsEnabled);
    }
    if (values.emailNotificationsEnabled !== undefined) {
      await setChecked(this.page.locator('#edit-email-notifications'), values.emailNotificationsEnabled);
    }
    if (values.sendInvitation !== undefined) {
      const invitation = this.page.locator('#edit-invite');
      await expect(invitation, 'de persoonlijke uitnodigingskeuze hoort in het formulier te staan').toBeAttached();
      if (values.sendInvitation) {
        await expect(invitation, 'TEST moet persoonlijke uitnodigingen kunnen afleveren').toBeEnabled();
      }
      if (await invitation.isEnabled()) await setChecked(invitation, values.sendInvitation);
    }
    if (values.addAnother !== undefined) {
      await setChecked(this.page.locator('#edit-add-another'), values.addAnother);
    }
  }

  async saveEmployee(): Promise<StaffWrite> {
    const responsePromise = this.page.waitForResponse(response => {
      if (!response.url().includes('/server/api/staff.php') || response.request().method() !== 'POST') return false;
      try {
        return (response.request().postDataJSON() as { action?: string })?.action === 'upsert_employee';
      } catch {
        return false;
      }
    });
    await this.page.locator('#modal-confirm').click();
    const response = await responsePromise;
    const request = response.request().postDataJSON() as Record<string, unknown>;
    const body = await response.json() as Record<string, unknown>;
    expect(response.status(), JSON.stringify(body)).toBe(200);
    expect(body.ok).toBe(true);
    await expect(this.page.locator('#modal')).toBeHidden();
    return { response, request, body };
  }

  async addEmployee(values: EmployeeFormValues): Promise<StaffWrite> {
    await this.startEmployee();
    await this.fillEmployee(values);
    return this.saveEmployee();
  }

  async editEmployee(name: string, values: EmployeeFormValues): Promise<StaffWrite> {
    await this.openEmployee(name);
    await this.fillEmployee(values);
    return this.saveEmployee();
  }

  async deactivateEmployee(name: string): Promise<StaffWrite> {
    const card = this.employeeCard(name);
    await expect(card).toHaveCount(1);
    await card.locator('[data-toggle-employee]').click();
    await expect(this.page.locator('#modal-confirm')).toHaveText('Deactiveren');
    // Ook deactiveren loopt via users.php. staff.php doet alleen aanmaken en wijzigen.
    const responsePromise = this.page.waitForResponse(response => (
      response.url().includes('/server/api/users.php') && response.request().method() === 'POST'
    ));
    await this.page.locator('#modal-confirm').click();
    const response = await responsePromise;
    const request = response.request().postDataJSON() as Record<string, unknown>;
    const body = await response.json() as Record<string, unknown>;
    expect(response.status(), JSON.stringify(body)).toBe(200);
    expect(body.ok).toBe(true);
    await expect(this.page.locator('#modal')).toBeHidden();
    return { response, request, body };
  }

  async showInactive(): Promise<void> {
    await this.page.locator('[data-employee-scope="inactive"]').click();
    await expect(this.page.locator('[data-employee-scope="inactive"]')).toHaveClass(/is-active/);
  }

  async deleteEmployee(name: string): Promise<StaffWrite> {
    const card = this.employeeCard(name);
    await expect(card).toHaveCount(1);
    await card.locator('[data-delete-employee]').click();
    await expect(this.page.locator('#modal-confirm')).toHaveText('Definitief verwijderen');
    // Verwijderen loopt via users.php; staff.php doet alleen aanmaken en wijzigen.
    const responsePromise = this.page.waitForResponse(response => (
      response.url().includes('/server/api/users.php') && response.request().method() === 'POST'
    ));
    await this.page.locator('#modal-confirm').click();
    const response = await responsePromise;
    const request = response.request().postDataJSON() as Record<string, unknown>;
    const body = await response.json() as Record<string, unknown>;
    expect(response.status(), JSON.stringify(body)).toBe(200);
    expect(body.ok, 'definitief verwijderen hoort te slagen').toBe(true);
    return { response, request, body };
  }

  /**
   * Zelfde handeling als deleteEmployee, maar zonder oordeel over de afloop.
   *
   * deleteEmployee eist succes, en dat is precies wat je níet wilt wanneer je
   * onderzoekt of een account met zakelijke historie terecht wordt tegengehouden.
   * Een geblokkeerde verwijdering is daar het gewenste gedrag, geen fout.
   */
  async attemptDeleteEmployee(name: string): Promise<StaffWrite> {
    const card = this.employeeCard(name);
    await expect(card).toHaveCount(1);
    await card.locator('[data-delete-employee]').click();
    await expect(this.page.locator('#modal-confirm')).toHaveText('Definitief verwijderen');
    const responsePromise = this.page.waitForResponse(response => (
      response.url().includes('/server/api/users.php') && response.request().method() === 'POST'
    ));
    await this.page.locator('#modal-confirm').click();
    const response = await responsePromise;
    const request = response.request().postDataJSON() as Record<string, unknown>;
    const body = await response.json() as Record<string, unknown>;
    return { response, request, body };
  }

  async addAdmin(values: {
    name: string;
    email: string;
    notificationsEnabled?: boolean;
    sendInvitation?: boolean;
  }): Promise<StaffWrite> {
    await this.page.locator('#add-admin').click();
    await this.page.locator('#edit-admin-name').fill(values.name);
    await this.page.locator('#edit-admin-email').fill(values.email);
    if (values.notificationsEnabled !== undefined) {
      await setChecked(this.page.locator('#edit-admin-notifications'), values.notificationsEnabled);
    }
    if (values.sendInvitation !== undefined) {
      const invitation = this.page.locator('#edit-admin-invite');
      await expect(invitation).toBeAttached();
      if (values.sendInvitation) await expect(invitation).toBeEnabled();
      if (await invitation.isEnabled()) await setChecked(invitation, values.sendInvitation);
    }
    const responsePromise = this.page.waitForResponse(response => {
      if (!response.url().includes('/server/api/staff.php') || response.request().method() !== 'POST') return false;
      try {
        return (response.request().postDataJSON() as { action?: string })?.action === 'upsert_admin';
      } catch {
        return false;
      }
    });
    await this.page.locator('#modal-confirm').click();
    const response = await responsePromise;
    const request = response.request().postDataJSON() as Record<string, unknown>;
    const body = await response.json() as Record<string, unknown>;
    expect(response.status(), JSON.stringify(body)).toBe(200);
    expect(body.ok).toBe(true);
    await expect(this.page.locator('#modal')).toBeHidden();
    return { response, request, body };
  }
}
