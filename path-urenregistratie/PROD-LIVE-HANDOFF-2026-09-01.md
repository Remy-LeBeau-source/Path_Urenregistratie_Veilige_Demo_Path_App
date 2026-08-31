# Handoff — PROD-livevoorbereiding 1 september 2026

## Doel

Rond versie `0.9.156` gecontroleerd af op TEST en bereid daarna de productiepilot voor. Commit en
push pas nadat de gerichte tests, GUI-smoke en volledige regressie groen zijn. Activeer echte
productiemail uitsluitend na een afzonderlijke go/no-go en begin met de pilot-allowlist.

## Vaste veiligheidsgrenzen

- PROD-data is al ingericht en mag niet opnieuw worden geseed of gereset.
- `allow_demo_migrations` blijft op PROD `false`.
- Wachtwoorden, tokens, SSH-sleutels en `server/config.local.php` komen niet in Git, deze handoff of
  testuitvoer.
- Productiemail staat bij aanvang uit. Alleen `configure-production-mail-pilot.php` mag de pilot
  atomisch activeren.
- De vier echte medewerkers krijgen nog geen automatische herinnering. De eerste reminderproef is
  uitsluitend voor de dummy.
- Een geslaagde mail mag niet via de gewone beheeractie opnieuw worden verstuurd. Alleen een
  definitief mislukte levering kan gemotiveerd en auditbaar opnieuw worden klaargezet.

## Reeds voorbereide PROD-basis

- Beheerders: Gio Maatsen en Joyce van der Steenhoven.
- Medewerkers: Brian Hek, Marc de Roon, Stasjo van Bakel, Shawn-Douglas Nahar en
  `PROD Pilot Medewerker`.
- PROD bevat alleen de startperiode augustus 2026.
- De vier echte medewerkeraccounts zijn nog niet vrijgegeven voor dagelijks gebruik.
- De dummy gebruikt `prod-medewerker@pathconsultancy.nl`.
- Dummy brokerroute: `gambitizanagi@gmail.com`.
- Dummy boekhoudroute: `gambitizanagi+prod-boekhouder@gmail.com`.
- Dummy salarisroute: `gambitizanagi+prod-salaris@gmail.com`.
- De echte routegegevens voor Brian, Marc, Stasjo en Shawn zijn aanwezig.
- Lege eigen onderwerp- en tekstvelden zijn correct: de centrale standaardtekst van het kanaal wordt
  dan gebruikt.
- De oude productieperioden april tot en met juli zijn verwijderd nadat was vastgesteld dat ze leeg
  waren. De databaseback-up van vóór de masterdatamigratie staat buiten de webroot.
- Productiemail en automatische reminders zijn nog niet actief.

## Werkmap en niet-gecommitteerde wijzigingen

Werkmap:

`C:\Path_Urenregistratie_Veilige_Demo_Path_App\path-urenregistratie`

Belangrijke actuele wijzigingen:

- factuurarchief toont direct of factuur en klanturenstaat aanwezig zijn;
- ontbrekende factuur of klanturenstaat kan als PDF, JPG of PNG worden toegevoegd;
- JPG en PNG worden server-side naar PDF genormaliseerd;
- externe factuur bewaart bronbestandsnaam en verplichte reden;
- factuurlijst heeft zoeken, documentstatusfilter en paginagrootte;
- verzendadministratie heeft server-side zoeken, statusfilter, paginering en 10/25/50 per pagina;
- mislukte leveringen tonen de echte fout en kunnen begrensd worden hersteld;
- na maximale pogingen kan Backoffice dezelfde levering met reden handmatig herstarten;
- verzonden leveringen tonen geen herhaalactie;
- Allure en Living Documentation krijgen versie- en stagegegevens uit dezelfde run;
- Playwright kan via `PATH_APP_BASE_URL=http://127.0.0.1:8001` draaien wanneer poort 8000 bezet is.

Het tijdelijke migratiescript `server/scripts/migrate-test-masterdata-to-production.php` is bewust
niet voor Git bedoeld. Verwijder het vóór commit uit de release-scope of laat het expliciet
untracked; voer het niet nogmaals op PROD uit.

## Nieuwe mailqueuecases

- `EQ-H-031`: mislukte mail blijft herstelbaar; verzonden mail heeft geen herhaalactie.
- `EQ-H-032`: handmatige herstart na maximale pogingen is gemotiveerd, auditbaar en eenmalig.
- `EQ-H-033`: queue-API pagineert en zoekt server-side.

Status op 31 augustus 2026:

- `EQ-H-031` groen.
- `EQ-H-032` groen.
- `EQ-H-033` groen nadat herhaalde native-PDO-placeholders zijn opgesplitst.
- `EQ-H-015` is groen nadat de test het zichtbare keuzemenu is gaan bedienen in plaats van de
  verborgen onderliggende `<select>`.
- De brede kritieke E2E-H-keten is lokaal `25/25` groen.
- De volledige factuurset is lokaal `16/16` groen, inclusief PDF/JPG/PNG en archieffilters.
- De drie nieuwe mailherstelcases zijn lokaal `3/3` groen.
- De productiebuild en syntaxcontroles zijn groen; de volledige CI-releasegates blijven leidend
  vóór TEST en PROD worden vrijgegeven.

Eerst uitvoeren:

```powershell
$env:PATH_APP_BASE_URL='http://127.0.0.1:8001'
node scripts/run-playwright-e2e.mjs -- --grep EQ-H-015
node scripts/run-playwright-e2e.mjs -- --grep EQ-H-03
```

Daarna de gerichte factuurarchiefcases, `npm run check`, `npm run test:gui-smoke`, de volledige
Playwright-regressie en build. Geen timeout verhogen en geen forced clicks gebruiken.

## Herinneringen — feitelijke huidige stand

Het scherm toont vijf geplande regels, maar er is nog geen serverplanner. Van de vijf instellingen
wordt alleen de klanturenstaatinstelling server-side bewaard. De overige vier bestaan alleen in de
browser. Het label `Voorbereiding · niet automatisch` is daarom correct. Een vinkje aan laten staan
verstuurt momenteel niets.

De getoonde gewenste planning is:

- week niet compleet: vrijdag 15:00;
- maand niet ingediend: laatste werkdag 15:00;
- vorige maand open: eerste werkdag 09:00;
- goedkeuring wacht: eerste werkdag 10:00;
- klanturenstaat: één werkdag vóór deadline om 15:00, op deadline om 10:00 en twee werkdagen later.

Veilige implementatievolgorde als reminders in dezelfde release moeten komen:

1. Voeg een serverleidende opt-in per medewerker toe met fail-closed standaard `false`.
2. Bewaar ook de vier nog lokale planningsregels server-side.
3. Laat de planner uitsluitend actieve medewerkers met een werkend account en expliciete opt-in
   selecteren.
4. Maak per medewerker, periode en herinneringstype een unieke deduplicatiesleutel.
5. Haal gemiste historische tijdsloten niet automatisch in bij eerste activatie.
6. Queue reminder-mails via `email_deliveries.channel = reminder`; schrijf ook een in-app melding.
7. Test dubbele cronruns, zomertijd, weekend/werkdag, ontbrekende urenstaat, gedeactiveerde gebruiker,
   mail uit, pilotallowlist, fout/retry en een reeds verstuurde deduplicatiesleutel.
8. Zet op PROD eerst alleen de dummy-opt-in aan. De vier echte medewerkers blijven `false`.

Dit is releasekritieke productlogica en vereist tegelijk migratie, FO/TO, featurecase, positieve en
negatieve Playwright-tests, GUI-smoke en living-doctraceerbaarheid. Zet niet alleen een cronjob aan.

## Go/no-go voor 1 september

### GO voor kernapp en dummy-pilot

- GitHub-release-SHA en TEST-deploy zijn exact gelijk en volledig groen.
- TEST E2E doorloopt medewerker, uren, klanturenstaat, correctie, factuur en drie mailroutes.
- PROD-preflight, health, HTTPS, login en rollen zijn groen.
- Verse database- en private-bestandenback-up is gemaakt.
- Productiepilotallowlist bevat uitsluitend de expliciete dummy-ontvangers die werkelijk worden
  getest.
- Eén dummyflow wordt uitgevoerd en iedere verwachte mail en PDF wordt menselijk gecontroleerd.
- De verzendadministratie toont queued, sent of failed correct en biedt geen resend bij sent.

### NO-GO voor alles-aan

- Een pipelinejob is rood of wacht nog.
- PROD-release-SHA wijkt af van de groene TEST-SHA.
- Mailqueue bevat een onverklaarde `processing`- of `failed`-regel.
- SMTP-relay, SPF, DKIM of DMARC is niet gecontroleerd.
- Factuur of klanturenstaat kan niet vóór verzending worden geopend.
- De dummy-only begrenzing voor reminders is niet server-side bewezen.

## Pilotactivering en terugval

Activeer productiepilotmail uitsluitend met de bestaande, bevestigde CLI-tool en de minimaal nodige
allowlist. Controleer de config daarna met de statische én live productiepreflight. Installeer of
activeer de mailworker pas na de dummy-go/no-go.

Bij ieder incident:

1. stop mailworker en reminderplanner;
2. zet productiemail terug naar `disabled`;
3. leg tijd, release-SHA en delivery-ID vast zonder berichtinhoud of persoonsgegevens te loggen;
4. reconcilieer `processing` met de Google-relaylogs vóór een nieuwe poging;
5. gebruik de bewezen vorige release als rollback en voer geen neerwaartse SQL op PROD uit.

## Besluit voor morgen

De kernapp kan morgen live als alle releasegates groen zijn. Factuurmail kan daarna in dummy-pilot.
Automatische reminders gaan morgen alleen aan wanneer de volledige serverplanner plus dummy-only
opt-in aantoonbaar groen is. Anders blijft alleen dat onderdeel uit; dit blokkeert urenregistratie,
documentcontrole, facturatie en de gecontroleerde dummy-mailpilot niet.
