// Navigation-only step definitions for F12 from .feature files.
// Executable tests remain in tests/playwright/timesheet-write.spec.ts.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

Given('een ingelogde medewerker met een schrijfbare testperiode', () => undefined);
Given('een bestaande draft urenstaat in de testperiode', () => undefined);
Given('een draft urenstaat van de ingelogde medewerker', () => undefined);
Given('een ingelogde medewerker', () => undefined);
Given('een medewerker dient een draft urenstaat in', () => undefined);
Given('een ingediende urenstaat', () => undefined);
Given('een ingediende urenstaat met bekende versie', () => undefined);
Given('een urenstaat in correction met open correctieverzoek', () => undefined);
Given('een ingediende urenstaat na herindiening met bekende versie', () => undefined);

When('de medewerker save_draft uitvoert met geldige daguren', () => undefined);
When('de medewerker de urenstaat terugleest', () => undefined);
When('de medewerker submit uitvoert', () => undefined);
When('de medewerker een andere employee_id probeert te schrijven', () => undefined);
When('de urenstaat opnieuw wordt uitgelezen', () => undefined);
When('de medewerker opnieuw save_draft of submit probeert', () => undefined);
When('de administrator request_correction uitvoert met de juiste expected_version', () => undefined);
When('de medewerker submit uitvoert met de juiste expected_version', () => undefined);
When('de administrator approve uitvoert met de juiste expected_version', () => undefined);
When('request_correction of approve met verouderde expected_version wordt uitgevoerd', () => undefined);

Then('wordt de urenstaat als draft opgeslagen', () => undefined);
Then('ziet de medewerker de opgeslagen draftstatus en laatste audit-event', () => undefined);
Then('wordt de urenstaat submitted met submitted_at', () => undefined);
Then('krijgt de medewerker een forbidden response', () => undefined);
Then('is het laatste audit-event timesheet.submitted', () => undefined);
Then('krijgt de medewerker een conflictresponse', () => undefined);
Then('wordt de urenstaat correction met correctiebericht en audit-event', () => undefined);
Then('wordt de urenstaat opnieuw submitted en correctie als resubmitted gemarkeerd', () => undefined);
Then('wordt de urenstaat approved met approved_at approved_by en audit-event', () => undefined);
Then('krijgt de gebruiker een stale-version conflictresponse', () => undefined);
