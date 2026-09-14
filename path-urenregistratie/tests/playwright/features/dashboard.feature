@regressie
@ui
@desktop
@fase:15
Feature: Dashboard en open werkvoorraad

  # Native Playwright-uitvoering: tests/playwright/dashboard*.spec.ts
  # Navigatiemapping: tests/playwright/steps/dashboard.steps.ts

  @happy
  Scenario: [DASH-H-002] employee dashboard opent zonder console errors
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 1
    Given de medewerker is ingelogd
    When de medewerker het dashboard opent
    Then alleen medewerkersinformatie wordt getoond zonder consolefouten

  @happy
  Scenario: [DASH-H-025] "Mijn maanden" toont naast de urenstatus ook de klanturenstaat-status per maand
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 7
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-H-025 wordt uitgevoerd
    Then heeft de historietabel een eigen Klanturenstaat-kolom naast Status
    And toont elke maandrij een eigen klanturenstaat-statuspil, niet gelijk aan de urenstatus

  @happy
  Scenario: [DASH-H-021] de medewerker keert zowel via Dashboard als via Mijn uren terug naar de actuele maand na een blik op een oudere maand
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 10
    Given de medewerker heeft op Mijn uren zelf een eerdere maand geopend
    When de medewerker op Dashboard klikt
    Then staat de maandkiezer weer op de actuele kalendermaand augustus
    When de medewerker opnieuw juli opent, via Mededelingen navigeert en dan zélf op Mijn uren klikt (niet op Dashboard)
    Then zet ook de Mijn uren-tab zelf de maand terug op augustus, zonder via Dashboard te gaan

  @negative
  Scenario: [DASH-N-023] een medewerker kan niet naar een maand vóór de eigen indiensttreding bladeren
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de medewerker (in dienst sinds mei 2026) op de actuele kalendermaand staat
    When de medewerker probeert een maand vóór de startdatum te openen
    Then blijft de maand op augustus staan en verschijnt een duidelijke melding

  @negative
  Scenario: [DASH-N-030] ook vóórdat de serverdata binnen is, opent een medewerker geen maand vóór zijn indiensttreding
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een ingelogde medewerker vóórdat de serverdata binnen is
    When de medewerker april 2026 kiest, een maand vóór zijn indiensttreding in mei
    Then wordt met Playwright-assertions bevestigd dat ook vóórdat de serverdata binnen is, opent een medewerker geen maand vóór zijn indiensttreding

  @negative
  Scenario: [DASH-N-024] een lokaal record van vóór indiensttreding verschijnt niet in Mijn maanden
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given de medewerker is ingelogd en er bestaat lokaal een record van vóór de startdatum
    When de flow voor DASH-N-024 wordt uitgevoerd
    Then blijft april 2026 weg uit de historie, ook al heeft het record uren

  @negative
  Scenario: [DASH-N-025] een gekozen klanturenstaat-bestand blijft niet hangen na een gewone maandwissel
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de medewerker heeft een bestand gekozen voor de huidige maand
    When de medewerker via de gewone pijltjesnavigatie naar een andere maand gaat
    Then staat het bestandsveld weer leeg, want het gekozen bestand hoorde bij de vorige maand

  @negative
  Scenario: [DASH-N-021] een lege oudere maand openen voegt geen fantoom-open-acties toe en houdt de kalendermaand in beeld
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 12
    Given de medewerker ziet zijn open acties in de actuele kalendermaand augustus
    When de medewerker handmatig een lege oudere maand (juni 2026) opent
    Then verschijnt juni niet als open-actiemaand en blijven het totaal en de kalendermaand ongewijzigd

  @negative
  Scenario: [DASH-N-009] medewerker teller blijft stabiel bij aug-juli-aug en dashboard triggert geen verborgen timesheet-read
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de medewerker zit op het dashboard en timesheet-read is gemonitord
    When de medewerker augustus-juli-augustus doorloopt vanuit dashboard
    Then blijft de teller gelijk en zijn er geen verborgen timesheet-reads

  @happy
  Scenario: [DASH-H-003] medewerkerdashboard ververst meteen na ureninvoer en themakiezer blijft leesbaar
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 12
    Given een medewerker die een urenstaat vult en het thema wisselt
    When de medewerker uren invult en terug naar het medewerkerdashboard gaat
    Then blijven de maandnamen zichtbaar in donkere modus

  @happy
  Scenario: [DASH-H-004] terugkeren naar medewerkerdashboard ververst de uren en behoudt maandlabels bij themawissel
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een medewerker op donker thema die vanuit dashboard naar uren gaat
    When de medewerker uren wijzigt en terug navigeert via de zichtbare medewerkerroute
    Then zijn de maandlabels nog zichtbaar in de maandkiezer

  @happy
  Scenario: [DASH-H-005] medewerker ziet open maanden compact en kan direct naar de juiste maand springen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een medewerker met open maanden
    When het medewerkerdashboard opent
    Then is er een compacte open-maandenkaart zichtbaar met een directe maandknop

  @happy
  Scenario: [DASH-H-014] medewerker krijgt de eerstvolgende concrete actie met juiste maand en taakroute
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 22
    Given een medewerker met meerdere open acties over verschillende maanden
    When het dashboard de werkvoorraad prioriteert
    Then opent de hoofdactie exact de geprioriteerde maand en juiste taakroute

  @negative
  Scenario: [DASH-N-015] medewerkerprioriteit kiest correctie boven document en toont niets als alles klaar is
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 15
    Given alleen augustus zowel een urencorrectie als documentherindiening vraagt
    When de flow voor DASH-N-015 wordt uitgevoerd
    Then staat de urencorrectie vóór het document en kloppen de totalen
    And bij een volledig afgeronde werkvoorraad verdwijnen taaklijst en prioriteitsdata

  @negative
  Scenario: [DASH-N-016] correctieactie ververst een verborgen rooster uit een eerdere maand
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 11
    Given juli als goedgekeurde verborgen urenstaat is achtergebleven
    When het dashboard augustus prioriteert en Open correctie wordt gekozen
    Then toont Mijn uren augustus als bewerkbare correctie met herindienknop

  @negative
  Scenario: [DASH-N-018] medewerkerdashboard toont een laadtoestand tot de eerste werkvoorraad-sync
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de eerste werkvoorraad-sync van de medewerker nog niet terug is
    Then toont het dashboard een neutrale laadtoestand en geen stellige afgerond-tekst
    When de sync binnenkomt, verschijnt de gezaghebbende stand

  @happy
  Scenario: [DASH-H-006] medewerker mag tot 2 jaar vooruitkijken zonder fantoom-werkactie, maar niet verder
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 11
    Given een medewerker op de actuele kalendermaand zonder toekomstige werkactie
    When de medewerker de volgende maand opent (binnen 2 jaar)
    Then blijft oktober buiten de medewerkerwerkvoorraad (geen fantoom-actie)
    When de medewerker meer dan 2 jaar vooruit probeert te springen

  @happy
  Scenario: [DASH-H-007] september toont alleen historie vanaf de persoonlijke startmaand, en oktober blijft geen werkactie ondanks dat vooruitkijken nu mag
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 9
    Given een medewerker die in september sinds augustus in dienst is
    When de medewerker augustus opent en daarna juli en oktober probeert
    Then blijft juli dicht, en oktober opent wel (binnen 2 jaar) maar is geen werkactie

  @happy
  Scenario: [DASH-H-024] startdatum verbergt procesmaand zonder uren of klanturenstaatactie te wissen
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 13
    Given Beheer de startdatum eerder heeft gezet en juli nog leeg was
    When de medewerker uren invult terwijl de klanturenstaat nog openstaat
    Then een latere startdatum verbergt de maand en beide acties maar wist niets
    And opnieuw vervroegen herstelt exact dezelfde uren- en klanturenstaatflow

  @happy
  Scenario: [DASH-H-023] medewerker kan met de browser-terug/-vooruit-knop door alle eigen schermen navigeren
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given de medewerker is ingelogd op Mijn overzicht
    When de medewerker achtereenvolgens elk scherm opent
    Then brengt browser-terug telkens het vorige scherm terug
    Then brengt browser-vooruit telkens het volgende scherm terug
    Then een paginaherlading op een teruggenavigeerd scherm blijft daar staan, springt niet terug naar het beginscherm

  @negative
  Scenario: [DASH-N-026] het medewerkerdashboard blijft nooit op "Werkvoorraad laden" hangen, ook niet als de eerste serversync faalt
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de medewerker logt voor het eerst in terwijl de eerste werkvoorraad-sync mislukt
    When de hydratie via het vangnet afrondt
    Then toont geen enkele werkvoorraadplek nog een laadtekst

  @negative
  Scenario: [DASH-N-028] Mijn uren toont in het weekend de week waar vandaag in valt, niet de eerste week van de maand
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een medewerker inlogt op een zaterdag
    When de flow voor DASH-N-028 wordt uitgevoerd
    Then toont de weekkaart de week van vandaag (7-11 sep), niet de eerste week van de maand
    And telt Volgende week vanaf de juiste week verder, niet vanaf de eerste week van de maand

  @negative
  Scenario: [DASH-N-029] de pijl springt naar de eerstvolgende week met een leeg urenvak, ook terug in de tijd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een medewerker op de week van vandaag (Week 37), met die week en de volgende al volledig ingevuld, maar een eerdere week nog leeg
    When op de volgende-week-pijl wordt gedrukt
    Then springt de weergave terug naar de eerdere, nog lege week, niet naar Week 38
    And staat de focus op het eerste lege urenveld van die week

  @happy
  Scenario: [DASH-H-026] het medewerkerdashboard houdt op telefoonbreedte de afgesproken prioriteitsvolgorde aan
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 11
    Given een ingelogde medewerker op telefoonbreedte in Klassiek
    When de flow voor DASH-H-026 wordt uitgevoerd
    Then staat in Klassiek de volgende actie bovenaan, dan open acties, dan de klanturenstaat, dan de rest
    And staat in Nieuw open acties in ieder geval boven de correctie- en archiefingang

  @happy
  Scenario: [DASH-H-030] de indienbevestiging noemt werkdagen die bewust op 0,0 staan
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 9
    Given twee werkdagen staan bewust op 0,0, When de medewerker de maand wil indienen
    When de flow voor DASH-H-030 wordt uitgevoerd
    Then noemt de bevestiging die twee dagen bij naam
    And blijft de melding weg zodra die dagen wel uren hebben

  @happy
  Scenario: [DASH-H-031] het verloop van een maand klapt open in Mijn maanden en overleeft een hertekening
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 14
    Given de medewerker staat op Mijn maanden in Klassiek
    Then staat het verloop dicht tot je erom vraagt
    When het verloop van de eerste maand wordt opengeklapt
    Then toont die maand vijf stappen in de vaste volgorde
    And blijft hij open staan na een hertekening van het scherm
    And staat er hoogstens één maand tegelijk open
    And sluit een tweede tik op dezelfde maand hem weer

  @happy
  Scenario: [DASH-H-032] "Hele maand" noemt de ontbrekende werkdagen bij naam, inclusief dagen die nog moeten komen
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 18
    Given de medewerker staat op Mijn uren in de maandweergave
    When de hele maand leeg is op één bewust op 0,0 gezette dag na
    Then staan de ontbrekende dagen er bij naam, niet als kaal aantal
    And telt de bewust op 0,0 gezette dag niet mee, ook al ligt hij aan het eind van de maand
    And noemt de indienknop wat hij doet en hoeveel dagen er nog open staan, gedempt
    And brengt een chip je naar de week waar die dag in zit
    And verdwijnt de waarschuwing zodra alles is ingevuld

  @happy
  Scenario: [DASH-H-033] de verloopstappen in Klassiek tonen ✓ en • in de bol, leesbaar in licht en donker
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 14
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-H-033 wordt uitgevoerd
    Then heeft de huidige stap een • en een wachtende stap geen teken

  @happy
  Scenario: [DASH-H-034] de klanturenstaatkaart loopt van leeg via bestand gekozen naar verstuurd, en stuurt het gekozen bestand echt mee
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 32
    Given een lege kaart met kiezen, foto en zelf gemaild
    When een verkeerd bestandstype wordt gekozen, dan blijft de kaart leeg met uitleg
    When een PDF wordt gekozen, dan toont de kaart naam, grootte, kruisje en de verstuurknop
    And het kruisje brengt de kaart terug naar leeg
    When het bestand als bijlage wordt verstuurd, dan gaat precies dat bestand mee naar de indienroute
    And na een weigering blijft het gekozen bestand staan
    Then wordt met Playwright-assertions bevestigd dat de klanturenstaatkaart loopt van leeg via bestand gekozen naar verstuurd, en stuurt het gekozen bestand echt mee

  @happy
  Scenario: [DASH-H-035] Mijn uren op desktop toont alleen Ma–Vr, de datum boven elk veld, 0/8/9 eronder en het weektotaal rechts
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 9
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-H-035 wordt uitgevoerd
    Then heeft de weekstaat alleen de werkdagen als kolommen
    And staat in elke dagcel de datum boven het veld en 0/8/9 eronder, met het totaal rechts van de dagen

  @negative
  Scenario: [DASH-N-031] de volgende actie is één zin zonder aangeplakte maand, en de maand staat in de regel eronder
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-N-031 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de volgende actie is één zin zonder aangeplakte maand, en de maand staat in de regel eronder

  @happy
  Scenario: [DASH-H-036] Vandaag staat op desktop in Klassiek volgens de referentie, en hero, ring en Nog te doen kloppen met elkaar
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 27
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-H-036 wordt uitgevoerd
    Then staat Vandaag er in Klassiek, en zijn de oude blokken en de klanturenstaatkaart verhuisd of weg
    And komt het gezegde letterlijk uit de lijst van de referentie
    And zeggen hero en ring hetzelfde aantal open weken
    And toont Nog te doen een chip per open maand, oudste eerst en uitgelicht
    And brengt de hoofdknop je naar Mijn uren zolang er weken open staan
    And staat Vandaag niet in Modern, en daar blijft de bento
    And staat Vandaag op telefoonbreedte nog niet, en keert de kaart terug naar zijn eigen plek

  @happy
  Scenario: [DASH-H-037] Vandaag ververst het restcijfer meteen na ureninvoer en na terugnavigeren
    # Testtechniek: Herstelbaarheid + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 8
    Given het restcijfer klopt met contract en geboekte uren
    When de medewerker via de hoofdknop een uur invult en terug naar het dashboard gaat
    Then is het restcijfer lager en klopt het nog steeds met de bron

  @happy
  Scenario: [DASH-H-038] Nog te doen in Vandaag opent per maand de juiste route, ook voor een correctie, en blijft leesbaar in donker
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 17
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-H-038 wordt uitgevoerd
    Then leidt de eerste chip, de geprioriteerde maand, naar precies die maand en de juiste route
    And opent een correctiemaand Mijn uren als bewerkbare correctie
    And is de tekst op elke chip leesbaar in donker (4,5:1 tegen het werkelijke vlak)

  @happy
  Scenario: [DASH-H-039] het verloop in Vandaag volgt de volgorderegel en is gelijk aan de stappen in Modern
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 9
    Given een concept-maand met een factuurstatus die al op verwerkt staat
    And lopen beide gelijk mee zodra de maand is ingediend
    When de flow voor DASH-H-039 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat het verloop in Vandaag volgt de volgorderegel en is gelijk aan de stappen in Modern

  @negative
  Scenario: [DASH-N-032] een hertekening op de achtergrond zet "Hele maand" in Mijn uren niet terug naar één week
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 12
    Given Klassiek op Mijn uren met Hele maand gekozen
    When de app op de achtergrond opnieuw tekent, then blijft Hele maand staan met de indienknop
    And geldt dat ook in Modern op Mijn uren
    And blijft de keuze ook staan als de bento in Modern op het dashboard tekent
    And volgt Mijn uren de week van de bento zolang de medewerker zelf niets koos
    Then wordt met Playwright-assertions bevestigd dat een hertekening op de achtergrond zet "Hele maand" in Mijn uren niet terug naar één week

  @happy
  Scenario: [DASH-H-040] Standaardmaand vullen vult elke werkdag van de maand volgens het werkpatroon uit beheer, ook de vrije dag, en laat geen gaten
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 6
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-H-040 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat standaardmaand vullen vult elke werkdag van de maand volgens het werkpatroon uit beheer, ook de vrije dag, en laat geen gaten

  @happy
  Scenario: [DASH-H-041] Maand terugzetten zet elke werkdag van de maand op 0,0, niet alleen één week
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 4
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-H-041 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat maand terugzetten zet elke werkdag van de maand op 0,0, niet alleen één week

  @happy
  Scenario: [DASH-H-042] Standaardweek vullen na Week terugzetten vult de week weer volgens het werkpatroon
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 7
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-H-042 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat standaardweek vullen na Week terugzetten vult de week weer volgens het werkpatroon

  @happy
  Scenario: [DASH-H-043] een vrije dag uit beheer telt als ingevuld en staat niet in het rode blok; een 0 op een werkdag wel
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 10
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-H-043 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat een vrije dag uit beheer telt als ingevuld en staat niet in het rode blok; een 0 op een werkdag wel

  @happy
  Scenario: [DASH-H-044] bij een zelf gemailde klanturenstaat zegt het verloop "wacht op Backoffice" en "Volgt na bevestiging", met ongewijzigde standen
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 6
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-H-044 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat bij een zelf gemailde klanturenstaat zegt het verloop "wacht op Backoffice" en "Volgt na bevestiging", met ongewijzigde standen

  @negative
  Scenario: [DASH-N-033] geen misleidend bericht aan Backoffice, en zelf gemaild in medewerkertaal terwijl Backoffice zijn eigen term houdt
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 11
    Given dashboard en open werkvoorraad is voorbereid
    When de flow voor DASH-N-033 wordt uitgevoerd
    Then heeft het scherm Klanturenstaat geen berichtveld en geen berichtvoorbeeld meer
    And staat in Mijn maanden, waar de pil alleen staat, de volledige tekst
    And houdt Backoffice zijn eigen term, zonder sjabloonbericht van de medewerker

  @happy
  Scenario: [DASH-H-001] admin dashboard opent zonder console errors
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given de administrator is ingelogd
    When de administrator het dashboard opent
    Then het dashboard toont admin-overzicht zonder consolefouten

  @happy
  Scenario: [DASH-H-018] elke login en elke Dashboard-klik opent de actuele maand; een handmatige maand blijft alleen op andere schermen
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 29
    Given Backoffice in september inlogt met een eerder bewaarde maand
    Then opent de actuele kalendermaand voor Backoffice
    And Goedkeuringen en Facturen tonen de juiste septemberbeginstand
    When Backoffice augustus kiest en naar Facturen navigeert
    Then blijft augustus gekozen op de andere schermen
    When Backoffice daarna op Dashboard klikt
    Then springt de maandkiezer terug naar de actuele kalendermaand september
    And een nieuwe medewerkerlogin begint opnieuw in september

  @negative
  Scenario: [DASH-N-022] een medewerker met een toekomstige startdatum verschijnt niet in Teamstatus of Klanturenstaten vóór indiensttreding
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de beheerder een nieuwe medewerker aanmaakt die pas volgende maand start
    Then blijft de nieuwe medewerker weg uit augustus (vóór indiensttreding)
    When de beheerder naar september bladert (de startmaand)
    Then verschijnt de medewerker wél in Teamstatus en Klanturenstaten voor september

  @negative
  Scenario: [DASH-N-007] afwijkend API-totaal overschrijft de concrete werkvoorraad niet
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 1
    Given een oude serverstate en een afwijkend API-totaal van 205
    When de flow voor DASH-N-007 wordt uitgevoerd
    Then alle zichtbare totalen blijven gelijk aan de concrete taakregels

  @negative
  Scenario: [DASH-N-008] voorbeeldgegevens herstellen houdt alle werkvoorraadtellers gelijk
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given auth-modus met oude fallback-state en afwijkende serverwerkvoorraad
    When voorbeeldgegevens worden hersteld
    Then blijven de concrete taakregels leidend en verschijnt geen oude teller

  @negative
  Scenario: [DASH-N-010] herstel blijft na F5 leidend boven een oude serverstatus
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 17
    Given Backoffice de voorbeeldomgeving herstelt en daarna naar Stasjo wisselt
    When Stasjo daarna een open urenactie indient
    And Stasjo voert daarna F5 uit
    Then blijft de gewijzigde lokale teller zichtbaar en wordt er geen oude serverstatus teruggezet
    And Backoffice kan Marc zijn klanturenstaat goedkeuren zonder statusrace

  @negative
  Scenario: [DASH-N-011] afgeronde Backoffice-taak en teller blijven na F5 stabiel, ongeacht het beginaantal
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de administrator is ingelogd en reset naar vaste baseline
    When een actionable urencontrole-taak (hours-review) wordt goedgekeurd
    Then blijft de goedgekeurde taak weg en de teller stabiel na F5

  @happy
  Scenario: [DASH-H-008] GUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 24
    Given de lokale demo toont alle 12 beginacties en tellerverdeling
    When medewerkers alle vijf wachtende acties via de zichtbare interface afronden
    And Backoffice bevestigt iedere resterende zichtbare taak tot de werkvoorraad 0 is
    Then wordt met Playwright-assertions bevestigd dat gUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice

  @negative
  Scenario: [DASH-N-012] afgeronde verzendcontrole blijft na F5 weg, ongeacht het beginaantal
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 13
    Given de administrator is ingelogd, reset naar vaste baseline en keurt een ingediende urenstaat goed
    When de nieuwe verzendcontrole (invoice-delivery) wordt afgerond
    Then blijft de afgeronde verzendcontrole weg en de teller stabiel na F5

  @happy
  Scenario: [DASH-H-012] GUI-smoke scheidt werkacties van medewerkers- en beheerdersaccounts
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 35
    Given de vaste GUI-baseline met twaalf open acties en zes actieve accounts
    When de flow voor DASH-H-012 wordt uitgevoerd
    Then toont het dashboard zeven Backoffice-acties en vijf wachttaken zonder medewerkerbadge in het menu
    And Teambeheer toont vier medewerkers en twee beheerders als zes actieve accounts
    And Dashboard opent bovenaan terwijl eigenaarbolletjes gericht naar hun werkvoorraad springen

  @happy
  Scenario: [DASH-H-013] dashboardmodules tonen compacte documenten, procesfasen en teamacties
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 16
    Given Backoffice de vaste augustusbaseline opent
    When de flow voor DASH-H-013 wordt uitgevoerd
    Then toont klanturenstaten een verkoopklaar kaartenoverzicht
    And proces en team tonen zonder lege tussenruimte duidelijke kerninformatie en acties

  @negative
  Scenario: [DASH-N-017] beheerderdashboard toont een laadtoestand tot de eerste werkvoorraad-sync
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 7
    Given de eerste werkvoorraad-sync nog niet is teruggekomen
    Then toont het dashboard een neutrale laadtoestand en geen voorlopige teller
    When de sync binnenkomt, verschijnt de gezaghebbende teller

  @happy
  Scenario: [DASH-H-017] serverwerkvoorraad hydrateert volledig en blijft stabiel bij maand- en filterwissels
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 30
    Given Backoffice met de volledige serverwerkvoorraad is ingelogd
    When Backoffice augustus-juli-augustus doorloopt
    Then blijven globale aantallen, eigenaren en taakidentiteiten gelijk
    And eigenaarfilters openen alleen hun concrete taakregels
    And opnieuw openen zet alle maandblokken terug naar ingeklapt

  @happy
  Scenario: [DASH-H-019] werkvoorraadhydratatie negeert toekomstperioden en begrenst parallelle reads
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 6
    Given Backoffice een bootstrap met ongeldige toekomstperioden ontvangt
    When de flow voor DASH-H-019 wordt uitgevoerd
    Then toekomstperioden veroorzaken geen workflowreads
    And de gedeelde leeswachtrij voert maximaal vier taken tegelijk uit

  @happy
  Scenario: [DASH-H-020] de actieteller benoemt dat de rij over alle maanden loopt
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 7
    Given Backoffice openstaande acties in meer dan een maand heeft
    When Backoffice een actie vanuit de maandlijst opent
    Then vermeldt de teller dat de rij over alle maanden loopt

  @negative
  Scenario: [DASH-N-019] een achtergrond-hertekening sluit het geopende profielmenu niet
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de scroll-handler het respijtvenster na een hertekening respecteert
    When de beheerder het profielmenu opent en er een hertekening plaatsvindt
    Then blijft het profielmenu open

  @happy
  Scenario: [DASH-H-022] beheerder kan met de browser-terug/-vooruit-knop door alle eigen schermen navigeren
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given de beheerder is ingelogd op Urenoverzicht
    When de beheerder achtereenvolgens elk scherm opent
    Then brengt browser-terug telkens het vorige scherm terug, in exact omgekeerde volgorde
    Then brengt browser-vooruit telkens het volgende scherm terug, in dezelfde volgorde als daarnet geopend

  @negative
  Scenario: [DASH-N-027] het profielmenu verbergt "Ander account of rol" bij een echte login
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een echt ingelogde medewerker
    When de medewerker het profielmenu opent
    Then wordt met Playwright-assertions bevestigd dat het profielmenu verbergt "Ander account of rol" bij een echte login

  @happy
  Scenario: [DASH-H-027] de dashboardtellers van Backoffice komen exact uit de serverdata, niet uit een eigen berekening
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 12
    Given de administrator heeft het dashboard open
    When de serverwaarheid voor diezelfde maand wordt opgehaald
    Then tonen de tellers exact de getallen van de server
    And spreken de bijschriften de tellers niet tegen
    And wint de server aantoonbaar van een eigen telling, ook bij getallen die lokaal onmogelijk zijn

  @happy
  Scenario: [DASH-H-028] elke goedkeurknop draagt de echte employees.id van de getoonde medewerker
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 6
    Given Backoffice de openstaande goedkeuringen open heeft
    When de flow voor DASH-H-028 wordt uitgevoerd
    Then hoort bij elke naam op een goedkeurkaart de employees.id uit de database
