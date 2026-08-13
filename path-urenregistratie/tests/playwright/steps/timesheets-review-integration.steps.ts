// Navigation-only mapping for timesheets-review-integration.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'TS-REV-API-H-005', spec: 'timesheet-review-flow.spec.ts', assertionCount: 65, acceptanceCriteria: ["And de reviewcontext wisselt naar administrator","Then een verouderde correctie-aanvraag wordt geblokkeerd met stale-version","Then een tweede correctie op dezelfde versie wordt geweigerd","And de context wisselt terug naar medewerker voor herindiening","Then een medewerker mag geen admin-reviewactie uitvoeren","And de context wisselt opnieuw naar administrator voor goedkeuring","Then een verouderde approve-aanvraag wordt geblokkeerd met stale-version","Then read-back toont approved status met volledige audit- en correctiehistorie","And een goedkeuring zonder factuur server-side kan worden heropend voor correctie","And cleanup: sessie sluiten voor testisolatie"] },
  { caseId: 'TS-REV-API-H-006', spec: 'timesheet-review-flow.spec.ts', assertionCount: 7, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat gelijktijdige approve-requests door twee beheerders leveren exact één winnaar"] },
  { caseId: 'TS-REV-API-H-007', spec: 'timesheet-review-flow.spec.ts', assertionCount: 7, acceptanceCriteria: ["And cleanup: sessie sluiten voor testisolatie","Then wordt met Playwright-assertions bevestigd dat jaarwisseling december naar januari verwerkt urenstaten correct over de jaargrens"] },
] as const;
