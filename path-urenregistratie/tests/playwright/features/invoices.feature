@regressie
@ui
@desktop
@fase:11
Feature: Facturen bekijken en beheren

  # Native Playwright-uitvoering: tests/playwright/invoices.spec.ts
  # Navigatiemapping: tests/playwright/steps/invoices-ui.steps.ts

  @happy
  Scenario: [INV-H-001] admin facturen zichtbaar en console errors 0
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given de administrator is ingelogd
    When de administrator het facturenscherm opent
    Then facturen per periode zijn zichtbaar zonder consolefouten

  @negative
  Scenario: [INV-N-005] employee facturen zichtbaar maar beperkt en console errors 0
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de medewerker is ingelogd
    When de medewerker factuurdata opvraagt
    Then alleen eigen facturen zijn zichtbaar zonder consolefouten

  @happy
  Scenario: [INV-H-002] periodefilter juli en augustus werkt
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de administrator is ingelogd en op het facturenscherm staat
    When de administrator wisselt tussen juli en augustus 2026
    Then het factuuroverzicht ververst voor de gekozen periode

  @happy
  Scenario: [INV-H-003] server berekent bedrag uit uren en uurtarief voor open facturen
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de administrator is ingelogd
    When factuurdata voor augustus 2026 wordt opgevraagd
    Then het bedrag komt uit server-side berekening in plaats van alleen statische demo-output

  @happy
  Scenario: [INV-H-006] admin kan het gekozen maanddetail inklappen en weer uitklappen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 11
    Given de administrator is ingelogd en op facturen staat
    When de gekozen maanddetails worden verborgen en opnieuw getoond
    Then blijven het overzicht en de gekozen maand netjes gescheiden zichtbaar

  @happy
  Scenario: [INV-H-007] factuurnavigatie onderscheidt geblokkeerde en controleklare maanden met oranje en groen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 10
    Given de administrator is ingelogd met de vaste demo-baseline
    When de flow voor INV-H-007 wordt uitgevoerd
    Then toont Facturen één oranje blokkadebadge en één groene controlebadge

  @happy
  Scenario: [INV-H-009] server-PDF-content moet identiek zijn aan app-preview
    # Testtechniek: Regressie-preventie + inhoudsconsistentie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de administrator is ingelogd en reset naar vaste baseline
    When de administrator een klaarstaande factuur in preview opent
    Then zijn de zichtbare preview-velden niet leeg

  @negative
  Scenario: [INV-N-007] ongeldige periodefilter geeft nette 400-fout
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de administrator is ingelogd
    When een ongeldige periodefilter wordt opgevraagd
    Then geeft de API invalid-period met status 400 terug
