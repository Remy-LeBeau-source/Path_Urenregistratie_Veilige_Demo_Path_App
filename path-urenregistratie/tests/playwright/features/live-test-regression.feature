Feature: Live TEST-regressie
  Read-only en gecontroleerd muterende cases die rechtstreeks tegen de
  gedeployde TEST-site draaien (tests/remote/). Ze vangen deploy-, config- en
  omgevingsfouten die de lokale suite niet ziet. Muterende cases zetten de
  gedeelde TEST-baseline daarna terug.

  @happy @live
  Scenario: [TEST-SMOKE-01] de live TEST-site draait de verwachte versie met veilige headers
    # Testtechniek: Deploycontract plus headerinspectie tegen de echte omgeving
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de gedeployde TEST-site op https://uren-test.pathconsultancy.nl
    When health.php en index.html read-only worden opgehaald
    Then bevestigt health de databaseverbinding en de aanwezige demo-seed
    And toont de gedeployde index het verwachte versienummer
    And staan nosniff en een self-only Content-Security-Policy in de headers

  @happy @live
  Scenario: [TEST-SMOKE-02] de beheerder logt in en elke zichtbare view laadt zonder fouten
    # Testtechniek: End-to-end rondgang met console- en HTTP-foutbewaking
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de beheerder is ingelogd op de live TEST-site
    When elke voor de rol zichtbare navigatieknop wordt geopend
    Then toont elke view een paginatitel en blijft de app-shell zichtbaar
    And zijn er geen console- of 5xx-fouten opgetreden

  @happy @live
  Scenario: [TEST-SMOKE-03] een medewerker ziet alleen de eigen uren op de live site
    # Testtechniek: Beslissingstabel rollen en autorisatie tegen de echte omgeving
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een demo-medewerker is ingelogd op de live TEST-site
    When het urenscherm wordt geopend en beheerroutes worden geprobeerd
    Then zijn goedkeuringen en teambeheer niet zichtbaar of bedienbaar
    And weigert de server een vreemde urenstaat met 401 of 403
    And zijn er geen console- of 5xx-fouten opgetreden

  @happy @live
  Scenario: [TEST-SMOKE-04] de factuurpreview rendert met bedragen en bedrijfsidentiteit
    # Testtechniek: Visuele contractassertie tegen de echte omgeving
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de beheerder is ingelogd op de live TEST-site
    When de factuurpreview van een bestaande factuur wordt geopend
    Then toont de preview de afzendernaam en een betaalregel met IBAN
    And zijn er geen console- of 5xx-fouten opgetreden

  @happy @live
  Scenario: [TEST-E2E-01] inloggen op de live site: juiste credentials binnen, foute geweigerd
    # Testtechniek: Equivalentieklassen geldige en ongeldige inloggegevens
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de live TEST-site met de demo-credentials
    When met het juiste en daarna met een fout wachtwoord wordt ingelogd
    Then komt de juiste inlog binnen en toont de app het versienummer
    And blijft de foute inlog buiten met een zichtbare foutmelding
    And weigert ook de login-API de foute poging met een nette 4xx-fout

  @happy @live
  Scenario: [TEST-E2E-02] wachtwoord vergeten op de live site: aanvraag, nieuw wachtwoord, oude link vervalt
    # Testtechniek: Toestandsovergang tokenlevenscyclus tegen de echte omgeving
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de TEST-maillevering tijdelijk gepauzeerd zodat het token in de response komt
    When twee resetaanvragen worden gedaan en de nieuwste link een wachtwoord zet
    Then werkt inloggen met het nieuwe wachtwoord
    And zijn zowel het gebruikte als het vervangen token daarna ongeldig
    And staat de maillevering na afloop weer aan

  @happy @live
  Scenario: [TEST-E2E-03] nieuwe medewerker aanmaken op de live site en zelf laten inloggen
    # Testtechniek: End-to-end use-case vanaf accountaanmaak tot eerste login
    # Aantoonbare Playwright-assertions in deze case: 10
    Given de beheerder maakt via de API een nieuwe medewerker aan
    When de medewerker via de eenmalige link zelf een wachtwoord zet en inlogt
    Then komt de medewerker als zichzelf binnen
    And ziet die alleen het eigen urenscherm zonder beheerknoppen

  @happy @live
  Scenario: [TEST-E2E-04] volledige factuur- en mailketen op de live site met PDF- en mailinhoudcontrole
    # Testtechniek: End-to-end use-case met documentinhoud-integriteit tegen de echte omgeving
    # Aantoonbare Playwright-assertions in deze case: 18
    Given een demo-medewerker vult uren in en dient in op de live site
    When de beheerder goedkeurt en de factuur definitief maakt
    Then bevat de factuur-PDF het echte factuurnummer, de IBAN, KvK en Btw en sluitende bedragen zonder conceptwatermerk
    And dragen de klaargezette mails de juiste routering, onderwerpen en bijlagebeleid
    And krijgt de salarisadministratie geen factuur mee

  @happy @live
  Scenario: [TEST-E2E-05] de acceptatieconsole verstuurt de vijf scenario-mails naar de vaste sink
    # Testtechniek: Bestandscontract plus beslissingstabel ontvanger en bijlage tegen de echte SMTP-relay
    # Aantoonbare Playwright-assertions in deze case: 15
    Given de acceptatieconsole is beschikbaar op de live TEST-site
    When elk klaarstaand scenario met pauze en een herkansing wordt verstuurd
    Then meldt elk scenario een echte verzending naar de vaste sink
    And is geen enkele verzending slechts een preview

  @happy @live
  Scenario: [TEST-E2E-06] elke demo-medewerker ziet alleen eigen data en alle facturen hebben een echt nummer
    # Testtechniek: Beslissingstabel rollen plus data-integriteit over alle demo-accounts
    # Aantoonbare Playwright-assertions in deze case: 24
    Given alle vier demo-medewerkers op de live TEST-site
    When elke medewerker inlogt en de beheerder de bestaande facturen naloopt
    Then ziet elke medewerker alleen de eigen uren zonder beheerknoppen
    And volgt elk factuurnummer de per-opdracht nummering en nooit de generieke dummy

  @happy @live
  Scenario: [TEST-E2E-07] nieuwe medewerker met eigen opdracht-opties: volledige keten en eigen factuurnummer
    # Testtechniek: End-to-end use-case met eigen opdrachttemplate tegen de echte omgeving
    # Aantoonbare Playwright-assertions in deze case: 12
    Given de beheerder maakt een medewerker aan met een eigen factuurnummer-template en brokeropties
    When de medewerker zelf inlogt, uren indient en de beheerder de factuur maakt
    Then volgt het factuurnummer exact de eigen opdrachttemplate
    And is het geen generieke dummy-nummering

  @happy @live
  Scenario: [TEST-E2E-08] herinneringen: instelling bewaren en een veilige voorbeeldmelding
    # Testtechniek: Gegevensstroomtest van formulier naar server-readback plus neveneffectcontrole
    # Aantoonbare Playwright-assertions in deze case: 7
    Given het herinneringen-scherm met de actieve-planning samenvatting
    When een herinneringsregel wordt om- en teruggezet en opgeslagen
    Then blijft de gewijzigde instelling na herladen bewaard
    And maakt Voorbeeldmelding maken alleen een lokale melding zonder mail klaar te zetten

  @happy @live
  Scenario: [TEST-E2E-10] elke bestaande factuur heeft een echt nummer en geen CONCEPT-markering in de PDF
    # Testtechniek: Data-integriteit met documentidentiteitscontrole over alle facturen
    # Aantoonbare Playwright-assertions in deze case: 12
    Given de bestaande facturen over alle perioden op de live TEST-site
    When elk factuurnummer en elke downloadbare factuur-PDF wordt nagelopen
    Then volgt elk factuurnummer de per-opdracht nummering en nooit de generieke dummy
    And draagt geen enkele gedownloade factuur-PDF een CONCEPT- of CONCEPTVOORBEELD-markering

  @happy @live
  Scenario: [TEST-E2E-11] nieuwe medewerker via het beheer-scherm en de volledige flow tot jsPDF-conceptfactuur
    # Testtechniek: End-to-end use-case vanaf beheer-scherm tot definitieve jsPDF-factuur
    # Aantoonbare Playwright-assertions in deze case: 12
    Given de beheerder maakt via het teambeheerscherm een medewerker met eigen opdracht-opties aan
    When de medewerker zelf inlogt, uren indient en de beheerder de verzending via de GUI afrondt
    Then is de definitieve factuur de jsPDF-conceptfactuur zonder CONCEPT-markering
    And volgt het factuurnummer het eigen opdracht-sjabloon

  @happy @live
  Scenario: [TEST-E2E-12] urenstaat-toestandsketen: indienen, correctie, herindienen, goedkeuren; ongeldige overgang geweigerd
    # Testtechniek: Toestandsovergangstabel met negatieve overgang
    # Aantoonbare Playwright-assertions in deze case: 10
    Given een medewerker heeft uren ingediend op de live TEST-site
    When de medewerker na indienen probeert te wijzigen, Backoffice correctie met reden vraagt, de medewerker herindient en Backoffice goedkeurt
    Then wordt de wijziging na indienen geweigerd zonder statuswijziging
    And gaat de status via correctie met zichtbare reden en aanvrager terug naar submitted en daarna approved

  @happy @live
  Scenario: [TEST-E2E-14] klanturenstaat-upload: geldige typen door, ongeldige fail-closed, concept ongewijzigd
    # Testtechniek: Equivalentieklassen en grenswaarden op bestandsupload
    # Aantoonbare Playwright-assertions in deze case: 9
    Given een medewerker met een openstaande klanturenstaatperiode
    When een geldige PDF, een nep-PDF, een corrupte afbeelding, een te groot bestand en een geldige JPG worden geupload
    Then worden geldige typen geaccepteerd en als PDF opgeslagen
    And worden de nep-PDF, de corrupte afbeelding en het te grote bestand fail-closed geweigerd terwijl het bestaande concept blijft

  @happy @live
  Scenario: [TEST-E2E-16] rol-beslissingstabel: medewerker geweigerd op beheeracties, beheerder toegestaan
    # Testtechniek: Beslissingstabel rollen en autorisatie tegen de echte omgeving
    # Aantoonbare Playwright-assertions in deze case: 8
    Given zowel een medewerker- als een beheerdersessie op de live TEST-site
    When elke rol goedkeuren, medewerker aanmaken en de gedeelde TEST-reset via de API probeert
    Then weigert de server elke beheeractie voor de medewerker met 401 of 403
    And staat de server dezelfde acties voor de beheerder toe

  @happy @live
  Scenario: [TEST-E2E-17] één factuuractie levert exact drie gescheiden routes met het juiste bijlagebeleid
    # Testtechniek: Beslissingstabel mailroutering en bijlagebeleid
    # Aantoonbare Playwright-assertions in deze case: 12
    Given een goedgekeurde urenstaat op de live TEST-site
    When de beheerder de verzending via de GUI afrondt
    Then ontstaan precies drie afzonderlijke deliveries: broker, boekhouding en salaris
    And krijgt broker de factuur, boekhouding de factuur en salaris geen bijlage, zonder CC- of BCC-bundel

  @happy @live
  Scenario: [TEST-E2E-18] negatieve controles: CSRF verplicht, XSS geëscaped, stale version geweigerd
    # Testtechniek: Negatieve equivalentieklasse plus error guessing op de echte API
    # Aantoonbare Playwright-assertions in deze case: 10
    Given een beheerder- en medewerkersessie op de live TEST-site
    When een POST zonder CSRF-token, een script-payload in een naamveld en een verouderde expected_version worden geprobeerd
    Then weigert de server de POST zonder token
    And wordt de script-payload veilig opgeslagen en geëscaped weergegeven, en wordt de verouderde versie met een stale-version-fout geweigerd

  @happy @live
  Scenario: [TEST-E2E-20] werkvoorraad-invariant: alle acties is Backoffice plus medewerkers, ongewijzigd bij maandnavigatie
    # Testtechniek: Data-integriteit met invariantcontrole
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de beheerder opent het dashboard op de live TEST-site
    When de werkvoorraad-samenvatting wordt gelezen en daarna door de maanden wordt genavigeerd
    Then is alle acties gelijk aan de som van Backoffice- en medewerkeracties
    And wijzigt maandnavigatie de globale totalen niet

  @happy @live
  Scenario: [TEST-E2E-13] klanturenstaat-toestandsketen: indienen, opnieuw opvragen, herindienen, goedkeuren, brokerroute
    # Testtechniek: Toestandsovergangstabel met negatieve overgangen op de klanturenstaat
    # Aantoonbare Playwright-assertions in deze case: 19
    Given een verse medewerker met een openstaande klanturenstaatperiode op de live TEST-site
    When de medewerker indient, Backoffice de brokerroute vóór goedkeuring probeert, een nieuw document met reden vraagt, goedkeuren op resubmit probeert, de medewerker herindient en Backoffice goedkeurt en doorzet
    Then worden beide ongeldige overgangen met 409 geweigerd zonder statuswijziging
    And loopt de status via received, resubmit met bewaarde reden, opnieuw received, approved naar sent_to_broker
    And blijft het document na een verse login inline als PDF bekijkbaar

  @happy @live
  Scenario: [TEST-E2E-15] uren-invoer EP/BVA: 0 en 24 door, negatief, boven 24 en niet-numeriek fail-closed
    # Testtechniek: Equivalentieklassen en grenswaardenanalyse op de urendaginvoer
    # Aantoonbare Playwright-assertions in deze case: 19
    Given een verse medewerker met een concept-urenstaat op de live TEST-site
    When achtereenvolgens 8, 0, 24, 24,01, min 1, 25 en een niet-numerieke waarde als daguren worden opgeslagen
    Then worden 8, 0 en 24 uur geaccepteerd en persistent opgeslagen
    And worden 24,01, negatief, boven 24 en niet-numeriek met een invalid-payload 400 geweigerd
    And laat elke geweigerde invoer de opgeslagen uren ongewijzigd

  @happy @live
  Scenario: [TEST-E2E-19] robuustheid: te lange invoer begrensd, dubbele acties idempotent, gelijktijdige writes consistent
    # Testtechniek: Robuustheids- en monkey-test met gelijktijdigheid en idempotentie
    # Aantoonbare Playwright-assertions in deze case: 18
    Given een verse medewerker en een beheerdersessie op de live TEST-site
    When een toelichting van 5000 tekens, een naam van 20000 tekens, twee gelijktijdige factuur-locks, een dubbele goedkeuring en vier gelijktijdige concept-writes met dezelfde versie worden geprobeerd
    Then geeft de server op de te lange invoer een nette 400 en nooit een 500, en blijft het geldige concept staan
    And levert de dubbele lock precies één factuur op en wordt de tweede goedkeuring geweigerd
    And wint precies één gelijktijdige write, worden de andere drie stale-version geweigerd en is de eindstaat consistent

  @happy @live
  Scenario: [TEST-E2E-21] exploratory: mededeling plaatsen, ontvangen, intrekken met historie; instellingenmenu compleet
    # Testtechniek: Exploratory rondgang langs mededelingen en het instellingenscherm
    # Aantoonbare Playwright-assertions in deze case: 18
    Given een beheerder- en een medewerkersessie op de live TEST-site
    When de beheerder een concept opslaat, een mededeling verzendt, die intrekt met reden en het concept verwijdert
    Then ziet de ontvanger de mededeling in het eigen archief en blijft na intrekken de historie bestaan
    And is het concept na verwijderen weg en toont het instellingenscherm het volledige inhoudsmenu met alle primaire knoppen

  @happy @live
  Scenario: [TEST-E2E-22] herinneringen: samenvatting volgt de instellingen, klanturenstaat-tijd bereikt de server, voorbeeld zonder neveneffect
    # Testtechniek: Beslissingstabel en grenswaarden op de planningsafleiding plus neveneffectcontrole
    # Aantoonbare Playwright-assertions in deze case: 14
    Given het herinneringen-scherm van de beheerder op de live TEST-site
    When de regels een voor een aan- en uitgezet worden en de klanturenstaat-tijd wordt opgeslagen en herladen
    Then volgt de planningssamenvatting exact de ingestelde regels, dagen, tijden en het aantal regels
    And komt de gewijzigde klanturenstaat-tijd via bootstrap terug na herladen
    And zet Voorbeeldmelding maken geen mail klaar en meldt dat expliciet

  @happy @live
  Scenario: [TEST-E2E-23] verse beheerder: aanmaken, inloggen, goedkeuren en factuur afronden
    # Testtechniek: End-to-end use-case met een zelf aangemaakte administrator i.p.v. de demo-beheerder
    # Aantoonbare Playwright-assertions in deze case: 13
    Given de bestaande beheerder maakt via het beheer-pad een nieuwe administrator aan
    When die nieuwe beheerder zelf inlogt, een ingediende urenstaat goedkeurt en de factuur afrondt
    Then ziet de nieuwe beheerder de beheerschermen en is de rol administrator
    And is de definitieve factuur de jsPDF-conceptfactuur en ontstaan de drie mailroutes broker, boekhouding en salaris

  @happy @live
  Scenario: [TEST-E2E-24] medewerker deactiveren blokkeert inloggen; data blijft; heractiveren herstelt toegang
    # Testtechniek: Toestandsovergang op de accountstatus met negatieve login-controle
    # Aantoonbare Playwright-assertions in deze case: 9
    Given een verse medewerker die kan inloggen op de live TEST-site
    When de beheerder het account deactiveert en daarna weer heractiveert
    Then wordt inloggen tijdens de deactivatie met 401 of 403 geweigerd terwijl het account zichtbaar en als inactief gemarkeerd blijft
    And werkt inloggen na heractiveren weer

  @happy @live
  Scenario: [TEST-E2E-27] goedgekeurde urenstaat zonder factuur mag terug naar correctie; met factuur wordt heropenen geweigerd
    # Testtechniek: Beslissingstabel op de heropen-overgang van een goedgekeurde urenstaat
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een goedgekeurde urenstaat zonder factuur op de live TEST-site
    When de beheerder correctie vraagt, de medewerker herindient, opnieuw wordt goedgekeurd en de factuur wordt gemaakt, en daarna nogmaals correctie wordt gevraagd
    Then is de eerste correctie toegestaan en gaat de status naar correctie
    And wordt de tweede correctie na facturatie met 409 geweigerd zonder statuswijziging

  @happy @live
  Scenario: [TEST-E2E-30] twee medewerkers met hetzelfde nummer-sjabloon in dezelfde periode krijgen elk een uniek nummer
    # Testtechniek: Data-integriteit met uniciteitsinvariant op factuurnummers
    # Aantoonbare Playwright-assertions in deze case: 7
    Given twee verse medewerkers met exact hetzelfde factuurnummer-sjabloon op de live TEST-site
    When beide in dezelfde periode uren indienen en hun facturen worden afgerond
    Then verschillen de twee factuurnummers ondanks het gelijke sjabloon
    And krijgt het tweede nummer een numerieke suffix
