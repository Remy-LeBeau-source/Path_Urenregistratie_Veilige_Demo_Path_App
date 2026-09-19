@regressie
@ui
@desktop
@fase:19
Feature: Vondsten uit de monkey-verkenning op Klassiek

  # Native Playwright-uitvoering: tests/playwright/klassiek-verkenning.spec.ts
  # Navigatiemapping: tests/playwright/steps/klassiek-verkenning.steps.ts

  @negative
  Scenario: [KLV-N-002] het maandkeuzepaneel valt op geen enkele breedte buiten het scherm
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een medewerker in Klassiek
    And is de maandkeuze op minstens de desktopbreedtes van Mijn uren echt gemeten
    When de flow voor KLV-N-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat het maandkeuzepaneel valt op geen enkele breedte buiten het scherm

  @negative
  Scenario: [KLV-N-003] in de menubalk van de medewerker overlapt niets elkaar, op geen enkele desktopbreedte
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een medewerker in Klassiek met de testbalk in de menubalk
    When de flow voor KLV-N-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat in de menubalk van de medewerker overlapt niets elkaar, op geen enkele desktopbreedte

  @negative
  Scenario: [KLV-N-004] een trage opslag die pas na herladen aankomt, blokkeert de volgende invoer niet
    # Testtechniek: Monkey testing (seeded) + concurrency + herstelbaarheid
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een medewerker op Mijn uren met een urenstaat die al een serverversie heeft
    When een opslag onderweg is, de pagina herlaadt en die opslag pas daarna aankomt
    And de medewerker daarna gewoon verder invult
    Then wordt die invoer zonder foutmelding opgeslagen en staat hij na nog een herlading op de server

  @negative
  Scenario: [KLV-N-005] op geen enkel medewerkerscherm valt inhoud buiten de rechterrand rond de breekpunten
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + toestandsovergang + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een medewerker in Klassiek
    When de flow voor KLV-N-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat op geen enkel medewerkerscherm valt inhoud buiten de rechterrand rond de breekpunten

  @negative
  Scenario: [KLV-N-006] op geen enkel beheerscherm valt inhoud buiten de rechterrand rond de breekpunten
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + toestandsovergang + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een beheerder in Klassiek
    When de flow voor KLV-N-006 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat op geen enkel beheerscherm valt inhoud buiten de rechterrand rond de breekpunten

  @negative
  Scenario: [KLV-N-007] elk scherm heeft een paginatitel, ook Klanturenstaten bij de beheerder
    # Testtechniek: Monkey testing (seeded) + negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een beheerder op het dashboard
    When de beheerder de klanturenstaten opent vanaf het dashboard
    Then staat er een paginatitel
    And heeft ieder scherm in de app een eigen titel

  @negative
  Scenario: [KLV-N-008] meer dan 24 uur op een dag wordt direct in het vak gemeld en niet naar de server gestuurd
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + negatieve equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 11
    Given een medewerker op Mijn uren van een open maand
    When de medewerker 25 uur op een dag intypt
    Then is het vak ongeldig, staat er een duidelijke melding en gaat er niets naar de server
    And geldt 24,5 ook als te veel, maar 24 precies niet

  @negative
  Scenario: [KLV-N-009] in Klassiek staat het klanturenstaatlabel niet op Mijn uren maar op het eigen Klanturenstaat-scherm
    # Testtechniek: Beslissingstabel vormgeving en scherm + regressiebewaking
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een medewerker in Klassiek
    When de medewerker Mijn uren opent
    Then staat er op Mijn uren geen klanturenstaatlabel of -paneel
    And staat het label wel op het Klanturenstaat-scherm

  @happy
  Scenario: [KLV-H-010] op TEST staat alleen Herstel bovenin; thema, vormgeving en versie staan in het profielmenu
    # Testtechniek: Responsive viewport + toegankelijkheidsinspectie (44px, toetsenbord) + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 15
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    When de flow voor KLV-H-010 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat op TEST staat alleen Herstel bovenin; thema, vormgeving en versie staan in het profielmenu

  @happy
  Scenario: [KLV-H-021] de knoppen onder Testfuncties tonen waar je naartoe gaat, niet waar je bent
    # Testtechniek: Toestandsovergangtest (licht↔donker, Klassiek↔Modern, heen en terug) + toegankelijkheidsinspectie (geen misleidend aria-pressed)
    # Aantoonbare Playwright-assertions in deze case: 16
    Given licht en Klassiek: de knoppen zeggen Donker en Modern
    When naar donker, then zegt de themaknop Licht
    When naar Modern, then zegt de vormgevingsknop Klassiek
    And terug naar Klassiek en licht: weer Modern en Donker
    Then wordt met Playwright-assertions bevestigd dat de knoppen onder Testfuncties tonen waar je naartoe gaat, niet waar je bent

  @negative
  Scenario: [KLV-N-022] de statuspillen naast de koppen in Instellingen blijven binnen hun kaart op smalle telefoons
    # Testtechniek: Responsive viewport (320/360/390) + grenswaarden smalle telefoon + lay-outmeting binnen de kaart
    # Aantoonbare Playwright-assertions in deze case: 1
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    When de flow voor KLV-N-022 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de statuspillen naast de koppen in Instellingen blijven binnen hun kaart op smalle telefoons

  @negative
  Scenario: [KLV-N-023] verlof en ziekte accepteren geen onmogelijk aantal uren en gaan dan niet naar de server
    # Testtechniek: Grenswaardenanalyse (maandmaximum voor verlof en ziekte) + foutafhandeling zonder serverfout
    # Aantoonbare Playwright-assertions in deze case: 13
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    And geldt dezelfde grens voor Ziekte
    When de flow voor KLV-N-023 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat verlof en ziekte accepteren geen onmogelijk aantal uren en gaan dan niet naar de server

  @negative
  Scenario: [KLV-N-011] de mailgeschiedenis in Instellingen blijft binnen beeld, ook met lange regels en een herstelknop
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een beheerder op Instellingen met drie mailregels in de geschiedenis
    When de flow voor KLV-N-011 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de mailgeschiedenis in Instellingen blijft binnen beeld, ook met lange regels en een herstelknop

  @negative
  Scenario: [KLV-N-012] typen in één dag van de laatste open week maakt de rest van die week niet ingevuld
    # Testtechniek: Toestandsovergangtest (onaangeraakt → deels ingevuld) + beslistabel indienbaarheid + herladen (persistentie)
    # Aantoonbare Playwright-assertions in deze case: 6
    Given alleen één week van de maand is nog leeg
    When de medewerker in één dag van die week uren typt
    Then telt alleen die dag mee: nog steeds geen Maand indienen, ook niet na herladen

  @happy
  Scenario: [KLV-H-013] Week opslaan telt lege dagen als bewust 0: daarna Maand indienen, ook buiten de laatste week
    # Testtechniek: Toestandsovergangtest (Opslaan = bewust 0) + beslistabel indienbaarheid
    # Aantoonbare Playwright-assertions in deze case: 4
    Given alleen één week is nog leeg en Maand indienen is er niet
    When de medewerker die lege week opslaat
    Then staat Maand indienen er in de weekweergave, zonder de tekst dat hij onder Hele maand staat

  @happy
  Scenario: [KLV-H-014] Standaardweek vullen in de laatste open week maakt indienen mogelijk, op Mijn uren en op Vandaag
    # Testtechniek: Toestandsovergangtest (Standaardweek vullen) + consistentie tussen schermen (Mijn uren en Vandaag)
    # Aantoonbare Playwright-assertions in deze case: 4
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    When de medewerker in de laatste open week op Standaardweek vullen drukt
    Then kan de maand worden ingediend op Mijn uren
    And wijst de hoofdknop op Vandaag naar Maand indienen

  @happy
  Scenario: [KLV-H-015] het label onder het weeknummer telt de open dagen van die week af tot Compleet
    # Testtechniek: Toestandsovergangtest (N open → Compleet) + grenswaarde (laatste open dag)
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een week met nog open werkdagen
    When de medewerker één dag invult, dan telt het label één af
    Then staat er Compleet zodra elke werkdag van de week is ingevuld

  @happy
  Scenario: [KLV-H-016] op de telefoon brengt een klein knopje bij de weekkeuze je terug naar Vandaag
    # Testtechniek: Responsive viewport (390/1280) + toegankelijkheidsinspectie (44px tikvlak) + navigatietest
    # Aantoonbare Playwright-assertions in deze case: 7
    Given Mijn uren op telefoonbreedte: het knopje staat vlak boven de weekkeuze
    When de medewerker erop tikt, dan staat Vandaag open
    And op desktopbreedte, waar de menubalk Vandaag al toont, staat het knopje er niet
    Then wordt met Playwright-assertions bevestigd dat op de telefoon brengt een klein knopje bij de weekkeuze je terug naar Vandaag

  @happy
  Scenario: [KLV-H-017] de standaardweek gebruikt hele dagen van 9 of 8 uur en de vrije dag die Beheer instelt
    # Testtechniek: Beslistabeltest (weekuren × vrije dag van Beheer) + equivalentieklassen (past in 9, in 8, past niet)
    # Aantoonbare Playwright-assertions in deze case: 1
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    When de flow voor KLV-H-017 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de standaardweek gebruikt hele dagen van 9 of 8 uur en de vrije dag die Beheer instelt

  @happy
  Scenario: [KLV-H-018] Berichten toont "Nieuw in de app" met de laatste 20 updates en tijdstip, 5 per pagina, zonder namen, alleen buiten PROD
    # Testtechniek: Omgevingsafhankelijke test (TEST/lokaal vs PROD-host) + ordening- en grenscontrole (nieuwste ≤ appversie) + inhoudscontrole (geen namen of gevoelige gegevens) + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 29
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    When de flow voor KLV-H-018 wordt uitgevoerd
    Then staan er lokaal/op TEST 20 updates met datum en tijdstip, nieuwste eerst
    And staan er 5 per pagina met Vorige en Volgende, tot en met de laatste pagina
    And staat geen naam of gevoelig gegeven in de teksten
    And op de PROD-host is het blok weg

  @happy
  Scenario: [KLV-H-019] ingevulde uren op Mijn uren zijn leesbaar in licht en donker, op telefoon en desktop
    # Testtechniek: Contrastmeting (WCAG 4,5:1) + themacombinaties (licht/donker) × responsive viewport (390/1280)
    # Aantoonbare Playwright-assertions in deze case: 2
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    When de flow voor KLV-H-019 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat ingevulde uren op Mijn uren zijn leesbaar in licht en donker, op telefoon en desktop

  @happy
  Scenario: [KLV-H-020] de actieknop in Mijn maanden heeft de huisstijl en zegt wat er nu te doen is
    # Testtechniek: Beslistabel (stap → knoptekst) + visuele consistentie met de huisstijlknop in licht en donker
    # Aantoonbare Playwright-assertions in deze case: 5
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    When de flow voor KLV-H-020 wordt uitgevoerd
    Then noemt de knop per stap de juiste handeling (beslistabel)
    And heeft de knop dezelfde vorm als de andere hoofdknoppen, in licht en donker

  @negative
  Scenario: [KLV-N-001] snel achter elkaar uren invullen botst nooit met de eigen, net opgeslagen versie
    # Testtechniek: Monkey testing (seeded) + concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 11
    Given een medewerker op Mijn uren van een open maand
    And de urenstaat staat al met een versie op de server
    When de eerste invoer onderweg is en er intussen twee nieuwe invoeren volgen
    Then slaagt elke opslag en staan alle drie de waarden daarna op de server

  @negative
  Scenario: [KLV-N-024] na "Herstel demo" leest de app de server weer zodra de uren zijn opgeslagen
    # Testtechniek: Toestandsovergang (lokaal leidend na reset naar server leidend na een geslaagde urenopslag) + foutvermoeden uit monkey-verkenning
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de medewerker heeft de voorbeeldgegevens hersteld en staat op Mijn uren
    When de medewerker uren invult en die op de server worden opgeslagen
    Then is de server weer leidend: de resetvlag is weg
    And na F5 leest de app de urenstaat van de server en synchroniseert verder invullen gewoon

  @negative
  Scenario: [KLV-N-025] een geweigerde opslag omdat de maand ${klasse.naam} is, noemt de echte reden
    # Testtechniek: Equivalentieklassen op de reden van het slot (ingediend tegenover goedgekeurd/gefactureerd) met de letterlijke serverantwoorden
    # Aantoonbare Playwright-assertions in deze case: 4
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    When de medewerker toch iets invult
    Then noemt de melding de reden die de server gaf

  @negative
  Scenario: [KLV-N-026] na "Herstel demo" zet een door de server geweigerde invoer de ingediende maand weer op slot
    # Testtechniek: Toestandsovergang (lokaal leidend na reset naar server leidend na een weigering die de serverstand bewijst) + foutvermoeden uit monkey-verkenning
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een maand die op de server is ingediend
    When de medewerker iets invult en de server dat weigert
    Then noemt de app de reden, laat hij de herstelstand los en staat de maand op slot

  @negative
  Scenario: [KLV-N-027] de snelknoppen 0, 8 en 9 in Mijn uren zijn op telefoon groot genoeg om te raken
    # Testtechniek: Grenswaardenanalyse op de schermbreedte (320, 390 en de rand van het telefoonblok 720) + WCAG 2.5.8 doelgrootte
    # Aantoonbare Playwright-assertions in deze case: 4
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    When de flow voor KLV-N-027 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de snelknoppen 0, 8 en 9 in Mijn uren zijn op telefoon groot genoeg om te raken
