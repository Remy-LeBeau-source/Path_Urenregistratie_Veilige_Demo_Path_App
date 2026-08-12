// Navigation-only mapping for invoices-ui.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'INV-H-001', spec: 'invoices.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then facturen per periode zijn zichtbaar zonder consolefouten"] },
  { caseId: 'INV-N-005', spec: 'invoices.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then alleen eigen facturen zijn zichtbaar zonder consolefouten"] },
  { caseId: 'INV-H-002', spec: 'invoices.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then het factuuroverzicht ververst voor de gekozen periode"] },
  { caseId: 'INV-H-003', spec: 'invoices.spec.ts', assertionCount: 7, acceptanceCriteria: ["Then het bedrag komt uit server-side berekening in plaats van alleen statische demo-output"] },
  { caseId: 'INV-H-006', spec: 'invoices.spec.ts', assertionCount: 11, acceptanceCriteria: ["Then blijven het overzicht en de gekozen maand netjes gescheiden zichtbaar"] },
  { caseId: 'INV-H-007', spec: 'invoices.spec.ts', assertionCount: 10, acceptanceCriteria: ["Then toont Facturen één oranje blokkadebadge en één groene controlebadge"] },
  { caseId: 'INV-N-007', spec: 'invoices.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then geeft de API invalid-period met status 400 terug"] },
] as const;
