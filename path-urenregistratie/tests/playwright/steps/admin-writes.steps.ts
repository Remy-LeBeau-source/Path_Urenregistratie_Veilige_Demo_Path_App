// Navigation-only mapping for admin-writes.feature.
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
  { caseId: 'ADM-WR-H-001', spec: 'admin-writes.spec.ts' },
  { caseId: 'ADM-WR-H-002', spec: 'admin-writes.spec.ts' },
  { caseId: 'ADM-WR-H-003', spec: 'admin-writes.spec.ts' },
] as const;