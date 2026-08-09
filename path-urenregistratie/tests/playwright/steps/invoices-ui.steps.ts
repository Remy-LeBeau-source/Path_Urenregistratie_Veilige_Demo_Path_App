// Navigation-only mapping for invoices-ui.feature.
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
  { caseId: 'INV-H-001', spec: 'invoices.spec.ts' },
  { caseId: 'INV-N-005', spec: 'invoices.spec.ts' },
  { caseId: 'INV-H-002', spec: 'invoices.spec.ts' },
  { caseId: 'INV-H-003', spec: 'invoices.spec.ts' },
  { caseId: 'INV-N-007', spec: 'invoices.spec.ts' },
] as const;
