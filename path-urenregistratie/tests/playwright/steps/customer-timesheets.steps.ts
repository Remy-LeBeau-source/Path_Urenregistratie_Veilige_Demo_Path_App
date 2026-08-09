// Navigation-only mapping for customer-timesheets.feature.
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
  { caseId: 'CTS-API-H-001', spec: 'customer-timesheet-api.spec.ts' },
  { caseId: 'CTS-API-N-006', spec: 'customer-timesheet-api.spec.ts' },
  { caseId: 'CTS-API-N-007', spec: 'customer-timesheet-api.spec.ts' },
  { caseId: 'CTS-API-H-004', spec: 'customer-timesheet-api.spec.ts' },
  { caseId: 'CTS-API-N-005', spec: 'customer-timesheet-api.spec.ts' },
] as const;
