@regressie
@api
@fase:15
Feature: Periodebeheer via API in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/period-management.spec.ts
  # Navigatiemapping: tests/playwright/steps/period-management.steps.ts

  @happy
  Scenario: [PER-H-001] admin kan periodes ophalen met overzicht
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een ingelogde admin
    When de periodes worden opgehaald
    Then wordt met Playwright-assertions bevestigd dat admin kan periodes ophalen met overzicht

  @happy
  Scenario: [PER-H-002] admin kan periode sluiten en heropenen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 9
    Given een ingelogde admin
    When de testperiode wordt gesloten
    Then is de periode gesloten
    And heropenen werkt

  @negative
  Scenario: [PER-N-003] anonieme gebruiker krijgt 401 op periods
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given periodebeheer via API is voorbereid
    When periods.php wordt aangeroepen zonder sessie
    Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op periods

  @negative
  Scenario: [PER-N-004] medewerker mag geen periodes beheren
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given een ingelogde medewerker
    When periods.php wordt aangeroepen als medewerker
    Then wordt met Playwright-assertions bevestigd dat medewerker mag geen periodes beheren

  @negative
  Scenario: [PER-N-005] dubbel sluiten van periode geeft 409
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een reeds gesloten periode
    When dezelfde periode nogmaals wordt gesloten
    Then wordt met Playwright-assertions bevestigd dat dubbel sluiten van periode geeft 409

  @negative
  Scenario: [PER-N-006] heropenen van open periode geeft 409
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een open periode en ingelogde admin
    When een open periode wordt heropend
    Then wordt met Playwright-assertions bevestigd dat heropenen van open periode geeft 409

  @negative
  Scenario: [PER-N-007] driecijferig jaar geeft 400
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given periodebeheer via API is voorbereid
    When de flow voor PER-N-007 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat driecijferig jaar geeft 400

  @negative
  Scenario: [PER-N-008] vijfcijferig jaar geeft 400
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given periodebeheer via API is voorbereid
    When de flow voor PER-N-008 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat vijfcijferig jaar geeft 400

  @negative
  Scenario: [PER-N-009] ongeldige maand geeft 400
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given periodebeheer via API is voorbereid
    When de flow voor PER-N-009 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat ongeldige maand geeft 400

  @negative
  Scenario: [PER-N-010] onbekende periodeactie geeft 400
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given periodebeheer via API is voorbereid
    When de flow voor PER-N-010 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat onbekende periodeactie geeft 400
