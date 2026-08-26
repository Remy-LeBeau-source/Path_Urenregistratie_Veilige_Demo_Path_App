@regressie
@integration
@ui
@desktop
@mobile
@fase:16
Feature: Bedrijfsketens van medewerker tot Backoffice

  # Native Playwright-uitvoering: tests/playwright/business-workflows-*.spec.ts
  # Navigatiemapping: tests/playwright/steps/end-to-end-workflows.steps.ts
  # Iedere case draait op desktop-chromium, mobile-chrome en mobile-safari.
  # Iedere case start uitsluitend op een database waarvan de naam op _test eindigt.
  # Een automatische fixture legt de baseline vast, gebruikt een unieke case-/projectmarker,
  # controleert writes via readback en herstelt na afloop database en private opslag.
  # Na iedere case moeten de marker, verweesde relaties, tijdelijke PDF's, tokens en mailitems weg zijn.

  @happy
  Scenario: [E2E-H-001] herstelbasis houdt globale werkvoorraad stabiel bij maand- en filterwissels
    # Aantoonbare Playwright-assertions in deze case: 11
    # Testtechniek: Equivalentieklassen
    Given Backoffice de vaste herstelbasis met twaalf open acties opent
    Then tonen juni, juli en augustus respectievelijk 3, 5 en 4 acties
    And geldt zichtbaar 12 alle acties = 7 bij Backoffice + 5 bij medewerkers
    And staat iedere taak bij precies één eigenaar en opent de werkvoorraad standaard ingeklapt
    When Backoffice tussen juni, juli en augustus wisselt en daarna ieder eigenaarfilter opent
    Then blijven totaal, eigenaarschap, taaktypes en concrete taakidentiteiten ongewijzigd
    And tonen Alle, Backoffice en Medewerkers uitsluitend hun 12, 7 en 5 concrete acties

  @happy
  Scenario: [E2E-H-002] rolwissel werkt zonder F5 en herstel blijft beschikbaar voor iedere rol op LOCAL/TEST
    # Aantoonbare Playwright-assertions in deze case: 11
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Open ontwerpconflict: FO Rollen/traceerbaarheid zegt reset alleen beheerder,
    # FO Reset en de bestaande implementatie staan reset ook voor medewerker toe.
    Given de LOCAL/TEST-login alle zes vaste demoaccounts per rol zichtbaar toont
    When Stasjo via de medewerkerskeuze wordt geselecteerd
    Then staan zijn testcredentials direct klaar en blijft Herstel ook voor hem beschikbaar op LOCAL/TEST
    When naar Joyce als beheerder wordt gewisseld zonder pagina-herlaad
    Then wisselen e-mailadres, wachtwoord, eigen identiteit en rol direct zonder oude accountgegevens
    And krijgt Backoffice de herstelbediening en blijven de zes accountkeuzes compleet

  @happy
  Scenario: [E2E-H-003] herindiening verplaatst dezelfde actie van medewerker naar Backoffice
    # Aantoonbare Playwright-assertions in deze case: 18
    # Testtechniek: Toestandsovergang met dossierinvariant
    Given de herstelbasis Stasjo een correctieactie en Backoffice zeven acties geeft
    And toont de correctie zichtbaar reden, aanvrager en periode
    When Stasjo een dagregel wijzigt en exact eenmaal opnieuw indient
    Then verdwijnt hours-correction en verschijnt hours-review voor dezelfde medewerker en periode
    And wijzigen de eigenaartellers van 7 en 5 naar 8 en 4 terwijl het globale totaal 12 blijft
    And zijn de ingediende velden vergrendeld en blijft dezelfde serverstatus na refresh zichtbaar

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-004] goedkeuring vervangt urencontrole door factuurverzending voor hetzelfde dossier
    # Aantoonbare Playwright-assertions in deze case: 5
    # Testtechniek: Toestandsovergang met readback
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: taakidentiteit, eigenaar, totaal, enkele write, vervolgtaak en refreshbestendigheid.
    Given Backoffice een ingediende urenstaat uit de vaste herstelbasis opent
    When Backoffice die urenstaat goedkeurt
    Then wordt exact één goedkeuringswrite voor die medewerker, periode en versie uitgevoerd
    And verdwijnt alleen de urencontrole en verschijnt een factuuractie voor hetzelfde dossier
    And blijven taakidentiteit, eigenaar, totaal en vervolgactie na een volledige refresh correct

  @happy
  Scenario: [E2E-H-005] klanturenstaatcontrole wordt een brokeractie zonder taakverlies
    # Aantoonbare Playwright-assertions in deze case: 13
    # Testtechniek: Toestandsovergang met documentidentiteit
    Given Backoffice een ontvangen klanturenstaat heeft voor een opdracht waarvoor de brokerroute actief is
    When Backoffice het ontvangen klantdocument goedkeurt
    Then verandert de serverstatus exact eenmaal van Ontvangen naar Goedgekeurd
    And verdwijnt customer-review en verschijnt customer-broker voor dezelfde medewerker, periode en document-ID
    And blijven eigenaar, globale telling en de te openen documentbytes na refresh correct

  @happy
  Scenario: [E2E-H-006] eenmalige wachtwoordlink geeft toegang en blokkeert hergebruik
    # Aantoonbare Playwright-assertions in deze case: 13
    # Testtechniek: Toestandsovergang tokenlevenscyclus op een wegwerpaccount
    Given een actief wegwerpaccount met een bestaand wachtwoord via Wachtwoord vergeten een resetlink aanvraagt
    When de medewerker via de eenmalige link een sterk nieuw wachtwoord instelt en via de GUI inlogt
    Then werkt het nieuwe wachtwoord en werkt het oude wachtwoord niet meer
    And is dezelfde link niet opnieuw bruikbaar zonder status- of wachtwoordmutatie
    When de medewerker twee resetlinks achter elkaar aanvraagt
    Then maakt de nieuwste link de vorige ongeldig en blijft alleen de nieuwste link eenmaal bruikbaar

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-007] taakgestuurde goedkeuring blijft na serververversing afgerond
    # Aantoonbare Playwright-assertions in deze case: 5
    # Testtechniek: Toestandsovergang
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: zichtbare taak, exacte write, serverstatus, taakvervanging, teller en geforceerde readback.
    Given een servergestuurde urencontrole in de Backoffice-werkvoorraad staat
    When Backoffice via de taakmodal goedkeurt
    Then is de serverstatus Goedgekeurd en is exact één goedkeuringswrite uitgevoerd
    And verdwijnt dezelfde urencontrole uit de zichtbare werkvoorraad en klopt de teller
    And blijft de controle na geforceerde server-readback en pagina-refresh weg
    And staat de factuurtaak voor exact dezelfde medewerker en periode open

  @happy
  Scenario: [E2E-H-008] urencontrole vraagt na oude versie opnieuw op en maakt daarna toch goedkeuren af
    # Aantoonbare Playwright-assertions in deze case: 4
    # Testtechniek: Optimistic-concurrencyfout gevolgd door herstel
    Given Backoffice een urencontrole met een aantoonbaar verouderde lokale versie opent
    When Backoffice eerst met die oude versie probeert goed te keuren
    Then weigert de server de write met een begrijpelijke melding
    And blijven status, versie, eigenaar, taak en tellers ongewijzigd
    When de GUI de nieuwste serverversie terugleest en Backoffice opnieuw bevestigt
    Then wordt exact één goedkeuring gecommit, verdwijnt de urencontrole en verschijnt de factuurtaak
    And blijft die overgang na een volledige refresh staan

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-023] twee nieuw toegevoegde ontvangers krijgen via de volledige GUI-keten ieder hun eigen factuurmail
    # Aantoonbare Playwright-assertions in deze case: 12
    # Testtechniek: End-to-end use-case + equivalentieklasse meerdere ontvangers
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: twee opgeslagen ontvangers, twee eigen teksten, gescheiden deliveries en bijlagebeleid.
    Given Backoffice via Teambeheer twee eigen ontvangers met verschillende adressen en teksten toevoegt
    When Backoffice opslaat, de medewerker opnieuw opent en de volledige uren- en factuurketen via de GUI doorloopt
    Then blijven beide ontvangers na refresh afzonderlijk zichtbaar met hun eigen instellingen
    And ontstaat voor iedere ontvanger precies één delivery met een eigen route-ID
    And blijft het bedoelde adres auditbaar terwijl TEST fysiek uitsluitend naar de vaste sink met vaste CC aflevert
    And staan in onderwerp en bericht exact de waarden die bij die ontvanger zijn ingevuld
    And heeft de route met Factuur meesturen een geldige PDF en de route zonder vinkje geen bijlage

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-024] een nieuw account krijgt via de GUI toegang en zijn eigen tekst komt letterlijk in de verzonden mail
    # Aantoonbare Playwright-assertions in deze case: 18
    # Testtechniek: End-to-end use-case van accountaanmaak tot mailinhoud
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: uitnodiging, eigen identiteit, letterlijke tekst, onderwerp, handtekening en cleanup.
    Given Backoffice via Teambeheer een nieuw account met persoonlijke uitnodiging en een eigen ontvanger, onderwerp en tekst aanmaakt
    Then toont Teambeheer Toegang in afwachting en bestaat een twee uur geldige eenmalige uitnodigingslink
    When de nieuwe medewerker via de eenmalige link een wachtwoord instelt en via de GUI inlogt
    And de medewerker uren indient en Backoffice via de GUI goedkeurt en factureert
    Then staat de zelf ingevoerde tekst letterlijk en eenmaal in de mail voor de eigen ontvanger
    And kloppen onderwerp, medewerkernaam en alle vijf ingestelde handtekeningvelden
    And bevat onderwerp noch bericht tekst van een ander kanaal of een onvervangen veld tussen accolades
    And is de uitnodigingslink na gebruik zonder mutatie onbruikbaar

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-025] een aangepaste standaardtekst werkt in de echte mail en is via de GUI terug te zetten
    # Aantoonbare Playwright-assertions in deze case: 10
    # Testtechniek: Equivalentieklassen standaard, aangepast en teruggezet
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: geen stille customisatie, opslag/readback, echte mailinhoud en herstel van meegeleverde tekst.
    Given de fixture de vooraf geldende boekhoudingstekst en customisatiestatus bewaart
    And Backoffice Instellingen en de standaardtekst voor Boekhouding opent
    When Backoffice zonder een wijziging opslaat en de pagina ververst
    Then is geen eigen standaardtekst vastgelegd
    When Backoffice een unieke standaardtekst invoert, opslaat en de factuurketen via de GUI afrondt
    Then blijft de aangepaste tekst na refresh staan en staat hij letterlijk in de boekhoudingsmail
    When Backoffice Terug naar de meegeleverde tekst kiest en opnieuw opslaat
    Then is de eigen standaardtekst verwijderd en geldt na refresh weer de meegeleverde tekst
    And herstelt de fixture na de case exact de vooraf geldende tekst en customisatiestatus

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-012] het vinkje Factuur meesturen bepaalt werkelijk of de bijlage meegaat
    # Aantoonbare Playwright-assertions in deze case: 6
    # Testtechniek: End-to-end use-case + beslissingstabel per soort ontvanger
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: opgeslagen vinkje, aan/uit-paar, echte attachment en vaste salarisuitzondering.
    Given twee ontvangers van het type Overig waarvan Factuur meesturen bij één aan en bij één uit staat
    When Backoffice opslaat, opnieuw opent en de volledige GUI-keten tot en met de mail doorloopt
    Then blijft het vinkje per ontvanger na refresh correct staan
    And heeft alleen de aangevinkte ontvanger een werkelijk te openen factuur-PDF met niet-lege bytes
    And bestaat de salarisroute precies eenmaal met nul bijlagen en is haar vinkje met reden uitgeschakeld

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-013] een nieuwe medewerker doorloopt via de GUI de hele keten tot en met factuur en mail
    # Aantoonbare Playwright-assertions in deze case: 36
    # Testtechniek: End-to-end use-case vanaf een leeg account
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: identiteit, formulier-readback, contract, uitnodiging, uren-readback,
    # taak/eigenaar/teller, factuur-PDF, mailinhoud, ontvangers en afzonderlijke bijlagen.
    Given Backoffice in Teambeheer via Nieuwe medewerker een medewerker met klant, broker, contract en een eigen ontvanger invoert
    And bij de eigen ontvanger Factuur meesturen inschakelt en een persoonlijke uitnodiging laat maken
    When Backoffice opslaat, de medewerker opnieuw opent en de pagina ververst
    Then staan alle ingevoerde medewerker-, opdracht-, contract- en ontvangergegevens nog in de GUI
    And toont Teambeheer dat de persoonlijke toegang nog in afwachting is
    When de medewerker de eenmalige link opent, zelf een wachtwoord instelt en via de GUI inlogt
    Then ziet de medewerker zijn eigen naam, rol en opdracht zonder horizontale mobiele overflow
    When de medewerker uren invoert, opslaat, na verversen terugleest en daarna indient
    Then zijn uren, periode en status Ingediend zichtbaar en zijn de invoervelden vergrendeld
    When Backoffice opnieuw inlogt en de werkvoorraad opent
    Then staat exact deze medewerker en periode als urencontrole bij Backoffice en kloppen taak, eigenaar en teller
    When Backoffice via de GUI goedkeurt en de factuurcontrole afrondt
    Then verdwijnt de urencontrole en bestaat een definitieve serverfactuur met een afzonderlijk te openen PDF-link
    And krijgen broker, boekhouding, salarisadministratie en de eigen ontvanger ieder één gescheiden delivery met hun eigen mailtekst
    And blijven de bedoelde adressen auditbaar terwijl TEST alleen naar de vaste sink en vaste CC aflevert
    And krijgen alleen de bedoelde ontvangers exact de juiste afzonderlijk te openen PDF-bijlagen
    And bevat geen enkel onderwerp of bericht een leeg of onvervangen veld tussen accolades

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-014] een nieuwe beheerder logt via de GUI zelf in en maakt een echte keten af
    # Aantoonbare Playwright-assertions in deze case: 17
    # Testtechniek: End-to-end use-case + beslissingstabel rollen
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: uitnodiging, eigen identiteit, rol/autorisatie, gelijke werkvoorraad,
    # taakovergang, factuur-PDF, mailroutes en herstel na verversen.
    Given een bestaande beheerder in Teambeheer via de GUI een nieuwe beheerder met persoonlijke uitnodiging aanmaakt
    When de nieuwe beheerder de eenmalige link opent, zelf een wachtwoord instelt en inlogt
    Then toont de GUI zijn eigen naam en de rol Beheerder en nooit de identiteit van een collega
    And ziet hij na verversen dezelfde maanden, taaktotalen en concrete werkvoorraad als de bestaande beheerder
    And zijn beheerfuncties zichtbaar en medewerkerfuncties afgeschermd zonder horizontale mobiele overflow
    When een medewerker via de GUI een nieuwe urenstaat indient
    And de nieuwe beheerder precies die urencontrole via de werkvoorraad opent en goedkeurt
    Then verdwijnt de urencontrole en verschijnt voor dezelfde medewerker en periode de factuuractie
    When de nieuwe beheerder via de GUI de factuur controleert en definitief afrondt
    Then kan hij de definitieve factuur-PDF openen en ontstaan de juiste gescheiden mailroutes en bijlagen
    And blijven de afgeronde status en verdwenen taak na een volledige pagina-refresh staan

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-015] medewerker-CRUD blijft via de GUI na iedere schrijfactie en refresh correct
    # Aantoonbare Playwright-assertions in deze case: 18
    # Testtechniek: CRUD-keten met server-readback na iedere zichtbare schrijfactie
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: create/read/update/deactivate/delete, alle formuliervelden, actieve en
    # inactieve lijsten, refreshbestendigheid, bevestigingsmodal en geen achtergebleven account/opdracht.
    Given Backoffice via Nieuwe medewerker alle medewerker-, klant-, broker-, contract- en ontvangergegevens invult
    When Backoffice via de GUI opslaat, terugkeert naar Teambeheer en de pagina ververst
    Then staat de nieuwe medewerker één keer in de actieve lijst
    And toont opnieuw openen elk opgeslagen veld met exact de ingevoerde waarde
    When Backoffice via Bewerken ieder wijzigbaar veld een nieuwe waarde geeft en opslaat
    Then toont opnieuw openen na een volledige refresh uitsluitend de nieuwe waarden
    When Backoffice de medewerker via de GUI deactiveert
    Then verdwijnt hij uit de actieve lijst maar staat hij na refresh één keer in de inactieve lijst
    And blijven zijn zakelijke gegevens en opdracht bij opnieuw openen beschikbaar
    When Backoffice vanuit de inactieve lijst definitief verwijderen kiest en de bevestiging uitvoert
    Then staat het account na refresh in geen enkele teamlijst meer
    And ontbreken gebruiker, medewerkerprofiel, opdracht en ontvangerkoppelingen in de server- en DB-readback
    And bestaan geen verweesde relaties voor het verwijderde account

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-016] ieder wijzigbaar Teambeheerveld heeft een aantoonbaar opslag- of uitzonderingscontract
    # Aantoonbare Playwright-assertions in deze case: 32
    # Testtechniek: Gegevensstroomtest van formulier naar write en server-readback
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: volledige veldinventaris, requestwaarde, serverwaarde, refreshwaarde en expliciete uitzonderingslijst.
    Given Backoffice voor ieder wijzigbaar veld van Nieuwe medewerker een unieke herkenbare waarde invult
      | Groep | Velden |
      | Account | naam, zakelijk accountadres, functie, startdatum, contract, uren per week |
      | Opdracht | klant, projectcode, broker, brokeradres, factuurontvanger, factuuradres, factuurproject, tarief |
      | Brokerroute | ontvangt mail, factuur meesturen, eigen onderwerp, eigen begeleidende tekst |
      | Vaste routes | actief, factuur meesturen, eigen onderwerp en eigen tekst per ontvanger |
      | Nieuwe ontvanger | type, naam, adres, actief, factuur meesturen, eigen onderwerp, eigen tekst |
      | Klanturenstaat | verwacht, werkdag, brokerroute, adreskeuze, afwijkend adres, factuur mag eerder |
      | Meldingen | geplande urenherinneringen, aanvullende e-mailmeldingen |
      | Acties zonder opslag | persoonlijke uitnodiging en hierna nog iemand toevoegen met expliciete reden |
    When Backoffice het formulier via de GUI opslaat
    Then heeft ieder veld een expliciete request-key, server-/DB-readback-key en GUI-control voor opnieuw openen
    And staat iedere verstuurde waarde exact in bootstrap, de bijbehorende DB-kolom en na refresh in de GUI
    And staat iedere bewuste actie-zonder-opslag met veldnaam en reden in de vaste uitzonderingslijst
    And bevat het formuliercontract geen onbekende, dubbele of stil genegeerde velden
    When Backoffice alle velden via Bewerken een tweede unieke waarde geeft en opnieuw opslaat
    Then komen ook alle tweede waarden na refresh exact terug en is geen eerste waarde blijven hangen

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-017] de volledige toegestane urenstatusketen bewaakt na iedere write status, eigenaar en taak
    # Aantoonbare Playwright-assertions in deze case: 16
    # Testtechniek: Toestandsovergangstabel
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: draft, submitted, correction, resubmitted, approved, invoiced, versions, taken en tellers.
    Given een nieuwe medewerker via de GUI een concepturenstaat met dagregels opslaat en na refresh terugleest
    Then staat de DB-status op draft, blijft de taak bij de medewerker en bestaat geen hours-review
    When de medewerker indient
    Then stijgt de versie eenmaal, staat de DB-status op submitted en vervangt hours-review de medewerkerstaak
    When Backoffice via de GUI met een reden om correctie vraagt
    Then staat de DB-status op correction en ziet de medewerker reden, aanvrager en periode bij hours-correction
    When de medewerker corrigeert en opnieuw indient
    Then staat de DB-status weer op submitted en ziet Backoffice één hours-review voor hetzelfde dossier
    When Backoffice goedkeurt
    Then staat de DB-status zichtbaar op approved en vervangt invoice-delivery de urencontrole
    When Backoffice daarna de factuur definitief afrondt
    Then staat de DB-status op invoiced en blijven status, eigenaar, taak en teller na refresh gelijk

  @negative @gui @desktop @mobile
  Scenario: [E2E-N-017] submitted, approved en invoiced blokkeren iedere verboden medewerkerwrite
    # Aantoonbare Playwright-assertions in deze case: 22
    # Testtechniek: Negatieve toestandsovergangen
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: UI-lock, serverweigering, ongewijzigde versie/status/taken/tellers en geen audit-succes.
    Given dezelfde urenstaat achtereenvolgens de statussen submitted, approved en invoiced bereikt
    When de medewerker per status de zichtbare bediening en een directe write met geldige CSRF probeert
    Then zijn wijzigen, opslaan en indienen in de GUI afwezig of uitgeschakeld waar de status dat verbiedt
    And weigert de server iedere verboden overgang met het vastgelegde foutcontract
    And blijven DB-status, versie, eigenaar, taakidentiteiten en tellers na iedere poging exact gelijk
    And ontstaat geen succesvolle auditregel, factuur of delivery door een verboden write

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-018] iedere beloofde factuurbijlage bestaat werkelijk als geldige en te openen PDF
    # Aantoonbare Playwright-assertions in deze case: 25
    # Testtechniek: Bestandscontract + beslissingstabel ontvanger en bijlage
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: HTTP 200, PDF-content-type, PDF-signatuur, niet-lege bytes, bestandsnaam en routebeleid.
    Given Backoffice een volledige uren-, klanturenstaat- en factuurketen via de GUI klaar heeft voor bevestiging
    When Backoffice iedere link in de scenariolijst en bevestigingsmodal vóór afronden afzonderlijk opent
    Then antwoordt iedere bijlage met HTTP 200, attachment disposition, een veilige pdf-bestandsnaam en application/pdf
    And gelden private no-store en nosniff en bevat iedere payload %PDF-, %%EOF en niet-triviale bytes
    When Backoffice de controle bevestigt en dezelfde deliverybijlagen opnieuw opent
    Then zijn hash en bytes gelijk aan de vooraf gecontroleerde serverdocumenten en blijven ze na refresh te openen
    And zijn factuur en klanturenstaat twee afzonderlijke documenten waar de broker beide hoort te krijgen
    And heeft Boekhouding alleen de factuur, Salarisadministratie geen bijlage en iedere eigen ontvanger zijn ingestelde beleid
    And bestaat geen delivery die een bijlage belooft zonder een werkelijk bestand

  @negative @gui @desktop @mobile
  Scenario: [E2E-N-018] documentlinks accepteren geen ongeautoriseerde gebruiker, clientpad of vrije bestandsnaam
    # Aantoonbare Playwright-assertions in deze case: 13
    # Testtechniek: Negatieve autorisatie en invoerklassen
    Given een geldige factuur- en klanturenstaatbijlage voor Backoffice bestaat
    When een medewerker, een uitgelogde browser en een gemanipuleerde URL dezelfde documentroute proberen
    Then weigert de server ieder ongeautoriseerd verzoek zonder opslagpad of technische details te lekken
    And kan geen clientpad, vrije bestandsnaam, andere medewerker of andere periode worden afgedwongen
    And blijven originele bytes, delivery, audit en opslagbestand ongewijzigd

  @happy @gui @desktop @mobile
  Scenario: [E2E-H-019] dubbel klikken maakt nooit dubbele statussen, facturen of mails
    # Aantoonbare Playwright-assertions in deze case: 22
    # Testtechniek: Idempotentie met vertraagde writes
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: enkele write per actie, stabiele versie, één factuur en exact één delivery per route.
    Given de eerste submit-, goedkeurings- en factuurwrite gecontroleerd worden vertraagd
    When de gebruiker iedere primaire actie snel tweemaal probeert en daarna de pagina ververst
    Then commit de server per overgang exact één statusmutatie en toont de GUI één blijvende vervolgstatus
    And bestaan voor medewerker en periode precies één urenstaat en één definitieve factuur
    And bestaat per bedoelde ontvanger precies één delivery en één audit-succes zonder dubbele mail of bijlage

  @negative @gui @desktop @mobile
  Scenario: [E2E-N-019] een mislukte factuurpoging laat niets half achter en opnieuw proberen levert een factuur
    # Aantoonbare Playwright-assertions in deze case: 19
    # Testtechniek: Gecontroleerde foutinjectie en herstel
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: onveranderde status/versie, geen tweede factuurregel, niets definitief,
    # ongewijzigde deliverylijst en na herstel exact een definitieve factuur met een bericht per ontvanger.
    # Bewust buiten deze case: de retry op een MISLUKTE mailverzending. Die vereist dat de
    # verzending zelf gecontroleerd faalt, en daar bestaat geen testhaak voor. Een case die
    # dat suggereert zonder het te bewijzen is misleidender dan een case die het niet claimt.
    Given een goedgekeurde urenstaat met vastgelegde status, versie, conceptfactuur en delivery-IDs
    When de eerste factuurpoging op netwerkniveau gecontroleerd strandt
    Then blijven status, versie en eigenaar gelijk en is er niets definitief gemaakt
    And is er geen tweede factuurregel en geen enkel extra mailitem klaargezet
    When Backoffice het via dezelfde weg opnieuw probeert
    Then bestaat er precies een factuur en is die definitief
    And krijgt iedere bedoelde ontvanger precies een bericht zonder dubbele mail of bijlage

  @negative @gui @desktop @mobile
  Scenario: [E2E-N-020] een medewerker kan de Backoffice-keten niet uitvoeren en een weigering verandert niets
    # Aantoonbare Playwright-assertions in deze case: 26
    # Testtechniek: Negatieve autorisatie + invarianten vóór en na de poging
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: verborgen bediening, HTTP-weigering, ongewijzigde status, eigenaar, teller, factuur en mailqueue.
    Given een ingediende urenstaat als controle bij Backoffice staat
    When de medewerker inlogt en met een geldige medewerker-CSRF timesheets.php action approve probeert
    Then zijn Teambeheer, goedkeuren, factureren en mailbeheer niet zichtbaar of bedienbaar
    And weigert de server exact met HTTP 403 en het vastgelegde autorisatiefoutcontract zonder technische details
    And blijven status, versie, eigenaar, taakidentiteit en alle tellers exact ongewijzigd
    And ontstaan geen factuur, audit-succes of maildelivery door de geweigerde poging

  @negative @gui @desktop @mobile
  Scenario: [E2E-N-021] een gedeactiveerd account met historie blijft veilig bewaard en legt de blokkeerreden uit
    # Aantoonbare Playwright-assertions in deze case: 20
    # Testtechniek: Beslissingstabel verwijderen met en zonder zakelijke historie
    # Uitvoermatrix: desktop-chromium, mobile-chrome en mobile-safari
    # Assertioncontract: deactivatie, loginblokkade, begrijpelijke deleteblokkade, bewaarde relaties en geen dataverlies.
    Given een medewerker via de GUI heeft ingelogd en uren, factuur, delivery en auditgeschiedenis heeft opgebouwd
    When Backoffice de medewerker deactiveert en vanuit de inactieve lijst definitief verwijderen bevestigt
    Then kan het account niet meer inloggen en staat het niet meer in de actieve lijst
    And weigert de GUI definitief verwijderen met een begrijpelijke reden zonder SQL- of serverdetails
    And blijven medewerkerprofiel, opdracht, urenhistorie, facturen en auditrelaties intact
    And staat het account na refresh precies eenmaal als inactief vermeld

  @happy @database
  Scenario: [E2E-H-022] iedere case laat database en private opslag aantoonbaar schoon achter
    # Aantoonbare Playwright-assertions in deze case: 20
    # Testtechniek: Baselinefingerprint + referentiële-integriteits- en leakcontrole
    # Deze automatische fixturestappen zijn bij iedere case zichtbaar in Playwright UI.
    Given de runner uitsluitend een database op _test en een unieke tijdelijke private opslag gebruikt
    And de fixture vóór de case rij-aantallen, bedrijfsstatussen, demoaccounts en opslagbestanden vastlegt
    When de case records en PDF's met een unieke case-, run- en projectmarker maakt
    Then zijn alle bedoelde writes via GUI-, server- en DB-readback aantoonbaar gevuld
    When de fixture na diagnostiek de testbaseline transactioneel herstelt
    Then komt de functionele baseline exact overeen met de voorstatus
    And levert zoeken op de unieke marker nul gebruikers, medewerkers, opdrachten, routes, urenregels, facturen, deliveries en tokens op
    And bestaan geen verweesde foreign-keyrelaties, tijdelijke PDF's of achtergebleven sessies voor die marker
    And kunnen de vaste beheerder en medewerker opnieuw met hun oorspronkelijke testwachtwoord inloggen
