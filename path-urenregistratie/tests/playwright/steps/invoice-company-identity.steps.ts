// Navigation-only mapping for invoice-company-identity.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'INV-ID-H-001', spec: 'invoice-company-identity.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat handelsnaam en juridische naam staan samen op de factuurpreview"] },
  { caseId: 'INV-ID-H-002', spec: 'invoice-company-identity.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat alleen juridische naam is als factuurweergave te kiezen"] },
  { caseId: 'INV-ID-H-003', spec: 'invoice-company-identity.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat factuuridentiteit wordt door settings API opgeslagen en via bootstrap herladen"] },
  { caseId: 'INV-ID-N-004', spec: 'invoice-company-identity.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat settings API weigert een onbekende factuurweergave"] },
  { caseId: 'INV-ID-H-005', spec: 'invoice-company-identity.spec.ts', assertionCount: 8, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat instellingen tonen verkoopklare bedrijfsidentiteit en beveiligde verzendmodus"] },
] as const;
