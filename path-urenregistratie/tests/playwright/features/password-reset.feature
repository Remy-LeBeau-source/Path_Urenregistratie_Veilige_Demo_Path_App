@regressie
@security
@fase:13
Feature: Wachtwoordherstel en rate limiting in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/password-reset.spec.ts
  # Navigatiemapping: tests/playwright/steps/password-reset.steps.ts

  @happy
  Scenario: [PWD-H-001] request-reset retourneert token in demo-modus
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [PWD-H-002] onbekend e-mailadres retourneert ook ok=true (geen email-enumeration)
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [PWD-H-003] me.php bevat force_password_change veld
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PWD-N-004] reset-password met ongeldig token geeft 400
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PWD-N-005] reset-password met te kort wachtwoord geeft 400
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PWD-N-006] hergebruik van al-gebruikt token geeft 409
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [PWD-N-007] login wordt geblokkeerd na 5 mislukte pogingen (rate-limit)
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
