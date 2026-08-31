@regressie
@integration
@live
@fase:16
Feature: Live TEST-regressie en deployacceptatie

  # Native Playwright-uitvoering: tests/playwright/../remote/*.spec.ts
  # Navigatiemapping: tests/playwright/steps/live-test-regression.steps.ts

  @happy
  Scenario: [TEST-E2E-13] klanturenstaat-toestandsketen: indienen, opnieuw opvragen, herindienen, goedkeuren, brokerroute
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 20
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-13 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat klanturenstaat-toestandsketen: indienen, opnieuw opvragen, herindienen, goedkeuren, brokerroute

  @happy
  Scenario: [TEST-E2E-15] uren-invoer EP/BVA: 0 en 24 door, negatief, >24 en niet-numeriek fail-closed
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 10
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-15 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat uren-invoer EP/BVA: 0 en 24 door, negatief, >24 en niet-numeriek fail-closed

  @happy
  Scenario: [TEST-E2E-19] robuustheid: te lange invoer begrensd, dubbele acties idempotent, gelijktijdige writes consistent
    # Testtechniek: Concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 19
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-19 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat robuustheid: te lange invoer begrensd, dubbele acties idempotent, gelijktijdige writes consistent

  @happy
  Scenario: [TEST-E2E-21] exploratory: mededeling plaatsen, ontvangen, intrekken met historie; instellingenmenu compleet
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 18
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-21 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat exploratory: mededeling plaatsen, ontvangen, intrekken met historie; instellingenmenu compleet

  @happy
  Scenario: [TEST-E2E-34] een mededeling met scriptinhoud belandt als tekst bij de medewerker, niet als code
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-34 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat een mededeling met scriptinhoud belandt als tekst bij de medewerker, niet als code

  @happy
  Scenario: [TEST-E2E-22] herinneringen: samenvatting volgt exact de instellingen, klanturenstaat-tijd bereikt de server, voorbeeld zonder neveneffect
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 18
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-22 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat herinneringen: samenvatting volgt exact de instellingen, klanturenstaat-tijd bereikt de server, voorbeeld zonder neveneffect

  @happy
  Scenario: [TEST-E2E-23] verse beheerder: aanmaken, inloggen, goedkeuren en factuur afronden
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 10
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-23 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat verse beheerder: aanmaken, inloggen, goedkeuren en factuur afronden

  @happy
  Scenario: [TEST-E2E-24] medewerker deactiveren blokkeert inloggen; data blijft; heractiveren herstelt toegang
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-24 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat medewerker deactiveren blokkeert inloggen; data blijft; heractiveren herstelt toegang

  @happy
  Scenario: [TEST-E2E-27] goedgekeurde urenstaat zonder factuur mag terug naar correctie; met factuur wordt heropenen geweigerd
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 8
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-27 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat goedgekeurde urenstaat zonder factuur mag terug naar correctie; met factuur wordt heropenen geweigerd

  @happy
  Scenario: [TEST-E2E-30] twee medewerkers met hetzelfde nummer-sjabloon in dezelfde periode krijgen elk een uniek nummer
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-30 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat twee medewerkers met hetzelfde nummer-sjabloon in dezelfde periode krijgen elk een uniek nummer

  @happy
  Scenario: [TEST-E2E-31] Marc en Brian: volledige afrond-flow levert de branded jsPDF-factuur
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 2
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-31 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat marc en Brian: volledige afrond-flow levert de branded jsPDF-factuur

  @happy
  Scenario: [TEST-E2E-10] elke bestaande factuur heeft een echt nummer en geen CONCEPT-markering in de PDF
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 6
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-10 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat elke bestaande factuur heeft een echt nummer en geen CONCEPT-markering in de PDF

  @happy
  Scenario: [TEST-E2E-11] nieuwe medewerker via het beheer-scherm: volledige flow tot de jsPDF-conceptfactuur
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 11
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-11 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat nieuwe medewerker via het beheer-scherm: volledige flow tot de jsPDF-conceptfactuur

  @happy
  Scenario: [TEST-E2E-25] Overig-ontvanger: het vinkje Factuur meesturen bepaalt op de live site of de bijlage meegaat
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 9
    Given twee Overig-ontvangers bij de medewerker, één met Factuur meesturen aan en één uit
    When de volledige factuurketen via de GUI wordt afgerond
    Then gaat de factuur mee naar de aangevinkte Overig-ontvanger en niet naar de uitgevinkte

  @happy
  Scenario: [TEST-E2E-12] urenstaat-toestandsketen: indienen, correctie, herindienen, goedkeuren; ongeldige overgang geweigerd
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 12
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-12 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat urenstaat-toestandsketen: indienen, correctie, herindienen, goedkeuren; ongeldige overgang geweigerd

  @happy
  Scenario: [TEST-E2E-14] klanturenstaat-upload: geldige typen door, ongeldige fail-closed, concept ongewijzigd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 15
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-14 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat klanturenstaat-upload: geldige typen door, ongeldige fail-closed, concept ongewijzigd

  @happy
  Scenario: [TEST-E2E-16] rol-beslissingstabel: medewerker geweigerd op beheeracties, beheerder toegestaan
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-16 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat rol-beslissingstabel: medewerker geweigerd op beheeracties, beheerder toegestaan

  @happy
  Scenario: [TEST-E2E-17] één factuuractie levert exact drie gescheiden routes met het juiste bijlagebeleid
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 9
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-17 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat één factuuractie levert exact drie gescheiden routes met het juiste bijlagebeleid

  @happy
  Scenario: [TEST-E2E-18] negatieve controles: CSRF verplicht, XSS geëscaped, stale version geweigerd
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 9
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-18 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat negatieve controles: CSRF verplicht, XSS geëscaped, stale version geweigerd

  @happy
  Scenario: [TEST-E2E-20] werkvoorraad-invariant: alle acties = Backoffice + medewerkers, ongewijzigd bij maandnavigatie
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-20 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat werkvoorraad-invariant: alle acties = Backoffice + medewerkers, ongewijzigd bij maandnavigatie

  @happy
  Scenario: [TEST-E2E-06] elke demo-medewerker ziet alleen eigen data; alle facturen hebben een echt nummer
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-06 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat elke demo-medewerker ziet alleen eigen data; alle facturen hebben een echt nummer

  @happy
  Scenario: [TEST-E2E-07] nieuwe medewerker met eigen opdracht-opties: volledige keten en eigen factuurnummer
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 12
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-07 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat nieuwe medewerker met eigen opdracht-opties: volledige keten en eigen factuurnummer

  @happy
  Scenario: [TEST-E2E-08] herinneringen: instelling bewaren en een veilige voorbeeldmelding
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 7
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-08 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat herinneringen: instelling bewaren en een veilige voorbeeldmelding

  @happy
  Scenario: [TEST-E2E-28] een medewerker komt niet bij de gegevens of acties van een andere medewerker
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 11
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-28 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat een medewerker komt niet bij de gegevens of acties van een andere medewerker

  @happy
  Scenario: [TEST-E2E-01] inloggen: juiste credentials binnen, foute geweigerd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 5
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-01 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat inloggen: juiste credentials binnen, foute geweigerd

  @happy
  Scenario: [TEST-E2E-02] wachtwoord vergeten: aanvraag, nieuw wachtwoord, oude link vervalt
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een eerste resetaanvraag een eenmalige link geeft
    And een tweede aanvraag een nieuwe link geeft
    When de nieuwste link een nieuw wachtwoord zet
    Then werkt het nieuwe wachtwoord
    And zijn zowel het gebruikte als het vervangen token ongeldig

  @happy
  Scenario: [TEST-E2E-03] medewerker aanmaken, laat hem zelf inloggen en alleen eigen uren zien
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 9
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-03 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat medewerker aanmaken, laat hem zelf inloggen en alleen eigen uren zien

  @happy
  Scenario: [TEST-E2E-04] volledige factuur- en mailketen met PDF- en mailinhoudcontrole
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 21
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-04 wordt uitgevoerd
    Then is de definitieve factuur de jsPDF-conceptfactuur zonder CONCEPT-markering
    And toont de factuurpreview het juiste nummer, de IBAN en de bedragen
    And klopt het mailverkeer: routering, onderwerpen, bijlagebeleid

  @happy
  Scenario: [TEST-E2E-05] acceptatieconsole verstuurt de vijf scenario-mails naar de sink
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 9
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-05 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat acceptatieconsole verstuurt de vijf scenario-mails naar de sink

  @happy
  Scenario: [TEST-E2E-29] een wachtwoord-vergeten-aanvraag wordt op de live SMTP-weg echt verstuurd
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 8
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-29 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat een wachtwoord-vergeten-aanvraag wordt op de live SMTP-weg echt verstuurd

  @happy
  Scenario: [TEST-E2E-33] de wachtwoord-reset-drempel stopt de vierde aanvraag binnen het venster
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 7
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-33 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de wachtwoord-reset-drempel stopt de vierde aanvraag binnen het venster

  @happy
  Scenario: [TEST-SMOKE-01] de TEST-site draait de verwachte versie met veilige headers
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 7
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-SMOKE-01 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de TEST-site draait de verwachte versie met veilige headers

  @happy
  Scenario: [TEST-E2E-26] de deploy levert de veiligheidsheaders en PWA-assets die de app nodig heeft
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 20
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-26 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de deploy levert de veiligheidsheaders en PWA-assets die de app nodig heeft

  @happy
  Scenario: [TEST-E2E-32] de live sessie is een veilige cookie en valt na uitloggen echt om
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 8
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-E2E-32 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de live sessie is een veilige cookie en valt na uitloggen echt om

  @happy
  Scenario: [TEST-SMOKE-02] beheerder kan inloggen en elke view laadt zonder fouten
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-SMOKE-02 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat beheerder kan inloggen en elke view laadt zonder fouten

  @happy
  Scenario: [TEST-SMOKE-03] medewerker ziet alleen de eigen uren
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-SMOKE-03 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat medewerker ziet alleen de eigen uren

  @happy
  Scenario: [TEST-SMOKE-04] de factuurpreview rendert met bedragen en bedrijfsidentiteit
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 4
    Given live TEST-regressie en deployacceptatie is voorbereid
    When de flow voor TEST-SMOKE-04 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de factuurpreview rendert met bedragen en bedrijfsidentiteit
