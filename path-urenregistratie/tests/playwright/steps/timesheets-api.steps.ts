// Navigation-only mapping for timesheets-api.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

Given('de uitvoerbare Playwright-case is voorbereid', () => undefined);
When('de beschreven businessflow wordt uitgevoerd', () => undefined);
Then('wordt het verwachte resultaat aantoonbaar gevalideerd', () => undefined);

export const caseMappings = [
  { caseId: 'TS-API-H-001', spec: 'timesheet-write.spec.ts' },
  { caseId: 'TS-API-N-010', spec: 'timesheet-write.spec.ts' },
  { caseId: 'TS-API-N-011', spec: 'timesheet-write.spec.ts' },
  { caseId: 'TS-API-N-003', spec: 'timesheet-write.spec.ts' },
  { caseId: 'TS-API-N-004', spec: 'timesheet-write.spec.ts' },
] as const;
