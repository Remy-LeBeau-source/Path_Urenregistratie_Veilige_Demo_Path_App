// Hulpstukken die zowel dashboard.spec.ts als dashboard-medewerker.spec.ts
// gebruiken. Ze stonden in dashboard.spec.ts toen dat nog één bestand was;
// bij het opknippen zijn ze hierheen verhuisd in plaats van gedupliceerd.
import { expect } from '@playwright/test';

export type MutableRecord = {
  entries: number[][];
  contractHours: number;
  leave: number;
  sick: number;
  timesheetStatus: 'draft' | 'submitted' | 'correction' | 'approved';
  invoiceStatus: 'concept' | 'ready' | 'simulated';
  payrollStatus: 'concept' | 'ready' | 'simulated';
  invoiceNumber: string;
  serverVersion: null;
  correctionHistory: Array<unknown>;
  customerTimesheet: {
    status: string;
    isExample: boolean;
    fileName: string;
    originalFileName: string;
    fileData: string;
    mimeType: string;
    uploadedAt: string;
    uploadedBy: string;
    reviewedAt: string;
    reviewedBy: string;
    reviewNote: string;
    submissionSubject: string;
    submissionBody: string;
    brokerSubject: string;
    brokerBody: string;
    sentAt: string;
    skippedReason: string;
    skippedAt: string;
    skippedBy: string;
    reminderCount: number;
    lastReminderAt: string;
  };
};

export function staleRecord(periodKey: string, employeeId: number): MutableRecord {
  return {
    entries: Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]),
    contractHours: 151.2,
    leave: 0,
    sick: 0,
    timesheetStatus: 'correction',
    invoiceStatus: 'concept',
    payrollStatus: 'concept',
    invoiceNumber: `STALE-${periodKey}-${employeeId}`,
    serverVersion: null,
    correctionHistory: [],
    customerTimesheet: {
      status: 'missing',
      isExample: false,
      fileName: '',
      originalFileName: '',
      fileData: '',
      mimeType: 'application/pdf',
      uploadedAt: '',
      uploadedBy: '',
      reviewedAt: '',
      reviewedBy: '',
      reviewNote: '',
      submissionSubject: '',
      submissionBody: '',
      brokerSubject: '',
      brokerBody: '',
      sentAt: '',
      skippedReason: '',
      skippedAt: '',
      skippedBy: '',
      reminderCount: 0,
      lastReminderAt: ''
    }
  };
}

export function staleServerStateWith132OpenActions(): Record<string, unknown> {
  const records: Record<string, Record<string, MutableRecord>> = {};
  const monthKeys: string[] = [];
  for (let month = 1; month <= 12; month += 1) monthKeys.push(`2024-${String(month).padStart(2, '0')}`);
  for (let month = 1; month <= 12; month += 1) monthKeys.push(`2025-${String(month).padStart(2, '0')}`);
  for (let month = 1; month <= 9; month += 1) monthKeys.push(`2026-${String(month).padStart(2, '0')}`);

  monthKeys.forEach(periodKey => {
    records[periodKey] = {
      '1': staleRecord(periodKey, 1),
      '2': staleRecord(periodKey, 2),
      '3': staleRecord(periodKey, 3),
      '4': staleRecord(periodKey, 4)
    };
  });

  return {
    schemaVersion: 23,
    selectedPeriodKey: '2026-07',
    employees: [
      { id: 1, customerTimesheetExpected: false },
      { id: 2, customerTimesheetExpected: false },
      { id: 3, customerTimesheetExpected: false },
      { id: 4, customerTimesheetExpected: false }
    ],
    records
  };
}

export const ALLE_SCHERMEN = [
  'dashboard', 'employee-dashboard', 'timesheet', 'approvals', 'invoices',
  'announcements', 'employee-announcements', 'employees', 'settings',
] as const;
export const SCHERMTITELS: Record<(typeof ALLE_SCHERMEN)[number], string> = {
  dashboard: 'Urenoverzicht',
  'employee-dashboard': 'Mijn overzicht',
  timesheet: 'Mijn uren',
  approvals: 'Goedkeuringen',
  invoices: 'Facturen',
  announcements: 'Mededelingen',
  'employee-announcements': 'Mijn mededelingen',
  employees: 'Medewerkers',
  settings: 'Instellingen',
};

// Precies één scherm hoort .is-active te dragen en de URL-hash en #page-title
// horen daarbij te passen -- dit toetst dat expliciet voor alle negen
// schermsecties, niet alleen het scherm dat net geopend werd, zodat een
// browser-terug/-vooruit die per ongeluk twee schermen tegelijk actief laat
// (of geen enkel) hier meteen opvalt.
export async function verwachtAlleenSchermActief(page: import('@playwright/test').Page, scherm: (typeof ALLE_SCHERMEN)[number]) {
  for (const kandidaat of ALLE_SCHERMEN) {
    if (kandidaat === scherm) {
      await expect(page.locator(`#view-${kandidaat}`), `#view-${kandidaat} hoort actief te zijn`).toHaveClass(/is-active/);
    } else {
      await expect(page.locator(`#view-${kandidaat}`), `#view-${kandidaat} hoort niet actief te zijn`).not.toHaveClass(/is-active/);
    }
  }
  await expect(page.locator('#page-title')).toHaveText(SCHERMTITELS[scherm]);
  await expect(page).toHaveURL(new RegExp('#' + scherm + '$'));
}
