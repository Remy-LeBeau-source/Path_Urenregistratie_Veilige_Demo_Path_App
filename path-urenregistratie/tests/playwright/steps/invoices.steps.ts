// Deze step definitions zijn voorbereidende BDD-documentatie.
// De uitvoerende tests staan nu in de .spec.ts bestanden.
// Er is bewust nog geen Cucumber/BDD-runner toegevoegd.
// Zie TEST-BDD-MAPPING.md voor de koppeling tussen feature scenario's en Playwright specs.

export const invoiceSteps = {
  adminFacturen: 'Gebruik InvoicesPage.open() en InvoicesPage.assertRowsVisible() voor admin.',
  medewerkerEigenFacturen: 'Valideer de employee-beperking via de bestaande read-only API en appflow.',
  periodefilter: 'Gebruik InvoicesPage.selectPeriod(\'2026-07\') en InvoicesPage.selectPeriod(\'2026-08\').',
  geenConsoleErrors: 'Controleer console/page errors nadat het facturenscherm geladen is.',
} as const;
