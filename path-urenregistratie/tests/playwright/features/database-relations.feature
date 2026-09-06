@regressie
@integration
@db
@fase:16
Feature: Relationele database-integriteit

  # Native Playwright-uitvoering: tests/playwright/database-integrity.spec.ts
  # Navigatiemapping: tests/playwright/steps/database-relations.steps.ts

  @happy
  Scenario: [DB-H-002] geen enkele kerntabel bevat een weesverwijzing
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 1
    Given relationele database-integriteit is voorbereid
    When de flow voor DB-H-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat geen enkele kerntabel bevat een weesverwijzing

  @happy
  Scenario: [DB-H-003] de afhankelijke tabellen hebben de beloofde ON DELETE CASCADE
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 4
    Given relationele database-integriteit is voorbereid
    When de flow voor DB-H-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de afhankelijke tabellen hebben de beloofde ON DELETE CASCADE

  @negative
  Scenario: [DB-N-005] een verwijderde medewerker zonder historie laat geen weesrijen achter
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een net aangemaakte medewerker met opdracht en mailroute
    When de beheerder de medewerker deactiveert en definitief verwijdert
    Then bestaat er geen enkele rij meer die naar die medewerker verwijst
