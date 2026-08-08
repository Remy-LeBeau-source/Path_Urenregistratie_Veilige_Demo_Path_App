Feature: Dashboard in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/dashboard.steps.ts

  Scenario: Admin ziet open werkvoorraad
    Gegeven de administrator is ingelogd
    Dan ziet de administrator de open werkvoorraad en backoffice-navigatie

  Scenario: Medewerker ziet eigen dashboard
    Gegeven de medewerker is ingelogd
    Dan ziet de medewerker alleen het eigen dashboard en geen backoffice-overzicht

  Scenario: Dashboard gebruikt API-data met fallback
    Gegeven de dashboardweergave van Path Uren & Facturatie
    Dan gebruikt het dashboard API-data wanneer beschikbaar en fallback-data wanneer nodig

  Scenario: Dashboard laadt zonder console errors
    Gegeven een geldige Path login
    Dan laadt het dashboard zonder console- of page-errors na login
