@regressie
@integration
@fase:9
Feature: Correctie en goedkeuring met optimistic locking in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/timesheet-review-flow.spec.ts
  # Navigatiemapping: tests/playwright/steps/timesheets-review-integration.steps.ts

  @happy
  Scenario: [TS-REV-API-H-005] admin vraagt correctie, employee dient opnieuw in, admin keurt goed met optimistic locking
    # Testtechniek: Concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 58
    Given de medewerker is ingelogd en heeft een schrijfbare testperiode
    When de medewerker een concept opslaat en daarna indient
    And de reviewcontext wisselt naar administrator
    Then een verouderde correctie-aanvraag wordt geblokkeerd met stale-version
    When de administrator een geldige correctie-aanvraag uitvoert
    Then een tweede correctie op dezelfde versie wordt geweigerd
    And de context wisselt terug naar medewerker voor herindiening
    Then een medewerker mag geen admin-reviewactie uitvoeren
    When de medewerker na correctie opnieuw indient
    And de context wisselt opnieuw naar administrator voor goedkeuring
    Then een verouderde approve-aanvraag wordt geblokkeerd met stale-version
    When de administrator met juiste versie goedkeurt
    Then read-back toont approved status met volledige audit- en correctiehistorie
    And cleanup: sessie sluiten voor testisolatie

  @happy
  Scenario: [TS-REV-API-H-006] gelijktijdige approve-requests door twee beheerders leveren exact één winnaar
    # Testtechniek: Concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een medewerker een urenstaat heeft ingediend in een schrijfbare testperiode
    When twee beheerders tegelijk dezelfde urenstaat proberen goed te keuren
    Then wordt met Playwright-assertions bevestigd dat gelijktijdige approve-requests door twee beheerders leveren exact één winnaar

  @happy
  Scenario: [TS-REV-API-H-007] jaarwisseling december naar januari verwerkt urenstaten correct over de jaargrens
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 7
    Given de medewerker is ingelogd
    When de medewerker concepten opslaat voor december en de daaropvolgende januari
    And cleanup: sessie sluiten voor testisolatie
    Then wordt met Playwright-assertions bevestigd dat jaarwisseling december naar januari verwerkt urenstaten correct over de jaargrens
