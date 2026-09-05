@regressie
@api
@fase:10
Feature: Klanturenstaten en documentverwerking

  # Native Playwright-uitvoering: tests/playwright/customer-timesheet-api.spec.ts
  # Navigatiemapping: tests/playwright/steps/customer-timesheets.steps.ts

  @happy
  Scenario: [CTS-API-H-012] admin kan een ontbrekende klanturenstaat extern bevestigen en terugzetten
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 15
    Given de beheerder is ingelogd bij een periode zonder klanturenstaatrecord
    When de beheerder eerst zonder en daarna met verplichte reden extern bevestigt
    Then de bevestiging auditbaar leesbaar is en door de beheerder kan worden teruggedraaid

  @happy
  Scenario: [CTS-API-H-009] brokerroute koppelt de officiële klanturenstaat aan dezelfde medewerker en periode
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 12
    Given klanturenstaten en documentverwerking is voorbereid
    When de flow voor CTS-API-H-009 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat brokerroute koppelt de officiële klanturenstaat aan dezelfde medewerker en periode

  @happy
  Scenario: [CTS-API-H-001] employee uploadt klanturenstaat, dient in en downloadt; admin kan goedkeuren en resubmit vragen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 28
    Given de medewerker is ingelogd in auth-modus
    When de medewerker een concept uploadt en indient
    Then de medewerker kan het ingediende document teruglezen en downloaden
    And cleanup: wissel naar administrator-context voor reviewstappen
    Given de administrator is ingelogd voor reviewbesluiten
    When de administrator approve en request_resubmit uitvoert
    And cleanup: sessie sluiten voor testisolatie

  @negative
  Scenario: [CTS-API-N-006] employee kan geen klanturenstaat voor andere medewerker wijzigen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de medewerker is ingelogd
    When de medewerker schrijft met een andere employee_id
    And cleanup: sessie sluiten voor testisolatie
    Then wordt met Playwright-assertions bevestigd dat employee kan geen klanturenstaat voor andere medewerker wijzigen

  @negative
  Scenario: [CTS-API-N-007] employee kan geen admin reviewactie uitvoeren op klanturenstaat
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 12
    Given de medewerker is ingelogd met een ingediende klanturenstaat
    When de medewerker approve probeert uit te voeren
    Then de medewerker ook geen request_resubmit mag uitvoeren
    And cleanup: sessie sluiten voor testisolatie

  @happy
  Scenario: [CTS-API-H-004] employee kan mark_skipped registreren en restore_missing terugdraaien
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 15
    Given de medewerker is ingelogd in een lege maand zonder klanturenstaatrecord
    When de medewerker eerst zonder en daarna met reden rechtstreeks gemaild registreert
    Then readback de nieuwe rij toont en restore_missing terugzet naar missing
    And cleanup: sessie sluiten voor testisolatie

  @happy
  Scenario: [CTS-API-H-013] medewerker registreert rechtstreeks gemaild zichtbaar vanuit een lege actuele maand
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 20
    Given de medewerker in september start zonder klanturenstaatrecord
    When de medewerker de zichtbare registratie met verplichte reden afrondt
    Then serverreadback en F5 dezelfde status tonen en herstel opnieuw werkt

  @negative
  Scenario: [CTS-API-N-005] employee krijgt 400 bij ongeldig bestandstype
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de medewerker is ingelogd
    When de medewerker een tekstbestand uploadt als klanturenstaat
    And cleanup: sessie sluiten voor testisolatie
    Then wordt met Playwright-assertions bevestigd dat employee krijgt 400 bij ongeldig bestandstype

  @happy
  Scenario: [CTS-API-H-005] JPG- en PNG-upload worden als inline bekijkbare PDF opgeslagen
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 34
    Given de medewerker is ingelogd
    When de medewerker een JPG uploadt als concept-klanturenstaat
    Then is de JPG als inline bekijkbare PDF met een PDF-bestandsnaam opgeslagen
    When de medewerker het concept vervangt door een PNG
    Then is ook de PNG als inline bekijkbare PDF opgeslagen
    And cleanup: sessie sluiten voor testisolatie

  @happy
  Scenario: [CTS-API-H-006] medewerker uploadt zichtbaar een afbeelding en kan die na nieuwe login bekijken
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 23
    Given de medewerker via de zichtbare upload een PNG als concept opslaat
    When dezelfde medewerker opnieuw inlogt en via de zichtbare maandkeuze dezelfde periode opent
    Then verschijnt het serverdocument en levert Klanturenstaat bekijken een inline PDF-response
    And cleanup: zet de geïsoleerde toekomstcase terug naar ontbrekend en log uit

  @negative
  Scenario: [CTS-API-N-008] employee krijgt 400 bij een te grote klanturenstaat-upload
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de medewerker is ingelogd
    When de medewerker een PDF van ruim boven de 2 MB-limiet uploadt
    And cleanup: sessie sluiten voor testisolatie
    Then wordt met Playwright-assertions bevestigd dat employee krijgt 400 bij een te grote klanturenstaat-upload

  @negative
  Scenario: [CTS-API-N-009] corrupte of te grote afbeelding en nep-PDF worden geweigerd zonder bestaand concept te vervangen
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 15
    Given de medewerker is ingelogd en de bestaande klanturenstaat is vastgelegd
    When de medewerker corrupte bytes met een JPG-bestandsnaam uploadt
    And een afbeelding boven de veilige dimensiegrens wordt geweigerd
    Then worden tekstbytes met alleen een PDF-bestandsnaam ook geweigerd
    Then blijft het bestaande document ongewijzigd
    And cleanup: sessie sluiten voor testisolatie

  @negative
  Scenario: [CTS-API-N-010] bestand van precies 2 MB wordt geaccepteerd, 2 MB + 1 byte wordt geweigerd
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de medewerker is ingelogd
    When de medewerker een geldige PDF van precies 2 MB uploadt
    Then wordt dezelfde geldige PDF van 2 MB + 1 byte geweigerd
    And cleanup: sessie sluiten voor testisolatie

  @negative
  Scenario: [CTS-API-N-012] een leeg bestand (0 bytes) wordt geweigerd zonder een bestaand concept te vervangen
    # Testtechniek: Equivalentieklassen + foutinjectie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de medewerker is ingelogd en de bestaande klanturenstaat is vastgelegd
    When de medewerker een leeg bestand van 0 bytes uploadt
    Then blijft het bestaande document ongewijzigd
    And cleanup: sessie sluiten voor testisolatie

  @negative
  Scenario: [CTS-API-N-011] "vervangen" van een reeds goedgekeurde klanturenstaat wordt door de server geweigerd
    # Testtechniek: Beslissingstabel
    # Aantoonbare Playwright-assertions in deze case: 9
    Given een medewerker een klanturenstaat heeft ingediend die is goedgekeurd
    When de medewerker via save_draft alsnog probeert te vervangen
    Then blijft de klanturenstaat gewoon goedgekeurd
    And cleanup: sessie sluiten voor testisolatie

  @happy
  Scenario: [CTS-API-H-015] "Concept vervangen" na een afkeuring (resubmit) wist het oude beoordelingsbericht
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 13
    Given Backoffice om een nieuwe versie heeft gevraagd met een afkeurreden
    When de medewerker via "Concept vervangen" een nieuwe versie uploadt
    Then is het oude beoordelingsbericht van Backoffice gewist
    And cleanup: sessie sluiten voor testisolatie

  @happy
  Scenario: [CTS-API-H-014] een serverschrijfactie heft de lokale herstelvoorrang op zodat de status niet uit de pas loopt
    # Testtechniek: Toestandsovergang + foutinjectie
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de lokale herstelvoorrang aanstaat en de klanturenstaat nog open is
    When de medewerker de klanturenstaat als rechtstreeks gemaild registreert
    Then is de herstelvoorrang opgeheven en toont het scherm de serverstand

  @happy
  Scenario: [CTS-API-H-016] de knop wisselt zichtbaar tussen "Concept opslaan" en "Concept vervangen" en vervangt het bestand echt
    # Testtechniek: Toestandsovergang + UI-verificatie
    # Aantoonbare Playwright-assertions in deze case: 14
    Given de medewerker opent een maand zonder klanturenstaat
    When de medewerker een eerste PDF opslaat als concept
    Then toont de knop nu "Concept vervangen" in plaats van "Concept opslaan"
    When de medewerker via diezelfde knop een tweede, ander bestand kiest
    Then is het eerste bestand echt vervangen door het tweede, niet ernaast bewaard
    And cleanup: zet de geïsoleerde toekomstcase terug naar ontbrekend en log uit
