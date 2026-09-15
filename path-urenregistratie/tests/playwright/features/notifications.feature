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
  Scenario: [NOT-H-011] medewerker leest mededelingen door ze te zien: tellers lopen vanzelf naar nul, zonder markeerknop
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 18
    Given drie ongelezen mededelingen en een ongelezen statusmelding
    Then staat alleen de statusmelding in de bel
    And staan in Berichten de ongelezen open en bovenaan, de gelezen ingeklapt, zonder markeerknop
    When elk ongelezen bericht 2 seconden in beeld is, then telt het vanzelf als gelezen
    And blijven de net gelezen berichten open staan; na herladen zijn ze ingeklapt

  @negative
  Scenario: [NOT-N-015] een ongelezen bericht dat maar kort in beeld is, blijft ongelezen
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given meldingen beheren is voorbereid
    When de flow voor NOT-N-015 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat een ongelezen bericht dat maar kort in beeld is, blijft ongelezen

  @happy
  Scenario: [NOT-H-012] medewerker ziet ingetrokken mededelingen ingeklapt met label, de reden bij openen, en het filter toont precies die
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 14
    Given Stasjo opent Berichten met ingetrokken voorbeeldmededelingen in de TEST-basis
    When hij het filter Ingetrokken kiest
    Then staan alleen ingetrokken berichten er, ingeklapt met label, en geen ervan als ongelezen
    And zie je de reden zodra je het bericht openklapt
    And staat onder Alles een geldige mededeling niet als ingetrokken

  @happy
  Scenario: [NOT-H-013] een melding in de bel brengt de medewerker direct naar de plek waar iets te doen is
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 6
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
