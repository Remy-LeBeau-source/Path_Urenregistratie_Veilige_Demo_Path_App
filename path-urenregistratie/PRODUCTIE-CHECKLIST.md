# Productiechecklist Path Uren & Facturatie

Dit is een levende checklist. Bevestigde punten worden uit **Nog te beslissen** gehaald, zodat Gio en Joyce niet steeds dezelfde vragen krijgen. Echte e-mailadressen blijven bewust buiten de demobroncode.

## Al bevestigd of aangeleverd

- KvK-nummer, btw-nummer, IBAN, adres en betalingstermijn zijn uit de aangeleverde facturen overgenomen.
- De ontvangen facturen gebruiken QSI Consultancy; daarom blijft QSI de huidige standaard in de demo totdat Path expliciet besluit nieuwe facturen op naam van Path Consultancy B.V. te zetten.
- Het factuuradres van ItaQ is uit meerdere aangeleverde facturen bevestigd als **Laan van ZuidHoorn 165, 2289 DD Rijswijk** en is exact zo in de app ingevuld.
- Het factuuradres van Circle8 is uit Shawns factuur bevestigd als **Plettenburg-West, Fultonbaan 6, 3439 NE Nieuwegein** en is exact zo in de app ingevuld.
- De standaarddemo gebruikt veilige `@example.invalid`-adressen. Beheerders mogen zelf echte adressen lokaal invoeren; daadwerkelijke verzending blijft technisch uitgeschakeld.
- Medewerkers, klanten, brokers, tarieven, contracturen en bestaande factuurnummervoorbeelden zijn ingevoerd.
- De bestaande medewerker-/klantpatronen voor factuurnummers en de voorlopige onderwerpregels en begeleidende teksten zijn uit de voorbeelden overgenomen; ze hoeven niet opnieuw te worden aangeleverd.
- Path heeft de factuurnummering bevestigd: de nummers gebruiken koppeltekens zonder spaties, per medewerker blijft het vaste patroon gelijk en bij een nieuwe periode veranderen automatisch alleen maand en jaar. In januari 2027 wordt bijvoorbeeld `Bel-Shawn-2027-januari` gebruikt.
- Voor Shawn/Circle8 zijn overeenkomstnummer, crediteurennummer, nummer opdrachtuitvoerder en het bestaande factuurnummervoorbeeld ingevoerd.
- Gio en Joyce zijn de beoogde beheerders.
- `backoffice@pathconsultancy.nl` is het bevestigde hulpadres voor vragen die de ingebouwde hulp niet kan beantwoorden.
- Iedere medewerker dient precies één gekozen maand in en ziet alleen de eigen uren.
- Oudere onvoltooide maanden blijven op het dashboard staan totdat uren, correcties, goedkeuringen en alle gekozen verzendroutes zijn afgerond. Een maandactie verwerkt nooit meerdere maanden tegelijk.
- EasySalary krijgt per medewerker en maand standaard alleen de begeleidende tekst met het goedgekeurde urentotaal; de factuurbijlage staat voor deze route standaard uit.
- Broker en iedere centraal aangemaakte ontvanger zijn gescheiden routes; CC/BCC wordt niet gebruikt om verschillende inhoud te combineren.
- Boekhouder, EasySalary en extra ontvangers worden centraal beheerd en per medewerker aangevinkt.
- Zelf aangemaakte extra ontvangers kunnen na waarschuwing worden verwijderd; Boekhouder en EasySalary blijven beschermde systeemrollen en kunnen worden gedeactiveerd.
- **Ontvangt mail** en **Factuur meesturen** zijn per medewerker voor de broker en iedere centrale ontvanger afzonderlijk instelbaar.
- Een urenstaat wordt niet meegestuurd; de daadwerkelijke goedgekeurde uren staan in de begeleidende tekst.
- De standaard begeleidende tekst begint met `Middag,` en bevat `{medewerker}`, `{maand}` en `{uren}`.
- De beheerder start de maandverzending met één knop; alle aangevinkte ontvangers blijven intern gescheiden berichten.
- De demo toont en downloadt conceptfacturen als PDF. Definitieve productie-PDF's moeten server-side worden gemaakt, opgeslagen en vergrendeld.
- Iedere factuur gebruikt dezelfde Path-vormgeving met logo en huisstijlkleuren; de juridische facturerende onderneming blijft afzonderlijk zichtbaar. De drie extra Circle8-referenties worden uitsluitend op Shawns factuur geplaatst.
- De boekhouder krijgt binnen die actie per medewerker een afzonderlijk bericht; alleen naam en e-mailadres ontbreken nog.
- Algemene mededelingen kunnen naar iedereen, een klantgroep of gekozen medewerkers. Na een wijziging zien medewerkers alleen de nieuwste tekst; oudere versies blijven uitsluitend intern voor beheerders bewaard.
- Conceptmededelingen blijven uitsluitend bij beheerders en veroorzaken geen melding of e-mail.
- Intrekken verbergt de oorspronkelijke melding uit de actieve bel, stuurt een nieuwe intrekkingsmelding en bewaart het origineel met reden in het medewerkersarchief.
- Medewerkers kunnen aanvullende e-mailmeldingen zelf aan- of uitzetten; in-app meldingen blijven zichtbaar.
- EasySalary blijft vanuit Facturen controleerbaar en krijgt geen dubbel onderdeel of aparte bulkknop.

## Alleen nog nodig van Path voor productie

1. Eén keuze: blijven nieuwe facturen op naam van QSI Consultancy staan, of wordt dit Path Consultancy B.V.? Zonder nieuw besluit blijft de app QSI gebruiken zoals de ontvangen facturen.
2. De officiële Circle8-aanleverinstructie: alleen nog bevestigen of verzending via e-mail of een portaal loopt. Het factuuradres zelf is al uit Shawns factuur bevestigd.
3. Naam en e-mailadres van de boekhouder.
4. De zakelijke Google Workspace-adressen voor Gio, Joyce en iedere medewerker. Deze kunnen ook later tijdens het aanmaken van de accounts worden ingevuld.
5. Het definitieve EasySalary-ontvangstadres en een bevestiging van EasySalary dat de afgesproken tekstmail met naam, maand en goedgekeurde uren voldoende is.
6. Akkoord op de standaardmomenten voor herinneringen, of eigen momenten. Voorstel: maandag 09:00 voor een onvolledige vorige week, laatste werkdag 09:00 voor een nog niet ingediende maand en direct bij correctie of goedkeuring.

Afwijkende brokerteksten hoeven alleen te worden aangeleverd wanneer een broker afwijkt van de huidige standaard **factuur als enige bijlage, met het urentotaal in de tekst**. De reeds ingevoerde onderwerpen en teksten blijven anders de standaard.

## TransIP en database

- Subdomein `uren.pathconsultancy.nl` aanmaken.
- Aparte MySQL-database en databasegebruiker aanmaken.
- Productiebestanden uploaden via SFTP.
- SSL voor het subdomein controleren.
- Cronjob instellen voor herinneringen, exports en de verzendwachtrij.
- Controleren of de back-ups ook de nieuwe database en applicatiebestanden omvatten.

## Google Workspace

- Google Cloud-project op naam van Path aanmaken.
- Gmail API en Google-login activeren.
- Productie-afzender en echte ontvangers alleen in de beveiligde serverconfiguratie zetten.
- Alleen de minimaal benodigde verzendtoestemming geven.
- Callbackadres `https://uren.pathconsultancy.nl/auth/google/callback` registreren.
- Eerst met interne Path-accounts testen; automatische externe verzending blijft uitgeschakeld.

## Acceptatie vóór livegang

- Eén volledige maand doorlopen met testaccounts voor beheerder en iedere medewerker.
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
- Controleren dat geen van de drie routes een urenstaat als bijlage krijgt.
- Eén maandknop testen en controleren dat alle gekozen ontvangers ondanks die ene actie gescheiden routes blijven.
- Een conceptfactuur bekijken, als PDF downloaden en bedragen, btw, watermerk en bestandsnaam controleren.
- Een algemene mededeling, klantgroepbericht en geselecteerde doelgroep testen; controleren dat niet-ontvangers niets zien.
- E-mailvoorkeur uitzetten en controleren dat de in-app mededeling blijft, terwijl de aanvullende e-mail wordt overgeslagen.
- Een mededeling wijzigen en controleren dat medewerkers uitsluitend de nieuwste tekst zien, zonder correctielabel, oud bericht of intern berichtnummer; de beheerder behoudt intern beide versies.
- Een concept opslaan en controleren dat geen ontvanger een melding krijgt; het concept daarna bewerken, verzenden en eventueel een nooit verzonden concept verwijderen.
- Een mededeling zonder reden proberen in te trekken en controleren dat dit wordt geblokkeerd.
- Na intrekken controleren dat de oude melding uit de actieve bel verdwijnt, een nieuwe intrekkingsmelding verschijnt en het origineel met reden in het medewerkersarchief blijft staan.
- Het medewerkersarchief en de filters Alles, Ongelezen en Ingetrokken per medewerker controleren.
- Pas na schriftelijke acceptatie echte automatische verzending activeren.

## Niet opnemen als verwijderfunctie

- Verstuurde mededelingen worden nooit hard verwijderd. Correctie en intrekking blijven als controleerbare historie bestaan.
- Alleen een concept dat nog nooit bij ontvangers zichtbaar was, mag definitief worden verwijderd.
