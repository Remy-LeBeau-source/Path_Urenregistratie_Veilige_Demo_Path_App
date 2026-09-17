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

  @happy
  Scenario: [ANN-H-007] "Bij medewerkers verwijderen" laat het bericht echt verdwijnen bij de medewerker, maar blijft intern zichtbaar
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 13
    Given de beheerder stuurt een mededeling naar de vaste testmedewerker
    Then ziet de medewerker het bericht in Mijn mededelingen
    When de beheerder intrekt en daarna bij medewerkers verwijdert
    Then is het bericht bij de medewerker volledig verdwenen, ook na een herlading
    Then blijft de mededeling in het interne beheeroverzicht van Backoffice staan

  @happy
  Scenario: [ANN-H-008] een correctie laat de medewerker alleen de nieuwste tekst zien, niet de oorspronkelijke
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de beheerder verstuurt een origineel bericht naar de vaste testmedewerker
    When de beheerder een correctie verstuurt met nieuwe tekst
    Then ziet de medewerker alleen de gecorrigeerde tekst, niet de oude
    And cleanup: trek de gecorrigeerde mededeling in en verberg deze bij medewerkers

  @happy
  Scenario: [ANN-H-009] een via het scherm gekozen medewerker wordt ook bij de server als die medewerker bewaard
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de beheerder opent een nieuwe mededeling en kiest zelf de ontvangers
    When precies een medewerker wordt aangevinkt en het bericht wordt geplaatst
    Then heeft de server die medewerker als ontvanger, en niet iemand anders

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
  Scenario: [ANN-N-008] de reden van intrekken kent dezelfde grens als het invoerveld en de kolom
    # Testtechniek: Grenswaardenanalyse langs de kolomgrens (750 tekens, met accenten) + controle dat een geweigerde intrekking niets verandert
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een verzonden mededeling
    When de reden één teken te lang is, then wordt die geweigerd met uitleg
    And blijft de mededeling daardoor gewoon verzonden staan
    And wordt precies 750 tekens wél geaccepteerd, ook met accenten
    Then wordt met Playwright-assertions bevestigd dat de reden van intrekken kent dezelfde grens als het invoerveld en de kolom

  @negative
  Scenario: [ANN-N-009] een ingetrokken mededeling blijft ongelezen tot de medewerker hem opent
    # Testtechniek: Beslistabel (handeling x brontoestand) op wanneer een bericht als gelezen telt
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een verzonden mededeling met een ongelezen melding
    When de beheerder hem intrekt, then blijft de melding ongelezen
    And cleanup: de testmededeling wordt bij de medewerker verborgen
    Then wordt met Playwright-assertions bevestigd dat een ingetrokken mededeling blijft ongelezen tot de medewerker hem opent

  @negative
  Scenario: [ANN-N-007] de lengtegrens telt tekens zoals het invoerveld, ook met accenten en emoji, en legt uit wat er mis is
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 8
    Given mededelingen versturen, intrekken en verbergen is voorbereid
    When de flow voor ANN-N-007 wordt uitgevoerd
    Then wordt precies de grens geaccepteerd, ook als elk teken meer dan één byte is
    And wordt één teken te veel geweigerd, met een melding die zegt wat er mis is
    And cleanup: de verstuurde testmededeling wordt ingetrokken en bij medewerkers verborgen

  @negative
  Scenario: [ANN-N-006] een medewerker kan zelf geen mededeling versturen en anoniem is alles dicht
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 2
    Given mededelingen versturen, intrekken en verbergen is voorbereid
    When de flow voor ANN-N-006 wordt uitgevoerd
    Then krijgt een anonieme aanroep 401
    And een ingelogde medewerker mag zelf niets versturen

  @negative
  Scenario: [ANN-N-010] een bericht kan niet tegelijk correctie en intrekking van iets anders zijn
    # Testtechniek: Decision-table-analyse (combinatie van twee onderling uitsluitende referentievelden) + negatieve equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 4
    Given mededelingen versturen, intrekken en verbergen is voorbereid
    When de flow voor ANN-N-010 wordt uitgevoerd
    Then weigert de server een bericht met beide referenties tegelijk

  @negative
  Scenario: [ANN-N-011] een medewerker ziet nooit welke beheerder een mededeling stuurde
    # Testtechniek: Twee-rollentest (beheerder versus medewerker op dezelfde mededeling) + negatieve inhoudscontrole op naamlekken
    # Aantoonbare Playwright-assertions in deze case: 10
    Given de administrator (Gio Maatsen) een mededeling stuurt aan een andere testmedewerker (Brian)
    When de flow voor ANN-N-011 wordt uitgevoerd
    Then ziet de administrator zelf zijn eigen echte naam als afzender
