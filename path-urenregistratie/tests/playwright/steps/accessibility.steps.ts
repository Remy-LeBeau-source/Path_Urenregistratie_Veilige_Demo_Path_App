// Navigation-only mapping for accessibility.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'A11Y-H-001', spec: 'accessibility.spec.ts', assertionCount: 6, acceptanceCriteria: ["Then hebben e-mail, wachtwoord en inlogknop een programmatisch gekoppeld label"] },
  { caseId: 'A11Y-H-002', spec: 'accessibility.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then heeft elke hoofdnavigatieknop een herkenbare, unieke naam"] },
] as const;
