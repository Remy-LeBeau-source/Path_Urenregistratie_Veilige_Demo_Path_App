@regressie
@ui
@mobile
@fase:15
Feature: Mobiele gebruikerservaring in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/mobile-ui.spec.ts
  # Navigatiemapping: tests/playwright/steps/mobile.steps.ts

  @happy
  Scenario: [MOB-H-001] mobiele login navigatie en dashboard blijven volledig bereikbaar
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [MOB-H-002] mobiele medewerker kan concepturen opslaan indienen en documentupload bereiken
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [MOB-H-003] mobiele correctie herindiening en administratieve goedkeuring zijn bereikbaar
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [MOB-N-004] mobiele facturen touch targets en modals blijven binnen viewport
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
