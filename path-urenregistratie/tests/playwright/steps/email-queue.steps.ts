// Navigation-only mapping for email-queue.feature.
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
  { caseId: 'EQ-H-001', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-H-002', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-H-003', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-H-004', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-H-005', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-N-006', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-N-007', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-N-008', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-N-009', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-N-010', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-N-011', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-N-012', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-N-013', spec: 'email-queue.spec.ts' },
  { caseId: 'EQ-N-014', spec: 'email-queue.spec.ts' },
] as const;
