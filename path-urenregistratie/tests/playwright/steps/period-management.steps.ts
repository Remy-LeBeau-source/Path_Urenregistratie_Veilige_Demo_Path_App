// Navigation-only mapping for period-management.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'PER-H-001', spec: 'period-management.spec.ts', assertionCount: 6, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat admin kan periodes ophalen met overzicht"] },
  { caseId: 'PER-H-002', spec: 'period-management.spec.ts', assertionCount: 9, acceptanceCriteria: ["Then is de periode gesloten","And heropenen werkt"] },
  { caseId: 'PER-N-003', spec: 'period-management.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op periods"] },
  { caseId: 'PER-N-004', spec: 'period-management.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat medewerker mag geen periodes beheren"] },
  { caseId: 'PER-N-005', spec: 'period-management.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat dubbel sluiten van periode geeft 409"] },
  { caseId: 'PER-N-006', spec: 'period-management.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat heropenen van open periode geeft 409"] },
  { caseId: 'PER-N-007', spec: 'period-management.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat driecijferig jaar geeft 400"] },
  { caseId: 'PER-N-008', spec: 'period-management.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat vijfcijferig jaar geeft 400"] },
  { caseId: 'PER-N-009', spec: 'period-management.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat ongeldige maand geeft 400"] },
  { caseId: 'PER-N-010', spec: 'period-management.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat onbekende periodeactie geeft 400"] },
] as const;
