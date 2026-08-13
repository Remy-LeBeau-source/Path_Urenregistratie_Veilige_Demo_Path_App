// Navigation-only mapping for password-reset.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'PWD-H-001', spec: 'password-reset.spec.ts', assertionCount: 12, acceptanceCriteria: ["Then kan het token worden gebruikt om wachtwoord te resetten"] },
  { caseId: 'PWD-H-002', spec: 'password-reset.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat onbekend e-mailadres retourneert ook ok=true (geen email-enumeration)"] },
  { caseId: 'PWD-H-003', spec: 'password-reset.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then bevat me.php het force_password_change veld"] },
  { caseId: 'PWD-H-004', spec: 'password-reset.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then kan het wachtwoord via dezelfde beveiligde flow worden teruggezet"] },
  { caseId: 'PWD-H-005', spec: 'password-reset.spec.ts', assertionCount: 8, acceptanceCriteria: ["Then is het wachtwoord gewijzigd en kan dezelfde link niet opnieuw worden gebruikt"] },
  { caseId: 'PWD-N-010', spec: 'password-reset.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then blijft de gebruiker op het formulier met een duidelijke validatiemelding"] },
  { caseId: 'PWD-N-011', spec: 'password-reset.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat elf tekens ligt onder de wachtwoordgrens van twaalf"] },
  { caseId: 'PWD-N-004', spec: 'password-reset.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat reset-password met ongeldig token geeft 400"] },
  { caseId: 'PWD-N-005', spec: 'password-reset.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat reset-password onder twaalf tekens geeft 400"] },
  { caseId: 'PWD-N-006', spec: 'password-reset.spec.ts', assertionCount: 3, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat hergebruik van al-gebruikt token geeft 409"] },
  { caseId: 'PWD-N-007', spec: 'password-reset.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt de 6e poging geblokkeerd met 429"] },
  { caseId: 'PWD-N-008', spec: 'password-reset.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat request-reset weigert GET"] },
  { caseId: 'PWD-N-009', spec: 'password-reset.spec.ts', assertionCount: 2, acceptanceCriteria: ["Then wordt met Playwright-assertions bevestigd dat request-reset met leeg e-mailadres geeft 400"] },
] as const;
