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
    # Aantoonbare Playwright-assertions in deze case: 6
    Given interactieve Path Pipeline als zelfstandige TEST-demo met echte projectstand is voorbereid
    When de flow voor PIPE-N-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de oude bestandsnaam wijst door naar Path Kwaliteitsstraat, en de bestemming laadt zijn eigen stylesheet en script echt

  @happy
  Scenario: [PIPE-H-001] de demo toont de echte laatste opleveringen uit GIO-WENSEN met hun cases en Gherkin
    # Testtechniek: Datagedreven vergelijking (pagina versus pilot/path-kwaliteitsstraat-data.json) + traceerbaarheid over drie projecties
    # Aantoonbare Playwright-assertions in deze case: 38
    Given de zelfstandige TEST-only pipelinepagina met de echte projectstand
    When de pagina is geladen, staan de vier fasen en de eerste echte opleveringen op het bord
    And de zoekbalk vindt ook een oplevering die buiten de eerste lading valt
    And Kennisbank en Testbeheer projecteren dezelfde echte cases, met paginering in plaats van een afkap
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

  @happy
  Scenario: [PIPE-H-010] een ticket opent als een echte Jira-story: details, beschrijving, traceability, ontwerp en historie
    # Testtechniek: Contractcontrole op de issuepagina (vaste blokken, veld-naar-veldafbeelding naar Jira) + controle dat traceability-cijfers uit de echte case komen en de ERD-link echt bereikbaar is
    # Aantoonbare Playwright-assertions in deze case: 28
    Given een opgeleverd ticket wordt geopend vanaf het bord
    When de flow voor PIPE-H-010 wordt uitgevoerd
    Then staan de vaste blokken van een Jira-issuepagina er
    And toont Traceability de echte testcases met techniek en assertions
    And staan FO, TO en het databasemodel bij de story
    And vertelt de historie wat er echt is gebeurd
    And zijn de blokken in te klappen zoals in Jira

  @happy
  Scenario: [PIPE-H-013] een kaart verplaatsen verandert de stand echt en blijft staan na herladen
    # Testtechniek: Toestandsovergangtest op het bord (kolom naar kolom) met controle op de server in plaats van op het scherm + herstelbaarheid na herladen zonder browseropslag + tweede lezer ziet dezelfde stand
    # Aantoonbare Playwright-assertions in deze case: 15
    Given de opslag kent deze kaart nog niet
    When de kaart naar In uitvoering wordt gesleept
    Then weet de server het, met een geschiedenisregel erbij
    And blijft hij daar na herladen, ook zonder de browseropslag
    And een tweede lezer ziet dezelfde stand
    And de kaart gaat terug, zodat deze case geen sporen achterlaat

  @happy
  Scenario: [PIPE-H-012] elk ticket heeft een deelbare link en zichtbare verwijzingen naar Confluence en Zephyr
    # Testtechniek: Navigatietest over de drie werkruimtes via het gedeelde nummer + herstelbaarheid (dezelfde link opent hetzelfde ticket opnieuw) + negatieve inhoudscontrole dat de eigen implementatie (GitHub) nergens meer doorschemert
    # Aantoonbare Playwright-assertions in deze case: 20
    Given interactieve Path Pipeline als zelfstandige TEST-demo met echte projectstand is voorbereid
    When de flow voor PIPE-H-012 wordt uitgevoerd
    Then stuurt geen enkele knop of link de lezer nog naar GitHub
    And staan in het ticket de verwijzingen met hun echte nummer
    And is de link naar dit ticket deelbaar
    And wijst de keten door naar de uitkomst in de Living Doc
    And brengt de Confluence-verwijzing je naar de pagina van hetzelfde nummer

  @happy
  Scenario: [PIPE-H-011] Releases bundelt de echte versies met hun wensen, cases en assertions
    # Testtechniek: Datagedreven vergelijking (versiegroepering op de pagina versus dezelfde groepering uit de feed) + equivalentieklassen op het releasefilter + navigatiecontrole van release naar bord
    # Aantoonbare Playwright-assertions in deze case: 16
    Given het tabblad Releases
    When de flow voor PIPE-H-011 wordt uitgevoerd
    Then staat de nieuwste versie bovenaan met haar echte aantallen
    And scheidt het filter gereleaste versies van wat nog op een versie wacht
    And brengt klikken op een versie je naar precies die opleveringen

  @happy
  Scenario: [PIPE-H-009] de koppelingen tonen welke bron geldt en lekken nooit een instelling
    # Testtechniek: Contractcontrole op het koppelingen-endpoint (vorm, statusregels per bron) + negatieve inhoudscontrole dat geen enkele instelling naar buiten lekt
    # Aantoonbare Playwright-assertions in deze case: 19
    Given het koppelingen-endpoint van de open demo-omgeving
    When de flow voor PIPE-H-009 wordt uitgevoerd
    Then geldt onze eigen bron en staan de drie klantbronnen klaar
    And staat er nergens een instelling in het antwoord
    And legt de Kennisbank uit wat er per koppeling nodig is

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
    # Aantoonbare Playwright-assertions in deze case: 26
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
  Scenario: [PIPE-N-001] de demo blijft lokaal, tekent de Living Doc in stappen en past op een telefoon
    # Testtechniek: Grenswaardenanalyse (10 van 14 regels) + responsive viewport + negatieve integratiecontrole
    # Aantoonbare Playwright-assertions in deze case: 14
    Given interactieve Path Pipeline als zelfstandige TEST-demo met echte projectstand is voorbereid
    When de Kennisbank op de telefoon wordt geopend
    Then tekent de Living Doc tien regels per keer, lokaal vóór echt, en bewaart hij er hooguit 25
    And de pagina heeft geen horizontale overflow of gedeelde appcode

  @happy
  Scenario: [PIPE-H-006] de Living Doc leest op vijftien pixels, in licht en in donker
    # Testtechniek: Meting van berekende stijl in licht en donker + responsive viewport (intake #45)
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de Living Doc in de Kennisbank
    When de flow voor PIPE-H-006 wordt uitgevoerd
    Then blijft de regel ook op een telefoon binnen beeld
