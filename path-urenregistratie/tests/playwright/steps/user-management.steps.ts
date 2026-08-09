// Navigation-only mapping for user-management.feature.
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
  { caseId: 'USR-H-001', spec: 'user-management.spec.ts' },
  { caseId: 'USR-H-002', spec: 'user-management.spec.ts' },
  { caseId: 'USR-H-003', spec: 'user-management.spec.ts' },
  { caseId: 'USR-N-004', spec: 'user-management.spec.ts' },
  { caseId: 'USR-N-005', spec: 'user-management.spec.ts' },
  { caseId: 'USR-N-006', spec: 'user-management.spec.ts' },
  { caseId: 'USR-N-007', spec: 'user-management.spec.ts' },
] as const;
