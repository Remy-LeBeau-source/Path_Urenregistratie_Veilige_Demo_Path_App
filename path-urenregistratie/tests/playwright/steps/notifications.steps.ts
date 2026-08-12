// Navigation-only mapping for notifications.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'NOT-H-001', spec: 'notifications.spec.ts', assertionCount: 5, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat ingelogde gebruiker kan notificaties ophalen"] },
  { caseId: 'NOT-H-002', spec: 'notifications.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat mark_all_read werkt zonder fouten"] },
  { caseId: 'NOT-N-003', spec: 'notifications.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op notificaties"] },
  { caseId: 'NOT-N-004', spec: 'notifications.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat unknown action geeft 400"] },
  { caseId: 'NOT-H-005', spec: 'notifications.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat notificatielimiet wordt op minimaal een begrensd"] },
  { caseId: 'NOT-H-006', spec: 'notifications.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat unread-filter retourneert uitsluitend ongelezen meldingen"] },
  { caseId: 'NOT-N-007', spec: 'notifications.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat mark_read zonder notification_id geeft 400"] },
  { caseId: 'NOT-H-008', spec: 'notifications.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat mark_read voor onbekende melding wijzigt nul records"] },
] as const;
