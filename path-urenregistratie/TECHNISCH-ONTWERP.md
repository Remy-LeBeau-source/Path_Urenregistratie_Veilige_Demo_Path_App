# Technisch Ontwerp — Path Uren & Facturatie

## 1. Architectuurprincipes

1. MySQL is in AUTH/TEST/PROD de bron voor bedrijfsdata; `localStorage` bewaart daar alleen UI-voorkeuren.
2. De browser leidt geen globale telling af uit toevallig bezochte maanden.
3. Iedere schrijfactie retourneert de nieuwe serverstatus; daarna wordt de betrokken workflow opnieuw gelezen.
4. Autorisatie wordt zowel in de UI als op ieder API-endpoint afgedwongen.
5. Omgevingsconfiguratie en secrets staan buiten de documentroot en buiten Git.
6. Deployments vervangen de inhoud van een stabiele documentroot en bewaren een herstelbare rollback.

## 2. Componenten

| Laag | Verantwoordelijkheid |
|---|---|
| `index.html` / `assets/app.js` | presentatie, navigatie, lokale demomodus, serverstatus projecteren |
| `server/api/bootstrap.php` | organisatie, accounts, medewerkers, opdrachten, perioden en mailroutes |
| timesheet/customer-timesheet API's | statusovergangen en detail-readback |
| invoice/mail API's | factuurstatus, queue, dispatch en acceptatieconsole |
| MySQL | gezaghebbende records, relaties, audit en mailhistorie |
| Playwright + featurebestanden | executable specificatie en releaseblokkades |
| GitHub Actions + deployscripts | build, regressie, TEST-deploy, productiecutover en smoke |

## 3. Frontend-statusmodel

`state.records[periode][medewerker]` bevat de geprojecteerde uren-, document-, factuur- en salarisstatus. In servermodus wordt na bootstrap voor een beheerder de volledige bekende combinatie van perioden en actieve medewerkers gehydrateerd voordat de globale werkvoorraad als gezaghebbend geldt.

Belangrijke regels:

- `selectedPeriodKey` bestuurt alleen detailweergaven;
- `adminOpenTasks()` gebruikt alle gehydrateerde perioden;
- detailreads mogen één record actualiseren, maar niet ongerelateerde records verwijderen;
- `adminTaskPanelExpanded` is uitsluitend UI-status;
- rolwissel in TEST behoudt de volledige democatalogus; productie gebruikt uitsluitend serveraccounts;
- resetbediening wordt na iedere render opnieuw gekoppeld aan omgeving én rol.

## 4. Taakprojectie

Per medewerker/periode worden taken deterministisch afgeleid:

- `draft` → `hours-draft`, eigenaar medewerker;
- `correction` → `hours-correction`, eigenaar medewerker;
- `submitted` → `hours-review`, eigenaar Backoffice;
- klanturenstaat `missing|draft|resubmit` → eigenaar medewerker;
- klanturenstaat `received` → controle door Backoffice;
- klanturenstaat `approved` met brokerroute → brokercontrole door Backoffice;
- goedgekeurde/gefactureerde uren zonder volledig verzendbewijs → factuur-/verzendcontrole door Backoffice.

Taak-ID's zijn stabiel opgebouwd uit type, periode en medewerker. Hierdoor kunnen filters, tellingen en tests dezelfde actie eenduidig volgen.

## 5. Cache- en synchronisatiecontract

- Bootstrap levert de complete lijst van geldige periodekeys.
- Na beheerlogin worden uren, klanturenstaten en factuurstatussen voor alle geldige combinaties opgehaald.
- Na medewerkerlogin en bij maandwissel wordt de eigen klanturenstaat gericht opgehaald; de server
  blijft de `employee_id` aan de ingelogde medewerker koppelen en de frontend projecteert de
  `download_url` opnieuw in zowel dashboard als uploadpaneel.
- Een `found: false`-antwoord is gezaghebbend en wist een eventueel lokaal of demorecord voor die
  medewerker/periode. Iedere klanturenstaatmutatie verhoogt daarnaast een epoch per sleutel, zodat
  een eerder begonnen GET-resultaat een zojuist opgeslagen document nooit kan overschrijven.
- De hydratatie heeft één in-flight guard en een korte TTL tegen dubbele requests.
- Na hydratatie volgt één volledige render.
- Na medewerker- of beheerwrite wordt minimaal het betrokken record geforceerd herlezen.
- Een maandwissel start hoogstens een detailrefresh en verandert geen globale totalen zonder een echte serverstatuswijziging.
- Elke timesheetmutatie verhoogt een epoch per `periode + medewerker`. Een GET die vóór die mutatie
  begon, mag na de write niet meer op de record worden toegepast.
- Autosave wordt tijdens indienen gepauzeerd en hervat alleen als na de submit nog een aantoonbare
  nieuwe conceptwijziging bestaat.
- Serverpayloads worden aan de grens genormaliseerd; optionele arrays zoals announcement-
  ontvangers zijn nooit impliciet verplicht voor een volledige render.

### Klanturenstaat-bestandscontract

- Toegestane bronnen zijn PDF, JPG/JPEG en PNG, maximaal 2 MB.
- PDF-upload vereist zowel een geldige PDF-header als een eindmarkering; alleen een bestandsnaam of
  aangeleverd MIME-type is niet voldoende.
- JPG/PNG worden met GD genormaliseerd en als valide PDF-bytes onder een `.pdf` storage key bewaard.
- Afbeeldingsbreedte, -hoogte en totaal aantal pixels hebben vaste bovengrenzen vóór decode en vóór
  PDF-opbouw, zodat een klein gecomprimeerd bestand geen onbegrensd geheugen kan opeisen.
- Afbeeldingsdecode of PDF-conversie faalt gesloten met `invalid-upload`; rauwe afbeeldingsbytes
  worden nooit stil als officieel document opgeslagen en een bestaand concept wordt niet vervangen.
- De downloadendpoint blijft geautoriseerd op bedrijf, rol, medewerker en opdracht en levert een
  PDF met `Content-Type: application/pdf`, `Content-Disposition: inline`, een veilige `.pdf`-naam,
  `Cache-Control: private, no-store` en `X-Content-Type-Options: nosniff`.
- De healthcheck vereist de GD-functies die deze ondersteunde uploadroute nodig heeft; alle CI-
  regressiejobs installeren `pdo_mysql`, `gd` en `fileinfo` expliciet.
- Historische records met een niet-PDF-MIME mogen nog geautoriseerd worden bekeken, maar worden
  niet goedgekeurd of als PDF-bijlage verzonden totdat een ondersteund document opnieuw is geüpload.

### Render- en schrijfvolgorde

1. valideer rol, periode, recordversie en invoer;
2. markeer de mutatie als in-flight;
3. wacht een al lopende conceptwrite af;
4. voer precies één statuswrite uit;
5. pas response en versienummer atomisch toe;
6. forceer gerichte readback indien nodig;
7. projecteer alle vervolgacties opnieuw;
8. render teller, detailstatus en navigatie in één cyclus;
9. beëindig de in-flight guard, ook bij fout.

## 6. Mailveiligheid

- `mail.enabled`, testvenster en acceptance guard moeten alle drie passen bij de omgeving.
- TEST gebruikt `test_redirect_all` en een expliciete allowlist.
- De envelope/from-identiteit blijft Backoffice; de functionele ontvanger wordt in TEST naar de sink herschreven.
- Een factuurlock schrijft standaard drie gescheiden `email_deliveries`: `broker`, `accountant` en
  `payroll`. TEST verandert bij dispatch alleen de effectieve ontvanger; kanaal, oorspronkelijke
  ontvanger, onderwerp en attachment policy blijven auditbaar.
- De factuurlock genereert en bewaart eerst de definitieve branded server-PDF met ingebed Path-logo.
  Alleen in de volledig vrijgegeven TEST-sandbox dispatcht dezelfde gebruikersactie daarna exact de
  nieuw aangemaakte delivery-ID's. LOCAL blijft dry-run; PROD blijft queue/worker-gestuurd.
- Bijlagen worden server-side op routebeleid gevalideerd. De acceptatiestatus publiceert uitsluitend
  een veilige bestandsnaam en index. Een geautoriseerde beheerder kan met scenario + index dezelfde
  server-side gegenereerde PDF inline openen; de endpoint valideert opnieuw het routebeleid en de
  PDF, gebruikt `no-store` en accepteert nooit een clientpad of vrije bestandsnaam.
- SMTP-succes wordt pas getoond na bevestigde dispatch; fouten blijven met pogingenteller in `email_deliveries`.
- Databasetijden zonder tijdzone worden als reeds lokale servertijd weergegeven en krijgen niet nogmaals
  de Amsterdam-offset; expliciete ISO-tijden worden wel naar `Europe/Amsterdam` omgerekend.

### Wachtwoordbeheer

- `force_password_change` is uitsluitend beschikbaar voor een beheerder binnen hetzelfde bedrijf.
- De API weigert het eigen account en de UI toont de actie alleen bij andere actieve serveraccounts.
- Een nieuwe reset maakt eerdere ongebruikte tokens ongeldig, zet de resetverplichting en queue't een
  link die twee uur geldig en eenmaal bruikbaar is.
- Een beheerder leest of kiest nooit het wachtwoord van een andere gebruiker.

## 7. Teststrategie en traceerbaarheid

Iedere featurecase heeft een unieke ID en verwijst via het stepbestand naar een Playwright-test. Kritieke ketens gebruiken echte statusovergangen of deterministische API-mocks, nooit uitsluitend zichtbaarheid van losse componenten.

Gebruikte testtechnieken:

- toestandsovergang: uren, klanturenstaat, factuur en mail;
- beslissingstabellen: rollen, verwijderbaarheid, bijlagen en mailomgevingen;
- equivalentieklassen en grenswaarden: uren, wachtwoorden, retry en datum/periode;
- pairwise: rol × omgeving × actie;
- use-case/ketentest: medewerker → Backoffice → medewerker → Backoffice;
- regressie-invariant: sommen en taak-ID's vóór/na maand- en rolwissel;
- negatieve autorisatie: medewerker op beheer/reset/mail-endpoints;
- herstelbaarheid: reset en deploymentrollback.

De GUI-smoke bevat de kortste complete bedrijfsketen. De volledige regressie bevat daarnaast foutpaden, concurrency, grenzen, toegankelijkheid, mobiel en servercontracten.

### Dry-run betekent niet hetzelfde op elke omgeving

`auth_password_reset_public_response()` zet `dry_run` op `!$realDelivery`. Lokaal en op test staat
daar een echt token bij, als vervanging voor een mail die daar niet aankomt. **Productie meldt óók
`dry_run`** — echte SMTP-verzending staat daar bewust uit — maar geeft geen token terug, en maakt er
zelfs geen aan zolang verzending niet beschikbaar is.

Een frontend die eerst op `dry_run` test, laat daardoor op productie ontwikkelaarsjargon zien aan
iemand die zijn wachtwoord kwijt is. De juiste conditie is `dry_run && token`: praat pas over een
token als er er een is. Wie een omgevingsvlag in de UI gebruikt, moet nagaan wat die vlag op
productie betekent, niet alleen wat hij lokaal doet.

### Identiteit komt uit de sessie, niet uit de catalogus

De demo-hosts (localhost en `uren-test`) houden de volledige demo-catalogus bewust in stand. De
koppeling van het getoonde profiel aan de ingelogde gebruiker liep echter alleen wanneer de
servercatalogus leidend was, dus juist op die hosts niet. De selectie bleef daardoor wijzen naar het
standaard gekozen demo-account: inloggen als Marc leverde `Stasjo van Bakel` op.

Twee regels gelden nu. Ten eerste volgt het profiel op **elke** omgeving de ingelogde sessie,
gekoppeld op `dbUserId` met het sessie-e-mailadres als terugval, en wordt alleen opnieuw gekoppeld
wanneer de ingelogde gebruiker wijzigt — anders zou een achtergrondverversing een bewuste rolwissel
op TEST ongedaan maken. Ten tweede mag een terugval nooit een andere persoon opleveren:
`currentEmployee()` pakt bij een onbekend id de eerste actieve medewerker, en zo werd "onbekend"
andermans naam. `profileForRole()` vergelijkt het profiel daarom met de sessie en gebruikt bij
verschil de naam uit de sessie. Geen naam is acceptabel, de verkeerde naam niet.

### Welke begeleidende tekst een ontvanger krijgt

Eén regel, voor iedere ontvanger:

1. de tekst die bij díe ontvanger is ingevuld — die wint
2. anders de standaardtekst van zijn soort

Meer lagen zijn er niet. Hier stond eerder een tussenstap: "de tekst bij de opdracht", die iedereen
erfde behalve de boekhouder en de salarisadministratie. Dat was de bron van een reeks fouten. Die
tekst is namelijk aan de bróker geschreven ("Hierbij stuur ik de ureninformatie van...") en las bij
een andere ontvanger als een bericht aan de verkeerde persoon. De uitzondering die dat repareerde
maakte het instellingenscherm onnavolgbaar: per rij gold een andere regel, en er stonden drie
verschillende zinnen door elkaar over wat een leeg veld betekent.

De opdrachttekst is daarom geen aparte laag meer maar wat hij altijd al was: **de eigen tekst van de
broker**. Alleen die leest hem nog. In het medewerkersscherm staat hij dan ook in de rij van de
broker, met dezelfde twee velden als iedere andere ontvanger.

De standaardteksten per soort staan in `server/mail/templates.php` en zijn **aanpasbaar** bij
Instellingen → Teksten. Een aangepaste tekst komt in `mail_channel_templates` (bedrijf + kanaal).
Ontbreekt die rij, dan geldt de meegeleverde tekst uit `templates.php`. Dat is een bewuste keuze:
wie niets aanpast loopt mee met verbeteringen aan de meegeleverde teksten, en wie wel aanpast houdt
zijn eigen tekst.

Daaruit volgt een val die niet aan de uitkomst te zien is. Het instellingenscherm stuurt bij iedere
keer opslaan alle vier de kanalen mee, gevuld met wat er op dat moment geldt. Zonder vergelijking met
de meegeleverde tekst zou iemand die deze velden nooit aanraakt ze tóch als eigen tekst vastleggen —
en daarna niet meer meelopen met verbeteringen, zonder ooit iets te hebben gedaan. `settings.php`
verwijdert de rij daarom zodra de ingestuurde tekst leeg is óf gelijk aan de meegeleverde.

Een test die alleen naar de uitkomst kijkt vangt dat niet: de tekst is immers identiek. Daarom meldt
`bootstrap.php` apart welke kanalen werkelijk een eigen rij hebben (`mail_channel_customised`), en
kijken zowel het scherm als `E2E-H-011` daarnaar in plaats van naar de tekst zelf.

Let op bij het toevoegen van een kanaal: `mail_assert_vars()` laat de verzending falen op een
variabele die niet bestaat. Een tekstveld zonder die controle kan dus de facturatie blokkeren.

### Een bedieningselement dat niets doet

`include_invoice_pdf` werd voor een ontvanger van het type Overig genegeerd: `queue.php` zette
`$attachPolicy = 'none'` ongeacht het vinkje. Het vinkje werd wel opgeslagen en bleef aangevinkt
staan, dus het scherm toonde een instelling die niets deed. Zoiets merk je pas wanneer de ontvanger
belt dat de factuur ontbreekt.

Overig volgt nu het vinkje. De salarisadministratie houdt haar uitzondering — die krijgt bewust nooit
bedragen — maar daar wordt het vinkje niet meer aangeboden: het staat uitgeschakeld met de reden
erbij. Een dood vinkje aanbieden is net zo misleidend als een genegeerd vinkje.

Dit is dezelfde regel als bij `Goedkeuring verplicht` en `Factuurnummer vastzetten` hieronder: een
schakelaar die de server negeert hoort niet in het scherm te staan.

### Instellingen die de server niet kent

Niet elk veld in Instellingen heeft een serverkolom. `settings.php` bewaart de bedrijfsidentiteit,
de branding, de betalingstermijn en de klanturenstaat-herinnering. De overige
herinneringsinstellingen (week, maandeinde, achterstand, goedkeuring) bestaan alleen in de browser en
worden door geen enkele serverplanning uitgevoerd — er is namelijk geen scheduler. Het scherm is
daarop eerlijk gelabeld als `Voorbereiding · niet automatisch`. Wie die planning alsnog bouwt, moet
dus twee dingen doen: de kolommen toevoegen én de uitvoering, niet alleen de uitvoering.

Een bedieningselement dat niets doet is erger dan een ontbrekend bedieningselement: het wekt de
indruk dat er iets is ingesteld. `Goedkeuring verplicht`, `Factuurnummer vastzetten` en
`Auditlog bijhouden` waren zulke schakelaars — de server dwingt die regels altijd af en negeerde de
waarden volledig. Ze zijn vervangen door een read-only lijst. Een veiligheidsregel die altijd geldt,
hoort geen uitschakelaar te krijgen alleen omdat er ruimte voor is in de UI.

Een API-case die zijn payload uit de bestaande waarden opbouwt (`iban: company.iban || '...'`) bewijst
niet dat een veld bewaard blijft — hij slaagt ook als het veld nooit wordt opgeslagen. Waar een
formulier de enige route van de gebruiker is, moet minstens één case dat formulier zelf gebruiken:
invullen, opslaan, herladen, terugcontroleren. Een case die de shared settings-rij wijzigt zet de
oorspronkelijke waarden in een `finally` terug, anders lopen latere cases tegen testwaarden aan.

Formulieren die uit `state` worden gevuld, horen bij elke render opnieuw gevuld te worden. Wordt dat
maar één keer bij het opstarten gedaan, dan staat er verouderde data op het scherm zodra de
server-bootstrap later binnenkomt — en verstuurt een opslagactie die verouderde data terug. Het
opnieuw vullen mag nooit gebeuren terwijl een veld in dat formulier focus heeft.

De mobiele suite draait apart op `mobile-chrome` (Pixel 7) en `mobile-safari` (iPhone 13) en voert
uitsluitend `mobile-ui.spec.ts` uit. Elk mobiel scherm dat een medewerker realistisch op een telefoon
opent, hoort daar een case te hebben — inclusief de eenmalige schermen buiten de dagelijkse keten,
zoals het instellen van een wachtwoord via een uitnodiging. Twee bewakingen keren in vrijwel elke
mobiele case terug: de pagina mag niet zijwaarts scrollen, en tikdoelen zijn minimaal 40px hoog.

Een mobiele case mockt de endpoints die niet tot zijn onderwerp horen. Een ongemockte leesactie kan
met de verse sessie racen en een 401 in de console loggen, wat de case rood maakt om een reden die
niets met het geteste scherm te maken heeft. Dat is een testrace, geen applicatiefout — maar het
onderscheid is alleen betrouwbaar te maken als de niet-relevante endpoints vastliggen.

### Testlagen

| Laag | Bewijst | Mag niet vervangen worden door |
|---|---|---|
| statische contractcheck | configuratie, syntax, fail-closed defaults | alleen handmatige inspectie |
| API/DB-integratie | echte statusovergang, versie, autorisatie en audit | uitsluitend UI-mocks |
| browsercomponent | zichtbaarheid, locks, validatie en navigatie | losse DOM-snapshots |
| ketentest | eigenaar- en taakoverdracht tussen rollen | vijf geïsoleerde happy-flowtests |
| TEST-host smoke | vhost, echte config, aparte DB en veilige sink | localhostresultaten |
| menselijke acceptatie | ontvangen mail, leesbare PDF en werkproces | technische SMTP-acceptatie |

De ketentests voeren bedrijfsstappen in de natuurlijke volgorde uit. Zij controleren na iedere write
minimaal status, eigenaar/vervolgtaak, globale sommen en zichtbare actie. Een test die alleen de
eindstatus controleert is voor een bedrijfskritieke overgang onvoldoende.

Voor meldingen is de serverlijst gezaghebbend. De vaste LOCAL/TEST-baseline bevat voor Stasjo drie
ongelezen mededelingen. `NOT-H-011` leest deze via de echte API en bewijst na iedere individuele
leeswrite dat belbadge, mededelingenfilter en persoonlijke lijst atomisch dezelfde reeks
`3 → 2 → 1 → 0` tonen. Bij auth-login wordt de lokale demo-notificatieprojectie vóór de eerste
app-render geleegd, zodat `15`/`10` nooit als tijdelijke serverwaarheid zichtbaar worden. Een
mock-only tellertest is hiervoor niet voldoende.

Die lagen zijn sinds 0.9.136 ook los te draaien, en het voorvoegsel van het casenummer bepaalt in
welke laag een case valt:

| Laag | Draai je met | Cases |
| --- | --- | --- |
| DB | `npm run test:db:crud` | `DB-*` |
| API | `npm run test:e2e:group:api` | `AUTH-`, `SEC-`, `ROLE-`, `TS-API-`, `CTS-API-` |
| E2E | `npm run test:e2e:group:e2e` | `E2E-*` |
| UI | `npm run test:e2e:group:ui`, `:ui-mobile` | `DASH-`, `INV-`, `MOB-` |

Loopt een nieuwe case de volledige keten door -- uren indienen, goedkeuren, factureren, mail -- dan
krijgt hij `E2E-`. Drie cases zijn daarom hernoemd; de omzettabel staat in `TESTCOMMANDOS.md`,
zodat oude nummers in eerdere testverslagen terugvindbaar blijven.

De expliciete ketenspecificatie `end-to-end-workflows.feature` wordt uit
`business-workflows-e2e.spec.ts` gegenereerd. De eerste releaseblokkades bewijzen: (1) stabiele
12/7/5-herstelbasis bij maand- en filterwissels, (2) rolwissel en autorisatie zonder F5 en (3)
correctieherindiening waarbij dezelfde open actie van medewerker naar Backoffice verhuist zonder dat
het globale totaal verandert.

### Omgevingspariteit

`seed-demo-data.sql`, demo-alignments, browserdemo en TEST-reset beschrijven dezelfde basis van
12 acties (7 Backoffice, 5 medewerkers). Een regressietest vergelijkt niet alleen een hardcoded
responseveld, maar ook de werkelijke geprojecteerde taakregels. Verschillen zijn alleen toegestaan
voor URL, sessiecookie, secrets, database-instantie, resettransport en mailtransport.

De publieke TEST-reset gebruikt de canonieke rolhashes uit migraties 004/005 en bewaart uitsluitend
de twee echte mailacceptatieaccounts. Lokale en CI-resets bewaren juist hun tijdelijk gegenereerde
demo-wachtwoorden. De destructieve remote variant is alleen beschikbaar bij de exacte combinatie
van raw omgeving `test`, origin `https://uren-test.pathconsultancy.nl`, databasehost
`pathco-urentest.db.transip.me`, poort `3306`, database `pathco_Urentest`, gebruiker
`pathco_UrenTestUser` en private root `/data/sites/web/pathconsultancynl/private/path-uren-test`;
zowel de ruwe configuratie als de effectieve database na eventuele omgevingsvariabelen moet hieraan
voldoen. Een afwijking valt vóór iedere write gesloten uit. Beide acceptatieaccounts moeten vóór de reset
een bestaande credential hebben. Alle zes canonieke demoaccounts worden binnen dezelfde
databasetransactie en vóór commit geverifieerd. Een fout bij de daaropvolgende documentopbouw wordt
expliciet als post-commit mutatie gerapporteerd.

## 8. Releasecontract

Een release mag pas door wanneer:

1. syntax/static checks groen zijn;
2. database- en API-contracttests groen zijn;
3. GUI-smoke met de hoofdketen groen is;
4. volledige Playwright-regressie groen is;
5. omgevingspreflight groen is;
6. na backup en migratie de vaste TEST-baseline plus alle zes demo-logincontracten vóór cutover
   zijn hersteld en geverifieerd;
7. deploychecksum en versie overeenkomen;
8. publieke health- en login-smoke groen zijn, inclusief een nieuwe beheerder- én medewerkerlogin
   na de gedeelde reset;
9. bij fout automatisch de vorige inhoud naar dezelfde stabiele documentroot wordt teruggezet.

Wijzigingen aan bedrijfslogica vereisen in dezelfde commit een update van FO/TO, featurecase en uitvoerbare assertion.

# Medewerkerwerkvoorraad volgt thema-oppervlakken (0.9.154)

De open-maandenkaart gebruikte vaste witte gradients en vaste lichte randkleuren. In donkere modus
werden de teksttokens wel licht, waardoor titel, toelichting en maandregels vrijwel wit op wit
verschenen. De kaart, maandregels, uitklapbody, hoverkleur, scheidingslijnen en chevron gebruiken nu
de bestaande thema-oppervlakken (`--vlak`, `--vlak-zacht`, `--green-light`, `--line` en
`--navy-tekst`). `DASH-H-003` meet in een echte browser het berekende contrast van de kaarttitel en
een maandregel en blokkeert de release onder 4,5:1.
# Fail-closed TEST-mailschakelaar

De bron van waarheid blijft `server/config.local.php`. De webinterface kan uitsluitend op de exacte TEST-origin een reeds volledig geconfigureerde SMTP-sandbox pauzeren of hervatten. Dit gebeurt met een bestand `test-mail-paused.flag` in de private opslag buiten de webroot. De schakelactie vereist een administratorsessie, CSRF en de expliciete bevestiging `SET_TEST_MAIL_STATE`. De endpoint retourneert `mail_mode`, `delivery_allowed`, `test_toggle_available` en het vaste sink-adres. LOCAL en PROD kunnen deze schakelactie niet uitvoeren.

Op loopbackhosts is daarnaast een afzonderlijke lokale previewmodus beschikbaar. De UI-keuze staat
onder `path-local-mail-preview-enabled` in `localStorage` en is geen transportconfiguratie. De server
staat preview uitsluitend toe bij `environment=local`, een loopbackhost en uitgeschakelde echte
mail. `mail-acceptance.php` retourneert dan `preview_only=true`; POST maakt alleen een droge
queue-/previewregistratie en opent geen netwerkverbinding. De frontend presenteert in LOCAL
`giovanno.maatsen@pathconsultancy.nl` uitsluitend als gesimuleerde TEST-aflevering naast de
ongewijzigde productieroute; dit adres wordt niet als lokaal SMTP-doel gebruikt. TEST gebruikt nooit deze browserkeuze en
PROD toont uitsluitend status. `EQ-H-025` bewaakt badge- en instellingenbediening, onderwerp, tekst,
PDF-links en de geen-SMTP-grens; `mail-acceptance-policy-check.php` bewijst daarnaast nul writes en
nul netwerkverbindingen tijdens de beleidscontrole.

# Beveiligingsmail wordt verzonden, niet alleen klaargezet

Iedere wachtrij-route (`invoices.php`, `customer-timesheets.php`, `email-queue.php` en de
acceptatieconsole) roept na het klaarzetten `mail_dispatch_created()` aan. `auth_create_password_reset()`
deed dat als enige niet en wachtte daarmee op een cronjob die op TEST niet draait; herstel- en
uitnodigingsmails bleven daardoor met `status = queued` en `attempt_count = 0` staan. De verzendstap
staat nu in de gedeelde functie, zodat herstel, uitnodiging en de resetlink vanuit Teambeheer
dezelfde route volgen. Verzenden gebeurt ná de commit, zodat SMTP nooit binnen een transactie wordt
geopend, en een mislukte verzending laat een al uitgegeven token intact: de levering blijft met
foutmelding in de wachtrij staan. Productie blijft wachtrij-only; de guard in
`mail_dispatch_created()` staat directe verzending uitsluitend toe in de afgeschermde TEST-sandbox.
`PWD-H-012` bewaakt de aanroep, de plaats ná de commit en de token-behoudende foutafhandeling.

# Mededelingen zonder mbstring-afhankelijkheid en met opruimbare concepten

`announcements.php` kapte de notificatietekst af met een directe `mb_substr()`-aanroep. Op een
PHP-installatie zonder de `mbstring`-extensie liep de hele verzendactie daardoor stuk op
`Call to undefined function`; mededelingen versturen was dan volledig onmogelijk.
`announcement_truncate()` gebruikt `mb_substr()` waar beschikbaar en valt anders terug op een
UTF-8-bewuste regex, zodat een meerbyte-teken nooit halverwege wordt afgekapt — dezelfde
guard-aanpak die `simple_pdf.php` al hanteerde voor `mb_convert_encoding()`.

Een concept verwijderen wiste bovendien alleen de `announcements`-rij, terwijl
`announcement_recipients` en `notifications` foreign keys houden. De aanroeper kreeg daardoor een
onafgevangen `PDOException` als HTTP 500 mét stacktrace en er werd niets verwijderd. De actie ruimt
nu eerst de gekoppelde ontvangers en meldingen op, binnen één transactie, en beantwoordt een fout
met een generieke melding terwijl de oorzaak naar het serverlog gaat. Beide regressies staan in de
smoke-test en in `ANN-H-002`.

# Factuurnummer: {klant} wordt de klantnaam, server en browser identiek

`formatInvoiceNumber()` (browser) en `invoices_apply_template()` (server) vulden alleen `{jaar}` en
`{maand}` in. Een opdracht zonder eigen sjabloon viel in de browser terug op `"{klant}-{jaar}-{maand}"`
terwijl de server voor datzelfde geval `INV-{jaar}-{maand}` gebruikte; het `{klant}`-token belandde
zo letterlijk op de PDF en e-mail en PDF toonden verschillende nummers.

Beide kanten hebben nu een `invoiceNumberToken()` / `invoices_number_token()`: de klantnaam
gestript tot `[A-Za-z0-9]`, met `Klant` als terugval. `invoices_apply_template()` en
`invoices_allocate_number()` krijgen de klantnaam mee; de lock-query in `invoices.php` joint
`counterparties` voor `client_name`. De client-side standaard is gelijkgetrokken naar
`INV-{jaar}-{maand}`. `invoices_allocate_number()` blijft de basis met een numerieke suffix
uniek maken. `smoke-test.mjs` controleert de `{klant}`-resolutie; `TEST-E2E-30` bewaakt de
uniciteit bij een gedeeld sjabloon.

# {broker}-token in mailteksten — en de HY093-valkuil bij herhaalde placeholders

De hulptekst bij *Eigen onderwerp/tekst* noemt `{broker}`, maar `mail_render()` kreeg die sleutel
nooit: `mail_enqueue_for_invoice()` bouwt `$vars` en `broker` ontbrak. Het token bleef letterlijk
in de verzonden mail staan. Opgelost met een `LEFT JOIN counterparties cp_broker` in de factuur-
laadquery (`COALESCE(NULLIF(cp_broker.trade_name, ''), cp_broker.legal_name) AS broker_name`) en
`'broker' => (string)($inv['broker_name'] ?? '')` in `$vars`.

Die join introduceerde eerst een **tweede** `:company_id` naast die van de `cp_client`-join. De
PDO-verbinding draait met **echte prepares** (`ATTR_EMULATE_PREPARES = false`); MySQL weigert dan
een benoemde placeholder die twee keer in dezelfde query voorkomt met `SQLSTATE[HY093] Invalid
parameter number`. Gevolg: élke factuurmail (`mail_enqueue_for_invoice`) faalde en pipeline
`29acf2a` (0.9.147) viel om op Validate-shards 1/2/4 — 0.9.147 is nooit gedeployd. De drie plekken
met het bedrijfs-id heten nu `:company_id`, `:company_id2` en `:company_id3` en worden alle drie
los gebonden in `execute()`. `smoke-test.mjs` controleert dat de factuur-laadquery `:company_id`
(zonder cijfer erachter) hooguit één keer bevat.

# Company-telefoonnummer gecorrigeerd met een idempotente migratie

`0646328283` moest `0646328286` zijn. Seed (`database/seed-demo-data.sql`), `provision-company.php`,
de app-default in `assets/app.js` en de betrokken tests zijn bijgewerkt. Voor al gedeployde
omgevingen zet migratie `026_company_invoice_phone_fix.sql` exact die ene waarde recht
(`UPDATE companies SET invoice_phone = '0646328286' WHERE invoice_phone = '0646328283'`), veilig
herhaalbaar en geregistreerd in `migrate.php`.

# Acceptatiemail hangt de echte factuur-PDF aan wanneer die bestaat

`mail_acceptance_test_attachments()` genereerde altijd een server-document dat er anders uitzag dan
een echte factuur, wat steeds tot de vraag "waarom is factuur X kapot" leidde. `mail_acceptance_
business_snapshot()` geeft nu ook `pdf_storage_key` terug; `mail_acceptance_real_invoice_attachment()`
haalt de opgeslagen PDF van de laatst verzonden factuur van schijf (via `mail_storage_path()`).
Bestaat die, dan gebruikt de acceptatiemail díe bytes voor de Factuur-bijlage — alleen met een
`ACCEPTATIETEST-NIET-BOEKEN-`-bestandsnaam en het NIET-BOEKEN-onderwerp. Zonder verzonden factuur,
of zonder leesbaar bestand, valt het terug op het gegenereerde branded NIET-BOEKEN-document.
`mail_acceptance_test_attachments()` krijgt hiervoor `array $config`; call sites in `dispatch.php`
en `api/mail-acceptance.php` geven `$config` mee, de offline `mail-acceptance-policy-check.php`
blijft op het gegenereerde document.

# CI: de Playwright-suite draait gesharded, zonder dekkingsverlies

De volledige suite draait serieel (`workers: 1`, gedeelde DB + PHP-dev-server met de fingerprint-
isolatiefixture). In `release-pipeline.yml` hebben de jobs `Validate` en `Promote Test` nu
`strategy.matrix.shard: [1,2,3,4]`, elk met een eigen `mysql:8.0`-service en `php -S`, en draaien
`npm run test:e2e -- --shard=<n>/4`. Alle tests blijven draaien; `npm run check` draait nog maar op
shard 1. Wanneer een externe stage-URL is geconfigureerd (`vars.PATH_APP_BASE_URL`) draait alleen
shard 1 de suite tegen die gedeelde database. Verwachte doorlooptijd naar TEST: ~50 → ~20 min.

# Guard: geen platte fallback-factuur in de TEST-regressie

`smoke-test.mjs` (in `npm run check`) faalt de build als een bestand onder `tests/remote/` een
factuur vergrendelt via `action:'lock'` zonder `concept_pdf_base64` binnen 600 tekens. Zonder de
jsPDF-conceptfactuur valt de server terug op de platte `simple_pdf`-tekstfactuur, en op de LIVE
TEST-site met echte mail ging die dan als bijlage de deur uit. Alle afrondingen in `tests/remote/`
lopen via `finaliseViaConceptUpload()` / `guiFinaliseInvoice()`.

# Installatiebanner: knop zichtbaar

Het inline SW-registratie-/installatiebanner-script in `index.html` werd door de
`script-src 'self'`-CSP stil geblokkeerd op TEST/PROD; het is verplaatst naar
`assets/pwa-install.js`. Daardoor verscheen de banner voor het eerst op TEST en
kwam een pre-existing CSS-fout boven: `#install-banner-accept` had alleen
`.button` (geen vulkleur) en viel weg op de donkere balk. De knop heeft nu
`button button-primary`; `smoke-test.mjs` eist een gevulde knopvariant.

# E2E-H-025 uit quarantaine (0.9.149)

De case stond op `test.skip` om drie losse fragiliteiten; alle drie nu opgelost:
1. **Render-race.** De standaardtekstenlijst wordt door twee renderpaden
   opgebouwd (`renderAll()` en het opnieuw vullen van het instellingenformulier,
   beide via `renderMailChannelTemplates()`). Vuurde er een terwijl je in een
   veld typte, dan verving `innerHTML` je invoer door de serverstand en ging die
   oude waarde mee bij opslaan. `renderMailChannelTemplates()` slaat de herbouw nu
   over zolang de lijst er staat én de cursor er middenin zit
   (`doel.contains(document.activeElement)`) -- alleen deze lijst, niet het hele
   formulier (`renderAll` blijft `populateSettings()` onvoorwaardelijk doen).
2. **Goedkeuring via de GUI-knop.** `ketenTotFactuur()` keurt nu goed via
   `timesheets.php` (`action: 'approve'` + `expected_version`) in plaats van de
   knop, die onder CI-datacontentie soms `correction` opleverde.
3. **Cleanup-lek.** `test_reset_shared_baseline()` (`server/lib/test-reset.php`)
   wist nu ook `mail_channel_templates`. De demo-seed maakt daar nooit een rij, dus
   een half afgebroken run die een kanaal had aangepast gaf baseline-drift op die
   tabel; na de reset is hij weer leeg, gelijk aan de baseline.

# Live TEST-regressie: deterministische goedkeuring voor data-integriteitscases

`tests/remote/_helpers.ts` heeft `apiApprove(request, period, employeeId)`: leest
de urenstaat, eist status `submitted`, keurt via `timesheets.php` goed met de
juiste `expected_version`. Data-integriteitscases (`TEST-E2E-27`, `-30`)
gebruiken die i.p.v. de GUI-knop, die voor een vers aangemaakte medewerker in
een lus soms de goedkeurrij niet toont. State-machine-cases draaien bovendien op
verse `createDemoEmployee`-medewerkers, omdat `creds.employee` (stasjo) binnen
één spec-bestand al door een eerdere case gefactureerd kan zijn.

# Acceptatiemail: alleen een echte factuur-PDF spiegelen

`mail_acceptance_real_invoice_attachment()` pakte de opgeslagen PDF van de laatst
verzonden factuur. Na een `resetSharedBaseline` hangen de geseede
baseline-facturen echter een leeg placeholderdocument uit `test-reset.php`
("PATH CONSULTANCY . TESTDOCUMENT"); dat belandde zo als "factuur" in de
acceptatiemail. De functie eist nu dat de bytes een jsPDF-conceptfactuur zijn
(`/Producer (jsPDF`) of een fors branded serverdocument (>= 20 kB), en weigert
alles met de marker `TESTDOCUMENT`. Zonder echte factuur valt de acceptatiemail
terug op het gegenereerde branded NIET-BOEKEN-document met nummer, medewerker,
uren en bedragen. `smoke-test.mjs` bewaakt de marker-check.

# Productiemail: afgeschermde pilotstand (0.9.154)

Productiemail heeft de expliciete standen `disabled`, `pilot` en `live`;
`mail.enabled=true` is op zichzelf niet meer voldoende. In `pilot` controleert
de server iedere primaire ontvanger en CC exact tegen `mail.allowed_recipients`.
`configure-production-mail-pilot.php` activeert of sluit deze stand atomisch en
met een letterlijke bevestiging. Daarbij worden alle TEST-schakelaars uitgezet.
De productiepreflight accepteert uitsluitend een veilige uitgeschakelde stand
of een volledig geldige actieve pilot/live-policy.
