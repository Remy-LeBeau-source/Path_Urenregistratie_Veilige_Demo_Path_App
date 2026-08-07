# Veilige demo en placeholders - versie 0.8.7

Deze versie bevat de aangeleverde medewerkers, klanten, brokers, tarieven en factuurgegevens. Alleen e-mailadressen zijn bewust vervangen door onbestelbare placeholders.

## Veiligheidsregels

- De standaard account-, broker-, boekhouder-, salaris- en afzenderadressen eindigen op `@example.invalid`.
- Een beheerder mag zelf ieder syntactisch geldig e-mailadres invoeren, waaronder interne `@pathconsultancy.nl`-adressen.
- Ingevoerde adressen worden alleen in de lokale browser bewaard; de demo bevat technisch geen echte verzendkoppeling.
- Alleen de handmatige hulplink gebruikt het bevestigde adres `backoffice@pathconsultancy.nl`; de app verstuurt daar nooit automatisch iets naartoe.
- Alleen tekst die geen syntactisch geldig e-mailadres is, wordt geweigerd.
- Er bestaat geen Gmail- of andere verzendkoppeling.
- De knop voor verzending voert uitsluitend een lokale verzendtest uit.
- KvK, btw, IBAN, adres, medewerkers, klanten, brokers en tarieven zijn overgenomen uit de aangeleverde gegevens.
- Wijzigingen worden alleen in de lokale browser opgeslagen.
- Met **Demo herstellen** worden alle lokale wijzigingen verwijderd.
- Een medewerker of beheerder wordt gedeactiveerd en nooit hard verwijderd; historie blijft zichtbaar en herstelbaar.

## Medewerkers

De demo gebruikt Marc de Roon, Stasjo van Bakel, Brian Hek en Shawn-Douglas Nahar. Iedere medewerker heeft afzonderlijk:

- klant en projectcode;
- broker en onbestelbaar brokeradres;
- factuurtarief;
- onderwerpregel;
- begeleidende brokertekst.

## Maanden en jaren

Iedere maand en ieder viercijferig jaar kan rechtstreeks worden gekozen. Een nog niet gebruikte periode krijgt automatisch een eigen lege urenregistratie, status en demo-factuurnummer. De gekozen periode geldt voor zowel de beheerders- als medewerkersweergave en wordt in alle relevante menu's gebruikt.

Het verschil tussen declarabele uren en contracturen is uitsluitend informatief. Zowel meer als minder uren kunnen worden ingediend. Een indienactie geldt altijd voor precies één geselecteerde maand. Het menu Goedkeuringen toont daarentegen alle openstaande maanden in één overzicht.

## Demo-inlog en toetsenbord

In het demoinlogscherm kan de beheerder of één van de vier medewerkers worden gekozen. Iedere medewerker komt in de eigen urenregistratie terecht en ziet geen beheerfuncties. Dit test de schermen en rollen; echte Google Workspace-authenticatie wordt pas in de productiefase toegevoegd.

Enter slaat een urenveld tussentijds op en gaat naar het volgende veld. In instellingen en korte bewerkvelden betekent Enter lokaal opslaan. In een meerregelig tekstvak blijft Enter een nieuwe regel en wordt `Ctrl+Enter` gebruikt om op te slaan. Indienen, goedkeuren en de verzendtest vereisen bewust een aparte klik.

## Profiel, meldingen en hulp

Iedere gekozen demo-gebruiker krijgt eigen initialen, een rolgebonden dashboard en een tijdsafhankelijke begroeting. Een lokale profielfoto en de keuze Automatisch, Licht of Donker worden alleen in deze browser bewaard.

De bel toont uitsluitend nieuwe meldingen voor de ingelogde rol en medewerker. Als er niets nieuws is, blijft het venster openen met de tekst dat er geen nieuwe meldingen zijn. De knoppen onderaan maken lokale testmeldingen; er wordt niets verstuurd.

Onder **Mededelingen** kan een beheerder bijvoorbeeld een app-update of belangrijke wijziging sturen naar alle actieve medewerkers, één klantgroep of zelf gekozen medewerkers. Iedere ontvanger krijgt altijd een eigen melding in de app. Optioneel krijgt iedere ontvanger afzonderlijk een e-mail dat er een nieuwe melding klaarstaat, maar alleen als die medewerker e-mailmeldingen aan heeft. CC en BCC worden niet gebruikt. Bij een wijziging verdwijnt de vorige versie bij medewerkers uit de bel en uit hun archief. Zij zien alleen de nieuwste tekst als gewone mededeling. De oude versie blijft uitsluitend intern voor beheerders bewaard.

Een nieuw bericht kan eerst als concept worden opgeslagen. Concepten zijn alleen zichtbaar voor beheerders en maken geen melding of e-mailtest. Een nooit verzonden concept mag worden verwijderd. Een verzonden bericht mag niet hard worden verwijderd. Intrekken vereist een eigen reden: de oorspronkelijke melding verdwijnt uit de actieve bel, dezelfde ontvangers krijgen een nieuwe intrekkingsmelding en het oude bericht blijft gemarkeerd in het medewerkersarchief. Een reeds verzonden e-mail kan niet worden teruggehaald.

Iedere medewerker heeft onder **Mededelingen** een eigen archief. Dat toont uitsluitend de actuele berichten waarvoor die medewerker ontvanger was en bevat filters voor alles, ongelezen en ingetrokken berichten. Interne versiehistorie, correctielabels en berichtnummers zijn voor medewerkers verborgen.

De hulpbot geeft vaste uitleg over alle aanwezige functies. Bij een eerste onbekende vraag vraagt de bot om één duidelijkere formulering. Alleen als ook de tweede poging onbekend blijft, maakt hij een vooraf ingevuld Gmail-concept, een link voor Outlook/de standaard mailapp en een kopieerbare mailtekst voor Path Backoffice. Beide formuleringen worden in het concept opgenomen. De gebruiker moet die mail altijd zelf controleren en verzenden. Een lokale mailapp kan vanuit de cloudbrowser niet worden gestart, maar werkt op een eigen apparaat als die als standaard mailapp is ingesteld.

## Correcties op uren

Op iedere open urenkaart staat direct **Correctie vragen**. Een beheerder kan ingediende uren niet zonder uitleg terugsturen. Het veld **Reden voor correctie** is verplicht. De medewerker ziet de volledige toelichting in de melding, op het dashboard en boven de betreffende urenstaat. Naam van de beheerder, datum, tijd, tekst en het moment van opnieuw indienen blijven lokaal in de historie bewaard.

## Vooraf klaargezette demosituaties

- Juni 2026: alle uren goedgekeurd en alle factuurverzendtests afgerond.
- Juli 2026: twee urencontroles open, één factuur klaar en één factuurverzendtest afgerond.
- Augustus 2026: één concepturenstaat, één correctieverzoek met een concrete voorbeeldtoelichting, één goedgekeurde urenstaat met factuur klaar en één ingediende urenstaat die op controle wacht.
- **Alle openstaande uren** combineert de controles uit verschillende maanden in één beheerderslijst; het maandfilter toont alleen de gekozen periode.

Met **Demo herstellen** worden deze uitgangssituaties opnieuw geladen.

## Besloten verzendroutes

- Er worden geen verschillende ontvangers via CC of BCC in één bericht gecombineerd.
- Per medewerker maakt één actie een afzonderlijk bericht voor de broker en iedere aangevinkte centrale ontvanger.
- Boekhouder, EasySalary en extra ontvangers worden één keer centraal aangemaakt bij **Instellingen**. Daarna wordt per medewerker aangevinkt wie de mail krijgt.
- Een nieuw aangemaakte ontvanger staat standaard uit bij bestaande en nieuwe medewerkers, totdat een beheerder hem bewust aanvinkt.
- Zelf aangemaakte extra ontvangers kunnen definitief worden verwijderd. Als ze bij medewerkers zijn aangevinkt, waarschuwt de app en verwijdert hij alleen die routeringskeuzes; uren en facturen blijven staan. De vaste systeemrollen Boekhouder en EasySalary kunnen wel worden gedeactiveerd, maar niet per ongeluk worden verwijderd.
- Alle ontvangers gebruiken dezelfde begeleidende basistekst met medewerker, maand en het daadwerkelijke goedgekeurde urentotaal.
- Standaard krijgt de broker de factuur, krijgt de boekhouder de factuur en krijgt EasySalary geen bijlage.
- Per medewerker en ontvanger kan een beheerder afzonderlijk aan- of uitzetten of de route actief is en of de factuur als PDF wordt toegevoegd.
- Een urenstaat wordt aan geen van de drie routes toegevoegd; het urentotaal staat in de tekst.
- Tarief, klant, broker, verlof- en ziektegegevens worden niet in het EasySalary-overzicht opgenomen.
- Een Excel- of CSV-bestand wordt alleen toegevoegd als EasySalary later expliciet een vaste importindeling verplicht stelt.
- Met één knop **Maandverzending klaarzetten** kunnen alle geselecteerde routes samen worden gestart, maar de app maakt intern per medewerker en per ontvanger afzonderlijke berichten.
- EasySalary staat niet als apart hoofdmenu-item en heeft geen aparte bulkknop; controle en maandverzending starten vanuit **Facturen**.

De standaard begeleidende tekst is:

```text
Middag,

Hierbij stuur ik de ureninformatie van {medewerker} over {maand} {jaar}.

Daadwerkelijk gewerkte uren: {uren} uur.
```

## Factuurvoorbeeld en PDF

- Een goedgekeurde urenstaat zet een conceptfactuur klaar.
- De beheerder kan de factuur in de app bekijken en als PDF downloaden.
- Alle facturen gebruiken dezelfde Path-kleuren en hetzelfde Path-logo, terwijl **QSI Consultancy** duidelijk als facturerende onderneming blijft staan.
- Het voorbeeld bevat bedrijfsgegevens, factuurnummer, datum, medewerker, maand, uren, tarief, btw en totaal.
- Het bevestigde ItaQ-factuuradres staat exact als op de bronfacturen: **Laan van ZuidHoorn 165, 2289 DD Rijswijk**.
- Het bevestigde Circle8-factuuradres staat exact als op Shawns bronfactuur: **Plettenburg-West, Fultonbaan 6, 3439 NE Nieuwegein**.
- Alleen voor Shawn staan ook **overeenkomstnummer 202636991**, **crediteurennummer 622085** en **nummer opdrachtuitvoerder 217744** op de factuur, omdat Circle8 deze aanvullende regels vereist.
- Alleen bij een later toegevoegde broker zonder volledig adres staat **Factuuradres: nog definitief bevestigen**.
- Iedere demo-PDF draagt het watermerk **CONCEPTVOORBEELD - NIET VERZONDEN**.
- In productie worden definitieve PDF's server-side gegenereerd, opgeslagen, vergrendeld en in de auditlog opgenomen.

## Factuurnummering

**Factuurnummer: [nummer]** staat als één witte regel in de factuurkop. De nummers bevatten koppeltekens en geen spaties. Path heeft bevestigd dat geen afzonderlijke doorlopende teller nodig is. Per medewerker blijft het patroon gelijk; alleen maand en jaar worden automatisch bijgewerkt:

- Marc: `IND-{jaar}-{maand}`
- Stasjo: `IND-StvB-{jaar}-{maand}`
- Brian: `COA-{jaar}-{maand}`
- Shawn: `Bel-Shawn-{jaar}-{maand}`

Voorbeeld: `Bel-Shawn-2026-juli` wordt in augustus `Bel-Shawn-2026-augustus` en in januari van het volgende jaar `Bel-Shawn-2027-januari`.

## Nog door Path definitief te bevestigen

De ontvangen facturen, medewerkers, tarieven, klantgegevens, bestaande factuurnummervoorbeelden en voorlopige mailteksten zijn al verwerkt en hoeven niet opnieuw te worden aangeleverd. Alleen dit ontbreekt nog:

1. Alleen melden als nieuwe facturen niet langer op naam van QSI Consultancy maar op naam van Path Consultancy B.V. moeten komen; zonder wijziging blijft QSI de standaard uit de ontvangen facturen.
2. Alleen nog de Circle8-aanleverroute: bevestigen of dit per e-mail of via een portaal loopt. Het factuuradres is al bevestigd.
3. Naam en e-mailadres van de boekhouder. De app zet binnen dezelfde actie per medewerker een afzonderlijk boekhoudersbericht klaar.
4. De productieaccountadressen van Gio, Joyce en de medewerkers, uiterlijk bij het aansluiten van Google Workspace.
5. Het definitieve EasySalary-adres en bevestiging dat de afzonderlijke tekstmail zonder Excel/CSV voldoende is.
6. Goedkeuring van de voorgestelde herinneringsmomenten of eigen momenten.

Een afwijkende brokerroute of andere mailtekst hoeft alleen te worden doorgegeven als die afwijkt van de reeds ingevoerde standaard.

Totdat deze punten zijn bevestigd, blijven de bijbehorende waarden voorlopige demogegevens of veilige placeholders en wordt niets automatisch verstuurd.

## Productiegegevens

Echte e-mailadressen worden pas later via een afgeschermde productieconfiguratie toegevoegd. Ze horen niet in deze demo of in de broncode. De overige aangeleverde bedrijfs- en opdrachtgegevens zijn al zichtbaar.
