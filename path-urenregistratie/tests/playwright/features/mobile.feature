@regressie
@ui
@mobile
@fase:15
Feature: Mobiele gebruikerservaring in Path Uren & Facturatie

  # Native Playwright-uitvoering:
  # tests/playwright/mobile-ui.spec.ts
  #
  # Deviceprojecten:
  # Pixel 7 / Chromium
  # iPhone 13 / WebKit

  Gebruikers van Path Uren & Facturatie willen de belangrijkste functies
  ook op mobiel kunnen gebruiken, zodat de applicatie bruikbaar blijft
  op telefoonformaat.

  @happy
  Scenario: [MOB-H-001] Mobiele login, navigatie en dashboard blijven bereikbaar
    Given de mobiele loginpagina is volledig zichtbaar
    When een administrator inlogt en de mobiele navigatie gebruikt
    Then blijven dashboard, Home en rolwissel zonder overflow bereikbaar

  @happy
  Scenario: [MOB-H-002] Medewerker dient mobiel uren in en bereikt upload en notificaties
    Given een medewerker een mobiele schrijfbare maand heeft
    When de medewerker uren opslaat en indient
    Then blijven klanturenstaat-upload en notificaties bereikbaar

  @happy
  Scenario: [MOB-H-003] Mobiele correctie, herindiening en goedkeuring werken
    Given een medewerker mobiel uren heeft ingediend
    When een administrator correctie vraagt en de medewerker opnieuw indient
    Then kan de administrator de herindiening mobiel goedkeuren

  @negative
  Scenario: [MOB-N-004] Facturen, touch controls en modals blijven binnen de viewport
    Given een administrator het mobiele factuuroverzicht opent
    When factuurkaarten en een bevestigingsmodal worden weergegeven
    Then blijven kaartinhoud, touch controls en bevestiging binnen de viewport