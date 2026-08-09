// Navigation-only mapping for notifications.feature.
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
  { caseId: 'NOT-H-001', spec: 'notifications.spec.ts' },
  { caseId: 'NOT-H-002', spec: 'notifications.spec.ts' },
  { caseId: 'NOT-N-003', spec: 'notifications.spec.ts' },
  { caseId: 'NOT-N-004', spec: 'notifications.spec.ts' },
  { caseId: 'NOT-H-005', spec: 'notifications.spec.ts' },
  { caseId: 'NOT-H-006', spec: 'notifications.spec.ts' },
  { caseId: 'NOT-N-007', spec: 'notifications.spec.ts' },
  { caseId: 'NOT-H-008', spec: 'notifications.spec.ts' },
] as const;
