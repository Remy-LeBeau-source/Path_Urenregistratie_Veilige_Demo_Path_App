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
