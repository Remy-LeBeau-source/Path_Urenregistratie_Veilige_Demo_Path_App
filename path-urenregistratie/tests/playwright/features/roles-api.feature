@regressie
@security
@fase:4
Feature: Rollen en gegevensscope in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/roles-api.spec.ts
  # Navigatiemapping: tests/playwright/steps/roles-api.steps.ts

  @negative
  Scenario: [ROLE-N-003] zonder sessie geeft protected API 401
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [ROLE-H-001] admin ziet volledige data
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [ROLE-H-002] employee ziet alleen eigen data
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
