// Navigation-only mapping for security.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'SEC-H-001', spec: 'security.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then ontvangt de client een geldige csrf-token payload"] },
  { caseId: 'SEC-H-002', spec: 'security.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then ontstaat een geldige administrator-sessie"] },
  { caseId: 'SEC-H-003', spec: 'security.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt de sessie netjes afgesloten"] },
  { caseId: 'SEC-N-001', spec: 'security.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then geeft de server csrf-invalid met status 403 terug"] },
  { caseId: 'SEC-N-002', spec: 'security.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then geeft de server csrf-invalid met status 403 terug"] },
  { caseId: 'SEC-N-003', spec: 'security.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then geeft de server invalid-payload met status 400 terug"] },
  { caseId: 'SEC-N-004', spec: 'security.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat zonder sessie protected API blijft 401"] },
  { caseId: 'SEC-H-004', spec: 'security.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat csrf-token blijft stabiel binnen dezelfde sessie"] },
  { caseId: 'SEC-N-005', spec: 'security.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat csrf-endpoint weigert POST"] },
  { caseId: 'SEC-N-006', spec: 'security.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat login-endpoint weigert GET"] },
  { caseId: 'SEC-N-007', spec: 'security.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat logout-endpoint weigert GET"] },
  { caseId: 'SEC-H-005', spec: 'security.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat sessiecode bevat expliciete timeout-check en sliding expiration"] },
  { caseId: 'SEC-H-006', spec: 'security.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat herhaalde mislukte loginpogingen maken security-audit event"] },
  { caseId: 'SEC-H-007', spec: 'security.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat config voorbeeld bevat voorbereide CSP/CORS/HSTS flags"] },
] as const;
