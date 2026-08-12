// Navigation-only mapping for timesheets-review-ui.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'TS-REV-UI-H-008', spec: 'timesheet-review-ui.spec.ts', assertionCount: 13, acceptanceCriteria: ["Then ziet de medewerker het correctieverzoek en dient opnieuw in","And de administrator keurt de herindiening goed","Then ziet de medewerker de eindstatus Goedgekeurd"] },
  { caseId: 'TS-REV-UI-H-009', spec: 'timesheet-review-ui.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then kan de medewerker opnieuw indienen zonder blokkerende statusmelding"] },
  { caseId: 'TS-REV-UI-H-010', spec: 'timesheet-review-ui.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then is de indienknop verborgen en staat er een statusmelding"] },
  { caseId: 'TS-REV-UI-N-011', spec: 'timesheet-review-ui.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then wordt de lokale status bijgewerkt zonder ongeldige serverwrite"] },
] as const;
