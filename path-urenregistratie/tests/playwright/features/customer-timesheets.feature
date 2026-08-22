@regressie
@api
@fase:10
Feature: Klanturenstaten en documentverwerking

  # Native Playwright-uitvoering: tests/playwright/customer-timesheet-api.spec.ts
  # Navigatiemapping: tests/playwright/steps/customer-timesheets.steps.ts

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
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de medewerker is ingelogd met een concept klanturenstaat
    When de medewerker mark_skipped uitvoert met reden
    Then restore_missing zet de status terug naar missing
    And cleanup: sessie sluiten voor testisolatie

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
