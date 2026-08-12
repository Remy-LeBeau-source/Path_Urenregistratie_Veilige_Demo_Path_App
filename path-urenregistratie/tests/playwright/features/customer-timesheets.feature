@regressie
@api
@fase:10
Feature: Klanturenstaten via API in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/customer-timesheet-api.spec.ts
  # Navigatiemapping: tests/playwright/steps/customer-timesheets.steps.ts

  @happy
  Scenario: [CTS-API-H-001] employee uploadt klanturenstaat, dient in en downloadt; admin kan goedkeuren en resubmit vragen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [CTS-API-N-006] employee kan geen klanturenstaat voor andere medewerker wijzigen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [CTS-API-N-007] employee kan geen admin reviewactie uitvoeren op klanturenstaat
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [CTS-API-H-004] employee kan mark_skipped registreren en restore_missing terugdraaien
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [CTS-API-N-005] employee krijgt 400 bij ongeldig bestandstype
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [CTS-API-H-005] JPG-upload wordt server-side automatisch als PDF opgeslagen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [CTS-API-N-008] employee krijgt 400 bij een te grote klanturenstaat-upload
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
