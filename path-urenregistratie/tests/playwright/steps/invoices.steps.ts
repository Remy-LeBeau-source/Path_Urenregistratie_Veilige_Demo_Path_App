// Navigation-only step definitions for F12 from .feature files.
// Executable tests remain in tests/playwright/invoices.spec.ts.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

Given('de administrator is ingelogd', () => undefined);
Given('de medewerker is ingelogd', () => undefined);
Given('een geldige Path login', () => undefined);

When('de administrator het facturenscherm opent', () => undefined);
When('de administrator wisselt tussen juli 2026 en augustus 2026', () => undefined);

Then('ziet de administrator facturen per geselecteerde periode', () => undefined);
Then('ziet de medewerker alleen eigen facturen en geen facturen van collega\'s', () => undefined);
Then('past het facturenoverzicht zich aan op de gekozen periode', () => undefined);
Then('laadt het facturenscherm zonder console- of page-errors na login', () => undefined);
