@regressie
@integration
@fase:11
Feature: Facturerende onderneming en handelsnaam

  # Native Playwright-uitvoering: tests/playwright/invoice-company-identity.spec.ts
  # Navigatiemapping: tests/playwright/steps/invoice-company-identity.steps.ts

  @happy
  Scenario: [INV-ID-H-001] handelsnaam en juridische naam staan samen op de factuurpreview
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given facturerende onderneming en handelsnaam is voorbereid
    When de flow voor INV-ID-H-001 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat handelsnaam en juridische naam staan samen op de factuurpreview

  @happy
  Scenario: [INV-ID-H-002] alleen juridische naam is als factuurweergave te kiezen
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 3
    Given facturerende onderneming en handelsnaam is voorbereid
    When de flow voor INV-ID-H-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat alleen juridische naam is als factuurweergave te kiezen

  @happy
  Scenario: [INV-ID-H-003] factuuridentiteit wordt door settings API opgeslagen en via bootstrap herladen
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given facturerende onderneming en handelsnaam is voorbereid
    When de flow voor INV-ID-H-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat factuuridentiteit wordt door settings API opgeslagen en via bootstrap herladen

  @negative
  Scenario: [INV-ID-N-004] settings API weigert een onbekende factuurweergave
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given facturerende onderneming en handelsnaam is voorbereid
    When de flow voor INV-ID-N-004 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat settings API weigert een onbekende factuurweergave

  @happy
  Scenario: [INV-ID-H-005] instellingen tonen verkoopklare bedrijfsidentiteit en beveiligde verzendmodus
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 8
    Given facturerende onderneming en handelsnaam is voorbereid
    When de flow voor INV-ID-H-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat instellingen tonen verkoopklare bedrijfsidentiteit en beveiligde verzendmodus
