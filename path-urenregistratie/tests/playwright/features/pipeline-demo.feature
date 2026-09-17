@regressie
@ui
@desktop
@mobile
@fase:18
Feature: Interactieve Path Pipeline als zelfstandige TEST-demo met echte projectstand

  # Native Playwright-uitvoering: tests/playwright/pipeline-demo.spec.ts
  # Navigatiemapping: tests/playwright/steps/pipeline-demo.steps.ts

  @negative
  Scenario: [PIPE-N-003] de oude bestandsnaam wijst door naar Path Kwaliteitsstraat, en de bestemming laadt zijn eigen stylesheet en script echt
    # Testtechniek: Regressiecontrole na hernoeming: oude URL blijft bereikbaar en verwijst door (meta-refresh) naar de nieuwe naam
    # Aantoonbare Playwright-assertions in deze case: 3
    Given interactieve Path Pipeline als zelfstandige TEST-demo met echte projectstand is voorbereid
    When de flow voor PIPE-N-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de oude bestandsnaam wijst door naar Path Kwaliteitsstraat, en de bestemming laadt zijn eigen stylesheet en script echt

  @happy
  Scenario: [PIPE-H-001] de demo toont de echte laatste opleveringen uit GIO-WENSEN met hun cases en Gherkin
    # Testtechniek: Datagedreven vergelijking (pagina versus pilot/path-kwaliteitsstraat-data.json) + traceerbaarheid over drie projecties
    # Aantoonbare Playwright-assertions in deze case: 28
    Given de zelfstandige TEST-only pipelinepagina met de echte projectstand
    When de pagina is geladen, staan de vier fasen en de laatste tien echte opleveringen op het bord
    And Kennisbank en Testbeheer projecteren dezelfde echte cases en de Living Doc toont hooguit tien
    Then wordt met Playwright-assertions bevestigd dat de demo toont de echte laatste opleveringen uit GIO-WENSEN met hun cases en Gherkin

  @happy
  Scenario: [PIPE-H-002] opslaan in het Confluence-loket is genoeg: de wens landt in de wachtrij op de server, niet bij GitHub
    # Testtechniek: Toestandsovergangtest (aangenomen → wacht op VS Code → simulatie → opgeleverd) + contractcontrole van het wachtrij-antwoord + negatieve controle dat GitHub niet meer wordt benaderd
    # Aantoonbare Playwright-assertions in deze case: 42
    Given de pagina opent in Confluence, want daar begint de keten
    And vanaf het Jira-bord wijst een knop terug naar het loket
    And een nieuwe wens met acceptatiecriterium
    When de flow wordt gestart, gaat de wens naar de eigen wachtrij en niet naar GitHub
    Then meldt de pagina dat hij is aangenomen en staat hij op het bord, ook na herladen
    And een tweede bezoeker met een schone browser ziet dezelfde wens, want de wachtrij staat op de server
    And een simulatie op dezelfde kaart loopt door vier fasen naar Zephyr en de Living Doc

  @negative
  Scenario: [PIPE-N-002] de intakewachtrij weigert onvolledige, te grote en verkeerd geadresseerde invoer, en bestaat niet op productie
    # Testtechniek: Foutinjectie op de intake (leeg veld, onleesbare invoer, grensoverschrijding, verkeerde methode) + omgevingsafscherming met tegenproef
    # Aantoonbare Playwright-assertions in deze case: 17
    Given de intakewachtrij van de open demo-omgeving
    When er onvolledige, onleesbare, te grote en verkeerd geadresseerde verzoeken binnenkomen
    Then staat er van al die pogingen niets in de wachtrij en lekt er geen IP-kenmerk
    And op een productieomgeving bestaat de wachtrij helemaal niet

  @happy
  Scenario: [PIPE-H-007] de keuzelijst vult het formulier voor, Te doen laat zich ordenen en de versie staat in de voet
    # Testtechniek: Beslistabel op de keuzelijst (kiezen, zelf typen, loslaten) + toestandsovergang van de volgorde in Te doen (toetsenbord, herladen) + inhoudscontrole van versheidsregel en voettekst
    # Aantoonbare Playwright-assertions in deze case: 26
    Given de keuzelijst toont de nice-to-haves uit GIO-WENSEN
    When de PO een verbetering kiest, then staan samenvatting en waarde ingevuld en blijft het criterium aan hem
    And zelf typen blijft mogelijk: aanpassen maakt de keuze niet ongedaan, loslaten wel
    And het type heet Onderhoud, niet Chore
    And de volgorde in Te doen is met het toetsenbord te wijzigen en blijft na herladen
    And bovenin staat hoe vers de stand is en de versie staat in de voet zoals in de urenapp
    Then wordt met Playwright-assertions bevestigd dat de keuzelijst vult het formulier voor, Te doen laat zich ordenen en de versie staat in de voet

  @happy
  Scenario: [PIPE-H-008] het loket stelt zelf een testbaar acceptatiecriterium voor, zonder externe aanroep
    # Testtechniek: Beslistabel op het criterium-voorstel (leeg/getal/status/generiek geeft elk een ander Then) + negatieve controle op een extern netwerkverzoek
    # Aantoonbare Playwright-assertions in deze case: 12
    Given Samenvatting en Gewenste waarde nog leeg zijn, then vraagt de knop erom in te vullen
    When beide velden gevuld zijn en op voorstellen wordt geklikt, then komt er een testbaar criterium
    And blijft het voorstel aanpasbaar: zelf typen overschrijft het gewoon
    And geeft een getal in het criterium een concreet Then over dat getal
    And geeft een bekend statuswoord een concreet Then over die status
    And gaat er voor dit alles geen enkel verzoek naar een externe dienst
    Then wordt met Playwright-assertions bevestigd dat het loket stelt zelf een testbaar acceptatiecriterium voor, zonder externe aanroep

  @negative
  Scenario: [PIPE-N-004] tussen de mobiele en de bureaubladdrempel blijft de Confluence-kolom leesbaar breed
    # Testtechniek: Grenswaardenanalyse op viewportbreedte (net onder/boven de drempel, plus de standaard testbreedte als vaste regressie) + reproductie van "Bureaubladsite aanvragen"
    # Aantoonbare Playwright-assertions in deze case: 13
    Given 1200px (net onder de drempel): de lay-out is gestapeld en breed genoeg om te lezen
    When de viewport 1px breder wordt (1201px), then komt de zijbalk terug zonder de kolom kapot te knijpen
    And op 1280px, de standaard testbreedte van deze hele suite, blijft de zijbalk zichtbaar en de kolom leesbaar
    And ook op een gewoon breed bureaubladscherm (1600px) is de kolom nog steeds leesbaar breed
    Then wordt met Playwright-assertions bevestigd dat tussen de mobiele en de bureaubladdrempel blijft de Confluence-kolom leesbaar breed

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
    # Aantoonbare Playwright-assertions in deze case: 12
    Given interactieve Path Pipeline als zelfstandige TEST-demo met echte projectstand is voorbereid
    When de Kennisbank op de telefoon wordt geopend
    Then toont de Living Doc precies tien regels, lokaal vóór echt, en bewaart hij er tien
    And de pagina heeft geen horizontale overflow of gedeelde appcode

  @happy
  Scenario: [PIPE-H-006] de Living Doc leest op vijftien pixels, in licht en in donker
    # Testtechniek: Meting van berekende stijl in licht en donker + responsive viewport (intake #45)
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de Living Doc in de Kennisbank
    When de flow voor PIPE-H-006 wordt uitgevoerd
    Then blijft de regel ook op een telefoon binnen beeld
