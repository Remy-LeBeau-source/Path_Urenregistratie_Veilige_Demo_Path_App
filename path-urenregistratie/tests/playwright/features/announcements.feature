@regressie
@api
@fase:15
Feature: Mededelingen versturen, intrekken en verbergen

  # Native Playwright-uitvoering: tests/playwright/announcements.spec.ts
  # Navigatiemapping: tests/playwright/steps/announcements.steps.ts

  @happy
  Scenario: [ANN-H-001] beheerder verstuurt een mededeling aan een gekozen medewerker
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een actieve medewerker als ontvanger
    When de beheerder de mededeling verstuurt
    Then wordt met Playwright-assertions bevestigd dat beheerder verstuurt een mededeling aan een gekozen medewerker

  @happy
  Scenario: [ANN-H-002] een concept blijft intern en kan daarna definitief worden verwijderd
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 7
    Given de beheerder een concept opslaat
    And alleen een concept mag definitief worden verwijderd
    When de flow voor ANN-H-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat een concept blijft intern en kan daarna definitief worden verwijderd

  @happy
  Scenario: [ANN-H-003] intrekken met reden en daarna verbergen bij medewerkers
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een verzonden mededeling
    When de beheerder intrekt met een reden
    Then staat het bericht als ingetrokken in de interne historie
    And alleen een ingetrokken bericht mag bij medewerkers worden verborgen

  @negative
  Scenario: [ANN-N-004] intrekken zonder reden wordt geweigerd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 3
    Given mededelingen versturen, intrekken en verbergen is voorbereid
    When de flow voor ANN-N-004 wordt uitgevoerd
    Then geeft intrekken zonder reden een nette 400 en blijft het bericht verzonden

  @negative
  Scenario: [ANN-N-005] verzenden zonder titel, bericht of ontvanger wordt geweigerd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given mededelingen versturen, intrekken en verbergen is voorbereid
    When de flow voor ANN-N-005 wordt uitgevoerd
    Then wordt elk ontbrekend verplicht veld afzonderlijk gemeld

  @negative
  Scenario: [ANN-N-006] een medewerker kan zelf geen mededeling versturen en anoniem is alles dicht
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 2
    Given mededelingen versturen, intrekken en verbergen is voorbereid
    When de flow voor ANN-N-006 wordt uitgevoerd
    Then krijgt een anonieme aanroep 401
    And een ingelogde medewerker mag zelf niets versturen
