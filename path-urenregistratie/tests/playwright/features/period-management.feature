@regressie
@api
@fase:15
Feature: Periodebeheer via API in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/period-management.spec.ts
  # Navigatiemapping: tests/playwright/steps/period-management.steps.ts

  @happy
  Scenario: [PER-H-001] admin kan periodes ophalen met overzicht
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [PER-H-002] admin kan periode sluiten en heropenen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PER-N-003] anonieme gebruiker krijgt 401 op periods
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PER-N-004] medewerker mag geen periodes beheren
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PER-N-005] dubbel sluiten van periode geeft 409
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PER-N-006] heropenen van open periode geeft 409
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PER-N-007] driecijferig jaar geeft 400
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PER-N-008] vijfcijferig jaar geeft 400
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PER-N-009] ongeldige maand geeft 400
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PER-N-010] onbekende periodeactie geeft 400
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
