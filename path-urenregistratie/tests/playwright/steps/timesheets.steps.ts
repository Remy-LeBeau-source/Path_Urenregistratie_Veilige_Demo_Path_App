// Deze step definitions zijn voorbereidende BDD-documentatie.
// De uitvoerende tests staan nu in de .spec.ts bestanden.
// Er is bewust nog geen Cucumber/BDD-runner toegevoegd.
// Zie TEST-BDD-MAPPING.md voor de koppeling tussen feature scenario's en Playwright specs.

export const timesheetsSteps = {
  gegevenIngelogdeMedewerker: 'Login via AuthApi.login() met medewerker-credentials uit de testconfig.',
  alsSaveDraft: 'Gebruik TimesheetApi.write({ action: save_draft, ... }) met geldige day_entries.',
  danDraftOpgeslagen: 'Valideer HTTP 200, ok true, timesheet.status draft en audit_event timesheet.draft_saved.',
  alsReadBack: 'Gebruik TimesheetApi.read(period) op dezelfde testperiode.',
  danReadBackDraft: 'Valideer found true, timesheet.status draft en last_audit.event_type timesheet.draft_saved.',
  alsSubmit: 'Gebruik TimesheetApi.write({ action: submit, ... }) op de draft urenstaat.',
  danSubmitted: 'Valideer HTTP 200, timesheet.status submitted en submitted_at gevuld.',
  danForbiddenAnderEmployee: 'Valideer HTTP 403 en error forbidden-employee-scope bij employee_id mismatch.',
  danAuditSubmitted: 'Valideer na readback dat last_audit.event_type gelijk is aan timesheet.submitted.',
  danConflictGesloten: 'Valideer HTTP 409 wanneer een ingediende of afgesloten urenstaat opnieuw wordt geschreven.',
} as const;
