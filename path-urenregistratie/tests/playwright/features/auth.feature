Feature: Authenticatie in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/auth.steps.ts

  Scenario: Admin kan inloggen op Path Uren & Facturatie
    Gegeven de Path loginpagina beschikbaar is
    Als de administrator inlogt met geldige demo-credentials
    Dan opent de backofficeomgeving van Path Uren & Facturatie

  Scenario: Medewerker kan inloggen op Path Uren & Facturatie
    Gegeven de Path loginpagina beschikbaar is
    Als de medewerker inlogt met geldige demo-credentials
    Dan opent alleen het eigen medewerkerdashboard

  Scenario: Gebruiker kan uitloggen
    Gegeven een ingelogde Path gebruiker
    Als de gebruiker uitlogt
    Dan verschijnt opnieuw het loginscherm

  Scenario: Me endpoint geeft niet-ingelogd terug na logout
    Gegeven een ingelogde Path gebruiker
    Als de gebruiker uitlogt
    Dan geeft het me endpoint authenticated false terug
