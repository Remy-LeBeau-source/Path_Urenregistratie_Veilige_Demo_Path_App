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
  Scenario: [ADM-WR-N-003] beheerder aanmaken met het e-mailadres van een bestaande medewerker wordt geweigerd
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 10
    Given organisatie-instellingen beheren is voorbereid
    When de flow voor ADM-WR-N-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat beheerder aanmaken met het e-mailadres van een bestaande medewerker wordt geweigerd

  @negative
  Scenario: [ADM-WR-N-004] beheerder aanmaken met het e-mailadres van een bestaande medewerker toont een duidelijke melding (geen silent failure)
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 13
    Given er al een medewerker met een vast e-mailadres bestaat
    When een beheerder wordt aangemaakt met exact datzelfde adres
    Then verschijnt een blokkade-popup en wordt de bestaande medewerker uitgelicht, i.p.v. stil niets te doen
    And na sluiten is er niets aangemaakt en is het bestaande account uitgelicht

  @negative
  Scenario: [ADM-WR-N-002] dubbel accountadres opent het bestaande account zonder duplicaat
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 14
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

  @happy
  Scenario: [ADM-WR-H-010] server-led aangemaakte beheerder en medewerker overleven een echte paginaherlading
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given de administrator een nieuwe beheerder en medewerker server-led opslaat (geen gemockte API)
    When de pagina echt opnieuw wordt geladen (F5), niet alleen opnieuw gerenderd
    Then blijven de nieuwe beheerder en medewerker zichtbaar in Teambeheer

  @happy
  Scenario: [ADM-WR-H-011] een echte paginaherlading blijft op het geopende scherm i.p.v. terug te springen naar Dashboard
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de administrator Instellingen heeft geopend
    When de pagina echt opnieuw wordt geladen (F5)
    Then blijft Instellingen actief in plaats van terug te vallen op Dashboard

  @negative
  Scenario: [ADM-WR-N-005] een al bestaande naam blokkeert of waarschuwt niet: alleen het e-mailadres moet uniek zijn
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de administrator is ingelogd en Teambeheer heeft geopend
    When een nieuwe beheerder met dezelfde naam maar een uniek adres wordt opgeslagen
    Then wordt het account direct aangemaakt, zonder tussenvraag over de naam

  @negative
  Scenario: [ADM-WR-N-006] dubbele naam is toegestaan, maar een al gebruikt e-mailadres wordt hard geblokkeerd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 8
    Given er al een beheerder én een medewerker bestaan met verschillende namen
    When een nieuwe beheerder met dezelfde naam én het e-mailadres van de medewerker wordt opgeslagen
    Then komt er geen tussenvraag over de naam en blokkeert de server hard op het al gebruikte e-mailadres

  @negative
  Scenario: [ADM-WR-N-007] actief-accounttotaal klopt op elke stap: exact duplicaat verandert niets, uniek account telt precies 1 op
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 15
    Given de administrator is ingelogd en Teambeheer heeft geopend
    When een medewerker en een beheerder worden toegevoegd, telt het totaal telkens precies 1 op t.o.v. daarvóór
    Then verandert een poging met exact hetzelfde e-mailadres het totaal niet
    And een volledig uniek account telt precies 1 op, zonder dat er verder iets bijkomt

  @happy
  Scenario: [ADM-WR-H-012] na Herstel legt Teambeheer uit dat de telling lokaal is en kan de serverstand terug worden gehaald
    # Testtechniek: Herstelbaarheid + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 8
    Given Teambeheer de serverstand toont zonder melding
    When de administrator Herstel gebruikt en terugkeert naar Teambeheer
    Then verklaart een zichtbare melding dat deze telling niet van de server komt
    And de knop haalt de echte serverstand terug en laat de melding verdwijnen
