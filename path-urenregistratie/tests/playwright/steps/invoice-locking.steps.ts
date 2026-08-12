// Navigation-only mapping for invoice-locking.feature.
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
  { caseId: 'INV-H-004', spec: 'invoice-lock.spec.ts' },
  { caseId: 'INV-N-008', spec: 'invoice-lock.spec.ts' },
  { caseId: 'INV-N-009', spec: 'invoice-lock.spec.ts' },
  { caseId: 'INV-N-010', spec: 'invoice-lock.spec.ts' },
  { caseId: 'INV-N-011', spec: 'invoice-lock.spec.ts' },
  { caseId: 'INV-N-012', spec: 'invoice-lock.spec.ts' },
  { caseId: 'INV-N-013', spec: 'invoice-lock.spec.ts' },
] as const;
