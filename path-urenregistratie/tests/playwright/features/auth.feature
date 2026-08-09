@regressie
@ui
@desktop
@fase:4
Feature: Authenticatie en sessiebeheer in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/auth.spec.ts
  # Navigatiemapping: tests/playwright/steps/auth.steps.ts

  @happy
  Scenario: [AUTH-H-001] Admin logt in en auth/me geeft de juiste gebruiker terug
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [AUTH-H-002] Medewerker logt in en auth/me geeft de juiste gebruiker terug
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [AUTH-H-003] Gebruiker logt uit en auth/me geeft authenticated false terug
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
