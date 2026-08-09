@regressie
@integration
@fase:11
Feature: Definitieve facturen en locking in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/invoice-lock.spec.ts
  # Navigatiemapping: tests/playwright/steps/invoice-locking.steps.ts

  @happy
  Scenario: [INV-H-004] admin lockt approved timesheet naar definitieve immutable factuur
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [INV-N-008] anonieme gebruiker kan factuur niet locken
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [INV-N-009] medewerker mag factuur niet finaliseren
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [INV-N-010] niet-goedgekeurde urenstaat kan niet worden gelockt
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [INV-N-011] tweede lock-oproep op dezelfde factuur wordt geblokkeerd
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [INV-N-012] gelijktijdige lock-requests leveren exact één winnaar
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
