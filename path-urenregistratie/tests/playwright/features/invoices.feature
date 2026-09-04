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

  @happy
  Scenario: [INV-H-013] documentarchief toont factuur en klanturenstaat zonder bestanden vooraf te laden
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 11
    Given facturen bekijken en beheren is voorbereid
    When de flow voor INV-H-013 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat documentarchief toont factuur en klanturenstaat zonder bestanden vooraf te laden

  @negative
  Scenario: [INV-N-014] ontbrekende klanturenstaat accepteert uitsluitend PDF JPG of PNG
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given facturen bekijken en beheren is voorbereid
    When de flow voor INV-N-014 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat ontbrekende klanturenstaat accepteert uitsluitend PDF JPG of PNG

  @happy
  Scenario: [INV-H-020] Backoffice kan een ontbrekende urenstaat extern bevestigen en terugdraaien
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 23
    Given Backoffice de door Shawn rechtstreeks gemailde urenstaat in september opent
    When Backoffice de ontvangen urenbevestiging met een standaardreden vastlegt
    Then telt de urenstaat groen mee en kan Backoffice de bevestiging terugdraaien

  @happy
  Scenario: [INV-H-021] goedgekeurde septemberuren maken de ontbrekende serverfactuur bij afronden aan
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 5
    Given Stasjo goedgekeurde septemberuren heeft maar nog geen factuurrij
    When Backoffice de controle afrondt
    Then maakt de app de serverfactuur vanuit de goedgekeurde urenstaat en sluit de taak

  @happy
  Scenario: [INV-H-018] externe factuur slaat PDF JPG en PNG via de factuur-API op
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 5
    Given facturen bekijken en beheren is voorbereid
    When de flow voor INV-H-018 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat externe factuur slaat PDF JPG en PNG via de factuur-API op

  @negative
  Scenario: [INV-N-017] medewerker mag geen externe factuur uploaden
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given facturen bekijken en beheren is voorbereid
    When de flow voor INV-N-017 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat medewerker mag geen externe factuur uploaden

  @happy
  Scenario: [INV-H-016] factuurdataset met 32 records wordt in pagina’s van maximaal 25 getoond
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 19
    Given facturen bekijken en beheren is voorbereid
    When de flow voor INV-H-016 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat factuurdataset met 32 records wordt in pagina’s van maximaal 25 getoond

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

  @negative
  Scenario: [INV-N-019] lege actuele maand met open medewerkeruren is geblokkeerd en nooit afgerond
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given Backoffice op TEST in september inlogt met vier nog niet ingediende urenstaten
    When Backoffice de septemberfacturen opent
    Then toont september vier blokkades en geen afgeronde maandcontrole

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
  Scenario: [INV-H-022] de drie statusstappen filteren de factuurlijst en lichten op
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de administrator het factuurscherm met de drie statusstappen opent
    When de administrator op de stap Klaar voor controle klikt
    Then staat de factuurlijst op Factuur klaar en licht die stap op
    And nog een keer op dezelfde stap klikken zet het filter terug op Alle

  @happy
  Scenario: [INV-H-023] documentarchief noemt wie de klanturenstaat buiten de app afhandelde en wanneer
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een factuur waarvan de klanturenstaat rechtstreeks is gemaild met reden en registratiegegevens
    When Backoffice het documentarchief opent
    Then staan de reden en de naam met datum van de registratie in beeld

  @happy
  Scenario: [INV-H-024] het factuurzoekveld matcht op een paar letters, niet alleen op de volledige naam
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 9
    Given een factuurlijst met twee medewerkers
    When de beheerder een paar letters, een deel van het factuurnummer of een middenstuk van de naam typt
    Then filtert de lijst live op die substring en toont leegmaken alles weer
