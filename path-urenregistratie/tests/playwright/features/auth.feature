Feature: Authenticatie in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/auth.steps.ts

  Scenario: Admin kan inloggen op Path Uren & Facturatie
    Given de Path loginpagina beschikbaar is
    When de administrator inlogt met geldige demo-credentials
    Then opent de backofficeomgeving van Path Uren & Facturatie

  Scenario: Medewerker kan inloggen op Path Uren & Facturatie
    Given de Path loginpagina beschikbaar is
    When de medewerker inlogt met geldige demo-credentials
    Then opent alleen het eigen medewerkerdashboard

  Scenario: Gebruiker kan uitloggen
    Given een ingelogde Path gebruiker
    When de gebruiker uitlogt
    Then verschijnt opnieuw het loginscherm

  Scenario: Me endpoint geeft niet-ingelogd terug na logout
    Given een ingelogde Path gebruiker
    When de gebruiker uitlogt
    Then geeft het me endpoint authenticated false terug
