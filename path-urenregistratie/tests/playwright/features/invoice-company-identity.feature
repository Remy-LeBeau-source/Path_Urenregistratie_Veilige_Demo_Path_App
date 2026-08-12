@regressie
@integration
@fase:11
Feature: Facturerende ondernemingsidentiteit in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/invoice-company-identity.spec.ts
  # Navigatiemapping: tests/playwright/steps/invoice-company-identity.steps.ts

  @happy
  Scenario: [INV-ID-H-001] handelsnaam en juridische naam staan samen op de factuurpreview
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [INV-ID-H-002] alleen juridische naam is als factuurweergave te kiezen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [INV-ID-H-003] factuuridentiteit wordt door settings API opgeslagen en via bootstrap herladen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [INV-ID-N-004] settings API weigert een onbekende factuurweergave
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [INV-ID-H-005] instellingen tonen verkoopklare bedrijfsidentiteit en beveiligde verzendmodus
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
