// Navigation-only mapping for invoice-locking.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'INV-H-004', spec: 'invoice-lock.spec.ts', assertionCount: 20, acceptanceCriteria: ["And een administrator die urenstaat goedkeurt","Then worden nummer bedragen en locked_at server-side vastgelegd en blijft client-manipulatie zonder effect","And de administrator kan de server-side gegenereerde factuur-PDF downloaden","And cleanup de administrator-sessie wordt afgesloten"] },
  { caseId: 'INV-N-015', spec: 'invoice-lock.spec.ts', assertionCount: 9, acceptanceCriteria: ["And Backoffice de uren goedkeurt en de factuur definitief maakt","Then de definitieve factuur en urenstatus onveranderd blijven"] },
  { caseId: 'INV-N-008', spec: 'invoice-lock.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker kan factuur niet locken"] },
  { caseId: 'INV-N-009', spec: 'invoice-lock.spec.ts', assertionCount: 3, acceptanceCriteria: ["And cleanup de sessie wordt afgesloten","Then wordt met Playwright-assertions bevestigd dat medewerker mag factuur niet finaliseren"] },
  { caseId: 'INV-N-010', spec: 'invoice-lock.spec.ts', assertionCount: 3, acceptanceCriteria: ["And cleanup de administrator-sessie wordt afgesloten","Then wordt met Playwright-assertions bevestigd dat niet-goedgekeurde urenstaat kan niet worden gelockt"] },
  { caseId: 'INV-N-011', spec: 'invoice-lock.spec.ts', assertionCount: 5, acceptanceCriteria: ["Then wordt een tweede lock-oproep geweigerd en ontstaat geen duplicaat","And cleanup de administrator-sessie wordt afgesloten"] },
  { caseId: 'INV-N-012', spec: 'invoice-lock.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat gelijktijdige lock-requests leveren exact één winnaar"] },
  { caseId: 'INV-N-013', spec: 'invoice-lock.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker kan factuur-PDF niet downloaden"] },
] as const;
