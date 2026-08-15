@regressie
@ui
@desktop
@fase:15
Feature: Dashboard en open werkvoorraad

  # Native Playwright-uitvoering: tests/playwright/dashboard.spec.ts
  # Navigatiemapping: tests/playwright/steps/dashboard.steps.ts

  @happy
  Scenario: [DASH-H-001] admin dashboard opent zonder console errors
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given de administrator is ingelogd
    When de administrator het dashboard opent
    Then het dashboard toont admin-overzicht zonder consolefouten

  @happy
  Scenario: [DASH-H-002] employee dashboard opent zonder console errors
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 1
    Given de medewerker is ingelogd
    When de medewerker het dashboard opent
    Then alleen medewerkersinformatie wordt getoond zonder consolefouten

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
    # Aantoonbare Playwright-assertions in deze case: 18
    Given Backoffice de voorbeeldomgeving herstelt en daarna naar Stasjo wisselt
    When Stasjo daarna een open urenactie indient
    And Stasjo voert daarna F5 uit
    Then blijft de gewijzigde lokale teller zichtbaar en komt geen oude serversessie terug
    And Backoffice kan Marc zijn klanturenstaat goedkeuren zonder statusrace

  @happy
  Scenario: [DASH-H-008] GUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 24
    Given de lokale demo toont alle 12 beginacties en tellerverdeling
    When medewerkers alle vijf wachtende acties via de zichtbare interface afronden
    And Backoffice bevestigt iedere resterende zichtbare taak tot de werkvoorraad 0 is
    Then wordt met Playwright-assertions bevestigd dat gUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice

  @negative
  Scenario: [DASH-N-009] medewerker teller blijft stabiel bij aug-juli-aug en dashboard triggert geen verborgen timesheet-read
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de medewerker zit op het dashboard en timesheet-read is gemonitord
    When de medewerker augustus-juli-augustus doorloopt vanuit dashboard
    Then blijft de teller gelijk en zijn er geen verborgen timesheet-reads

  @happy
  Scenario: [DASH-H-012] GUI-smoke scheidt werkacties van medewerkers- en beheerdersaccounts
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 30
    Given de vaste GUI-baseline met twaalf open acties en zes actieve accounts
    When de flow voor DASH-H-012 wordt uitgevoerd
    Then toont het dashboard zeven Backoffice-acties en vijf wachttaken zonder medewerkerbadge in het menu
    And Teambeheer toont vier medewerkers en twee beheerders als zes actieve accounts
    And Dashboard opent bovenaan terwijl eigenaarbolletjes gericht naar hun werkvoorraad springen

  @happy
  Scenario: [DASH-H-013] dashboardmodules tonen compacte documenten, procesfasen en teamacties
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 11
    Given Backoffice de vaste augustusbaseline opent
    When de flow voor DASH-H-013 wordt uitgevoerd
    Then toont klanturenstaten een verkoopklaar kaartenoverzicht
    And proces en team tonen zonder lege tussenruimte duidelijke kerninformatie en acties

  @happy
  Scenario: [DASH-H-003] medewerkerdashboard ververst meteen na ureninvoer en themakiezer blijft leesbaar
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een medewerker die een urenstaat vult en het thema wisselt
    When de medewerker uren invult en terug naar het medewerkerdashboard gaat
    Then blijven de maandnamen zichtbaar in donkere modus

  @happy
  Scenario: [DASH-H-004] terugkeren naar medewerkerdashboard ververst de uren en behoudt maandlabels bij themawissel
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
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
    # Aantoonbare Playwright-assertions in deze case: 20
    Given een medewerker met meerdere open acties over verschillende maanden
    When het dashboard de werkvoorraad prioriteert
    Then opent de hoofdactie exact de geprioriteerde maand en juiste taakroute

  @negative
  Scenario: [DASH-N-015] medewerkerprioriteit kiest correctie boven document en toont niets als alles klaar is
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 14
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

  @happy
  Scenario: [DASH-H-006] vooruit bladeren maakt geen lege toekomstmaand zichtbaar als medewerkeractie
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een medewerker zonder open acties in een lege toekomstmaand
    When de medewerker een toekomstige maand probeert te openen
    Then verschijnt september niet als open medewerkermaand

  @happy
  Scenario: [DASH-H-007] dashboardknop behoudt de geldige maand en medewerkeroverzichten
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een medewerker die een toekomstige maand probeert te openen
    When de medewerker teruggaat naar het dashboard
    Then staat de periode op augustus en toont het overzicht geen toekomstige maanden

  @happy
  Scenario: [DASH-H-017] serverwerkvoorraad hydrateert volledig en blijft stabiel bij maand- en filterwissels
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 14
    Given Backoffice met de volledige serverwerkvoorraad is ingelogd
    When Backoffice augustus-juli-augustus doorloopt
    Then blijven globale aantallen, eigenaren en taakidentiteiten gelijk
    And eigenaarfilters openen alleen hun concrete taakregels
