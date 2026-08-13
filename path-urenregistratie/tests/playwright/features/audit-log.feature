@regressie
@api
@fase:16
Feature: Auditlog en traceerbaarheid

  # Native Playwright-uitvoering: tests/playwright/audit-log.spec.ts
  # Navigatiemapping: tests/playwright/steps/audit-log.steps.ts

  @happy
  Scenario: [AUD-H-001] admin kan auditlog ophalen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een ingelogde admin
    When het auditlog wordt opgehaald
    Then wordt met Playwright-assertions bevestigd dat admin kan auditlog ophalen

  @happy
  Scenario: [AUD-H-002] auditlog filtert op entity_type
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een ingelogde admin
    When gefilterd op entity_type=invoice
    Then wordt met Playwright-assertions bevestigd dat auditlog filtert op entity_type

  @happy
  Scenario: [AUD-H-003] auditlog filtert op event_type
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een ingelogde admin
    When gefilterd op event_type=invoice.locked
    Then wordt met Playwright-assertions bevestigd dat auditlog filtert op event_type

  @happy
  Scenario: [AUD-H-004] auditlog bevat geen wachtwoorden of tokens in event_data
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 1
    Given een ingelogde admin
    When de flow voor AUD-H-004 wordt uitgevoerd
    Then bevat geen enkel item een wachtwoord of token veld in event_data

  @negative
  Scenario: [AUD-N-005] anonieme gebruiker krijgt 401 op auditlog
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given geen sessie
    When auditlog wordt opgevraagd
    Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op auditlog

  @negative
  Scenario: [AUD-N-006] medewerker mag auditlog niet lezen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given een ingelogde medewerker
    When auditlog wordt opgevraagd als medewerker
    Then wordt met Playwright-assertions bevestigd dat medewerker mag auditlog niet lezen

  @happy
  Scenario: [AUD-H-007] auditlog combineert entity- en eventfilter
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 4
    Given auditlog en traceerbaarheid is voorbereid
    When de flow voor AUD-H-007 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat auditlog combineert entity- en eventfilter

  @happy
  Scenario: [AUD-H-008] auditlog begrenst een nullimiet op een record
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given auditlog en traceerbaarheid is voorbereid
    When de flow voor AUD-H-008 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat auditlog begrenst een nullimiet op een record

  @happy
  Scenario: [AUD-H-009] auditlog begrenst een hoge limiet op tweehonderd records
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given auditlog en traceerbaarheid is voorbereid
    When de flow voor AUD-H-009 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat auditlog begrenst een hoge limiet op tweehonderd records

  @negative
  Scenario: [AUD-N-010] auditlog weigert POST
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given auditlog en traceerbaarheid is voorbereid
    When de flow voor AUD-N-010 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat auditlog weigert POST
