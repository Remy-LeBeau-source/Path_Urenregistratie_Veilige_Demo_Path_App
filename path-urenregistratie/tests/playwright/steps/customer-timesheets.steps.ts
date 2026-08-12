// Navigation-only mapping for customer-timesheets.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'CTS-API-H-001', spec: 'customer-timesheet-api.spec.ts', assertionCount: 28, acceptanceCriteria: ["Then de medewerker kan het ingediende document teruglezen en downloaden","And cleanup: wissel naar administrator-context voor reviewstappen","And cleanup: sessie sluiten voor testisolatie"] },
  { caseId: 'CTS-API-N-006', spec: 'customer-timesheet-api.spec.ts', assertionCount: 4, acceptanceCriteria: ["And cleanup: sessie sluiten voor testisolatie","Then wordt met Playwright-assertions bevestigd dat employee kan geen klanturenstaat voor andere medewerker wijzigen"] },
  { caseId: 'CTS-API-N-007', spec: 'customer-timesheet-api.spec.ts', assertionCount: 12, acceptanceCriteria: ["Then de medewerker ook geen request_resubmit mag uitvoeren","And cleanup: sessie sluiten voor testisolatie"] },
  { caseId: 'CTS-API-H-004', spec: 'customer-timesheet-api.spec.ts', assertionCount: 9, acceptanceCriteria: ["Then restore_missing zet de status terug naar missing","And cleanup: sessie sluiten voor testisolatie"] },
  { caseId: 'CTS-API-N-005', spec: 'customer-timesheet-api.spec.ts', assertionCount: 4, acceptanceCriteria: ["And cleanup: sessie sluiten voor testisolatie","Then wordt met Playwright-assertions bevestigd dat employee krijgt 400 bij ongeldig bestandstype"] },
  { caseId: 'CTS-API-H-005', spec: 'customer-timesheet-api.spec.ts', assertionCount: 9, acceptanceCriteria: ["Then is het opgeslagen document een geldig PDF, geen JPG","And cleanup: sessie sluiten voor testisolatie"] },
  { caseId: 'CTS-API-N-008', spec: 'customer-timesheet-api.spec.ts', assertionCount: 4, acceptanceCriteria: ["And cleanup: sessie sluiten voor testisolatie","Then wordt met Playwright-assertions bevestigd dat employee krijgt 400 bij een te grote klanturenstaat-upload"] },
] as const;
