// Navigation-only mapping for admin-writes.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'ADM-WR-H-001', spec: 'admin-writes.spec.ts', assertionCount: 6, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat admin kan company/settings server-led opslaan"] },
  { caseId: 'ADM-WR-H-002', spec: 'admin-writes.spec.ts', assertionCount: 8, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat admin kan beheerder server-led aanmaken en wijzigen"] },
  { caseId: 'ADM-WR-H-003', spec: 'admin-writes.spec.ts', assertionCount: 8, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat admin kan medewerker server-led aanmaken en bootstrap ziet deze terug"] },
] as const;
