@regressie
@security
@fase:14
Feature: Productieveiligheid in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/production-safety.spec.ts
  # Navigatiemapping: tests/playwright/steps/production-safety.steps.ts

  @happy
  Scenario: [SAFE-H-001] login picker vult alleen lokaal demo-wachtwoord in wanneer hints beschikbaar zijn
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [SAFE-N-001] frontend source bevat geen plaintext demo-credentials
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [SAFE-N-002] writes zonder csrf blijven geblokkeerd
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [SAFE-H-002] timesheet writeflow blijft werkend (draft + submit)
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [SAFE-N-003] productieconfig zet demo-migraties standaard uit
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [SAFE-H-003] health.php bevat productieguard die technische details onderdrukt
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [SAFE-N-004] install.php en migrate.php bevatten productieguards
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [SAFE-H-004] config.example.php bevat mail.enabled=false als standaard
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
