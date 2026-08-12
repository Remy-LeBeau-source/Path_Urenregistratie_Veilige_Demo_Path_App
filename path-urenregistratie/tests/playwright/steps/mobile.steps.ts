// Navigation-only mapping for mobile.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'MOB-H-001', spec: 'mobile-ui.spec.ts', assertionCount: 22, acceptanceCriteria: ["Then Home en rolwissel blijven bereikbaar zonder console- of page-errors"] },
  { caseId: 'MOB-H-002', spec: 'mobile-ui.spec.ts', assertionCount: 14, acceptanceCriteria: ["Then klanturenstaat en notificaties blijven mobiel bereikbaar"] },
  { caseId: 'MOB-H-003', spec: 'mobile-ui.spec.ts', assertionCount: 13, acceptanceCriteria: ["Then de medewerker de melding leest aanpast en opnieuw indient","And de administrator mobiel goedkeurt"] },
  { caseId: 'MOB-N-004', spec: 'mobile-ui.spec.ts', assertionCount: 13, acceptanceCriteria: ["Then de brede factuurtabel als mobiele kaartweergave rendert","And touch controls en bevestigingsmodal binnen viewport blijven"] },
] as const;
