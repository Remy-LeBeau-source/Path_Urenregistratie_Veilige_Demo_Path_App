Feature: Authenticatie en sessiebeheer in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/auth.steps.ts

  Scenario: [AUTH-001] Administrator logt succesvol in en ziet backoffice
    Given de Path loginpagina beschikbaar is
    When de administrator inlogt met geldige inloggegevens
    Then ziet de administrator de backofficeomgeving van Path Uren & Facturatie

  Scenario: [AUTH-002] Medewerker logt succesvol in en ziet alleen eigen omgeving
    Given de Path loginpagina beschikbaar is
    When de medewerker inlogt met geldige inloggegevens
    Then ziet de medewerker alleen het eigen dashboard

  Scenario: [AUTH-003] Ingelogde gebruiker kan veilig uitloggen
    Given een ingelogde Path gebruiker
    When de gebruiker uitlogt
    Then verschijnt opnieuw het loginscherm

  Scenario: [AUTH-004] Auth me endpoint meldt geen sessie na uitloggen
    Given een ingelogde Path gebruiker
    When de gebruiker uitlogt
    Then geeft het auth me endpoint authenticated false zonder actieve sessie terug
