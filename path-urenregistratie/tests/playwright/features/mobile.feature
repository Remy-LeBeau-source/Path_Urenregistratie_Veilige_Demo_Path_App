@regressie
@ui
@mobile
@fase:15
Feature: Mobiele gebruikerservaring

  # Native Playwright-uitvoering: tests/playwright/mobile-ui.spec.ts
  # Navigatiemapping: tests/playwright/steps/mobile.steps.ts

  @happy
  Scenario: [MOB-H-001] mobiele login navigatie en dashboard blijven volledig bereikbaar
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 31
    Given de mobiele loginpagina
    When een administrator inlogt en door de mobiele navigatie gaat
    Then Home en rolwissel blijven bereikbaar zonder console- of page-errors

  @happy
  Scenario: [MOB-H-002] mobiele medewerker kan concepturen opslaan indienen en documentupload bereiken
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 14
    Given een medewerker met een mobiele schrijfbare maand
    When uren als concept worden gewijzigd en daarna ingediend
    Then klanturenstaat en notificaties blijven mobiel bereikbaar

  @happy
  Scenario: [MOB-H-003] mobiele correctie herindiening en administratieve goedkeuring zijn bereikbaar
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 10
    Given de medewerker mobiel uren indient
    When de administrator mobiel een correctie vraagt
    Then de medewerker de melding leest aanpast en opnieuw indient
    And de administrator mobiel goedkeurt

  @negative
  Scenario: [MOB-N-004] mobiele facturen touch targets en modals blijven binnen viewport
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 13
    Given een administrator in het mobiele factuuroverzicht
    When de flow voor MOB-N-004 wordt uitgevoerd
    Then de brede factuurtabel als mobiele kaartweergave rendert
    And touch controls en bevestigingsmodal binnen viewport blijven

  @happy
  Scenario: [MOB-H-005] mobiele verzendadministratie blijft leesbaar en toont geen geheime inhoud
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 15
    Given een beheerder de mobiele Instellingen opent
    When de flow voor MOB-H-005 wordt uitgevoerd
    Then de verzendregistratie als leesbare kaart binnen het scherm staat
    And geheime inhoud verborgen blijft en Vernieuwen een touchdoel is
    And de losse mailacceptatieactie binnen het scherm blijft met een volwaardig touchdoel

  @happy
  Scenario: [MOB-H-006] een uitgenodigde collega stelt op de telefoon een wachtwoord in en ziet een duidelijke bevestiging
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 19
    Given de uitgenodigde collega de link uit de mail opent op de telefoon
    When beide wachtwoordvelden op het kleine scherm worden ingevuld
    Then verschijnt de bevestiging met een tapbare knop en past alles binnen het scherm

  @happy
  Scenario: [MOB-H-007] een medewerker leest mededelingen op de telefoon zonder afgekapte tekst
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een ingelogde medewerker op de telefoon
    When de medewerker de mededelingen opent
    Then is de volledige mededeling leesbaar en scrollt de pagina niet zijwaarts

  @happy
  Scenario: [MOB-H-008] elk hoofdscherm blijft op een telefoon leesbaar en bedienbaar
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 5
    Given mobiele gebruikerservaring is voorbereid
    When de flow voor MOB-H-008 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat elk hoofdscherm blijft op een telefoon leesbaar en bedienbaar

  @happy
  Scenario: [MOB-H-009] instellingen en urenstaat zijn op een telefoon te overzien
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de instellingen beginnen dichtgeklapt
    When een paneel wordt geopend, verschijnt de inhoud
    And de urenstaat past binnen het scherm zonder zijwaarts schuiven
    Then wordt met Playwright-assertions bevestigd dat instellingen en urenstaat zijn op een telefoon te overzien

  @happy
  Scenario: [MOB-H-010] een veeg over het scherm scrollt de pagina echt
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de pagina is langer dan het scherm
    Then blokkeert geen enkele laag het doorgeven van de veeg
    When er met een vinger omhoog wordt geveegd, komt de pagina in beweging

  @happy
  Scenario: [MOB-H-011] geen enkele tekst op een telefoon staat onder de leesbare ondergrens
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 2
    Given mobiele gebruikerservaring is voorbereid
    When de flow voor MOB-H-011 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat geen enkele tekst op een telefoon staat onder de leesbare ondergrens

  @happy
  Scenario: [MOB-H-012] de app is als PWA te installeren met een echt vierkant icoon
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 10
    Given de pagina verwijst naar een manifest en een iOS-icoon
    When de flow voor MOB-H-012 wordt uitgevoerd
    Then beschrijft het manifest een installeerbare app
    And is elk icoon werkelijk vierkant en van de opgegeven maat

  @happy
  Scenario: [MOB-H-013] de uitnodiging om te installeren verschijnt alleen waar hij hoort
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de app draait op telefoonformaat
    When de browser meldt dat installeren mogelijk is
    Then verdwijnt de balk na Niet nu en blijft hij weg na een herlaad
    And blijft hij op een laptopscherm helemaal weg

  @happy
  Scenario: [MOB-H-014] het aanbod om te installeren blijft bereikbaar na wegklikken of verwijderen
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de app draait in de browser
    When de flow voor MOB-H-014 wordt uitgevoerd
    Then staat Op startscherm zetten altijd in het profielmenu
    And vervalt een eerdere Niet nu na dertig dagen
    And wist een installatie de eerdere keuze, zodat het aanbod na verwijderen terugkomt

  @happy
  Scenario: [MOB-H-015] het aanbod verschijnt uit zichzelf, ook zonder melding van de browser
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 4
    Given iemand opent de app in de browser en de browser meldt niets
    When de flow voor MOB-H-015 wordt uitgevoerd
    Then verschijnt het aanbod alsnog, met uitleg in plaats van een knop
    And verschijnt er wel een knop zodra de browser het alsnog meldt

  @happy
  Scenario: [MOB-H-016] de knop Installeren doet nooit stil niets
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 2
    Given het aanbod staat er zonder bruikbare melding van de browser
    When er op Installeren wordt gedrukt
    Then krijgt de gebruiker uitleg in plaats van stilte

  @happy
  Scenario: [MOB-H-017] het installatieaanbod dekt geen knoppen af
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 3
    Given het aanbod staat in beeld
    When de flow voor MOB-H-017 wordt uitgevoerd
    Then verdwijnt hij vanzelf, zodat hij niets blijvend afdekt
    And ligt er daarna niets meer onder de balk

  @happy
  Scenario: [MOB-H-018] na installatie verdwijnt het installatieaanbod uit de balk en het profielmenu
    # Testtechniek: Responsive viewport + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 2
    Given mobiele gebruikerservaring is voorbereid
    When de flow voor MOB-H-018 wordt uitgevoerd
    Then blijft de balk weg, ook na een melding van de browser en de eigen timer
