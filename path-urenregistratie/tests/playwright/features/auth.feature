@regressie
@ui
@desktop
@fase:4
Feature: Inloggen, uitloggen en sessiebeheer

  # Native Playwright-uitvoering: tests/playwright/auth.spec.ts
  # Navigatiemapping: tests/playwright/steps/auth.steps.ts

  @happy
  Scenario: [AUTH-H-001] Admin logt in en auth/me geeft de juiste gebruiker terug
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de Path loginpagina beschikbaar is
    When de administrator inlogt met geldige inloggegevens
    Then auth/me bevestigt administrator sessie en juiste gebruiker

  @happy
  Scenario: [AUTH-H-002] Medewerker logt in en auth/me geeft de juiste gebruiker terug
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de Path loginpagina beschikbaar is
    When de medewerker inlogt met geldige inloggegevens
    Then auth/me bevestigt medewerkersessie en juiste gebruiker

  @happy
  Scenario: [AUTH-H-003] Gebruiker logt uit en auth/me geeft authenticated false terug
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een ingelogde Path gebruiker
    When de gebruiker uitlogt
    Then auth/me geeft authenticated false en geen actieve user

  @happy
  Scenario: [AUTH-H-004] Lokale beheeraccount wordt automatisch ingevuld en opent na een klik
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de lokale Path loginpagina beschikbaar is
    Then de gekozen beheeraccount automatisch is ingevuld
    When de gebruiker eenmaal op Inloggen klikt
    Then het beheerdersdashboard opent

  @negative
  Scenario: [AUTH-N-005] onbekend account geeft dezelfde generieke loginfout
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 3
    Given inloggen, uitloggen en sessiebeheer is voorbereid
    When de flow voor AUTH-N-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat onbekend account geeft dezelfde generieke loginfout

  @negative
  Scenario: [AUTH-N-006] ongeldig e-mailformaat wordt als invalid-payload geweigerd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given inloggen, uitloggen en sessiebeheer is voorbereid
    When de flow voor AUTH-N-006 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat ongeldig e-mailformaat wordt als invalid-payload geweigerd

  @negative
  Scenario: [AUTH-N-007] vijf mislukte logins tonen een servergestuurde aftelling
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given vijf mislukte pogingen voor hetzelfde account zijn geregistreerd
    When opnieuw via het loginformulier wordt geprobeerd
    Then toont de UI de resterende blokkeertijd en blijft het formulier bruikbaar voor een ander account

  @negative
  Scenario: [AUTH-N-008] de inlogblokkade en aftelling blijven zichtbaar na herladen
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given het account door vijf mislukte pogingen is geblokkeerd
    When de pagina met F5 wordt herladen
    Then blijft de aflopende blokkade zichtbaar en blijft de server leidend
