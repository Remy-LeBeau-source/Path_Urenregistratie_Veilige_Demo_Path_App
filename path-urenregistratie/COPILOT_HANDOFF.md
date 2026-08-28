# Copilot handoff — lokale mailpreview en regressieherstel

Bijgewerkt: 28 augustus 2026

## Stand 28 augustus 2026 (Claude Code)

Zie `../CLAUDE_CODE_HANDOFF.md` bovenaan voor de volledige sessiecontext. TEST staat op **0.9.146**
(branded acceptatie-PDF, telefoonnummer `…286` + migratie `026`, `{klant}` in het factuurnummer
werkt server+browser, acceptatiemail hangt de echte factuur-PDF aan / weigert het lege placeholder-
PDF, install-knop zichtbaar). **0.9.147** viel om op een `SQLSTATE[HY093]`: de `{broker}`-token-fix
gaf de factuur-laadquery in `queue.php` een tweede `:company_id` en echte prepares weigeren dat —
elke factuurmail faalde. **0.9.148** is de hotfix (`:company_id` / `:company_id2` / `:company_id3`
apart gebonden; `smoke-test.mjs` bewaakt het). `{broker}` werkt nu in mailteksten, install-banner
stopt na installatie (`getInstalledRelatedApps`), `dist/` gitignored. CI `Validate`/`Promote Test`
draaien 4-way gesharded. Nieuwe live-regressie in `tests/remote/`. PROD-grens onveranderd.

## Voor Codex — stand van Claude Code, 24 augustus

Niets gecommit, gepusht of gedeployed sinds `5fdf8fa`. Bronversie lokaal `0.9.139`,
TEST draait `0.9.138`. PROD blijft op zijn eigen oudere versie en wordt niet aangeraakt.

#### Aanvulling Claude Code — 24 augustus, na de Codex-sectie hierboven

Werk uit dezelfde dag, deels vóór en deels naast het Codex-werk. Alles staat lokaal;
**er is niets gecommit, gepusht of gedeployed** sinds `5fdf8fa`. Bronversie `0.9.139`,
TEST draait `0.9.138`.

**Beantwoord: `TeamManagementPage.ts` compileert.** Dat stond hierboven als eerste
open vraag. Gecontroleerd met een wegwerpspec die het page-object importeert en
`npx playwright test --list` — één test gevonden, geen TypeScript-fout. De spec is
daarna verwijderd. De **selectors** zijn daarmee nog niet bewezen; dat gebeurt pas
als een echte case ermee klikt.

**Toegevoegde E2E-cases** (nog als API/request-tests in `email-queue.spec.ts`, dus
kandidaten voor de GUI-omzetting die hierboven onder stap 5 staat):

| Case | Wat hij bewijst |
|---|---|
| `E2E-H-013` | nieuwe medewerker: gegevens blijven staan incl. contract, urenstaat wordt werk op het dashboard, factuur ontstaat, elke mail heeft onderwerp, naam en handtekening en géén onvervangen `{veld}` |
| `E2E-H-014` | nieuwe beheerder logt zelf in, ziet dezelfde werkvoorraad als een bestaande en maakt de keten af |
| `E2E-H-015` | volledige CRUD: aanmaken, wijzigen, deactiveren, definitief verwijderen laat geen medewerker, opdracht of account achter |
| `E2E-H-016` | elk veld dat het medewerkersformulier verstuurt komt exact terug, of staat met naam en reden in een uitzonderingslijst |

`E2E-H-009/010/011` zijn hernoemd uit `EQ-H-027/028/030`; de omzettabel staat in
`TESTCOMMANDOS.md`. **Let op de ID-botsing** die hierboven onder stap 6 staat: deze
nummers bestaan nu zowel in de feature van Codex als in `email-queue.spec.ts`.
Afstemmen vóór de GUI-omzetting, anders verwijzen twee dingen naar hetzelfde nummer.

**Overige lokale wijzigingen van deze hand**

- `playwright.config.ts`: mobiele projecten matchen ook `business-workflows-e2e.spec.ts`.
  Codex heeft dit inmiddels verbreed naar `business-workflows-*.spec.ts`; controleer
  welke versie in de werkboom staat en houd de bredere.
- `package.json`: `test:e2e:group:e2e`, `:e2e:ui` en `:e2e:headed`, zodat Gio de
  E2E-laag zelf kan draaien en in de Playwright-GUI kan bekijken. Dat heeft hij
  expliciet gevraagd.
- `server/scripts/mail-delivery-inspect.php`: meldt nu ook `invoice_number` en een
  `attachment`-blok (bestaat, bytes, is_pdf, sleutel, pad).
  **Waarschuwing:** de bestandscontrole werkt nog niet betrouwbaar. De runner geeft
  iedere run een eigen tijdelijke private opslagroot; deze inspecteur loste een ander
  pad op. `E2E-H-013` controleert daarom alleen dat `pdf_storage_key` gevuld is —
  die wordt pas gezet ná een geslaagde schrijfactie. Codex' `e2e-state-inspect.php`
  lijkt hiervoor de betere weg; sluit daarop aan in plaats van dit uit te breiden.
- Migratie 025 `contract_label` plus `staff.php`, `bootstrap.php` en `app.js`.
- `queue.php`: Overig volgt nu `include_invoice_pdf`; salaris houdt zijn uitzondering
  en het vinkje staat daar uitgeschakeld met reden.

**Wisselvallige tests**, drie keer dezelfde oorzaak: wachten op iets wat er toevallig
bij staat in plaats van op wat werkt. Opgelost via `openPaneel` in
`tests/playwright/pages/TopbarMenu.ts` (profielmenu, maandkiezer, keuzeknop) en in
`LoginPage.ts` (wachtte op het tekstje naast de inlogknop in plaats van op de knop).
Het patroon is **niet uitputtend nagelopen**.

**Bekend en nog niet opgelost:** `E2E-H-007` heeft een stap die twee dingen belooft
("blijft de controle weg en staat de factuurtaak open") en géén van beide controleert
— de enige assertie is dat er één schrijfactie was. Ook `E2E-H-004` mist een controle
op uren en bedrag. Beide stonden op de lijst toen de sessie werd onderbroken.

**Laatste meting:** volledige suite `299 passed` op `0.9.139`-broncode; E2E-laag
`15 passed` desktop; `business-workflows-e2e.spec.ts` `8 passed` op mobile-chrome en
`7 passed / 1 failed` op mobile-safari — die ene is `E2E-H-007`, met
*"Login faalde: E-mailadres of wachtwoord is onjuist"*. Dat sluit aan op stap 3
hierboven: H006/H007 hangen aan het gedeelde demowachtwoord en moeten naar een
wegwerpaccount.

#### Bevindingen van Gio uit de handmatige ronde op TEST (24 augustus)

Dit is de openstaande lijst uit zijn eigen testronde. Twee zijn opgelost, zes niet
gereproduceerd. Ze staan hier omdat ze anders tussen het E2E-werk door verdwijnen —
en omdat de niet-gereproduceerde er níet uitzien als verzinsels: hij zag ze op TEST,
ik niet op een schone database. Dat verschil is zelf het spoor.

**Opgelost en met een case vastgelegd**

| Bevinding | Oorzaak | Vastgelegd in |
|---|---|---|
| Contract invullen, opslaan, veld blijft leeg | er bestond geen kolom; het veld leefde alleen in de browser | migratie 025 `contract_label`, `E2E-H-015`/`E2E-H-016` |
| *Factuur meesturen* aanvinken bij Overig levert geen bijlage | `queue.php` zette `$attachPolicy = 'none'` ongeacht het vinkje | `E2E-H-012` |
| Boekhouder kreeg de algemene in plaats van zijn eigen mailtekst | soort ontvanger werd stil overschreven bij opslaan | migratie 023, `ADM-WR-H-017` |

Bij de salarisadministratie is het bijlagevinkje nu uitgeschakeld met de reden erbij:
de server weigert daar categorisch een factuur, en een dood vinkje aanbieden is net
zo misleidend als een genegeerd vinkje.

**Niet gereproduceerd — niet afgesloten**

1. Na **Herstel** blijft een nieuw aangemaakte persoon staan.
2. Na aanmaken moet je eerst opslaan **en F5** voordat je iets kunt invullen.
3. Na aanmaken staan **verkeerde vinkjes** aan bij een ontvanger.
4. Bij een nieuwe medewerker **geen klant zichtbaar** en de naam ontbreekt.
5. Een ingediende urenstaat kwam **niet als taak** terug.
6. Bij afronden: *"Niet alle serverfacturen zijn beschikbaar."*

Wat er wél is vastgesteld:

- Op een schone database klopt alles. De opdracht krijgt `client_id` en `broker_id`,
  de kaart toont klant en broker, een nieuwe ontvanger staat bij een tweede
  medewerker op `enabled=0`, en na F5 verandert er niets. Zie de walkthroughs; die
  zijn daarna opgeruimd.
- De melding bij 6 verschijnt wanneer niet elke goedgekeurde medewerker een
  serverfactuur heeft — `serverInvoiceFor()` in `assets/app.js`. Dat is het symptoom,
  niet de oorzaak.
- **Mijn verklaring is weerlegd.** Ik vermoedde dat de browser na een herstel een
  botsende ontvangersleutel kon maken (`nextMailRecipientId()` telt in de lokale
  lijst, de server werkt bij op dezelfde sleutel bij). Uitgelokt en gemeten: na de
  herlading haalt de app de ontvangers eerst bij de server op en telt netjes door.
  Geen botsing. Bouw hier dus niets op.
- Meest waarschijnlijke resterende verklaring: **een oude `app.js` in zijn browser**.
  De betrokken schermen zijn in 0.9.133–0.9.138 zwaar gewijzigd, en dit heeft eerder
  een half uur gekost. Gio is gevraagd één keer hard te verversen (`Ctrl+Shift+R`) en
  het opnieuw te proberen; **dat antwoord staat nog open**. Herstel in de app is iets
  anders dan een harde ververs — dat onderscheid was hem niet duidelijk.

Volgende stap voor wie dit oppakt: vraag de exacte klikvolgorde en of het na een
harde ververs nog optreedt. Reproduceer eerst, bouw daarna pas. Drie van deze zes
zouden door `E2E-H-013` en `E2E-H-016` gedekt moeten zijn zodra die op TEST-data
draaien in plaats van op een verse database.

**Eerder door Gio gemeld met schermafdrukken, allemaal opgelost en uitgerold**

Deze staan hier zodat de reeks compleet is: het waren er niet zes maar veel meer, en
bijna alles kwam uit zijn eigen ronde op een telefoon — niet uit de suite.

| Bevinding | Opgelost in |
|---|---|
| Scrollen werkte helemaal niet op de telefoon | 0.9.120 |
| Kolomlabels op de telefoon 8px, onleesbaar | 0.9.123 |
| Rolkeuze viel op iOS achter de statusbalk | 0.9.128 |
| App-icoon onleesbaar op het beginscherm | 0.9.130/0.9.134 |
| "Installeren" kwam nooit meer terug na verwijderen | 0.9.129 |
| Installeerknop deed niets bij het indrukken | 0.9.130 |
| Donkere modus: tekst in dialogen onleesbaar | 0.9.132/0.9.134 |
| Witte knoppen met witte tekst (Goedkeuringen, Facturen) | 0.9.134 |
| "Path" onzichtbaar in de topbalk bij daglicht | 0.9.134 |
| Meldingenbel was een boog en stond niet gecentreerd | 0.9.135 |
| Broker ontbrak volledig in Instellingen | 0.9.134 |
| Drie verschillende zinnen over wat een leeg tekstveld betekent | 0.9.135 |
| Handtekening ontbrak onder de brokermail | 0.9.132 |
| Profielfoto uploaden werkte niet | eerder |
| Meldingsvinkjes klopten niet per rol | eerder |

Patroon dat hieruit spreekt en dat de moeite van het onthouden waard is: **vrijwel
elke bevinding kwam uit handmatig kijken op een echt toestel, niet uit de suite.**
Meerdere ervan gingen door een volledig groene regressie heen. Dat is de reden dat
Gio nu een zichtbare GUI-suite wil die hij zelf kan draaien — en dat een walkthrough
met schermafdrukken die je zelf bekijkt, geen luxe is naast de asserties.

## Laatste overdracht — v0.9.138

### 2026-08-24 · Claude Code — v0.9.133 t/m v0.9.138: mailteksten, aanpasbare standaarden, E2E-laag

Werk gedaan door Claude Code, rechtstreeks op `main` (geen PR's in deze periode). TEST draait
`0.9.138`; PROD staat nog op `0.9.117` en wacht op Gio's goedkeuringspoort — **niet handmatig
promoveren**.

**Wat er functioneel is veranderd, en wat dat betekent als je hierin verder werkt:**

1. **De begeleidende tekst volgt nu één regel:** eigen tekst bij de ontvanger wint, anders de
   standaardtekst van dat soort. De laag "tekst bij de opdracht" bestaat niet meer als aparte laag —
   dat is de eigen tekst van de broker geworden, en alleen die leest hem. Wie code raakt in
   `server/mail/queue.php` rond `$templateFor`: er is geen erfvolgorde van drie stappen meer.
2. **Standaardteksten zijn aanpasbaar** bij Instellingen → Teksten, per kanaal. Tabel
   `mail_channel_templates` (migratie 024), gelezen via `mail_channel_templates_for()`. **Geen rij =
   de meegeleverde tekst uit `templates.php`** — dat is bewust, zodat wie niets aanpast meeloopt met
   verbeteringen. Sla dus nooit een rij op die gelijk is aan de meegeleverde tekst; `settings.php`
   verwijdert hem in dat geval juist.
3. **Twee bedieningselementen die logen zijn rechtgezet.** De soort ontvanger werd stil overschreven
   bij opslaan (bootstrap geeft `display_name`/`recipient_category`, het opslaan las alleen
   `name`/`category`) — migratie 023 herstelt bestaande rijen. En `include_invoice_pdf` werd bij
   Overig genegeerd.

**Vallen die tijd hebben gekost en die je waarschijnlijk ook tegenkomt:**

- De **migratieloper knipt op puntkomma, ook binnen commentaar**. Geen puntkomma in een toelichting.
- **Kolomtypes volgen de bestaande tabellen, niet `001_core_schema.sql`.** Dat bestand zegt `INT`;
  de werkelijke schema's gebruiken `BIGINT UNSIGNED`. Een foreign key met het verkeerde type weigert.
- **Een test die alleen naar de uitkomst kijkt kan een echte fout missen.** Een opgeslagen tekst die
  gelijk is aan de meegeleverde ziet er aan de buitenkant hetzelfde uit als géén opgeslagen tekst, en
  juist dat verschil is het probleem. `bootstrap.php` meldt daarom apart welke kanalen een eigen rij
  hebben (`mail_channel_customised`). Draai elke nieuwe case één keer met de fix eruit — dat heeft
  hier twee zwakke tests aan het licht gebracht die groen bleven terwijl de bug erin zat.
- **Wisselvallige tests hadden hier één terugkerende oorzaak:** wachten op iets wat er toevallig bij
  staat in plaats van op wat werkt (een tekstje naast een knop, een paneel na een klik die kan landen
  voordat de app zijn afhandeling heeft gekoppeld). Drie gevallen opgelost via `openPaneel` in
  `tests/playwright/pages/TopbarMenu.ts`. Niet uitputtend nagelopen.

**Teststructuur is veranderd.** Er zijn nu vier benoemde lagen met elk een eigen commando: DB, API,
E2E en UI. Het voorvoegsel van het casenummer bepaalt de laag. Drie cases die de volledige keten
doorlopen zijn hernoemd naar `E2E-H-009/010/011`; de omzettabel met hun oude nummers staat in
`TESTCOMMANDOS.md`, zodat oudere testverslagen leesbaar blijven. Loopt een nieuwe case de hele keten
door, geef hem dan `E2E-`.

**Wat openstaat en waar je niet blind op moet bouwen:**

- Drie waarnemingen van Gio zijn **niet gereproduceerd**: na Herstel blijft een nieuw aangemaakte
  persoon staan, na aanmaken eerst opslaan en F5 voordat je iets kunt invullen, en verkeerde vinkjes
  na aanmaken. Op een schone database klopt alles, server én scherm. De verklaring die ervoor lag —
  een botsende ontvangersleutel na Herstel — is uitgelokt en **weerlegd**. Bouw hier niets op voordat
  er een reproductie is; de meest waarschijnlijke resterende verklaring is een oude `app.js` in de
  browsercache.
- De suite sharden (825s naar ~210s) is afgesproken voor ná PROD.
- Fase 16 blijft de enige echte openstaande fase.

Volledige verantwoording per punt staat in `MASTERCHECKLIST.md` onder *v0.9.133 t/m v0.9.138*, en het
gewijzigde ontwerp in `TECHNISCH-ONTWERP.md` (*Welke begeleidende tekst een ontvanger krijgt*, *Een
bedieningselement dat niets doet*) en `FUNCTIONEEL-ONTWERP.md` (hoofdstuk 7).

## Laatste Codex-overdracht — LOCAL Herstelmeldingen

### 2026-08-16 17:12 · Copilot — pipelinefix gepusht als 0ef86b1

- `E2E-H-008` heeft nu een feature- en stepsmapping; de design-audit is weer groen.
- Alle artifact-uploads in de GitHub Actions-workflows gebruiken `retention-days: 7`.
- Versiecontract is doorgeschoven naar `v0.9.80`; `npm run check` is groen.
- Commit `0ef86b1` is op `main` gepusht.
- Lokale dashboardbaseline blijft `9 open acties` met `4 bij Backoffice` en `5 wacht op medewerkers`.

### 2026-08-16 17:12 · Copilot — pipelinefix en artifact-retentie afgerond

- Het CI-probleem zat in de design-audit: `E2E-H-008` was executable zonder feature-mapping.
- Oplossing: `E2E-H-008` toegevoegd aan de feature, navigation-only steps, BDD-mapping en
  functioneel ontwerp.
- Daarnaast hebben alle `actions/upload-artifact`-stappen nu `retention-days: 7`.
- Bewijs: `node scripts/test-design-audit.mjs` is groen; de bestaande dashboardbaseline bleef
  lokaal op `9 open acties` met `4 bij Backoffice` en `5 wacht op medewerkers`.
- Volgende stap: commit/push van deze fixset.

### 2026-08-16 16:59 · Copilot — F5-persistency op open acties nu bevestigd

- De Backoffice-flow is na de eerdere retry- en schemafixes doorgegaan tot `5 open acties`.
- Bewijs: na F5 op `http://localhost:8000/#dashboard` bleef de dashboardbaseline op `9 open acties`
  staan, met `4 bij Backoffice` en `5 wacht op medewerkers`, dus geen terugval meer naar `12`.
- Gewijzigd: alleen deze handoff bijgewerkt; geen extra codewijziging in deze stap.
- Uitgevoerde tests en resultaten: live browserverificatie na reload; eerder `node --check assets/app.js`
  groen, en de fix voor de eerder hangende modal was al aanwezig.
- Volgende stap: als de gebruiker wil, kan dit nu worden afgerond met commit/push; anders blijft dit
  de actuele lokale eindstatus.

### 2026-08-16 16:50 · Copilot — v0.9.79 hotfix release groen

- De urencontrole-retry is nu uitgegeven als `v0.9.79`; zichtbare labels en smoke-asserties zijn
  meegezet.
- Bewijs: `npm run build` en `node scripts/smoke-test.mjs` zijn beide groen afgerond op v0.9.79.
- Gewijzigd: dezelfde hotfixset plus versie- en docsynchronisatie.
- Volgende stap: commit/push van v0.9.79.

### 2026-08-16 16:43 · Copilot — urencontrole retry-hang gerepareerd

- De urencontrolemodal kon blijven hangen wanneer de lokale recordversie eerst 0 was en daarna
  een verse serverversie binnenkwam; de interne retry raakte de disabled confirm-knop.
- Fix: vóór de retry wordt de confirm-knop weer vrijgegeven, zodat de tweede poging werkelijk
  kan doorgaan.
- Bewijs: nieuwe Playwright-regressie `E2E-H-008` is 1/1 groen; de bevestiging wordt nu ook na
  de versie-refresh afgehandeld.
- Gewijzigd: `assets/app.js`, `tests/playwright/business-workflows-e2e.spec.ts`.
- Volgende stap: v0.9.79 is gebouwd en gesmoked; commit/push van deze hotfix volgt.

### 2026-08-16 16:18 · Copilot — v0.9.78 build en smoke groen

- De release is doorgebumped naar `v0.9.78`; zichtbare labels, docs en smoke-asserties zijn meegezet.
- GUI-baseline op localhost: 12 open acties totaal, opgesplitst in 7 bij Backoffice en 5 wacht op medewerkers.
- Bewijs: `npm run build` en `node scripts/smoke-test.mjs` zijn beide groen afgerond.
- Gewijzigd: `package.json`, `package-lock.json`, `index.html`, `README.md`,
  `scripts/build-live-doc-bundle.mjs`, `scripts/smoke-test.mjs`, `MASTERCHECKLIST.md`,
  `dist/index.html`.
- Volgende stap: commit/push van deze patchrelease, tenzij de user nog extra scope vraagt.

### 2026-08-16 16:12 · Copilot — invoice-only broker regressies groen

- De resterende stale brokerbundelverwachtingen in `tests/playwright/email-queue.spec.ts` zijn
  gesynchroniseerd met de huidige invoice-only flow.
- Bewijs: gerichte reruns zijn groen afgerond voor `EQ-H-016`, `EQ-H-025` en `EQ-N-019`;
  eerder waren `EQ-H-016`, `EQ-H-025`, `MOB-H-005` en `EQ-H-015` al groen op de direct aangepaste
  slice.
- Gewijzigd: `tests/playwright/email-queue.spec.ts`.
- Uitgevoerde tests en resultaten: alle relevante gerichte Playwright-runs zijn 1/1 groen;
  lokale precheck en de geïsoleerde testdatabase zijn telkens succesvol opgezet.
- Volgende stap: geen bredere regressie draaien totdat de user daarom vraagt; deze touched slice is
  nu afgedekt.

### 2026-08-16 · Copilot — v0.9.77 mail-, sessie- en mobiele fixes

- Server gebruikt per-assignment onderwerp/body; migraties 017/018 en TEST-reset zijn gekoppeld.
- Geldige auth-sessie blijft actief bij F5 en na Herstel; maandverzending auto-refresht facturen.
- Broker-facturen sturen nu alleen de factuur; de klanturenstaat loopt via de aparte
  klanturenstaattaak en de bijbehorende TEST-brokerroute. Mobiele taakregels zijn compacter.
- Gericht groen: 79/79 + F5 1/1 + mail/PDF 3/3; smoke, build en DB-H-001 groen.

### 2026-08-16 · Copilot — klanturenstaatteksten realistischer gemaakt

- De standaardonderwerpen voor klanturenstaat zijn herschreven naar:
  medewerker → Backoffice `... ter controle` en Backoffice → broker `... voor dossier`.
- De brokertekst krijgt nu expliciet een Backoffice-signatuur: `Path Backoffice` + organisatie.
- Bewijs: gewijzigde smoke-/API-tests en de aparte klanturenstaatflow zijn groen.

### 2026-08-16 · Copilot — mobiele appvriendelijke layout en subjectcontracten

- Mobiele breakpoint is compacter gemaakt: minder randruimte, rustigere cards en duidelijker
  stapelende panels op telefoon.
- De klanturenstaat-maandkeuze sluit nu betrouwbaar na selectie en houdt de appflow compact.
- Het onderwerpcontract voor klanturenstaat is nu in de smoke volledig gesynchroniseerd met
  `... ter controle`.
- Bewijs: `node scripts/smoke-test.mjs` geslaagd na de laatste updates.

### 2026-08-16 04:06 · Copilot — gewone TEST-mailflow hersteld in v0.9.74

- Gebruikersbevinding bevestigd: de acceptatieconsole dispatchte direct, maar de gewone
  factuurflow liet alle routes alleen op `queued/klaargezet` staan.
- Root cause: factuurlock queue'de vóór PDF-generatie en riep geen dispatch aan; de worker/cron was
  niet onderdeel van de zichtbare TEST-actie.
- Fix: definitieve branded server-PDF met echt Path-logo eerst opslaan; daarna uitsluitend in de
  beveiligde TEST-sandbox de zojuist gemaakte delivery-ID's direct dispatchen. LOCAL blijft dry-run
  en PROD blijft worker-gestuurd. De taak sluit alleen als alle TEST-items werkelijk `sent` zijn.
- Gericht bewijs: `EQ-H-020` 1/1 groen en toont `3 e-mails verzonden`; `INV-H-004` 1/1 groen en
  bewijst logo-XObject, Path/QSI-identiteit en afwezigheid van `CONCEPT`/`NIET VERZONDEN`.
- Aanvullend: de aparte klanturenstaatmodal gebruikte nog `mark_sent` en meldde onterecht dat niets
  was verzonden. Nieuwe serveractie `send_to_broker` queue't de officiële goedgekeurde PDF van exact
  dezelfde medewerker/periode, dispatcht hem op TEST naar Giovanno en sluit pas na `sent`.
  `EQ-H-026` is 1/1 groen en beschikbaar als `npm run test:mail-flow`.
- Releasebewijs: docs/check/diff groen, volledige GUI-smoke groen en geraakte regressiesuites
  36/36 + 15/15 = 51/51 groen. Volgende stap: build/DB/audit, commit en push.
- Eindgate afgerond: productiebuild, DB-H-001, dependency-audit met 0 kwetsbaarheden,
  v0.9.74-versiecontract en schone diff zijn groen. Commit/push volgt direct.
- Nieuwe vaste afspraak: iedere release krijgt gerichte regressie voor alle geraakte codepaden;
  volledige matrix alleen bij gedeelde kernlogica, breed risico of expliciet verzoek.

### 2026-08-16 03:38 · Copilot — v0.9.73 lokale releasegate volledig groen

- Productiebuild, `npm run check`, DB-H-001, dependency-audit (0 kwetsbaarheden), docs-sync
  (212 Playwright + 1 DB) en repositorybrede diffcontrole zijn groen.
- Drie door Vite achtergelaten eindspaties in `dist/index.html` zijn inhoudsneutraal verwijderd;
  bron en buildartefact tonen en laden exact v0.9.73.
- Samen met de GUI-smoke en 217/217 regressie is v0.9.73 lokaal volledig vrijgegeven voor
  commit/push. Er is nog geen echte mail verstuurd en nog niets gedeployed.

### 2026-08-16 03:35 · Copilot — v0.9.73 regressie 217/217 groen

- Alle vier definitieve shards zijn na de individuele leesklikfix groen:
  `64 + 47 + 55 + 51 = 217/217`, 0 failures.
- Iedere shard bouwde de geisoleerde `path_urenregistratie_test`-database opnieuw op; desktop,
  API, Mobile Chrome en Mobile Safari zijn volledig meegenomen.
- Nog niet gepubliceerd. Volgende stap: compacte technische releasechecks en daarna commit/push.

### 2026-08-16 03:29 · Copilot — v0.9.73 GUI-smoke groen

- `npm run test:gui-smoke` is na de individuele leesklikfix volledig groen afgerond met exitcode 0.
- De geisoleerde testdatabase is per deelrun opnieuw opgebouwd; meldingen `NOT-H-009/010/011`,
  werkvoorraad, rolwissel, lokale mailpreview, omgevingsveiligheid en mobiel liepen mee.
- Nog geen commit, push, deployment of echte mail. Volgende stap: vier volledige regressieshards.

### 2026-08-16 · Copilot — v0.9.73 individuele leesactie hersteld

- Gebruiker bevestigde dat bel/filter/kaarten op 3 stonden, maar één klik niet naar 2 ging.
- Oorzaak: de klik koos in auth-modus nog de serverwrite terwijl de LOCAL-resetguard de readback
  blokkeerde; de lokale melding bleef daardoor ongewijzigd.
- Individuele belklik, mededelingenklik en `Alles gelezen` gebruiken onder LOCAL-resetgezag nu
  consequent de lokale state. Zonder resetguard blijft de serverwrite leidend.
- `NOT-H-010` klikt nu echt één mededeling en eist bel/filter/kaarten `3 → 2`.
- Releasekandidaat en zichtbare labels zijn verhoogd naar v0.9.73. Alleen gerichte/goedkope
  validatie volgt; geen nieuwe volledige dure regressieronde zonder expliciet verzoek.
- Bewijs afgerond: `NOT-H-010` 1/1 groen in 3,2 s; syntax en v0.9.73-smoke groen; Living Docs
  gesynchroniseerd op 212 Playwright + 1 DB; versiecontract v0.9.73 groen.

### 2026-08-16 · Copilot — releasekandidaat verhoogd naar v0.9.72

- De aanvullende Stasjo-fix (bel, filter en kaarten alle drie exact 3) valt onder v0.9.72.
- Packageversie, zichtbare labels, asset-cachekeys, smokecontract, README, checklist en
  Living Documentation-versielabel zijn gesynchroniseerd.
- Historische v0.9.71-bewijsregels blijven ongewijzigd. Geen nieuwe dure regressierun uitgevoerd;
  de onderliggende code was direct daarvoor 217/217 groen.

### 2026-08-16 · Copilot — GUI-smoke opnieuw groen

- Na de laatste Herstelmeldingenpatch is `npm run test:gui-smoke` volledig groen afgerond.
- De GUI-gate bevat zowel `NOT-H-010` (`0 → Herstel → 3`, F5/herlogin) als `NOT-H-011`
  (`3 → 2 → 1 → 0`). Geen deelrun meldde een failure.
- Volgende stap: regressieshards 1/4 tot en met 4/4 opnieuw draaien. Nog niet publiceren.

### 2026-08-16 · Copilot — vier regressieshards opnieuw groen

- Definitieve rerun na de laatste Codex-patch: `64 + 47 + 55 + 51 = 217/217`, 0 failures.
- Iedere shard is op een verse geïsoleerde Playwright-database uitgevoerd.
- Nog te doen vóór vrijgave: echte localhost-GUI-flow `0 → Herstel → 3`, F5/herlogin en lokale
  acceptatiebaseline zichtbaar controleren. Nog niet committen of publiceren vóór die closeout.

### 2026-08-16 · Copilot — Stasjo-tellers nog ongelijk, lokale basis gecorrigeerd

- Eigen localhostcontrole bewees admin `3 → 0 → Herstel → 3` en behoud na F5/herlogin.
- De daaropvolgende Stasjo-controle vond nog bel `3`, mededelingenfilter `2`, kaarten `2`.
- Oorzaak: één ongelezen correctiestatus plus twee ongelezen algemene mededelingen. De correctiestatus
  is in de herstelbasis nu gelezen en de derde algemene mededeling ongelezen; taakstatus blijft gelijk.
- `NOT-H-010` controleert nu na LOCAL Herstel ook Stasjo's bel, filter en kaarten op exact `3`.
- Volgende stap: gerichte test en daarna alle geraakte gates opnieuw uitvoeren. Nog niet vrijgeven.

### 2026-08-16 · Copilot — gerichte Stasjo-baseline groen

- Versterkte `NOT-H-010` is groen: 1/1 in 3,2 s (totale run 4,5 s).
- Na LOCAL Herstel zijn nu admin `3`, en Stasjo bel `3`, filter `3`, kaarten `3` aantoonbaar gelijk.
- Volgende stap: notificatiesuite, `npm run check`, GUI-smoke en vier shards opnieuw uitvoeren.

### 2026-08-16 · Copilot — modulecheck en documentatie groen

- Volledige notificatiesuite: 11/11 groen in 9,4 s.
- `npm run check`: volledig groen, inclusief v0.9.71-smoke, 213/213 testdesignmapping, BDD,
  databaseconfig en operationele veiligheidschecks.
- `npm run docs:sync`: groen; 212 Playwright-cases + 1 DB-case = 213 cases.
- Volgende stap: GUI-smoke en volledige vier-shard regressie opnieuw draaien.

Status: **lokaal opgelost en gericht bewezen; niet gecommit, niet gepusht en niet gedeployed**.

- Gebruikersmelding: na `Alles gelezen` en daarna `Herstel` verschenen de drie lokale
  basismeldingen heel kort, waarna de teller weer naar nul sprong.
- Oorzaak: `freshState()` zette correct drie ongelezen meldingen terug, maar een direct daarna
  geforceerde serverrefresh omzeilde de LOCAL-resetguard en overschreef ze met de reeds gelezen
  serverstatus. Login kon dezelfde lokale baseline opnieuw leegmaken.
- Productfix in `assets/app.js`:
  - notificatie- en mededelingenreads respecteren weer de LOCAL-resetguard;
  - geen geforceerde notification/announcement-readback direct na LOCAL Herstel;
  - login wist notificaties niet wanneer de lokale resetbaseline gezaghebbend is;
  - meldingen blijven per actieve rol/medewerker gefilterd;
  - `Alles gelezen` wijzigt alleen de meldingen van het huidige profiel.
- Regressie in `tests/playwright/notifications.spec.ts`:
  `NOT-H-010` bewijst nu `0 → Herstel → exact 3`, controleert de drie titels, beschermt tegen
  een serverresponse met nul en controleert persistentie na F5/herlogin.
- BDD en uitvoer zijn gelijkgetrokken in
  `tests/playwright/features/notifications.feature`,
  `tests/playwright/steps/notifications.steps.ts` en het GUI-smokecommando in `package.json`.
- Bewijs op 16 augustus 2026:
  - `NOT-H-010`: **1/1 groen** (4,5 s);
  - volledige `notifications.spec.ts`: **11/11 groen** (9,4 s);
  - `npm run check`: **groen**, exitcode 0 (63,8 s);
  - `git diff --check`: geen whitespacefouten.
- Nog niet opnieuw uitgevoerd na deze laatste gerichte patch: de volledige GUI-smoke en de vier
  regressieshards. Copilot mag die als volgende gate draaien, maar mag niet suggereren dat ze al
  ná deze patch bewezen groen zijn.
- Werkboom bevat een bredere, nog niet gepubliceerde v0.9.71-batch. Niets resetten, uitchecken,
  stagen, committen, pushen of deployen zonder nieuwe opdracht. Geen echte mail verzenden.

## Start hier

- Werkmap: `path-urenregistratie`
- Branch: `agent/local-mail-preview`
- Gooi de dirty worktree **niet** weg en voer geen reset/checkout uit.
- Er staan geen secrets in deze overdracht.
- Laat PROD en de beveiligde TEST-allowlist ongemoeid.

## Huidige lokale wijzigingen

- `assets/app.js`
  - veilige localhost-mailpreview met aan/uitbediening via instellingen én statusbadge;
  - localhost maakt alleen queue-/previewregistraties en verstuurt nooit SMTP;
  - acceptatieconsole toont onderwerp, tekst en PDF-links;
  - lokaal herstel voor de actie "alles als gelezen".
- `assets/styles.css`
  - toetsenbord- en focusstijl voor de interactieve mailstatusbadge.
- `server/api/mail-acceptance.php`
- `server/mail/acceptance.php`
  - localhost-previewcontract, onderwerp/tekst/bijlagen en fail-closed transport.
- `server/scripts/mail-acceptance-policy-check.php`
  - beleidscontrole dat localhost nooit extern verzendt en PROD/TEST veilig blijven.
- `tests/playwright/email-queue.spec.ts`
  - nieuwe regressie `EQ-H-025` voor lokale preview, badgebediening, inhoud, PDF's en geen SMTP.

## Bewezen status

### 2026-08-16 · Codex — v0.9.71 lokale eindgate voltooid

- De vier definitieve regressieshards zijn volledig groen: `64 + 47 + 55 + 51 = 217/217`.
- De volledige GUI-smoke is groen (`exit 0`, circa 200 s) en `npm run check` is groen (`exit 0`).
- `NOT-H-011` bewijst het echte eerste-loginpad: geen tijdelijke demo-`15/10`, daarna exact drie
  servermededelingen en synchroon `3 → 2 → 1 → 0` in badge, filter en kaarten.
- De lokale gebruikersbaseline is na de tests veilig teruggezet naar exact drie ongelezen
  `Lokale tellertest 1/2/3 van 3`-meldingen, zonder overige lokale data te wissen.
- FO, TO, features, stappen, mapping, werkwijze en masterchecklist bevatten dezelfde regressieregel.
- Volgende stap: bewuste commit/push van v0.9.71 en de GitHub-checks volgen. Geen echte mail of
  handmatige productieactie is onderdeel van deze release.

### 2026-08-16 01:24 · Directe overdracht aan Codex

- Doel: zichtbare medewerkersmeldingen op LOCAL/TEST moeten met echte serverdata beginnen op drie
  ongelezen mededelingen en per individuele leesactie overal gelijk lopen: belbadge, filter en lijst
  `3 → 2 → 1 → 0`. Geen vrijgave op alleen een brede regressie; Codex moet de echte localhost-GUI
  zelf als laatste stap controleren.
- Gevonden echte bug: handmatige localhost-GUI op v0.9.71 liet direct na login bel `15` en filter
  `10` zien, ondanks drie servermededelingen. Eerste klik corrigeerde naar 2, daarna 1 en 0.
  `login(role)` renderde de demo-notificaties vóór de asynchrone serverreadback.
- Productfix: `assets/app.js` leegt in auth-modus alleen `state.notifications` vóór `renderAll()`.
  De serverrefresh blijft gezaghebbend. `NOT-H-011` eist nu direct na login een verborgen badge,
  daarna drie echte servermededelingen en de volledige 3→2→1→0-reeks.
- Serverbaseline: `database/seed-demo-data.sql` heeft drie gekoppelde, ongelezen mededelingen voor
  Stasjo; de eerdere correctiemelding staat gelezen. Releasekandidaat en zichtbare labels: v0.9.71.
- Werkwijze is aangescherpt in `WERKWIJZE-PATROON.md`: geen vraaglus, exacte handmatige flow in
  Playwright/smoke bouwen, patchversie verhogen, eigen zichtbare eindtest en pas daarna vrijgeven.
- Testresultaten: notificatiespec 11/11 groen; versterkte `NOT-H-011` 1/1 groen in 3,6 s;
  `npm run check` groen met 213/213 traceerbaarheid; GUI-smoke exit 0; gerichte Mobile Safari
  `MOB-H-003` 1/1 groen. Mobile test controleert nu zichtbaar verdwijnen van de goedkeuringskaart
  in plaats van een redundant intern response-signaal.
- Volledige regressie: eerdere 217/217 was vóór de laatste loginfix en is geen eindbewijs.
  Definitieve rerun erna: shard 1/4 64 groen, shard 2/4 47 groen; shards 3/4 en 4/4 staan open.
- Lokale DB: de drie tijdelijke titels `Lokale tellertest 1 van 3`, `2 van 3`, `3 van 3` zijn door
  de eigen GUI-run gelezen. Zet ze vóór gebruikersacceptatie opnieuw ongelezen klaar zonder andere
  lokale data te verwijderen.
- Nog doen: shards 3 en 4, eventueel docs opnieuw synchroniseren, lokale drie meldingen herstellen,
  verse localhost-GUI bewijzen zonder 15/10-flash, checklist/handoff afsluiten. Zeg pas daarna
  letterlijk `Je kunt nu testen op localhost`.
- Geen commit/push, geen echte mail en geen go-live. Dirty worktree behouden; niet resetten.

- 2026-08-16 00:47 · Copilot: de eerdere groene regressie dekte de zichtbare meldingenacceptatie
  niet. Nieuwe echte browsercase `NOT-H-011` faalt aantoonbaar: na medewerkerslogin toont de oude
  browserseed kort 15, waarna de server naar 1 corrigeert; verwacht zijn drie gekoppelde
  mededelingen en vervolgens `3 → 2 → 1 → 0`. Oorzaak: `database/seed-demo-data.sql` bevatte voor
  Stasjo één gewone melding en geen aan het mededelingenarchief gekoppelde notificaties. Gewijzigd:
  test, serverseed, feature/mapping, FO/TO, werkwijze, checklist, GUI-smoke en versievoorbereiding
  naar v0.9.71. Volgende stap: `NOT-H-011` opnieuw draaien en lokale keten verder valideren.
- 2026-08-16 00:48 · Copilot: `NOT-H-011` is met de echte geïsoleerde testdatabase groen in 3,4 s.
  De test logt in als Stasjo, ziet drie servermededelingen en voert drie echte
  `mark_announcement_read`-writes uit; na iedere readback blijven belbadge, filter en lijst gelijk
  op `3 → 2 → 1 → 0`, waarna alle drie als gelezen in de historie blijven. Gewijzigde bestanden:
  geen aanvullende productwijziging na de seed-/testpatch. Volgende stap: notificatiesuite,
  `npm run check`, GUI-smoke en volledige regressie.
- 2026-08-16 00:56 · Copilot: notificatiesuite 11/11 groen; versiecontract toont overal v0.9.71;
  `npm run check` volledig groen met 213/213 ontwerpgevallen, BDD, databaseconfig en operationele
  veiligheidschecks. De volledige `npm run test:gui-smoke` is eveneens groen en bevat nu verplicht
  `NOT-H-011`. Gewijzigd na de eerste check: ontbrekende featuremapping voor `NOT-H-010`, parservaste
  mapping voor `NOT-H-011` en smokeversietekst. Volgende stap: Living Docs synchroniseren en de
  volledige vier-shard regressie uitvoeren.
- 2026-08-16 01:02 · Copilot: regressieshards 1-3 waren groen (64 + 47 + 55); shard 4 gaf
  50 groen en één timeout in `MOB-H-003` Mobile Safari. Screenshotbewijs toont de juiste
  goedkeuringskaart, maar de test bleef wachten op een redundant intern POST-response-signaal tot
  de totale 30 seconden verstreken. De test controleert nu uitsluitend de zichtbare contractuitkomst:
  klik Goedkeuren en de kaart verdwijnt. Geen timeout verhoogd en geen forced click toegevoegd.
  Volgende stap: `MOB-H-003` gericht op Mobile Safari herhalen en daarna shard 4 opnieuw draaien.
- 2026-08-16 01:20 · Copilot: gerichte Mobile Safari-case en herhaalde shard 4 zijn groen, waarmee
  de volledige regressie 217/217 groen werd. De daaropvolgende echte localhost-GUI-controle
  reproduceerde echter exact de gebruikersbug: bij login bel 15 en mededelingenfilter 10, terwijl
  de server drie echte testmededelingen had; na de eerste leesactie corrigeerde dit naar 2→1→0.
  Oorzaak: `login(role)` renderde de demo-notificatieprojectie vóór de asynchrone serverrefresh.
  Fix: in auth-modus wordt alleen `state.notifications` vóór de eerste app-render geleegd;
  `NOT-H-011` eist nu direct na login een verborgen badge en daarna 3→2→1→0. Volgende stap:
  gerichte test, check, GUI-smoke, regressie en echte localhost-GUI opnieuw uitvoeren.

- 2026-08-15 20:56 · Copilot: `EQ-H-025` gebruikte ten onrechte de volledige lokale auth- en
  bootstrapketen voor een afgebakend frontendcontract. Daardoor liep de case tegen 120 seconden en
  was het brokerscenario nog niet gerenderd. `tests/playwright/email-queue.spec.ts` gebruikt nu een
  smalle deterministische auth/bootstrapfixture, behoudt alle inhouds-, PDF-, badge- en geen-SMTP-
  assertions en heeft weer een timeout van 60 seconden. Gerichte herhaling: 1/1 groen in 5,2 s.
- 2026-08-15 20:58 · Copilot: hetzelfde niet-geïsoleerde frontendpatroon verbruikte de volledige
  30 seconden van `NOT-H-009` vóór de notificatieklik. De case heeft nu een smalle auth/bootstrap-
  fixture; de verouderde GET-response en alle teller-/leegstatusasserties zijn ongewijzigd.
  Gerichte herhaling: 1/1 groen in 3,8 s.
- 2026-08-15 21:01 · Copilot: releasekandidaat is v0.9.69; FO, TO, masterchecklist en afgeleide
  Living Docs zijn bijgewerkt naar 210 Playwright-cases + 1 DB-case = 211 unieke cases.
  `npm run check` is volledig groen. Er is nog niets gecommit/gepusht en geen pipeline gestart;
  eerst volgen lokaal de volledige GUI-smoke en volledige Playwright-regressie.
- 2026-08-15 21:08 · Copilot: eerste GUI-smoke stopte bij `EQ-H-023`, omdat de loopbackpreview
  een gemockte autoritatieve TEST-serverstatus overschreef. `localMailPreviewAvailable()` staat
  preview nu alleen toe wanneer de queueomgeving leeg of `local` is; TEST/PROD winnen altijd.
  De TEST- en PROD-UI-cases gebruiken dezelfde smalle auth/bootstrapfixture. Gericht bewijs:
  `EQ-H-023`, `EQ-H-025` en `EQ-N-024` samen 3/3 groen in 6,4 s. Volgende stap: GUI-smoke herhalen.
- 2026-08-15 21:09 · Copilot: de volledige `npm run test:gui-smoke` is groen op v0.9.69,
  inclusief desktop-, mobiele-, notificatie- en mailomgevingcases. Nog geen commit/push/pipeline;
  volgende stap is de volledige lokale Playwright-regressie.
- 2026-08-15 21:16 · Copilot: volledige regressie rondde 215 uitvoeringen af met 2 failures.
  `INV-N-005` was direct daarna groen; `EQ-N-015` verwachtte nog de oude uitgeschakelde localhost-
  console. De case bewaakt nu het bedoelde contract `enabled=true`, `preview_only=true`, alle vijf
  scenario's gereed, maar POST zonder exacte bevestiging blijft 409. Gericht: 1/1 groen in 886 ms.
  Volgende stap: docs synchroniseren en de volledige regressie opnieuw draaien.
- 2026-08-15 21:23 · Copilot: volgende volledige run leverde 215 resultaten met alleen
  `INV-H-003` rood door een vastlopende `page.evaluate()` tijdens app-bootstrap. De pure API-case
  gebruikt nu bestaande `AuthApi`/`InvoiceApi` request-contexten; alle bedragasserties zijn gelijk
  gebleven. Gericht: 1/1 groen in 897 ms. Volgende stap: volledige regressie opnieuw.
- 2026-08-15 21:48 · Copilot: losse `npx playwright`-runs bleken de reeds draaiende stale lokale
  PHP-server te gebruiken en maakten `INV-H-001` schijnbaar rood. Via de officiële runner met verse
  testdatabase en beheerde server is de ongewijzigde UI-case 1/1 groen in 4,5 s. Een tijdelijke
  readinessprobe is volledig teruggedraaid. Omdat de monolithische run in deze terminal na circa
  2,5 minuut extern wordt gesloten, wordt dezelfde volledige suite nu via twee beheerde shards bewezen.
- 2026-08-15 22:02 · Copilot: de volledige lokale Playwright-matrix is via vier beheerde shards
  volledig groen: 64/64 + 47/47 + 53/53 + 51/51 = 215/215 uitvoeringen. Iedere shard gebruikte
  de geïsoleerde `path_urenregistratie_test`-database en een runner-managed PHP-server. Er is nog
  niets gecommit/gepusht; volgende stap is `npm run ci:local` en het opbouwen van rapportbewijs.
- 2026-08-15 22:03 · Copilot: lokale v0.9.69-eindgate volledig groen. `npm run ci:local` bewees
  releasebuild, `npm run check`, DB-H-001 en 0 dependencykwetsbaarheden. De vier groene shards zijn
  met expliciete Allure-preserve-opt-in samengevoegd tot 215 passed / 0 non-passed; Allure en Living
  Docs zijn opnieuw gebouwd. `git diff --check` en editorfouten zijn schoon. Volgende stap: commit,
  push en vervolgens de TEST-/PROD-releasepipeline volgen; menselijke TEST-mailacceptatie blijft open.
- 2026-08-15 22:35 · Copilot: op verzoek toont LOCAL nu overal (Instellingen, acceptatiescenario's,
  bevestiging, factuur-/brokercontrole, verzendadministratie) expliciet de vaste gesimuleerde
  TEST-ontvanger `giovanno.maatsen@pathconsultancy.nl` naast iedere bedoelde productieroute, met
  "geen verzending". Bedoelde routes zelf blijven ongewijzigd; alleen presentatie via de nieuwe
  `mailAcceptanceDeliverySummary()`-helper. Incident: één gecombineerde patch op `index.html` matchte
  per ongeluk een stale oude editor-snapshot en zou secties (mailacceptatieconsole, verzendadministratie)
  hebben verwijderd; ontdekt via `git diff`/`git cat-file -p HEAD`, direct `git checkout -- index.html`
  en de versiebump daarna los opnieuw met exacte huidige tekst toegepast — geverifieerd met een schone
  diff die alleen 0.9.69→0.9.70 toont. Les vastgelegd in `/memories/repo/build-notes-path-urenregistratie-index-html.md`.
  Releasekandidaat is nu v0.9.70. Gericht bewijs: `EQ-H-025` en `E2E-H-005` groen, volledige smoke groen.
  Volgende stap: docs:sync en de volledige lokale gate (smoke, matrix, ci:local, rapportage) herhalen.
- `node --check assets/app.js`: groen.
- PHP-lints en `php server/scripts/mail-acceptance-policy-check.php`: eerder groen op deze worktree.
- Laatste bekende groene main-release vóór deze lokale wijzigingen: SHA `5b4c4fc2e3fa59df11fb83d4b210ea20a32e0e50`.
- De lokale statusbadge toont zichtbaar `LOKALE MAILPREVIEW UIT`.

## Nog open / eerst oplossen

1. `EQ-H-025` is gericht hersteld en groen; voer nu de resterende lint-, policy-, smoke- en
  regressiegates uit.
2. De regressie voor "alles als gelezen" bestaat al als `NOT-H-009` in `notifications.spec.ts` en `notifications.feature`; controleer hem mee, maak geen duplicaat.
3. Controleer dat de badge op localhost en TEST bedienbaar is, maar op PROD alleen status toont.
4. Besluit vaste ontvangers niet per ongeluk te verwijderen: Boekhouding en Salarisadministratie zijn kernroutes die aangepast/gedeactiveerd kunnen worden; alleen zelf toegevoegde routes zijn definitief verwijderbaar.

## Verificatie vóór commit/push

Voer minimaal uit:

```text
node --check assets/app.js
php -l server/api/mail-acceptance.php
php -l server/mail/acceptance.php
php -l server/scripts/mail-acceptance-policy-check.php
php server/scripts/mail-acceptance-policy-check.php
npx playwright test tests/playwright/email-queue.spec.ts --project=desktop-chromium --grep "EQ-H-025" --reporter=line
npm run check
```

Daarna de relevante GUI-smoke/regressie en pas bij volledig groen: dist/living docs synchroniseren, bewuste versieverhoging, commit, push en pipeline volgen. Niet releasen op basis van alleen lint.

## Documentatie die bij afronding moet worden bijgewerkt

- `FUNCTIONEEL-ONTWERP.md`: localhost preview versus TEST SMTP versus PROD, statusbadgebediening en vaste/koppelbare ontvangers.
- `TECHNISCH-ONTWERP.md`: fail-closed omgevingscontract, localStorage-previewstatus, API/queuegrenzen en regressie-eisen.
- `MASTERCHECKLIST.md`: alleen bewezen groene onderdelen afvinken; resterende SMTP/ketentaken open laten.
- Deze handoff vervangen door de definitieve uitkomst en exacte commit-/run-URL.

## Vaste veiligheidsregels

- LOCALHOST: inhoud/PDF/queue controleren, nooit externe SMTP.
- TEST: echte SMTP uitsluitend via de TransIP-relay en exact de ingestelde sink/allowlist.
- PROD: echte productieroutes, geen TEST-omleiding en geen demo-reset.
- Geen wachtwoorden, tokens of databasegeheimen in Git, logs of documentatie.
