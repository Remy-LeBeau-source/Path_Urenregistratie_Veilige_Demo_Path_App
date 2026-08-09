// Navigation-only mapping for auth.feature.
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
  { caseId: 'AUTH-H-001', spec: 'auth.spec.ts' },
  { caseId: 'AUTH-H-002', spec: 'auth.spec.ts' },
  { caseId: 'AUTH-H-003', spec: 'auth.spec.ts' },
  { caseId: 'AUTH-H-004', spec: 'auth.spec.ts' },
  { caseId: 'AUTH-N-005', spec: 'auth.spec.ts' },
  { caseId: 'AUTH-N-006', spec: 'auth.spec.ts' },
] as const;
