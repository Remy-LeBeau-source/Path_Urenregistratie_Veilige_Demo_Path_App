@regressie
@api
@fase:15
Feature: Notificaties via API in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/notifications.spec.ts
  # Navigatiemapping: tests/playwright/steps/notifications.steps.ts

  @happy
  Scenario: [NOT-H-001] ingelogde gebruiker kan notificaties ophalen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [NOT-H-002] mark_all_read werkt zonder fouten
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [NOT-N-003] anonieme gebruiker krijgt 401 op notificaties
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [NOT-N-004] unknown action geeft 400
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
