// Navigation-only mapping for audit-log.feature.
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
  { caseId: 'AUD-H-001', spec: 'audit-log.spec.ts' },
  { caseId: 'AUD-H-002', spec: 'audit-log.spec.ts' },
  { caseId: 'AUD-H-003', spec: 'audit-log.spec.ts' },
  { caseId: 'AUD-H-004', spec: 'audit-log.spec.ts' },
  { caseId: 'AUD-N-005', spec: 'audit-log.spec.ts' },
  { caseId: 'AUD-N-006', spec: 'audit-log.spec.ts' },
] as const;
