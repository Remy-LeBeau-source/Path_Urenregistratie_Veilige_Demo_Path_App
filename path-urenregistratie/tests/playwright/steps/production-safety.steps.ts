// Navigation-only mapping for production-safety.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'SAFE-H-001', spec: 'production-safety.spec.ts', assertionCount: 9, acceptanceCriteria: ["Then wordt alleen in lokale hintmodus een demo-wachtwoord voorgeselecteerd"] },
  { caseId: 'SAFE-N-001', spec: 'production-safety.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then bevat de frontend geen plaintext demo-credentials"] },
  { caseId: 'SAFE-N-002', spec: 'production-safety.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat writes zonder csrf blijven geblokkeerd"] },
  { caseId: 'SAFE-H-002', spec: 'production-safety.spec.ts', assertionCount: 8, acceptanceCriteria: ["Then submit met expected_version blijft werkend"] },
  { caseId: 'SAFE-N-003', spec: 'production-safety.spec.ts', assertionCount: 9, acceptanceCriteria: ["Then staan demo-migraties standaard uit in productieconfig"] },
  { caseId: 'SAFE-H-003', spec: 'production-safety.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then bevat health.php een productieguard die host en databasenaam wegfiltert"] },
  { caseId: 'SAFE-N-004', spec: 'production-safety.spec.ts', assertionCount: 6, acceptanceCriteria: ["Then bevatten beide bestanden een HTTP-blokkering voor productieomgeving"] },
  { caseId: 'SAFE-H-004', spec: 'production-safety.spec.ts', assertionCount: 5, acceptanceCriteria: ["Then staat mail.enabled standaard op false en is SMTP relay voorbereid zonder activering"] },
  { caseId: 'SAFE-N-005', spec: 'production-safety.spec.ts', assertionCount: 11, acceptanceCriteria: ["Then zijn demoaccounts en lokale uitleg niet zichtbaar","And zonder authservice blijft productie fail-closed"] },
  { caseId: 'SAFE-N-006', spec: 'production-safety.spec.ts', assertionCount: 15, acceptanceCriteria: ["Then vereist de bootstrap een herkenbare testdatabase of geïsoleerde lokale CI-database","And gebruikt de CRUD-smoke dezelfde fail-closed scheiding"] },
  { caseId: 'SAFE-N-007', spec: 'production-safety.spec.ts', assertionCount: 14, acceptanceCriteria: ["Then vereist configuratie expliciete uitvoering, bevestiging en verborgen invoer","And valideert hij DB en private storage vóór een atomische 0600-write met mail uit"] },
  { caseId: 'SAFE-H-005', spec: 'production-safety.spec.ts', assertionCount: 14, acceptanceCriteria: ["Then zijn TLS, dry-run, private storage, HSTS en niet-mutatieve checks afgedwongen"] },
] as const;
