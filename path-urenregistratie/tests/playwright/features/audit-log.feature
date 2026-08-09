@regressie
@api
@fase:16
Feature: Auditlog en traceerbaarheid in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/audit-log.spec.ts
  # Navigatiemapping: tests/playwright/steps/audit-log.steps.ts

  @happy
  Scenario: [AUD-H-001] admin kan auditlog ophalen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [AUD-H-002] auditlog filtert op entity_type
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [AUD-H-003] auditlog filtert op event_type
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [AUD-H-004] auditlog bevat geen wachtwoorden of tokens in event_data
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [AUD-N-005] anonieme gebruiker krijgt 401 op auditlog
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [AUD-N-006] medewerker mag auditlog niet lezen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [AUD-H-007] auditlog combineert entity- en eventfilter
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [AUD-H-008] auditlog begrenst een nullimiet op een record
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [AUD-H-009] auditlog begrenst een hoge limiet op tweehonderd records
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [AUD-N-010] auditlog weigert POST
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
