[README.md](https://github.com/user-attachments/files/30806288/README.md)
# Path Uren & Facturatie

Interactieve veilige demo v0.8.7 van de uren- en facturatieapp voor Path Consultancy B.V.

## Wat deze versie laat zien

- Eigen dashboard voor beheerders én medewerkers, met tijdsafhankelijke begroeting en de gekozen maand duidelijk in beeld.
- Duidelijke demokeuze tussen beheerder en alle vier medewerkers.
- Iedere gekozen medewerker ziet uitsluitend de eigen uren; beheerfuncties blijven verborgen.
- Echte aangeleverde namen, klanten, brokers, tarieven en factuurgegevens uit de vier bronfacturen; de standaard-e-mailadressen zijn placeholders op `@example.invalid`, maar beheerders mogen zelf ieder geldig adres invoeren.
- Afzonderlijke brokerroutering en begeleidende tekst per medewerker.
- Onbeperkte maand- en jaarselectie met afzonderlijke uren en statussen per periode.
- Vorige/volgende maand werkt ook over jaargrenzen; dezelfde periode geldt in beide rollen en alle relevante menu's.
- Wijzigbare instellingen die alleen lokaal in de browser worden bewaard.
- Enter slaat uren, instellingen en medewerkerformulieren op; in een tekstvak gebruikt opslaan `Ctrl+Enter`.
- Uren invoeren per werkdag en week.
- Scheiding tussen contracturen en declarabele uren.
- Meer of minder declarabele uren dan contracturen geeft alleen een controlebericht en blokkeert indienen nooit.
- Uren indienen en door een beheerder laten goedkeuren.
- De verse demo bevat meerdere combinaties om direct te testen: juni volledig afgerond, juli met open controles, factuur klaar en verzendtest gedaan, en augustus met concepturen, een correctieverzoek met voorbeeldtekst, ingediende uren en een factuur die klaarstaat.
- Iedere open urenkaart heeft direct de knop **Correctie vragen**. Een beheerder kan uren alleen met een verplichte eigen toelichting terugsturen; de medewerker ziet de reden bij de melding, op het dashboard en boven de urenstaat.
- Correctieverzoeken bewaren beheerder, datum, tijd, tekst en het moment van opnieuw indienen in de lokale historie.
- Uren worden altijd voor één geselecteerde maand ingediend.
- Goedkeuringen tonen één centrale lijst met alle openstaande maanden, met een apart filter voor alleen de gekozen maand.
- Goedgekeurde facturen klaarzetten en de verzending veilig testen zonder e-mail te versturen.
- EasySalary-controle via **Facturen**: per medewerker één eigen bericht binnen dezelfde verzendactie; geen dubbel hoofdmenu-item en geen aparte bulkknop.
- Broker, boekhouder, EasySalary en eventuele extra ontvangers worden als gescheiden routes behandeld; CC/BCC wordt niet gebruikt om verschillende gegevensstromen te combineren.
- De begeleidende tekst bevat medewerker, maand en de daadwerkelijk goedgekeurde uren. De broker en boekhouder krijgen standaard de factuur; EasySalary standaard geen bijlage. Een urenstaat wordt niet toegevoegd.
- Boekhouder, EasySalary en extra ontvangers worden één keer centraal onder **Instellingen** aangemaakt of gedeactiveerd. Zelf aangemaakte extra ontvangers kunnen na een waarschuwing ook definitief worden verwijderd; uren- en factuurhistorie blijft behouden.
- Per medewerker is met vinkjes instelbaar of de broker en iedere centrale ontvanger een mail krijgen en of die ontvanger de factuur als PDF-bijlage ontvangt.
- De bevestigde ItaQ- en Circle8-factuuradressen zijn exact uit de aangeleverde facturen ingevuld. Voor Shawn blijven ook overeenkomstnummer, crediteurennummer en nummer opdrachtuitvoerder op de factuur bewaard.
- **Factuurnummer: [nummer]** staat als één witte regel in de factuurkop. De nummers gebruiken koppeltekens zonder spaties. Per medewerker blijft het vaste patroon gelijk; bij een nieuwe periode veranderen automatisch alleen de maand en het jaar.
- Een nieuw aangemaakte centrale ontvanger wordt niet automatisch voor alle medewerkers geselecteerd.
- Eén knop **Maandverzending klaarzetten** test na één bevestiging alle aangevinkte routes, maar houdt inhoud en ontvangers strikt gescheiden.
- Iedere factuur die klaarstaat heeft een zichtbaar conceptvoorbeeld en kan als echte PDF worden gedownload. Alle facturen gebruiken dezelfde professionele Path-vormgeving met logo, donkerblauw en mintgroen. Shawn behoudt daarnaast uitsluitend op zijn eigen Circle8-factuur de drie verplichte brokerreferenties. De PDF is duidelijk gemarkeerd als niet-verzonden concept; definitieve productie-PDF's worden later server-side gemaakt.
- Mededelingen, zoals een nieuwe appversie of belangrijke wijziging, naar alle actieve medewerkers, één klantgroep of zelf gekozen medewerkers.
- Een mededeling kan eerst als concept worden opgeslagen, opnieuw worden bewerkt, verzonden of vóór verzending worden verwijderd. Een concept maakt nooit meldingen of e-mailtests.
- Een gewijzigde mededeling vervangt voor medewerkers direct de vorige versie. Zij zien alleen de nieuwste tekst, zonder correctielabel of interne nummers; beheerders houden de versiehistorie intern.
- Een beheerder kan een verstuurde mededeling alleen met een verplichte reden intrekken. De oude melding verdwijnt uit de actieve bel, een nieuwe intrekkingsmelding verschijnt en het origineel blijft gemarkeerd in het archief.
- Medewerkers hebben een eigen mededelingenarchief met filters voor alles, ongelezen en ingetrokken berichten.
- Mededelingen verschijnen altijd in de app. Optioneel krijgt iedere ontvanger afzonderlijk een e-mail dat er een nieuwe melding klaarstaat; medewerkers kunnen dit in Voorkeuren uitzetten.
- Factuuroverzicht als CSV downloaden.
- Medewerkers, opdrachten, tarieven en brokers bekijken.
- Medewerkers en beheerders lokaal toevoegen, aanpassen, deactiveren en opnieuw activeren zonder historie te verwijderen.
- Profielmenu met lokale profielfoto, lichte modus, donkere modus en automatische systeemmodus.
- Meldingenvenster met rolgebonden meldingen, een duidelijke lege toestand en veilige testmeldingen.
- Ingebouwde hulpbot met vaste uitleg over alle functies; bij een onbekende vraag vraagt hij eerst om één duidelijkere formulering en toont pas na een tweede mislukte poging een Gmail-concept, Outlook/standaard-mailapplink en kopieerbare mailtekst voor Path Backoffice.
- Path-logo, kleuren en responsive mobiele navigatie.
- Datamodel voor een aparte MySQL-database op TransIP.

De standaardontvangers en accountadressen zijn veilige placeholders. Beheerders mogen echte adressen invoeren; die worden uitsluitend lokaal in de browser bewaard. Alleen `backoffice@pathconsultancy.nl` is als handmatige hulplink opgenomen. De demo heeft geen verzendkoppeling, verstuurt zelf geen e-mail en schrijft niet naar TransIP.

## Demo lokaal openen

Pak het volledige zipbestand uit en dubbelklik op de `index.html` in de hoofdmap. Kies daarna:

- **Beheerder** voor dashboard, goedkeuringen, facturen, EasySalary, mededelingen, medewerkers en instellingen.
- **Medewerker** voor het kiezen van Marc, Stasjo, Brian of Shawn en het bekijken, invullen en indienen van uitsluitend de eigen uren.

Voor ontwikkeling kan de demo ook via Vite worden gestart:

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
4. Server-side generatie en beveiligde opslag van definitieve factuur-PDF's; de demo kan al concept-PDF's maken.
5. Beveiligde rollen: medewerker, goedkeurder en beheerder.
6. Auditlog, vergrendelde factuurnummers en herstelbare verzending.

Zie `STAMGEGEVENS-EN-PLACEHOLDERS.md` voor de veiligheidsregels van de demo. Zie `PRODUCTIE-CHECKLIST.md` voor de technische gegevens die vóór ingebruikname nodig zijn.
