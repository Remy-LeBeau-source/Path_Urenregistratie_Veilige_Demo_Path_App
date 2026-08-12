@regressie
@ui
@desktop
@fase:9
Feature: Correctie en goedkeuring in de desktop-UI in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/timesheet-review-ui.spec.ts
  # Navigatiemapping: tests/playwright/steps/timesheets-review-ui.steps.ts

  @happy
  Scenario: [TS-REV-UI-H-008] browserflow: admin vraagt correctie, medewerker dient opnieuw in, admin keurt goed
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [TS-REV-UI-H-009] submitknop is verborgen bij ingediende urenstaat
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [TS-REV-UI-H-010] submitknop is verborgen bij goedgekeurde urenstaat
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
