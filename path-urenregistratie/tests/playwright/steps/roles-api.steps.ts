// Deze step definitions zijn voorbereidende BDD-documentatie.
// De uitvoerende tests staan nu in de .spec.ts bestanden.
// Er is bewust nog geen Cucumber/BDD-runner toegevoegd.
// Zie TEST-BDD-MAPPING.md voor de koppeling tussen feature scenario's en Playwright specs.

export const rolesApiSteps = {
  zonderSessie401: 'Gebruik native Playwright request-calls en verwacht 401 not-authenticated.',
  adminVolledigeData: 'Gebruik AuthApi.login() en ReadApi.bootstrap/dashboard/invoices() voor admin.',
  employeeEigenData: 'Valideer dat employee slechts eigen user/employee/assignment/invoices ziet.',
  geenVolledigeMedewerkerlijst: 'Controleer dat employee geen brede users/employees/mail recipients terugkrijgt.',
} as const;
