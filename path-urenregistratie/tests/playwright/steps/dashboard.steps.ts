// Navigation-only mapping for dashboard.feature.
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
  { caseId: 'DASH-H-001', spec: 'dashboard.spec.ts' },
  { caseId: 'DASH-H-002', spec: 'dashboard.spec.ts' },
  { caseId: 'DASH-N-007', spec: 'dashboard.spec.ts' },
  { caseId: 'DASH-N-008', spec: 'dashboard.spec.ts' },
] as const;
