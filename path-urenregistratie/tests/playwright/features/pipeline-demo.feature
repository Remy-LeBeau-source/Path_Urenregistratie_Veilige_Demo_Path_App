@regressie
@ui
@desktop
@mobile
@fase:18
Feature: Interactieve Path Pipeline als zelfstandige TEST-demo met echte projectstand

  # Native Playwright-uitvoering: tests/playwright/pipeline-demo.spec.ts
  # Navigatiemapping: tests/playwright/steps/pipeline-demo.steps.ts

  @happy
  Scenario: [PIPE-H-001] de demo toont de echte laatste opleveringen uit GIO-WENSEN met hun cases en Gherkin
    # Testtechniek: Datagedreven vergelijking (pagina versus pilot/path-pipeline-data.json) + traceerbaarheid over drie projecties
    # Aantoonbare Playwright-assertions in deze case: 26
    Given de zelfstandige TEST-only pipelinepagina met de echte projectstand
    When de pagina is geladen, staan de vier fasen en de laatste vijf echte opleveringen op het bord
    And Kennisbank en Testbeheer projecteren dezelfde echte cases en de Living Doc toont hooguit tien
    Then wordt met Playwright-assertions bevestigd dat de demo toont de echte laatste opleveringen uit GIO-WENSEN met hun cases en Gherkin

  @happy
  Scenario: [PIPE-H-002] een doorgezette wens wordt een GitHub-issue voor VS Code en kan daarna gesimuleerd worden
    # Testtechniek: Toestandsovergangtest (ingediend → wacht op VS Code → simulatie → opgeleverd) + contractcontrole van de issue-URL
    # Aantoonbare Playwright-assertions in deze case: 29
    Given een nieuwe wens met acceptatiecriterium
    When de wens wordt doorgezet naar VS Code
    Then staat de wens op het bord als wachtend op VS Code, ook na herladen
    And een simulatie op dezelfde kaart loopt door vier fasen naar Zephyr en de Living Doc

  @happy
  Scenario: [PIPE-H-004] zoeken, filteren, sorteren en het detailpaneel werken in alle drie de werkruimtes
    # Testtechniek: Equivalentieklassen op filters + toestandsovergang van het detailpaneel + sorteercontrole
    # Aantoonbare Playwright-assertions in deze case: 24
    Given de pipelinepagina met de echte projectstand
    When er wordt gezocht, gefilterd, gesorteerd en een kaart wordt geopend
    Then tonen bord, kennisbank en testbeheer telkens de bijbehorende selectie

  @happy
  Scenario: [PIPE-H-003] de Kennisbank leest in de Atlassian-letterstapel op 16px met regelhoogte 24px, licht en donker
    # Testtechniek: Meting van berekende stijl (computed style) in licht en donker kleurschema
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de Kennisbank van de pipelinepagina
    When de flow voor PIPE-H-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de Kennisbank leest in de Atlassian-letterstapel op 16px met regelhoogte 24px, licht en donker

  @happy
  Scenario: [PIPE-H-005] de weergaveknop kiest licht, donker of systeem en onthoudt die keuze
    # Testtechniek: Toestandsovergang over drie weergavestanden + meting van berekende stijl + persistentie na herladen
    # Aantoonbare Playwright-assertions in deze case: 13
    Given een bezoeker met een donkere systeeminstelling
    When de weergaveknop wordt gebruikt
    Then blijft de keuze staan na herladen

  @negative
  Scenario: [PIPE-N-001] de demo blijft lokaal, begrenst de Living Doc op tien en past op een telefoon
    # Testtechniek: Grenswaardenanalyse (10 van 14 regels) + responsive viewport + negatieve integratiecontrole
    # Aantoonbare Playwright-assertions in deze case: 9
    Given interactieve Path Pipeline als zelfstandige TEST-demo met echte projectstand is voorbereid
    When de Kennisbank op de telefoon wordt geopend
    Then toont de Living Doc precies tien regels, lokaal vóór echt, en bewaart hij er tien
    And de pagina heeft geen horizontale overflow of gedeelde appcode
