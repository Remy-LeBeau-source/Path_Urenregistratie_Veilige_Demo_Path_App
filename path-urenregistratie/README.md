# Path Uren & Facturatie

Lokale voorbereidingsversie v0.9.12 van een configureerbare uren- en facturatieapp. Path Consultancy B.V. is de volledig ingevulde voorbeeldorganisatie.

## Wat deze versie laat zien

- Eigen dashboard voor beheerders én medewerkers, met tijdsafhankelijke begroeting en de gekozen maand duidelijk in beeld.
- Duidelijke lokale accountkeuze tussen beheerder en alle vier medewerkers. Er staat bewust geen standaardwachtwoord in de app; dit scherm wordt bij productie volledig vervangen door Google Workspace-login.
- Iedere gekozen medewerker ziet uitsluitend de eigen uren; beheerfuncties blijven verborgen.
- Echte aangeleverde namen, klanten, brokers, tarieven en factuurgegevens uit de vier bronfacturen; de standaard-e-mailadressen zijn placeholders op `@example.invalid`, maar beheerders mogen zelf ieder geldig adres invoeren.
- Afzonderlijke brokerroutering en begeleidende tekst per medewerker.
- Onbeperkte maand- en jaarselectie met afzonderlijke uren en statussen per periode. De maand opent in een eigen venster met twaalf gewone knoppen; er wordt geen native browserdropdown of wegvallende browserkalender gebruikt.
- Vorige/volgende maand werkt ook over jaargrenzen; dezelfde periode geldt in beide rollen en alle relevante menu's.
- Wijzigbare instellingen die alleen lokaal in de browser worden bewaard.
- Organisatienaam, appnaam, ondersteuning, logo en twee huisstijlkleuren zijn instelbaar; factuurvoorbeeld en interface nemen deze branding over.
- Enter slaat uren, instellingen en medewerkerformulieren op; in een tekstvak gebruikt opslaan `Ctrl+Enter`.
- Uren blijven per werkdag invulbaar. Een filter toont **Hele maand** of één gekozen week; op een telefoon opent standaard één week. Week- en maandtotalen blijven tegelijk zichtbaar.
- Iedere wijziging in daguren, verlof of ziekte wordt tussentijds lokaal opgeslagen. Alleen de volledige geselecteerde maand kan worden ingediend.
- Scheiding tussen contracturen en declarabele uren.
- Meer of minder declarabele uren dan contracturen geeft alleen een controlebericht en blokkeert indienen nooit.
- Uren indienen en door een beheerder laten goedkeuren.
- De verse voorbeeldomgeving is rijk vooraf gevuld: juni heeft een afgeronde historische verzendcontrole, juli bevat drie direct te openen bevestigde conceptfacturen en één open urencontrole, en augustus bevat concepturen, een correctieverzoek met voorbeeldtekst, ingediende uren en een factuur die klaarstaat.
- Het dashboard toont **Openstaande maanden** over alle perioden, oudste maand eerst. Een oudere maand blijft staan zolang uren, correcties, goedkeuringen of gekozen verzendroutes nog open zijn. Iedere actie selecteert eerst precies die maand; meerdere maanden worden nooit ongemerkt samen verwerkt.
- Iedere open urenkaart heeft direct de knop **Correctie vragen**. Een beheerder kan uren alleen met een verplichte eigen toelichting terugsturen; de medewerker ziet de reden bij de melding, op het dashboard en boven de urenstaat.
- Correctieverzoeken bewaren beheerder, datum, tijd, tekst en het moment van opnieuw indienen in de lokale historie.
- Uren worden altijd voor één geselecteerde maand ingediend.
- Goedkeuringen toont één centrale lijst met alle openstaande maanden, oudste eerst. Naast **Alle openstaande** verschijnen uitsluitend maandfilters waarin werkelijk een urenstaat op controle wacht; ieder filter toont het actuele aantal.
- De algemene maandkiezer staat alleen op schermen waar de gekozen maand de inhoud bestuurt. Goedkeuringen, Mededelingen en Instellingen hebben daarom geen misleidende maandkiezer.
- **Bekijk teamstatus** blijft op het dashboard. Voor beheerders opent **Details bekijken** altijd een alleen-lezen urenoverzicht; alleen medewerkers kunnen via **Mijn uren** invoer wijzigen.
- De officiële **klanturenstaat** is een apart proces met eigen periodekeuze, concept, indiening, controle, herinneringen en optionele brokerroute. De eerste e-mail loopt van medewerker naar Backoffice; na controle volgt een aparte e-mail van Backoffice naar de broker. Beide organisatiestandaarden zijn bewerkbaar en de medewerker kan zijn eigen bericht vóór indienen per maand aanpassen. PDF blijft ongewijzigd; JPG en PNG worden automatisch als één gestandaardiseerde PDF opgeslagen. De app maakt zelf geen klanturenstaat.
- **Mijn overzicht** toont de klanturenstaat als een aparte maandtaak. Ook bij goedgekeurde uren blijft duidelijk zichtbaar dat het klantdocument nog ontbreekt, als concept klaarstaat of opnieuw moet worden geüpload.
- Met **Al rechtstreeks gemaild** kan een medewerker de klanturenstaat afronden wanneer deze buiten de app naar Path Backoffice is gestuurd. Een verplichte reden, medewerker en tijdstip worden bewaard. Backoffice ziet deze gegevens in de maanddetails; de taak verdwijnt uit de open werkvoorraad maar blijft in de historie zichtbaar. **Alsnog uploaden** draait de registratie terug.
- Het beheerdersdashboard heeft één **Werkvoorraad over alle maanden**. Urencontroles, klanturenstaten en verzendcontroles worden per maand gebundeld, oudste maand eerst. Iedere categorie heeft een directe knop die automatisch de juiste maand en lijst opent.
- Op het accountscherm zijn de native browserdropdowns vervangen door eigen accountmenu’s. Een account kiezen opent direct de juiste beheerders- of medewerkersrol; de grote rolknoppen openen het reeds gekozen account.
- Pas **Indienen bij Backoffice** maakt een in-app melding voor Backoffice. **Concept opslaan** en **Indienen bij Backoffice** worden direct actief zodra een geldig bestand is gekozen. Bij een goedgekeurde of al ingediende maand legt een zichtbare melding uit waarom de knoppen geblokkeerd zijn. Medewerker en Backoffice kunnen de opgeslagen PDF bekijken; na goedkeuring kan Backoffice onderwerp en begeleidende brokertekst nog aanpassen.
- Goedgekeurde facturen klaarzetten en de verzendroutes controleren zonder e-mail te versturen.
- Salarisadministratie loopt mee via het gewone **Mailvoorbeeld** en **Maandverzending controleren**. Er is geen apart scherm, geen vaste EasySalary-knop en geen aparte bulkknop. **EasySalary** is alleen de ingestelde Path-voorbeeldnaam.
- Broker, boekhouding, salarisadministratie en eventuele extra ontvangers worden als gescheiden configureerbare routes behandeld; CC/BCC wordt niet gebruikt om verschillende gegevensstromen te combineren.
- De begeleidende tekst bevat medewerker, maand en de daadwerkelijk goedgekeurde uren. De broker en boekhouder krijgen standaard de factuur; EasySalary standaard geen bijlage. Een urenstaat wordt niet toegevoegd.
- Boekhouder, salarisadministratie en extra ontvangers worden centraal bewaard. Een nieuwe vaste ontvanger kan direct tijdens **Medewerker toevoegen** worden aangemaakt of later onder **Instellingen** worden beheerd. Zelf aangemaakte extra ontvangers kunnen na een waarschuwing ook definitief worden verwijderd; uren- en factuurhistorie blijft behouden.
- Per medewerker is met vinkjes instelbaar of de broker en iedere centrale ontvanger een mail krijgen en of die ontvanger de factuur als PDF-bijlage ontvangt.
- De bevestigde ItaQ- en Circle8-factuuradressen zijn exact uit de aangeleverde facturen ingevuld. Voor Shawn blijven ook overeenkomstnummer, crediteurennummer en nummer opdrachtuitvoerder op de factuur bewaard.
- **Factuurnummer: [nummer]** staat als één witte regel in de factuurkop. De nummers gebruiken koppeltekens zonder spaties. Per medewerker blijft het vaste patroon gelijk; bij een nieuwe periode veranderen automatisch alleen de maand en het jaar.
- Een nieuw aangemaakte centrale ontvanger wordt niet automatisch voor alle medewerkers geselecteerd.
- Eén knop **Maandverzending controleren** toont alle aangevinkte routes en bijlagen en rondt na bevestiging alleen de controle af. Staat nog minimaal één urenstaat open, dan toont de knop het openstaande aantal en blokkeert de app de maandcontrole. In productie volgt daarna pas **Definitief verzenden**.
- De afgeronde status heet **Verzending gecontroleerd**. Dat betekent dat alle gekozen routes zijn gecontroleerd; er is niets echt verstuurd.
- De actie bij een factuur blijft vóór en na de controle **Mailvoorbeeld** heten; de status maakt duidelijk of de verzending al is gecontroleerd.
- Iedere factuur die klaarstaat heeft een zichtbaar conceptvoorbeeld en kan als echte PDF worden gedownload. Alle facturen gebruiken dezelfde professionele Path-vormgeving met logo, donkerblauw en mintgroen. Shawn behoudt daarnaast uitsluitend op zijn eigen Circle8-factuur de drie verplichte brokerreferenties. De PDF is duidelijk gemarkeerd als niet-verzonden concept; definitieve productie-PDF's worden later server-side gemaakt.
- Mededelingen, zoals een nieuwe appversie of belangrijke wijziging, naar alle actieve medewerkers, één klantgroep of zelf gekozen medewerkers.
- Een mededeling kan eerst als concept worden opgeslagen, opnieuw worden bewerkt, geplaatst of vóór plaatsing worden verwijderd. Een concept maakt nooit meldingen of e-mailacties.
- Een gewijzigde mededeling vervangt voor medewerkers direct de vorige versie. Zij zien alleen de nieuwste tekst, zonder correctielabel of interne nummers; beheerders houden de versiehistorie intern.
- Een beheerder kan een verstuurde mededeling met een verplichte reden intrekken. De oorspronkelijke tekst verdwijnt direct uit de bel en het medewerkersarchief; de medewerker ziet alleen één algemene intrekkingsmelding met de reden.
- Een ingetrokken bericht kan achteraf worden bewerkt. Onderwerp, oorspronkelijke tekst en intrekkingsreden zijn aanpasbaar; vorige waarden, beheerder en tijdstip blijven intern bewaard.
- Met **Bij medewerkers verwijderen** verdwijnen zowel de intrekkingsmelding als het oorspronkelijke bericht uit hun lijst en bel. Beheerders houden uitsluitend de interne controlehistorie.
- Medewerkers hebben een eigen mededelingenarchief met filters voor alles, ongelezen mededelingen en intrekkingen. De bel telt daarnaast ook urenstatussen, correcties en herinneringen, zodat beide aantallen bewust van elkaar kunnen verschillen.
- Mededelingen verschijnen altijd in de app. Optioneel krijgt iedere ontvanger afzonderlijk een e-mail dat er een nieuwe melding klaarstaat; medewerkers kunnen dit in Voorkeuren uitzetten.
- Factuuroverzicht als CSV downloaden.
- Medewerkers, opdrachten, tarieven en brokers bekijken.
- Medewerkers en beheerders lokaal toevoegen, aanpassen, deactiveren en opnieuw activeren zonder historie te verwijderen.
- Profielmenu met lokale profielfoto, lichte modus, donkere modus en automatische systeemmodus.
- Meldingenvenster met rolgebonden mededelingen, urenstatussen en een duidelijke lege toestand.
- Configureerbare herinneringsplanning: standaard vrijdag 15:00 bij een onvolledige week, laatste werkdag 15:00 bij een niet-ingediende maand, eerste werkdag 09:00 voor achterstand en eerste werkdag 10:00 voor wachtende goedkeuring. Iedere regel en geplande herinneringen per medewerker kunnen worden uitgezet.
- Een toekomstige lege maand toont geen waarschuwing of actieknop. Het voortgangsblok benoemt de vier stappen direct: **Uren → Controle → Facturen → Verzending**.
- Ingebouwde hulpbot met vaste uitleg over alle functies. Een half zoekwoord toont eerst passende onderwerpkeuzes; bij een onbekende vraag vraagt de hulp eerst om één duidelijkere formulering en toont pas na een tweede mislukte poging een Gmail-concept, Outlook/standaard-mailapplink en kopieerbare mailtekst voor Path Backoffice. Het hulpgesprek blijft alleen tijdens de huidige sessie staan en kan met **Gesprek wissen** direct worden leeggemaakt.
- Configureerbare branding en responsive mobiele navigatie; de voorbeeldomgeving gebruikt het Path-logo en de Path-kleuren.
- Multi-tenant datamodel voor een MySQL-database: gebruikers, medewerkers, opdrachten, ontvangers, perioden, facturen, meldingen en auditlog zijn per organisatie gescheiden.

De standaardontvangers en accountadressen zijn veilige placeholders. Beheerders mogen echte adressen invoeren; die worden uitsluitend lokaal in de browser bewaard. Alleen `backoffice@pathconsultancy.nl` is als handmatige hulplink opgenomen. Deze lokale versie heeft geen verzendkoppeling, verstuurt zelf geen e-mail en schrijft niet naar TransIP.

## Lokale versie openen

Pak het volledige zipbestand uit en dubbelklik op de `index.html` in de hoofdmap. Kies daarna:

- **Beheerder** voor dashboard, goedkeuringen, facturen inclusief salarisadministratieroutes, mededelingen, medewerkers en instellingen.
- **Medewerker** voor het kiezen van Marc, Stasjo, Brian of Shawn en het bekijken, invullen en indienen van uitsluitend de eigen uren.

Voor ontwikkeling kan de app ook via Vite worden gestart:

```bash
npm install
npm run dev
```

Open daarna de URL die Vite in de terminal toont.

## Controles

```bash
npm run check
npm run build
```

De productie-uitvoer wordt in `dist/` geplaatst.

## Productiekoppelingen die later worden toegevoegd

1. Google Workspace-inlog voor medewerkers en beheerders.
2. Gmail API met een afgeschermde productie-afzender.
3. MySQL-database op TransIP op basis van `database/schema.sql`.
4. Server-side generatie en beveiligde opslag van definitieve factuur-PDF's; de lokale versie kan al concept-PDF's maken.
5. Beveiligde rollen: medewerker, goedkeurder en beheerder.
6. Auditlog, vergrendelde factuurnummers en herstelbare verzending.

Zie `STAMGEGEVENS-EN-PLACEHOLDERS.md` voor de veiligheidsregels van de lokale versie, `PRODUCTIE-CHECKLIST.md` voor de technische gegevens vóór ingebruikname en `PRODUCTARCHITECTUUR-v0.9.0.md` voor de route naar een verkoopbare multi-tenant dienst.
