// Deze step definitions zijn voorbereidende BDD-documentatie.
// De uitvoerende tests staan nu in de .spec.ts bestanden.
// Er is bewust nog geen Cucumber/BDD-runner toegevoegd.
// Zie TEST-BDD-MAPPING.md voor de koppeling tussen feature scenario's en Playwright specs.

export const dashboardSteps = {
  adminWerkvoorraad: 'Gebruik DashboardPage.assertAdminDashboardVisible() voor de backofficeweergave.',
  medewerkerEigenDashboard: 'Gebruik DashboardPage.assertEmployeeDashboardVisible() voor de medewerkerweergave.',
  apiFallback: 'De native dashboard spec blijft leidend; fallback is functionele documentatie voor deze app.',
  geenConsoleErrors: 'Meet console/page errors na login en verwacht geen nieuwe fouten.',
} as const;
