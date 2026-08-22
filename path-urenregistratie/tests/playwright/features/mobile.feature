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
    # Aantoonbare Playwright-assertions in deze case: 15
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
