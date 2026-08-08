Feature: Dashboardweergave in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/dashboard.steps.ts

  Scenario: Administrator ziet open werkvoorraad en beheeropties
    Given de administrator is ingelogd
    Then ziet de administrator open werkvoorraad en backoffice-navigatie

  Scenario: Medewerker ziet alleen eigen dashboardinformatie
    Given de medewerker is ingelogd
    Then ziet de medewerker het eigen dashboard zonder backoffice-overzicht

  Scenario: Dashboard gebruikt API-data met veilige fallback
    Given de dashboardweergave van Path Uren & Facturatie
    Then gebruikt het dashboard API-data wanneer beschikbaar en fallback-data wanneer nodig

  Scenario: Dashboard laadt zonder console of page errors
    Given een geldige Path login
    Then laadt het dashboard zonder console- of page-errors na inloggen
