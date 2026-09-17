@regressie
@integration
@fase:9
Feature: Correctie- en goedkeuringsproces

  # Native Playwright-uitvoering: tests/playwright/timesheet-review-flow.spec.ts
  # Navigatiemapping: tests/playwright/steps/timesheets-review-integration.steps.ts

  @happy
  Scenario: [TS-REV-API-H-005] admin vraagt correctie, employee dient opnieuw in, admin keurt goed met optimistic locking
    # Testtechniek: Concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 80
    Given de medewerker is ingelogd en heeft een schrijfbare testperiode
    When de medewerker een concept opslaat en daarna indient
    And de reviewcontext wisselt naar administrator
    Then een verouderde correctie-aanvraag wordt geblokkeerd met stale-version
    Then een correctie-aanvraag zonder toelichting wordt door de server geweigerd (sectie 20: UI-verbergen is geen autorisatie)
    When de administrator een geldige correctie-aanvraag uitvoert
    Then een tweede correctie op dezelfde versie wordt geweigerd
    And de context wisselt terug naar medewerker voor herindiening
    Then een medewerker mag geen admin-reviewactie uitvoeren
    When de medewerker na correctie opnieuw indient
    And de context wisselt opnieuw naar administrator voor goedkeuring
    Then een verouderde approve-aanvraag wordt geblokkeerd met stale-version
    And heeft de geweigerde poging geen goedkeuringsmail in de wachtrij gezet
    When de administrator met juiste versie goedkeurt
    And staat er nu precies één goedkeuringsmail in de wachtrij voor déze goedkeuringsversie
    Then read-back toont approved status met volledige audit- en correctiehistorie
    And een goedkeuring zonder factuur server-side kan worden heropend voor correctie
    Then krijgt de medewerker ook bij een heropening ná goedkeuring een nieuwe, ongelezen melding
    And cleanup: sessie sluiten voor testisolatie

  @happy
  Scenario: [TS-REV-API-H-006] gelijktijdige approve-requests door twee beheerders leveren exact één winnaar
    # Testtechniek: Concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 10
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

  @negative
  Scenario: [TS-REV-API-N-002] elke verboden statusovergang wordt geweigerd en laat de urenstaat ongemoeid
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 19
    Given een concept van een medewerker in een eigen periode
    When de beheerder een concept probeert goed te keuren of te laten corrigeren, then weigert de server beide
    And blijft goedkeuren geweigerd zodra de maand al is goedgekeurd
    And mag de medewerker een goedgekeurde maand niet opnieuw indienen of als concept overschrijven
    Then wordt met Playwright-assertions bevestigd dat elke verboden statusovergang wordt geweigerd en laat de urenstaat ongemoeid

  @negative
  Scenario: [TS-REV-API-N-001] server weigert een dagregel op zaterdag of zondag, ook als de aanroep de client omzeilt
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de medewerker is ingelogd en heeft een schrijfbare testperiode
    When de medewerker rechtstreeks via de API een dagregel op een weekenddag probeert op te slaan
    Then wijst de server het verzoek af met een duidelijke foutmelding
    And cleanup: sessie sluiten voor testisolatie
