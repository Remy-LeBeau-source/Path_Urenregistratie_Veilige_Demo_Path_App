@regressie
@ui
@desktop
@mobile
@fase:18
Feature: Interactieve Path Pipeline als zelfstandige TEST-demo

  # Native Playwright-uitvoering: tests/playwright/pipeline-demo.spec.ts

  @happy
  Scenario: [PIPE-H-001] de demo verbindt backlog, kennisbank en testbeheer met vijf echte opleveringen
    # Testtechniek: use-caseketen + traceerbaarheid over drie projecties
    # Aantoonbare Playwright-assertions in deze case: 18
    Given de zelfstandige TEST-only pipelinepagina
    When de pipelinepagina is geladen
    Then staan de vier afgesproken fasen en vijf vaste tickets in beeld
    And Kennisbank en Testbeheer projecteren dezelfde traceerbare inhoud

  @happy
  Scenario: [PIPE-H-002] een nieuw ticket loopt door vier fasen naar Zephyr en de Living Doc
    # Testtechniek: toestandsovergang (te doen → uitvoering → opgeleverd) + ketentest
    # Aantoonbare Playwright-assertions in deze case: 25
    Given een nieuwe vraag met acceptatiecriterium
    When de volledige pipeline automatisch wordt uitgevoerd
    Then komt de testcase in Zephyr en de oplevering in de begrensde Living Doc

  @negative
  Scenario: [PIPE-N-001] de demo blijft lokaal, begrenst de Living Doc op tien en past op een telefoon
    # Testtechniek: grenswaardenanalyse (10/14 regels) + responsive viewport + negatieve integratiecontrole
    # Aantoonbare Playwright-assertions in deze case: 6
    Given veertien lokale Living Doc-regels op een telefoonviewport
    When de Kennisbank op de telefoon wordt geopend
    Then worden alleen de laatste vijf lokale regels getoond en tien lokaal bewaard
    And de pagina heeft geen horizontale overflow of gedeelde appcode
