@regressie
@api
@fase:12
Feature: E-mailqueue, ontvangers en afleverbeleid

  # Native Playwright-uitvoering: tests/playwright/email-queue.spec.ts
  # Navigatiemapping: tests/playwright/steps/email-queue.steps.ts

  @happy
  Scenario: [EQ-H-001] factuurlock maakt queue-items aan met dry_run=true
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de admin heeft een factuur gelockt
    When de flow voor EQ-H-001 wordt uitgevoerd
    Then zijn er queue-items voor deze factuur met dry_run=true en status queued
    And cleanup

  @happy
  Scenario: [EQ-H-002] broker-channel bundelt factuur en klanturenstaat
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een gelockte factuur met broker_invoice_attachment=true
    When de queue wordt uitgelezen
    Then heeft de broker-channel attachment_policy=invoice_and_customer_timesheet
    And cleanup

  @happy
  Scenario: [EQ-H-003] EasySalary-channel heeft attachment_policy none
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een gelockte factuur waar payroll_invoice_attachment=false
    When de queue-items voor deze factuur worden uitgelezen
    Then heeft elke EasySalary-item attachment_policy=none
    And cleanup

  @happy
  Scenario: [EQ-H-004] action=enqueue voor gelockte factuur maakt nieuwe items aan
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een admin is ingelogd met een reeds gelockte factuur
    When action=enqueue wordt aangeroepen
    Then zijn de nieuwe items in de queue zichtbaar per invoiceId
    And cleanup

  @happy
  Scenario: [EQ-H-005] action=list response bevat verplichte velden
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 15
    Given een admin is ingelogd
    When de queue wordt uitgelezen
    And cleanup
    Then wordt met Playwright-assertions bevestigd dat action=list response bevat verplichte velden

  @happy
  Scenario: [EQ-H-015] Backoffice ziet veilige verzendhistorie zonder berichtinhoud
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 10
    Given een beheerder is beveiligd ingelogd
    When de beheerder het verzendoverzicht in Instellingen opent
    Then zijn ontvanger, onderwerp, status, tijd en bijlagen zichtbaar zonder geheime inhoud
    And Vernieuwen haalt de actuele serverregistraties opnieuw op

  @negative
  Scenario: [EQ-N-006] anonieme gebruiker krijgt 401 op list
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 2
    Given geen sessie
    When GET email-queue zonder sessie
    Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op list

  @negative
  Scenario: [EQ-N-007] medewerker krijgt 403 op list
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given een ingelogde medewerker
    When de medewerker de queue opvraagt
    Then wordt met Playwright-assertions bevestigd dat medewerker krijgt 403 op list

  @negative
  Scenario: [EQ-N-008] action=enqueue zonder invoice_id geeft 400
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde admin
    When enqueue wordt aangeroepen zonder invoice_id
    Then wordt met Playwright-assertions bevestigd dat action=enqueue zonder invoice_id geeft 400

  @negative
  Scenario: [EQ-N-009] action=enqueue niet-bestaande factuur geeft 404
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde admin
    When enqueue wordt aangeroepen met niet-bestaand invoice_id
    Then wordt met Playwright-assertions bevestigd dat action=enqueue niet-bestaande factuur geeft 404

  @negative
  Scenario: [EQ-N-010] action=enqueue niet-gelockte factuur geeft 409
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een goedgekeurde-maar-niet-gelockte urenstaat
    When enqueue wordt aangeroepen voor een factuur die nog niet gelockt is
    And cleanup
    Then wordt met Playwright-assertions bevestigd dat action=enqueue niet-gelockte factuur geeft 409

  @negative
  Scenario: [EQ-N-011] action=retry op queued item geeft 409
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een queued (niet-failed) delivery item
    When retry wordt aangeroepen op een queued item
    And cleanup
    Then wordt met Playwright-assertions bevestigd dat action=retry op queued item geeft 409

  @negative
  Scenario: [EQ-N-012] ongeldige status-filter geeft 400
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde admin
    When status=invalid wordt meegestuurd
    Then wordt met Playwright-assertions bevestigd dat ongeldige status-filter geeft 400

  @negative
  Scenario: [EQ-N-013] anonieme enqueue geeft 401
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given geen sessie
    When POST email-queue zonder sessie
    Then wordt met Playwright-assertions bevestigd dat anonieme enqueue geeft 401

  @negative
  Scenario: [EQ-N-014] unknown action geeft 400
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde admin
    When een onbekende action wordt verstuurd
    Then wordt met Playwright-assertions bevestigd dat unknown action geeft 400
