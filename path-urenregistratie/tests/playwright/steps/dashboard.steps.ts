// Navigation-only step definitions for F12 from .feature files.
// Executable tests remain in tests/playwright/dashboard.spec.ts.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

Given('de administrator is ingelogd', () => undefined);
Given('de medewerker is ingelogd', () => undefined);
Given('de dashboardweergave van Path Uren & Facturatie', () => undefined);
Given('een geldige Path login', () => undefined);

Then('ziet de administrator de open werkvoorraad en backoffice-navigatie', () => undefined);
Then('ziet de medewerker alleen het eigen dashboard en geen backoffice-overzicht', () => undefined);
Then('gebruikt het dashboard API-data wanneer beschikbaar en fallback-data wanneer nodig', () => undefined);
Then('laadt het dashboard zonder console- of page-errors na login', () => undefined);
