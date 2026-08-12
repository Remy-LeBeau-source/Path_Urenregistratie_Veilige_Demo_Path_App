// Navigation-only mapping for roles-api.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'ROLE-N-003', spec: 'roles-api.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat zonder sessie geeft protected API 401"] },
  { caseId: 'ROLE-H-001', spec: 'roles-api.spec.ts', assertionCount: 7, acceptanceCriteria: ["And de administrator dashboarddata opvraagt","Then de administrator ziet volledige invoice-data"] },
  { caseId: 'ROLE-H-002', spec: 'roles-api.spec.ts', assertionCount: 8, acceptanceCriteria: ["Then de medewerker ziet alleen eigen invoice-data"] },
] as const;
