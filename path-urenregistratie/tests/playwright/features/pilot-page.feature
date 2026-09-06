@regressie
@ui
@desktop
@mobile
@fase:18
Feature: Functionele 1919-pilotportals naast de bestaande app

  # Native Playwright-uitvoering: tests/playwright/pilot-page.spec.ts
  # Navigatiemapping: tests/playwright/steps/pilot-page.steps.ts

  @happy
  Scenario: [PILOT-H-001] beide 1919-portals leven naast de bestaande app
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 13
    Given functionele 1919-pilotportals naast de bestaande app is voorbereid
    When de flow voor PILOT-H-001 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat beide 1919-portals leven naast de bestaande app

  @happy
  Scenario: [PILOT-H-002] medewerker schrijft uren via dezelfde API en draagt de maand over
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 10
    Given functionele 1919-pilotportals naast de bestaande app is voorbereid
    When de flow voor PILOT-H-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat medewerker schrijft uren via dezelfde API en draagt de maand over

  @happy
  Scenario: [PILOT-H-003] rechtstreeks gemaild blijft oranje tot Backoffice extern bevestigt
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 13
    Given functionele 1919-pilotportals naast de bestaande app is voorbereid
    When de flow voor PILOT-H-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat rechtstreeks gemaild blijft oranje tot Backoffice extern bevestigt

  @happy
  Scenario: [PILOT-H-004] PDF-aanlevering komt bij Backoffice ter controle en kan worden goedgekeurd
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given functionele 1919-pilotportals naast de bestaande app is voorbereid
    When de flow voor PILOT-H-004 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat pDF-aanlevering komt bij Backoffice ter controle en kan worden goedgekeurd

  @happy
  Scenario: [PILOT-H-005] Backoffice-correctie maakt de ingediende maand weer bewerkbaar
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given functionele 1919-pilotportals naast de bestaande app is voorbereid
    When de flow voor PILOT-H-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat backoffice-correctie maakt de ingediende maand weer bewerkbaar

  @happy
  Scenario: [PILOT-H-006] maandkeuze blijft in de sessie en uitloggen herstelt de actuele maand
    # Testtechniek: Herstelbaarheid + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given functionele 1919-pilotportals naast de bestaande app is voorbereid
    When de flow voor PILOT-H-006 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat maandkeuze blijft in de sessie en uitloggen herstelt de actuele maand

  @negative
  Scenario: [PILOT-N-001] rollen blijven ook op de pilot-URLs strikt gescheiden
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given functionele 1919-pilotportals naast de bestaande app is voorbereid
    When de flow voor PILOT-N-001 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat rollen blijven ook op de pilot-URLs strikt gescheiden

  @negative
  Scenario: [PILOT-N-002] beide pilots blijven bedienbaar zonder horizontale overflow op telefoon
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 7
    Given functionele 1919-pilotportals naast de bestaande app is voorbereid
    When de flow voor PILOT-N-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat beide pilots blijven bedienbaar zonder horizontale overflow op telefoon
