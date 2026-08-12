@regressie
@api
@fase:8
Feature: Urenregistratie via API in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/timesheet-write.spec.ts
  # Navigatiemapping: tests/playwright/steps/timesheets-api.steps.ts

  @happy
  Scenario: [TS-API-H-001] employee save draft, read back, submit, bewerkt en dient opnieuw in
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 31
    Given de medewerker is ingelogd
    When een herhaalbare schrijfbare testperiode is geselecteerd
    Then save_draft werkt en zet status op draft
    Then read back van draft bevat dagregels en auditdata
    When submit wordt uitgevoerd met expected_version
    Then een ingediende urenstaat kan worden bewerkt en opnieuw ingediend
    And cleanup: sessie sluiten voor testisolatie

  @negative
  Scenario: [TS-API-N-010] employee mag geen andere medewerker schrijven
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een ingelogde medewerker
    When de medewerker een andere employee_id probeert te schrijven
    And cleanup: sessie sluiten voor testisolatie
    Then wordt met Playwright-assertions bevestigd dat employee mag geen andere medewerker schrijven

  @negative
  Scenario: [TS-API-N-011] write zonder csrf geeft 403
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een ingelogde medewerker
    When de write zonder CSRF-token wordt verstuurd
    And cleanup: sessie sluiten voor testisolatie
    Then wordt met Playwright-assertions bevestigd dat write zonder csrf geeft 403

  @negative
  Scenario: [TS-API-N-003] write zonder sessie geeft 401
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given er is geen actieve sessie
    When een write zonder sessie wordt verstuurd
    Then wordt met Playwright-assertions bevestigd dat write zonder sessie geeft 401

  @negative
  Scenario: [TS-API-N-004] ongeldige payload geeft 400
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een ingelogde medewerker
    When de medewerker een ongeldige payload verstuurt
    And cleanup: sessie sluiten voor testisolatie
    Then wordt met Playwright-assertions bevestigd dat ongeldige payload geeft 400
