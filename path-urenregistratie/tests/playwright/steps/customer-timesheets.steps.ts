// Navigation-only step definitions for customer-timesheet scenarios.
// Executable tests remain in tests/playwright/customer-timesheet-api.spec.ts.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

Given('een ingelogde medewerker met een schrijfbare klanturenstaatperiode', () => undefined);
Given('een bestaande draft klanturenstaat in de testperiode', () => undefined);
Given('een ingediende klanturenstaat met bekende employee en assignment', () => undefined);
Given('een ingelogde medewerker met een bestaande klanturenstaat in conceptstatus', () => undefined);
Given('een medewerker met een open klanturenstaatperiode', () => undefined);
Given('een ingelogde medewerker', () => undefined);
Given('een ingelogde medewerker met een ingediende klanturenstaat', () => undefined);

When('de medewerker een PDF als save_draft uploadt', () => undefined);
When('de medewerker submit uitvoert zonder nieuw bestand', () => undefined);
When('de administrator approve en request_resubmit uitvoert', () => undefined);
When('de medewerker mark_skipped uitvoert met een reden en daarna restore_missing uitvoert', () => undefined);
When('de medewerker een tekstbestand probeert te uploaden', () => undefined);
When('de medewerker save_draft uitvoert met een andere employee_id', () => undefined);
When('de medewerker approve of request_resubmit probeert uit te voeren', () => undefined);

Then('wordt de klanturenstaat als draft met bestandsmetadata opgeslagen', () => undefined);
Then('wordt de klanturenstaat received en downloadbaar teruggegeven', () => undefined);
Then('wordt de status eerst approved en daarna resubmit met review_note', () => undefined);
Then('staat de klanturenstaat weer op missing', () => undefined);
Then('krijgt de medewerker invalid-upload met status 400', () => undefined);
Then('krijgt de medewerker een forbidden-employee-scope response', () => undefined);
Then('krijgt de medewerker forbidden-action', () => undefined);
