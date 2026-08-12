// Navigation-only mapping for audit-log.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'AUD-H-001', spec: 'audit-log.spec.ts', assertionCount: 7, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat admin kan auditlog ophalen"] },
  { caseId: 'AUD-H-002', spec: 'audit-log.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat auditlog filtert op entity_type"] },
  { caseId: 'AUD-H-003', spec: 'audit-log.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat auditlog filtert op event_type"] },
  { caseId: 'AUD-H-004', spec: 'audit-log.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then bevat geen enkel item een wachtwoord of token veld in event_data"] },
  { caseId: 'AUD-N-005', spec: 'audit-log.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op auditlog"] },
  { caseId: 'AUD-N-006', spec: 'audit-log.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat medewerker mag auditlog niet lezen"] },
  { caseId: 'AUD-H-007', spec: 'audit-log.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat auditlog combineert entity- en eventfilter"] },
  { caseId: 'AUD-H-008', spec: 'audit-log.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat auditlog begrenst een nullimiet op een record"] },
  { caseId: 'AUD-H-009', spec: 'audit-log.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat auditlog begrenst een hoge limiet op tweehonderd records"] },
  { caseId: 'AUD-N-010', spec: 'audit-log.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat auditlog weigert POST"] },
] as const;
