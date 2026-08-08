// Deze step definitions zijn voorbereidende BDD-documentatie.
// De uitvoerende tests staan nu in de .spec.ts bestanden.
// Er is bewust nog geen Cucumber/BDD-runner toegevoegd.
// Zie TEST-BDD-MAPPING.md voor de koppeling tussen feature scenario's en Playwright specs.

export const authSteps = {
  gegevenPathLoginpagina: 'De Path loginpagina is beschikbaar via de native Playwright LoginPage.',
  alsAdminInlogt: 'Gebruik LoginPage.loginAsAdmin() en valideer daarna de ingelogde sessie.',
  alsMedewerkerInlogt: 'Gebruik LoginPage.loginAsEmployee() en valideer daarna het medewerkerdashboard.',
  danUitgelogd: 'Gebruik LoginPage.logout() gevolgd door LoginPage.assertLoggedOut().',
  danMeNietIngelogd: 'Controleer /server/auth/me.php via browsercontext na logout.',
} as const;
