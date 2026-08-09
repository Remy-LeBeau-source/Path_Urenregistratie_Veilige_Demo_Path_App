// Navigation-only mapping for security.feature.
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
  { caseId: 'SEC-H-001', spec: 'security.spec.ts' },
  { caseId: 'SEC-H-002', spec: 'security.spec.ts' },
  { caseId: 'SEC-H-003', spec: 'security.spec.ts' },
  { caseId: 'SEC-N-001', spec: 'security.spec.ts' },
  { caseId: 'SEC-N-002', spec: 'security.spec.ts' },
  { caseId: 'SEC-N-003', spec: 'security.spec.ts' },
  { caseId: 'SEC-N-004', spec: 'security.spec.ts' },
] as const;
