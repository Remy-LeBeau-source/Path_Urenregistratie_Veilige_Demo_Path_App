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
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de administrator is ingelogd en reset naar vaste baseline
    When de administrator een klaarstaande factuur via API opvraagt
    Then is de invoice-data consistent (PDF format fix validates content structure)

  @negative
  Scenario: [INV-N-007] ongeldige periodefilter geeft nette 400-fout
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de administrator is ingelogd
    When een ongeldige periodefilter wordt opgevraagd
    Then geeft de API invalid-period met status 400 terug

  @happy
  Scenario: [INV-H-010] gecontroleerde concept-PDF wordt als mailbijlage naar de server gestuurd
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de administrator is ingelogd met demo-data
    When de app de gecontroleerde conceptfactuur voor verzending genereert
    Then is dezelfde payload een volledige geldige PDF voor de mailbijlage

  @happy
  Scenario: [INV-H-011] beperkte factuur-inhoud: alle velden in server-PDF inclusief recipient/project/uren/betaling
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de administrator is ingelogd met demo-data inclusief geassigneerde taken
    When de administrator factuurdata voor augustus opvraagt met details
    Then bevat de server-PDF alle inhoudssecties: FACTUUR, Facturerende, Factuur aan, Project, uren/tarief, Betaling

  @happy
  Scenario: [INV-H-012] gesloten factuur PDF bevat alle content sections (recipient, project, uren/tarief)
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de administrator is ingelogd en reset naar vaste baseline
    When de administrator het factuurscherm opent en een factuur sluit
    Then zit in de gegenereerde PDF alle content (recipient, project, uren, tarief, betaling)

  @happy
  Scenario: [INV-H-013] documentarchief toont factuur en klanturenstaat zonder bestanden vooraf te laden
    # Testtechniek: Use-case + lazy-loading contract
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de administrator heeft een factuur met twee bewaarde documenten
    When de administrator Documenten bekijken opent
    Then zijn factuur en klanturenstaat afzonderlijk op aanvraag beschikbaar

  @negative
  Scenario: [INV-N-014] ontbrekende klanturenstaat accepteert uitsluitend PDF JPG of PNG
    # Testtechniek: Negatieve equivalentieklasse + bestandsvalidatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de administrator heeft een factuur zonder bewaarde klanturenstaat
    When de administrator een niet toegestaan bestand kiest
    Then blijft het documentvenster open met een duidelijke validatiefout

  @negative
  Scenario: [INV-N-017] medewerker mag geen externe factuur uploaden
    # Testtechniek: Autorisatiematrix + negatieve API-test
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de medewerker is ingelogd
    When de medewerker een externe factuur probeert te uploaden
    Then weigert de server de factuuractie met status 403

  @happy
  Scenario: [INV-H-016] factuurdataset met 32 records wordt gepagineerd
    # Testtechniek: Grenswaardenanalyse rond paginagrootte 25
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de administrator heeft een testdataset met 32 facturen
    When de administrator naar de tweede archiefpagina gaat
    Then worden eerst 25 en daarna 7 facturen getoond
