// Navigation-only step definitions for F12 from .feature files.
// Executable tests remain in tests/playwright/roles-api.spec.ts.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

Given('er is geen actieve sessie', () => undefined);
Given('de administrator is ingelogd', () => undefined);
Given('de medewerker is ingelogd', () => undefined);

Then('geven bootstrap dashboard en invoices een 401 not-authenticated response', () => undefined);
Then('kan de administrator bootstrap dashboard en invoices volledig uitlezen', () => undefined);
Then('ziet de medewerker alleen eigen user employee assignment en invoice data', () => undefined);
Then('krijgt de medewerker geen volledige medewerkerslijst of brede recipient data terug', () => undefined);
