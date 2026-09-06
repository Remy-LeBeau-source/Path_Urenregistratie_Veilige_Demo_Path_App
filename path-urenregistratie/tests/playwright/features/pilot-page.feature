@regressie
@ui
@desktop
@mobile
@fase:18
Feature: 1414/1919-pilotpagina's naast de bestaande app

  # Native Playwright-uitvoering: tests/playwright/pilot-page.spec.ts
  # Beide pilots = statische 1-op-1 reproducties van de 1414/1919-mockups.
  # Medewerker-pilot heeft een lichte interactielaag (1919-medewerker-ui.js):
  # maandkeuze en uren invullen. Backoffice-pilot is volledig statisch.

  @happy
  Scenario: [PILOT-H-001] beide pilotpagina's leven naast een ongewijzigde app
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 10
    Given de webroot met de app op /
    When de medewerker- en Backoffice-pilot als eigen URL worden opgevraagd
    Then dragen ze de pilot-vlag/marker, delen ze geen code met de app en blijft / onaangeroerd

  @happy
  Scenario: [PILOT-H-002] medewerker-pilot toont de 1414-look met werkende maand en weekinvoer
    # Testtechniek: Visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 16
    Given de medewerker-pilot
    When de pagina is geladen
    Then staat september met week 36 klaar om in te vullen en de wekenmeter op nul

  @happy
  Scenario: [PILOT-H-006] medewerker-pilot: uren invullen zonder voorgevulde nul, week indienen opent de volgende week
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de medewerker-pilot met september open
    When een lege dag wordt ingevuld, bijgesteld en de week wordt ingediend
    Then springt de pilot naar week 37, die weer invulbaar is, en telt de wekenmeter mee

  @happy
  Scenario: [PILOT-H-007] medewerker-pilot: afgeronde maand toont vergrendelde weken en verzonden klanturenstaat
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 10
    Given de medewerker-pilot
    When augustus wordt gekozen in de maandkeuze
    Then staan alle weken vast en toont de klanturenstaat het verzonden-vinkje

  @happy
  Scenario: [PILOT-H-003] Backoffice-pilot reproduceert de 1414/1919-ADMIN-mockup 1-op-1
    # Testtechniek: Visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de statische Backoffice-pilot
    When de pagina is geladen
    Then staan de mockup-onderdelen in beeld met de vaste mockup-data

  @happy
  Scenario: [PILOT-H-004] Backoffice-pilot: geselecteerde rij krijgt een subtiele markering, geen groene balk links
    # Testtechniek: Visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de Backoffice-pilot
    When de wachtrij wordt getoond
    Then is precies één rij gemarkeerd zonder verticale groene balk, met opgelichte horizontale proceslijn

  @happy
  Scenario: [PILOT-H-005] Backoffice-pilot: verhaalpaneel toont de vier story-kaarten met statuspillen en de vervolgknop
    # Testtechniek: Visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de Backoffice-pilot met een geselecteerde medewerker
    When het verhaalpaneel wordt getoond
    Then dragen de kaarten de mockup-status en staat de vervolgknop klaar

  @negative
  Scenario: [PILOT-N-001] elke pilot-URL toont alleen de onderdelen van zijn eigen rol
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de medewerker-pilot
    When medewerker- en Backoffice-pilot naast elkaar worden bekeken
    Then heeft de medewerker geen Backoffice-pijplijn en is de Backoffice-pilot als zodanig gemarkeerd

  @negative
  Scenario: [PILOT-N-002] beide pilots blijven zonder horizontale overflow op telefoon
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een telefoonviewport
    When beide pilots worden geopend
    Then past alles binnen de breedte en zijn tapdoelen minimaal 42px
