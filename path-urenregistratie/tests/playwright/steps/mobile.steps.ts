// Navigation-only step definitions for mobile.feature.
// Executable tests remain in tests/playwright/mobile-ui.spec.ts.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

// [MOB-H-001] in mobile.feature -> [MOB-H-001] in mobile-ui.spec.ts
Given('de mobiele loginpagina is volledig zichtbaar', () => undefined);
When('een administrator inlogt en de mobiele navigatie gebruikt', () => undefined);
Then('blijven dashboard, Home en rolwissel zonder overflow bereikbaar', () => undefined);

// [MOB-H-002] in mobile.feature -> [MOB-H-002] in mobile-ui.spec.ts
Given('een medewerker een mobiele schrijfbare maand heeft', () => undefined);
When('de medewerker uren opslaat en indient', () => undefined);
Then('blijven klanturenstaat-upload en notificaties bereikbaar', () => undefined);

// [MOB-H-003] in mobile.feature -> [MOB-H-003] in mobile-ui.spec.ts
Given('een medewerker mobiel uren heeft ingediend', () => undefined);
When('een administrator correctie vraagt en de medewerker opnieuw indient', () => undefined);
Then('kan de administrator de herindiening mobiel goedkeuren', () => undefined);

// [MOB-N-004] in mobile.feature -> [MOB-N-004] in mobile-ui.spec.ts
Given('een administrator het mobiele factuuroverzicht opent', () => undefined);
When('factuurkaarten en een bevestigingsmodal worden weergegeven', () => undefined);
Then('blijven kaartinhoud, touch controls en bevestiging binnen de viewport', () => undefined);