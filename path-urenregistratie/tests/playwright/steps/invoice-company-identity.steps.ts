// Navigation-only mapping for invoice-company-identity.feature.
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
  { caseId: 'INV-ID-H-001', spec: 'invoice-company-identity.spec.ts' },
  { caseId: 'INV-ID-H-002', spec: 'invoice-company-identity.spec.ts' },
  { caseId: 'INV-ID-H-003', spec: 'invoice-company-identity.spec.ts' },
  { caseId: 'INV-ID-N-004', spec: 'invoice-company-identity.spec.ts' },
  { caseId: 'INV-ID-H-005', spec: 'invoice-company-identity.spec.ts' },
] as const;
