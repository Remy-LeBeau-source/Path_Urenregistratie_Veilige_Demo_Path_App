Feature: Dashboard in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/dashboard.steps.ts

  Scenario: Admin ziet open werkvoorraad
    Given de administrator is ingelogd
    Then ziet de administrator de open werkvoorraad en backoffice-navigatie

  Scenario: Medewerker ziet eigen dashboard
    Given de medewerker is ingelogd
    Then ziet de medewerker alleen het eigen dashboard en geen backoffice-overzicht

  Scenario: Dashboard gebruikt API-data met fallback
    Given de dashboardweergave van Path Uren & Facturatie
    Then gebruikt het dashboard API-data wanneer beschikbaar en fallback-data wanneer nodig

  Scenario: Dashboard laadt zonder console errors
    Given een geldige Path login
    Then laadt het dashboard zonder console- of page-errors na login
