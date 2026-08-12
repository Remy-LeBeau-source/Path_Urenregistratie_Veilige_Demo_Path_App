// Navigation-only mapping for password-reset.feature.
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
  { caseId: 'PWD-H-001', spec: 'password-reset.spec.ts' },
  { caseId: 'PWD-H-002', spec: 'password-reset.spec.ts' },
  { caseId: 'PWD-H-003', spec: 'password-reset.spec.ts' },
  { caseId: 'PWD-H-004', spec: 'password-reset.spec.ts' },
  { caseId: 'PWD-N-004', spec: 'password-reset.spec.ts' },
  { caseId: 'PWD-N-005', spec: 'password-reset.spec.ts' },
  { caseId: 'PWD-N-006', spec: 'password-reset.spec.ts' },
  { caseId: 'PWD-N-007', spec: 'password-reset.spec.ts' },
  { caseId: 'PWD-N-008', spec: 'password-reset.spec.ts' },
  { caseId: 'PWD-N-009', spec: 'password-reset.spec.ts' },
] as const;
