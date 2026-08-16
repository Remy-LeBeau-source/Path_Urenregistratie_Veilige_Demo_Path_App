@regressie
@integration
@fase:11
Feature: Facturen definitief maken en vergrendelen

  # Native Playwright-uitvoering: tests/playwright/invoice-lock.spec.ts
  # Navigatiemapping: tests/playwright/steps/invoice-locking.steps.ts

  @happy
  Scenario: [INV-H-004] admin lockt approved timesheet naar definitieve immutable factuur
    # Testtechniek: Concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 26
    Given een medewerker een urenstaat heeft ingediend in een herhaalbare testperiode
    And een administrator die urenstaat goedkeurt
    When de administrator de factuur finaliseert met lock-actie
    Then worden nummer bedragen en locked_at server-side vastgelegd en blijft client-manipulatie zonder effect
    And de administrator kan de server-side gegenereerde factuur-PDF downloaden
    And cleanup de administrator-sessie wordt afgesloten

  @negative
  Scenario: [INV-N-015] definitief gefactureerde uren kunnen niet voor correctie worden heropend
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 9
    Given een medewerker een urenstaat indient in een geïsoleerde testperiode
    And Backoffice de uren goedkeurt en de factuur definitief maakt
    When Backoffice de gefactureerde maand alsnog voor correctie probeert te openen
    Then de definitieve factuur en urenstatus onveranderd blijven

  @negative
  Scenario: [INV-N-008] anonieme gebruiker kan factuur niet locken
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given er is geen actieve sessie
    When een lock-actie zonder sessie wordt verstuurd
    Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker kan factuur niet locken

  @negative
  Scenario: [INV-N-009] medewerker mag factuur niet finaliseren
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de medewerker is ingelogd
    When de medewerker een lock-actie verstuurt
    And cleanup de sessie wordt afgesloten
    Then wordt met Playwright-assertions bevestigd dat medewerker mag factuur niet finaliseren

  @negative
  Scenario: [INV-N-010] niet-goedgekeurde urenstaat kan niet worden gelockt
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een ingediende maar niet-goedgekeurde urenstaat
    When de administrator de factuur probeert te finaliseren
    And cleanup de administrator-sessie wordt afgesloten
    Then wordt met Playwright-assertions bevestigd dat niet-goedgekeurde urenstaat kan niet worden gelockt

  @negative
  Scenario: [INV-N-011] tweede lock-oproep op dezelfde factuur wordt geblokkeerd
    # Testtechniek: Concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een administrator met een approved urenstaat
    When de eerste lock-oproep succesvol is
    Then wordt een tweede lock-oproep geweigerd en ontstaat geen duplicaat
    And cleanup de administrator-sessie wordt afgesloten

  @negative
  Scenario: [INV-N-012] gelijktijdige lock-requests leveren exact één winnaar
    # Testtechniek: Concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 1
    Given facturen definitief maken en vergrendelen is voorbereid
    When de flow voor INV-N-012 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat gelijktijdige lock-requests leveren exact één winnaar

  @negative
  Scenario: [INV-N-013] anonieme gebruiker kan factuur-PDF niet downloaden
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een administrator een factuur heeft gefinaliseerd
    When een anonieme gebruiker de factuur-PDF probeert te downloaden
    Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker kan factuur-PDF niet downloaden
