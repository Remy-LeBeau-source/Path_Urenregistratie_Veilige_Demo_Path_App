@regressie
@api
@fase:2
Feature: Server-led beheer- en instellingenwrites in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/admin-writes.spec.ts
  # Navigatiemapping: tests/playwright/steps/admin-writes.steps.ts

  @happy
  Scenario: [ADM-WR-H-001] admin kan company/settings server-led opslaan
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [ADM-WR-H-002] admin kan beheerder server-led aanmaken en wijzigen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [ADM-WR-H-003] admin kan medewerker server-led aanmaken en bootstrap ziet deze terug
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
