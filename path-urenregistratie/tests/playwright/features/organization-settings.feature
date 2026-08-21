@regressie
@api
@fase:2
Feature: Organisatie-instellingen beheren

  # Native Playwright-uitvoering: tests/playwright/admin-writes.spec.ts
  # Navigatiemapping: tests/playwright/steps/admin-writes.steps.ts

  @happy
  Scenario: [ADM-WR-H-001] admin kan company/settings server-led opslaan
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 6
    Given organisatie-instellingen beheren is voorbereid
    When de flow voor ADM-WR-H-001 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat admin kan company/settings server-led opslaan

  @happy
  Scenario: [ADM-WR-H-002] admin kan beheerder server-led aanmaken en wijzigen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 12
    Given organisatie-instellingen beheren is voorbereid
    When de flow voor ADM-WR-H-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat admin kan beheerder server-led aanmaken en wijzigen

  @happy
  Scenario: [ADM-WR-H-003] admin kan medewerker server-led aanmaken en bootstrap ziet deze terug
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 11
    Given organisatie-instellingen beheren is voorbereid
    When de flow voor ADM-WR-H-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat admin kan medewerker server-led aanmaken en bootstrap ziet deze terug

  @negative
  Scenario: [ADM-WR-N-001] dubbel accountadres geeft veilige metadata van het bestaande bedrijfsaccount
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 8
    Given organisatie-instellingen beheren is voorbereid
    When de flow voor ADM-WR-N-001 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat dubbel accountadres geeft veilige metadata van het bestaande bedrijfsaccount

  @negative
  Scenario: [ADM-WR-N-002] dubbel accountadres opent het bestaande account zonder duplicaat
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 12
    Given organisatie-instellingen beheren is voorbereid
    When de flow voor ADM-WR-N-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat dubbel accountadres opent het bestaande account zonder duplicaat

  @happy
  Scenario: [ADM-WR-H-004] admin slaat medewerker zonder SMTP veilig op met toegang in afwachting
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given organisatie-instellingen beheren is voorbereid
    When de flow voor ADM-WR-H-004 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat admin slaat medewerker zonder SMTP veilig op met toegang in afwachting

  @happy
  Scenario: [ADM-WR-H-005] productie toont uitsluitend serveraccounts en opent medewerkerformulier bovenaan
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 13
    Given organisatie-instellingen beheren is voorbereid
    When de flow voor ADM-WR-H-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat productie toont uitsluitend serveraccounts en opent medewerkerformulier bovenaan

  @happy
  Scenario: [ADM-WR-H-006] deactiveren verplaatst medewerker direct en leeg account kan worden verwijderd
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 13
    Given de server een actief gebruikersaccount en actief medewerkersprofiel teruggeeft
    When de beheerder de medewerker deactiveert
    Then verdwijnt de medewerker uit Actief en staat deze onder Inactief
    And definitief verwijderen haalt het lege account uit Teambeheer

  @happy
  Scenario: [ADM-WR-H-007] serverwrite na Herstel verschijnt direct in Teambeheer
    # Testtechniek: Herstelbaarheid + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given organisatie-instellingen beheren is voorbereid
    When de flow voor ADM-WR-H-007 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat serverwrite na Herstel verschijnt direct in Teambeheer

  @happy
  Scenario: [ADM-WR-H-008] bestaande beheerder en medewerker worden na Herstel direct terug in Teambeheer getoond
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 13
    Given organisatie-instellingen beheren is voorbereid
    When de flow voor ADM-WR-H-008 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat bestaande beheerder en medewerker worden na Herstel direct terug in Teambeheer getoond

  @happy
  Scenario: [ADM-WR-H-009] goedkeuringsloop volgt logische maand/medewerker-volgorde
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de administrator is ingelogd en reset naar vaste baseline
    When actionable admin tasks bestaan in de workflow
    Then zijn taken chronologisch gesorteerd (validatie van fix)
