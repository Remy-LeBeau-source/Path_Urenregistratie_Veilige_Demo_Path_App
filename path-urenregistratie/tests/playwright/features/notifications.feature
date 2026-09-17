@regressie
@api
@fase:15
Feature: Meldingen beheren

  # Native Playwright-uitvoering: tests/playwright/notifications.spec.ts
  # Navigatiemapping: tests/playwright/steps/notifications.steps.ts

  @happy
  Scenario: [NOT-H-001] ingelogde gebruiker kan notificaties ophalen
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een ingelogde medewerker
    When notificaties worden opgehaald
    Then wordt met Playwright-assertions bevestigd dat ingelogde gebruiker kan notificaties ophalen

  @happy
  Scenario: [NOT-H-002] mark_all_read werkt zonder fouten
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een ingelogde admin
    When mark_all_read wordt aangeroepen
    Then wordt met Playwright-assertions bevestigd dat mark_all_read werkt zonder fouten

  @negative
  Scenario: [NOT-N-003] anonieme gebruiker krijgt 401 op notificaties
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given meldingen beheren is voorbereid
    When notificaties.php zonder sessie wordt aangeroepen
    Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op notificaties

  @negative
  Scenario: [NOT-N-004] unknown action geeft 400
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde medewerker
    When een onbekende action wordt verstuurd
    Then wordt met Playwright-assertions bevestigd dat unknown action geeft 400

  @happy
  Scenario: [NOT-H-005] notificatielimiet wordt op minimaal een begrensd
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given meldingen beheren is voorbereid
    When de flow voor NOT-H-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat notificatielimiet wordt op minimaal een begrensd

  @happy
  Scenario: [NOT-H-006] unread-filter retourneert uitsluitend ongelezen meldingen
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 3
    Given meldingen beheren is voorbereid
    When de flow voor NOT-H-006 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat unread-filter retourneert uitsluitend ongelezen meldingen

  @negative
  Scenario: [NOT-N-007] mark_read zonder notification_id geeft 400
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given meldingen beheren is voorbereid
    When de flow voor NOT-N-007 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat mark_read zonder notification_id geeft 400

  @happy
  Scenario: [NOT-H-008] mark_read voor onbekende melding wijzigt nul records
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given meldingen beheren is voorbereid
    When de flow voor NOT-H-008 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat mark_read voor onbekende melding wijzigt nul records

  @happy
  Scenario: [NOT-H-009] alles gelezen wist teller en een oudere response kan deze niet herstellen
    # Testtechniek: Herstelbaarheid + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 9
    Given meldingen beheren is voorbereid
    When de flow voor NOT-H-009 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat alles gelezen wist teller en een oudere response kan deze niet herstellen

  @happy
  Scenario: [NOT-H-010] Herstel zet drie lokale basismeldingen terug en beschermt ze tegen serveroverschrijving
    # Testtechniek: Herstelbaarheid + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 15
    Given meldingen beheren is voorbereid
    When de flow voor NOT-H-010 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat herstel zet drie lokale basismeldingen terug en beschermt ze tegen serveroverschrijving

  @happy
  Scenario: [NOT-H-018] een ingeklapt bericht toont een korte samenvatting onder de titel, die verdwijnt zodra je het openklapt
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 8
    Given meldingen beheren is voorbereid
    Then toont een lang bericht ingeklapt een afgekapte samenvatting van de eigen tekst
    And toont een kort bericht zijn volledige tekst als samenvatting, zonder afkapping
    When het bericht wordt opengeklapt, then verdwijnt de samenvatting

  @happy
  Scenario: [NOT-H-011] een mededeling telt pas als gelezen na openklappen of het knopje, en Berichten springt naar de eerste ongelezen
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 25
    Given twee ongelezen mededelingen en een ongelezen statusmelding
    When de medewerker Berichten opent, then zijn alle berichten ingeklapt, staan de nieuwe bovenaan en is de eerste in beeld
    And blijven ze ongelezen, ook als ze langer in beeld staan
    When de medewerker het eerste bericht openklapt, then is dat bericht gelezen en blijft het open
    When de medewerker bij het tweede op Markeer als gelezen tikt, then is het gelezen zonder open te gaan
    And toont het filter Gelezen precies de drie gelezen berichten, compact met aantal
    And valt een leeg filter Ongelezen bij terugkomen terug op Actueel
    Then wordt met Playwright-assertions bevestigd dat een mededeling telt pas als gelezen na openklappen of het knopje, en Berichten springt naar de eerste ongelezen

  @negative
  Scenario: [NOT-N-015] dichtklappen of alleen bekijken leest een ongelezen bericht niet
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 5
    Given meldingen beheren is voorbereid
    When de flow voor NOT-N-015 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat dichtklappen of alleen bekijken leest een ongelezen bericht niet

  @happy
  Scenario: [NOT-H-012] medewerker ziet ingetrokken mededelingen ingeklapt met label, de reden bij openen, en het filter toont precies die
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 16
    Given Stasjo opent Berichten met ingetrokken voorbeeldmededelingen in de TEST-basis
    When hij het filter Ingetrokken kiest
    Then staan alleen ingetrokken berichten er, ingeklapt met label, en geen ervan als ongelezen
    And zie je de reden zodra je het bericht openklapt
    And steekt de onderste kaart niet buiten de ronde hoeken van het paneel
    And staat onder Alles een geldige mededeling niet als ingetrokken

  @happy
  Scenario: [NOT-H-013] een melding in de bel brengt de medewerker direct naar de plek waar iets te doen is
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 9
    Given meldingen beheren is voorbereid
    When de flow voor NOT-H-013 wordt uitgevoerd
    Then toont de bel alleen de drie meldingen over de medewerker zelf

  @happy
  Scenario: [NOT-H-014] Alles gelezen in Berichten leest alleen de mededelingen en laat de bel met rust
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 8
    Given twee ongelezen mededelingen in Berichten en één statusmelding in de bel
    When de medewerker in Berichten op Alles gelezen tikt
    Then zijn de mededelingen gelezen en blijft de statusmelding in de bel ongelezen

  @happy
  Scenario: [NOT-H-016] bij veel berichten blijft het overzichtelijk: Berichten toont de laatste 30, per pagina 5, de bel hooguit 10
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 17
    Given meldingen beheren is voorbereid
    Then toont de bel 10 van de 15 ongelezen meldingen, met een regel voor de rest
    And toont Berichten hooguit 30 berichten, 5 per pagina (zelfde paginagrootte als Nieuw in de app), de ongelezen vooraan
    When de medewerker naar de laatste pagina bladert, then staan daar 26–30 en is Volgende uit
    And zet een filterwissel de lijst terug op pagina 1

  @happy
  Scenario: [NOT-H-017] Berichten start op Actueel zonder ingetrokken berichten, telt per filter, en toont ingetrokken rustig en leesbaar
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 20
    Given meldingen beheren is voorbereid
    When de flow voor NOT-H-017 wordt uitgevoerd
    Then staat Actueel aan, met alleen berichten die nog gelden
    And tellen de filters op: Ongelezen + Gelezen = Actueel, Actueel + Ingetrokken = Alles
    And vat een ingetrokken bericht de reden samen, niet de tekst die niet meer geldt
