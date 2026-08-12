// Navigation-only mapping for email-queue.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'EQ-H-001', spec: 'email-queue.spec.ts', assertionCount: 5, acceptanceCriteria: ["Then zijn er queue-items voor deze factuur met dry_run=true en status queued","And cleanup"] },
  { caseId: 'EQ-H-002', spec: 'email-queue.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then heeft de broker-channel attachment_policy=invoice_and_customer_timesheet","And cleanup"] },
  { caseId: 'EQ-H-003', spec: 'email-queue.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then heeft elke EasySalary-item attachment_policy=none","And cleanup"] },
  { caseId: 'EQ-H-004', spec: 'email-queue.spec.ts', assertionCount: 6, acceptanceCriteria: ["Then zijn de nieuwe items in de queue zichtbaar per invoiceId","And cleanup"] },
  { caseId: 'EQ-H-005', spec: 'email-queue.spec.ts', assertionCount: 14, acceptanceCriteria: ["And cleanup","Then wordt met Playwright-assertions bevestigd dat action=list response bevat verplichte velden"] },
  { caseId: 'EQ-N-006', spec: 'email-queue.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op list"] },
  { caseId: 'EQ-N-007', spec: 'email-queue.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat medewerker krijgt 403 op list"] },
  { caseId: 'EQ-N-008', spec: 'email-queue.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat action=enqueue zonder invoice_id geeft 400"] },
  { caseId: 'EQ-N-009', spec: 'email-queue.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat action=enqueue niet-bestaande factuur geeft 404"] },
  { caseId: 'EQ-N-010', spec: 'email-queue.spec.ts', assertionCount: 2, acceptanceCriteria: ["And cleanup","Then wordt met Playwright-assertions bevestigd dat action=enqueue niet-gelockte factuur geeft 409"] },
  { caseId: 'EQ-N-011', spec: 'email-queue.spec.ts', assertionCount: 3, acceptanceCriteria: ["And cleanup","Then wordt met Playwright-assertions bevestigd dat action=retry op queued item geeft 409"] },
  { caseId: 'EQ-N-012', spec: 'email-queue.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat ongeldige status-filter geeft 400"] },
  { caseId: 'EQ-N-013', spec: 'email-queue.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat anonieme enqueue geeft 401"] },
  { caseId: 'EQ-N-014', spec: 'email-queue.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat unknown action geeft 400"] },
] as const;
