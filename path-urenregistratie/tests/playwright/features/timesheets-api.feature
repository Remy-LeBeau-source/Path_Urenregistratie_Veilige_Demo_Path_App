@regressie
@api
@fase:8
Feature: Urenregistratie via API in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/timesheet-write.spec.ts
  # Navigatiemapping: tests/playwright/steps/timesheets-api.steps.ts

  @happy
  Scenario: [TS-API-H-001] employee save draft, read back, submit, bewerkt en dient opnieuw in
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [TS-API-N-010] employee mag geen andere medewerker schrijven
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [TS-API-N-011] write zonder csrf geeft 403
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [TS-API-N-003] write zonder sessie geeft 401
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [TS-API-N-004] ongeldige payload geeft 400
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
