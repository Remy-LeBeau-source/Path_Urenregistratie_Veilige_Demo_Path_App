// Navigation-only mapping for user-management.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'USR-H-001', spec: 'user-management.spec.ts', assertionCount: 7, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat admin ziet alle gebruikers van het bedrijf"] },
  { caseId: 'USR-H-002', spec: 'user-management.spec.ts', assertionCount: 7, acceptanceCriteria: ["Then is de medewerker daarna inactief","And heractiveren werkt ook"] },
  { caseId: 'USR-H-003', spec: 'user-management.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat admin kan force_password_change instellen"] },
  { caseId: 'USR-N-004', spec: 'user-management.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op user-list"] },
  { caseId: 'USR-N-005', spec: 'user-management.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat medewerker mag geen gebruikersbeheer uitvoeren"] },
  { caseId: 'USR-N-006', spec: 'user-management.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat admin kan zichzelf niet deactiveren"] },
  { caseId: 'USR-N-007', spec: 'user-management.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat dubbel deactiveren geeft 409"] },
] as const;
