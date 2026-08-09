// Navigation-only mapping for period-management.feature.
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
  { caseId: 'PER-H-001', spec: 'period-management.spec.ts' },
  { caseId: 'PER-H-002', spec: 'period-management.spec.ts' },
  { caseId: 'PER-N-003', spec: 'period-management.spec.ts' },
  { caseId: 'PER-N-004', spec: 'period-management.spec.ts' },
  { caseId: 'PER-N-005', spec: 'period-management.spec.ts' },
  { caseId: 'PER-N-006', spec: 'period-management.spec.ts' },
  { caseId: 'PER-N-007', spec: 'period-management.spec.ts' },
  { caseId: 'PER-N-008', spec: 'period-management.spec.ts' },
  { caseId: 'PER-N-009', spec: 'period-management.spec.ts' },
  { caseId: 'PER-N-010', spec: 'period-management.spec.ts' },
] as const;
