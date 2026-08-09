@auth @api
Feature: Authenticatie en sessiebeheer in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/auth.steps.ts
# Dit featurebestand dekt login, logout en sessievalidatie via auth/me.
# Hash-overzicht testcase-doel:
# [AUTH-H-001] Administrator kan inloggen en krijgt backoffice-context.
# [AUTH-H-002] Medewerker kan inloggen met correcte rolscope.
# [AUTH-H-003] Uitloggen sluit de sessie en brengt gebruiker terug naar login.
# [AUTH-N-004] Na logout bevestigt auth/me dat er geen actieve sessie meer is.
# [AUTH-H-005] Auth me toont sessiecontext direct na geldige login.
# [AUTH-N-006] Ongeldige login wordt geweigerd zonder sessieopbouw.

  # Happy flows

  Scenario: [AUTH-H-001] Administrator logt succesvol in en ziet backoffice
    Given de Path loginpagina beschikbaar is zodat authenticatie gestart kan worden
    When de administrator inlogt met geldige inloggegevens
    Then ziet de administrator de backofficeomgeving van Path Uren & Facturatie zodat beheeracties mogelijk zijn

  Scenario: [AUTH-H-002] Medewerker logt succesvol in en ziet alleen eigen omgeving
    Given de Path loginpagina beschikbaar is zodat authenticatie gestart kan worden
    When de medewerker inlogt met geldige inloggegevens
    Then ziet de medewerker alleen het eigen dashboard zodat rolafbakening behouden blijft

  Scenario: [AUTH-H-003] Ingelogde gebruiker kan veilig uitloggen
    Given een ingelogde Path gebruiker met een actieve sessie
    When de gebruiker uitlogt
    Then verschijnt opnieuw het loginscherm zodat de sessie aantoonbaar is beëindigd

  Scenario: [AUTH-H-005] Auth me bevestigt direct de actieve sessie na login
    Given de Path loginpagina beschikbaar is zodat authenticatie gestart kan worden
    When de gebruiker inlogt met geldige gegevens en auth me opvraagt
    Then toont auth me authenticated true met de juiste rol en gebruiker zodat sessiecontext direct verifieerbaar is

  # Negative flows

  Scenario: [AUTH-N-004] Auth me endpoint meldt geen sessie na uitloggen
    Given een ingelogde Path gebruiker met een actieve sessie
    When de gebruiker uitlogt
    Then geeft het auth me endpoint authenticated false zonder actieve sessie terug zodat vervolgcalls niet geautoriseerd zijn

  Scenario: [AUTH-N-006] Ongeldige inloggegevens maken geen actieve sessie
    Given de Path loginpagina beschikbaar is zodat authenticatie gestart kan worden
    When een gebruiker inlogt met een ongeldig wachtwoord
    Then geeft de loginflow een fout en blijft auth me authenticated false zodat ongewenste sessieopbouw wordt voorkomen

