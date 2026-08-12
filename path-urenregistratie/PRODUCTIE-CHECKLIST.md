# Productiechecklist Path Uren & Facturatie

## Masterchecklist (technische voortgang)

De technische masterchecklist met fase-statussen, regressiestatus en updateprotocol staat in `MASTERCHECKLIST.md`.
Deze productiechecklist blijft de functionele/livegang-checklist.

Dit is een levende checklist. Bevestigde punten worden uit **Nog te beslissen** gehaald, zodat Gio en Joyce niet steeds dezelfde vragen krijgen. Secrets blijven buiten de broncode; de expliciet bevestigde acceptatie-ontvangers staan wel in de offline preflight.

## Al bevestigd of aangeleverd

- KvK-nummer, btw-nummer, IBAN, adres en betalingstermijn zijn uit de aangeleverde facturen overgenomen.
- De facturerende onderneming voor productie is bevestigd als **Path Consultancy B.V.**; QSI is geen open keuze meer.
- Het factuuradres van ItaQ is uit meerdere aangeleverde facturen bevestigd als **Laan van ZuidHoorn 165, 2289 DD Rijswijk** en is exact zo in de app ingevuld.
- Het factuuradres van Circle8 is uit Shawns factuur bevestigd als **Plettenburg-West, Fultonbaan 6, 3439 NE Nieuwegein** en is exact zo in de app ingevuld.
- De lokale voorbeeldomgeving gebruikt veilige `@example.invalid`-adressen. Beheerders mogen zelf echte adressen lokaal invoeren; daadwerkelijke verzending blijft technisch uitgeschakeld.
- Medewerkers, klanten, brokers, tarieven, contracturen en bestaande factuurnummervoorbeelden zijn ingevoerd.
- De bestaande medewerker-/klantpatronen voor factuurnummers en de voorlopige onderwerpregels en begeleidende teksten zijn uit de voorbeelden overgenomen; ze hoeven niet opnieuw te worden aangeleverd.
- Path heeft de factuurnummering bevestigd: de nummers gebruiken koppeltekens zonder spaties, per medewerker blijft het vaste patroon gelijk en bij een nieuwe periode veranderen automatisch alleen maand en jaar. In januari 2027 wordt bijvoorbeeld `Bel-Shawn-2027-januari` gebruikt.
- Voor Shawn/Circle8 zijn overeenkomstnummer, crediteurennummer, nummer opdrachtuitvoerder en het bestaande factuurnummervoorbeeld ingevoerd.
- Gio en Joyce zijn de beoogde beheerders.
- `backoffice@pathconsultancy.nl` is het bevestigde hulpadres voor vragen die de ingebouwde hulp niet kan beantwoorden.
- Iedere medewerker dient precies één gekozen maand in en ziet alleen de eigen uren.
- Oudere onvoltooide maanden blijven op het dashboard staan totdat uren, correcties, klantdocumenten en alle gekozen verzendroutes zijn afgerond. Directe beheertaken staan over alle maanden in één lijst, wachten op medewerkers wordt apart geteld en iedere taak verwerkt altijd maar één medewerker en maand.
- EasySalary krijgt per medewerker en maand standaard alleen de begeleidende tekst met het goedgekeurde urentotaal; de factuurbijlage staat voor deze route standaard uit.
- Broker en iedere centraal aangemaakte ontvanger zijn gescheiden routes; CC/BCC wordt niet gebruikt om verschillende inhoud te combineren.
- Boekhouder, EasySalary en extra ontvangers worden centraal beheerd en per medewerker aangevinkt.
- Zelf aangemaakte extra ontvangers kunnen na waarschuwing worden verwijderd; Boekhouder en EasySalary blijven beschermde systeemrollen en kunnen worden gedeactiveerd.
- **Ontvangt mail** en **Factuur meesturen** zijn per medewerker voor de broker en iedere centrale ontvanger afzonderlijk instelbaar.
- De app maakt zelf geen klanturenstaat. Een medewerker kan het officiële klantdocument later en los van de urenregistratie als PDF, JPG of PNG toevoegen. JPG en PNG worden automatisch als PDF opgeslagen.
- Een klanturenstaat kan eerst als privéconcept worden opgeslagen. Pas **Indienen bij Backoffice** maakt een in-app melding voor Backoffice.
- Medewerker en Backoffice kunnen de opgeslagen PDF bekijken. Na goedkeuring kan Backoffice onderwerp en begeleidende tekst van de aparte brokerroute nog aanpassen.
- Per medewerker zijn klanturenstaatdeadline, standaard of afwijkend brokeradres, brokerroute en **factuur mag zonder klanturenstaat** instelbaar.
- Een klanturenstaat gaat pas na Backoffice-controle naar de broker. De bevestigde eerste productiebundel bevat voor de broker factuur + goedgekeurde klanturenstaat; boekhouder krijgt alleen de factuur en salarisadministratie krijgt geen bijlage.
- De standaard begeleidende tekst begint met `Middag,` en bevat `{medewerker}`, `{maand}` en `{uren}`.
- De beheerder start de maandverzending met één knop; alle aangevinkte ontvangers blijven intern gescheiden berichten.
- De maandverzending wordt geblokkeerd zolang minimaal één relevante urenregistratie van die maand niet is goedgekeurd. Een ontbrekende klanturenstaat blokkeert alleen wanneer dit per medewerker expliciet is ingesteld.
- De app toont en downloadt conceptfacturen als PDF. Definitieve productie-PDF's moeten server-side worden gemaakt, opgeslagen en vergrendeld.
- Iedere factuur gebruikt dezelfde Path-vormgeving met logo en huisstijlkleuren; de juridische facturerende onderneming blijft afzonderlijk zichtbaar. De drie extra Circle8-referenties worden uitsluitend op Shawns factuur geplaatst.
- De boekhouder krijgt binnen die actie per medewerker een afzonderlijk bericht; alleen naam en e-mailadres ontbreken nog.
- Algemene mededelingen kunnen naar iedereen, een klantgroep of gekozen medewerkers. Na een wijziging zien medewerkers alleen de nieuwste tekst; oudere versies blijven uitsluitend intern voor beheerders bewaard.
- Conceptmededelingen blijven uitsluitend bij beheerders en veroorzaken geen melding of e-mail.
- Intrekken verwijdert de oorspronkelijke tekst bij medewerkers en toont alleen één algemene intrekkingsmelding met de reden. Het origineel blijft uitsluitend intern bij beheerders.
- Een ingetrokken bericht kan met interne versiehistorie worden bewerkt. Met **Bij medewerkers verwijderen** verdwijnen ook de intrekkingsmelding en gekoppelde meldingen uit hun lijst en bel.
- Medewerkers kunnen aanvullende e-mailmeldingen zelf aan- of uitzetten; in-app meldingen blijven zichtbaar.
- EasySalary blijft vanuit Facturen controleerbaar en krijgt geen dubbel onderdeel of aparte bulkknop.
- Uren blijven per dag invulbaar met een maand-/weekfilter, automatisch tussentijds opslaan en week- en maandtotalen. Alleen een volledige maand kan worden ingediend.
- Een beheerder kan goedgekeurde uren vóór de verzendcontrole met een verplichte reden vrijgeven voor correctie; daarna wordt de factuur opnieuw geblokkeerd.
- Herinneringsregels zijn configureerbaar. De klanturenstaat heeft daarnaast een eigen planning: één werkdag vooraf om 15:00, op de deadline om 10:00 en twee werkdagen te laat om 10:00.

## Alleen nog nodig van Path voor productie

1. De officiële Circle8-aanleverinstructie: bevestigen of verzending via e-mail of een portaal loopt. Het factuuradres zelf is al bevestigd.
2. De zakelijke adressen voor Gio, Joyce en iedere overige medewerker.
3. De tweede productiebeheerder, 2FA-keuze, bewaartermijnen, back-upretentie, monitoring-eigenaar en virusscanstrategie.
4. Bevestiging dat de aangeleverde Path-bedrijfsgegevens op de eerste definitieve PDF visueel correct staan.

De herinneringsmomenten zijn geen blokkerende productiebeslissing meer: een beheerder kan ze zelf onder **Instellingen** wijzigen en per medewerker uitschakelen. Voor automatische uitvoering is nog wel een server-side planner of cronjob nodig.

Afwijkende brokerteksten hoeven alleen te worden aangeleverd wanneer een broker afwijkt van de huidige standaard **factuur als enige bijlage, met het urentotaal in de tekst**. De reeds ingevoerde onderwerpen en teksten blijven anders de standaard.

## TransIP en database

- Subdomein `uren.pathconsultancy.nl` aanmaken.
- Aparte MySQL-database en databasegebruiker aanmaken.
- Productiebestanden uploaden via SFTP.
- SSL voor het subdomein controleren.
- Cronjob instellen voor herinneringen, exports en de verzendwachtrij.
- Controleren of de back-ups ook de nieuwe database en applicatiebestanden omvatten.

## Google Workspace SMTP Relay

- Relay: `smtp-relay.gmail.com:587`, STARTTLS verplicht, IP-gebaseerd via het publieke TransIP-IP.
- SMTP-authenticatie uit; geen username/password in de applicatie.
- Alleen geregistreerde domeinafzenders; From `backoffice@pathconsultancy.nl`.
- SPF, DKIM en DMARC extern controleren voordat echte mail wordt geactiveerd.
- Eerst de offline preflight en Bundel 3 uitvoeren; `mail.enabled` blijft tot expliciete toestemming `false`.

## Acceptatie vóór livegang

- Eén volledige maand doorlopen met testaccounts voor beheerder en iedere medewerker.
- Controleren dat **Mijn open taken** de juiste medewerker en maand per taak toont, **Start met oudste taak** de oudste directe actie opent en de algemene maandkiezer daarbij niet ongevraagd verandert.
- Controleren dat **Nu afhandelen** alleen directe beheeracties telt en **Wacht op medewerker** concepten, correcties en ontbrekende documenten apart houdt.
- Controleren dat **Open taken** het totale aantal over alle maanden toont, de maandsamenvatting per maand optelt en de teamstatus duidelijk alleen de geselecteerde maand en open uren betreft.
- Controleren dat een 100%-cirkel als **Factuurproces** is gelabeld en een nog open klanturenstaat daarnaast zichtbaar blijft.
- Terugsturen zonder correctietekst blokkeren; daarna controleren dat tekst, beheerder, datum en tijd zichtbaar en blijvend opgeslagen zijn.
- Correctie als medewerker aanpassen, opnieuw indienen en vervolgens alsnog goedkeuren.
- Controleren dat een medewerker nooit gegevens van een andere medewerker ziet.
- Bedragen, btw, afronding en factuurnummering laten controleren.
- Herstel van een back-up testen.
- Routering naar broker, boekhouder, EasySalary en een extra centrale ontvanger afzonderlijk controleren.
- Controleren dat EasySalary standaard geen factuurbijlage krijgt en dat tarief-, klant- en brokergegevens niet in het EasySalary-overzicht staan.
- Een centrale ontvanger aanmaken, bij één medewerker aanvinken en controleren dat andere medewerkers hem niet automatisch krijgen.
- Een gebruikte extra ontvanger verwijderen en controleren dat alleen de routeringskeuzes verdwijnen en uren/facturen behouden blijven.
- Per medewerker testen dat de factuurbijlage voor broker en iedere centrale ontvanger afzonderlijk aan- en uitgezet kan worden.
- Controleren dat alleen de broker de goedgekeurde klanturenstaat ontvangt en dat de eerste brokerbundel exact factuur + klanturenstaat bevat; boekhouder en salarisadministratie mogen die PDF niet krijgen.
- Een officiële klanturenstaat als PDF, JPG en PNG toevoegen met expliciete maand/jaar-keuze; controleren dat JPG/PNG als PDF worden opgeslagen en dat onderwerp, tekst en bestandsnaam ook bij januari 2027 correct zijn.
- Concept opslaan en controleren dat Backoffice nog geen melding krijgt; daarna indienen en controleren dat de in-app melding, PDF-weergave, controle, opnieuw-uploaden, herinnering en afwijkende brokerroute werken.
- Bij de brokercontrole onderwerp en begeleidende tekst aanpassen en controleren dat deze wijziging wordt bewaard.
- Controleren dat een klanturenstaat later mag komen, niet door de app wordt gegenereerd en alleen na goedkeuring via de aparte brokerroute gaat.
- Goedgekeurde uren met een verplichte reden vrijgeven en controleren dat status, correctiehistorie en factuurblokkade teruggezet worden. Na afgeronde verzendcontrole moet vrijgeven geblokkeerd zijn.
- Eén maandknop testen en controleren dat een open urenstaat de actie blokkeert. Daarna alles goedkeuren en controleren dat alle gekozen ontvangers ondanks die ene actie gescheiden routes blijven.
- Een conceptfactuur bekijken, als PDF downloaden en bedragen, btw, watermerk en bestandsnaam controleren.
- Een algemene mededeling, klantgroepbericht en geselecteerde doelgroep testen; controleren dat niet-ontvangers niets zien.
- E-mailvoorkeur uitzetten en controleren dat de in-app mededeling blijft, terwijl de aanvullende e-mail wordt overgeslagen.
- Een mededeling wijzigen en controleren dat medewerkers uitsluitend de nieuwste tekst zien, zonder correctielabel, oud bericht of intern berichtnummer; de beheerder behoudt intern beide versies.
- Een concept opslaan en controleren dat geen ontvanger een melding krijgt; het concept daarna bewerken, verzenden en eventueel een nooit verzonden concept verwijderen.
- Een mededeling zonder reden proberen in te trekken en controleren dat dit wordt geblokkeerd.
- Na intrekken controleren dat de oude tekst nergens bij medewerkers zichtbaar blijft en alleen één algemene intrekkingsmelding met reden verschijnt.
- Het ingetrokken bericht bewerken en controleren dat vorige waarden, beheerder en tijdstip alleen intern bewaard blijven.
- **Bij medewerkers verwijderen** uitvoeren en controleren dat ook de intrekkingsmelding uit hun bel en lijst verdwijnt.
- Het medewerkersarchief en de filters Alles, Ongelezen mededelingen en Ingetrokken per medewerker controleren. De bel moet daarnaast ook urenmeldingen tellen.
- Weekfilter, mobiele standaardweek, weektotaal, maandtotaal en automatisch opslaan controleren; alleen de volledige maand mag worden ingediend.
- Alle uren- en klanturenstaatherinneringsregels wijzigen, opslaan en met een lokale voorbeeldmelding controleren. Er mag lokaal niets worden gepland of verstuurd.
- Pas na schriftelijke acceptatie echte automatische verzending activeren.

## Bewaarregels

- Verstuurde mededelingen worden niet uit de interne audit-/beheerhistorie gewist. **Bij medewerkers verwijderen** maakt ze wel volledig onzichtbaar in hun bel en mededelingenlijst.
- Alleen een concept dat nog nooit bij ontvangers zichtbaar was, mag definitief worden verwijderd.
- Vragen en antwoorden in de hulpbot zijn geen dossier: ze blijven alleen tijdens de huidige sessie in beeld en kunnen direct met **Gesprek wissen** worden verwijderd.
