// Navigation-only mapping for timesheets-api.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'TS-API-H-001', spec: 'timesheet-write.spec.ts', assertionCount: 31, acceptanceCriteria: ["Then save_draft werkt en zet status op draft","Then read back van draft bevat dagregels en auditdata","Then een ingediende urenstaat kan worden bewerkt en opnieuw ingediend","And cleanup: sessie sluiten voor testisolatie"] },
  { caseId: 'TS-API-N-010', spec: 'timesheet-write.spec.ts', assertionCount: 4, acceptanceCriteria: ["And cleanup: sessie sluiten voor testisolatie","Then wordt met Playwright-assertions bevestigd dat employee mag geen andere medewerker schrijven"] },
  { caseId: 'TS-API-N-011', spec: 'timesheet-write.spec.ts', assertionCount: 3, acceptanceCriteria: ["And cleanup: sessie sluiten voor testisolatie","Then wordt met Playwright-assertions bevestigd dat write zonder csrf geeft 403"] },
  { caseId: 'TS-API-N-003', spec: 'timesheet-write.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat write zonder sessie geeft 401"] },
  { caseId: 'TS-API-N-004', spec: 'timesheet-write.spec.ts', assertionCount: 4, acceptanceCriteria: ["And cleanup: sessie sluiten voor testisolatie","Then wordt met Playwright-assertions bevestigd dat ongeldige payload geeft 400"] },
] as const;
