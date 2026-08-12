// Navigation-only mapping for database-integrity.feature.
// Database smoke remains executable through the SQL runner; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

Given('de database CRUD smoke is voorbereid', () => undefined);
When('het SQL-script wordt uitgevoerd via de DB smoke runner', () => undefined);
Then('wordt het verwachte cleanup-result bevestigd', () => undefined);

export const caseMappings = [
  { caseId: 'DB-H-001', source: 'crud-smoke.sql', runner: 'run-db-crud-smoke.mjs', assertionCount: 3, technique: 'CRUD-keten, toestandsovergang en data-integriteit' },
] as const;
