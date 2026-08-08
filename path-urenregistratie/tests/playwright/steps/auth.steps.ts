// Navigation-only step definitions for F12 from .feature files.
// Executable tests remain in tests/playwright/auth.spec.ts.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

Given('de Path loginpagina beschikbaar is', () => undefined);
Given('een ingelogde Path gebruiker', () => undefined);

When('de administrator inlogt met geldige demo-credentials', () => undefined);
When('de medewerker inlogt met geldige demo-credentials', () => undefined);
When('de gebruiker uitlogt', () => undefined);

Then('opent de backofficeomgeving van Path Uren & Facturatie', () => undefined);
Then('opent alleen het eigen medewerkerdashboard', () => undefined);
Then('verschijnt opnieuw het loginscherm', () => undefined);
Then('geeft het me endpoint authenticated false terug', () => undefined);
