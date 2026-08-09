@regressie
@api
@fase:13
Feature: Gebruikersbeheer via API in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/user-management.spec.ts
  # Navigatiemapping: tests/playwright/steps/user-management.steps.ts

  @happy
  Scenario: [USR-H-001] admin ziet alle gebruikers van het bedrijf
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [USR-H-002] admin kan medewerker deactiveren en heractiveren
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [USR-H-003] admin kan force_password_change instellen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [USR-N-004] anonieme gebruiker krijgt 401 op user-list
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [USR-N-005] medewerker mag geen gebruikersbeheer uitvoeren
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [USR-N-006] admin kan zichzelf niet deactiveren
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [USR-N-007] dubbel deactiveren geeft 409
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
