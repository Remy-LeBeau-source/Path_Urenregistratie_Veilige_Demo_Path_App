// Navigation-only mapping for auth.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'AUTH-H-001', spec: 'auth.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then auth/me bevestigt administrator sessie en juiste gebruiker"] },
  { caseId: 'AUTH-H-002', spec: 'auth.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then auth/me bevestigt medewerkersessie en juiste gebruiker"] },
  { caseId: 'AUTH-H-003', spec: 'auth.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then auth/me geeft authenticated false en geen actieve user"] },
  { caseId: 'AUTH-H-004', spec: 'auth.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then de gekozen beheeraccount automatisch is ingevuld","Then het beheerdersdashboard opent"] },
  { caseId: 'AUTH-N-005', spec: 'auth.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat onbekend account geeft dezelfde generieke loginfout"] },
  { caseId: 'AUTH-N-006', spec: 'auth.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat ongeldig e-mailformaat wordt als invalid-payload geweigerd"] },
  { caseId: 'AUTH-N-007', spec: 'auth.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then toont de UI de resterende blokkeertijd en blijft het formulier bruikbaar voor een ander account"] },
] as const;
