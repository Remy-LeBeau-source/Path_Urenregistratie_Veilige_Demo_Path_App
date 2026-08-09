@regressie
@integration
@fase:9
Feature: Correctie en goedkeuring met optimistic locking in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/timesheet-review-flow.spec.ts
  # Navigatiemapping: tests/playwright/steps/timesheets-review-integration.steps.ts

  @happy
  Scenario: [TS-REV-API-H-005] admin vraagt correctie, employee dient opnieuw in, admin keurt goed met optimistic locking
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
