# Handoff voor Claude Code

Bijgewerkt: 28 augustus 2026, Europe/Amsterdam.

## Sessie 28 aug 2026 — Claude Code (nieuwe machine, native MySQL)

Deze sectie gaat vóór alle oudere secties hieronder.

### Omgeving
- Oude laptop stuk; nieuwe Windows-machine, **zonder Docker**. PHP 8.4 (winget), MySQL 8.0.40
  (ZIP, matcht CI), app-DB `path_urenregistratie_test`. Zie `~/.claude/.../memory/dev-environment-this-machine.md`.
- TEST/PROD-DB in VS Code lukt niet (TransIP ProxySQL weigert de DB-Client-driver); phpMyAdmin of
  SSH-shell gebruiken. SSH-sleutel staat op `C:\Users\gchli\.ssh\path_transip`, geregistreerd bij TransIP.

### Vrijgegeven naar TEST deze sessie (TEST staat op 0.9.146)
- **0.9.142** — acceptatieconsole-PDF is de branded lay-out (Path-logo + kopbalk).
- **0.9.143** — factuur-telefoonnummer `0646328283 → 0646328286` (+ migratie `026` voor gedeployde
  data); `{klant}` in het factuurnummer wordt de klantnaam (server `invoices.php` + browser
  `app.js`); client-default `INV-{jaar}-{maand}` gelijk aan de server.
- **0.9.144** — acceptatiemail hangt de **echte** laatst-verzonden factuur-PDF aan wanneer die
  bestaat (`mail_acceptance_real_invoice_attachment()`), alleen met `ACCEPTATIETEST-`-naam.
- **0.9.145** — `#install-banner-accept` had alleen `.button` (geen vulkleur) en was onzichtbaar op
  de donkere balk; nu `button button-primary`. Kwam boven doordat de banner sinds `pwa-install.js`
  weer werkt. `smoke-test.mjs` eist een gevulde knopvariant.
- **0.9.146** — `mail_acceptance_real_invoice_attachment()` weigert nu het lege `test-reset.php`-
  placeholder-PDF (`TESTDOCUMENT`-marker of `< 20 kB` en geen jsPDF); zonder echte factuur valt de
  acceptatiemail terug op het gegenereerde branded NIET-BOEKEN-document. `smoke-test.mjs` bewaakt
  de marker-check.
- CI: `release-pipeline.yml` `Validate` en `Promote Test` draaien nu **4-way gesharded**
  (`strategy.matrix.shard`), ~50 → ~20 min, alle tests blijven draaien.
- `smoke-test.mjs`-guard: geen `action:'lock'` zonder `concept_pdf_base64` in `tests/remote/`.

### TEST-regressie (`tests/remote/`, aparte `playwright.test-remote.config.ts`, tegen de live site)
- Charter in `tests/remote/TEST-CHARTER.md`; scenario's in
  `tests/playwright/features/live-test-regression.feature`.
- Cases: SMOKE-01..04, E2E-01..08, 10..25, 27, 30, 31 = **30 cases, 30/30 groen tegen 0.9.146**
  (`--project=desktop`, 6,6 min). Commit `8bc82e4`. E2E-31 = Marc + Brian via de afrond-flow.
- Helpers in `tests/remote/_helpers.ts`: `createDemoEmployee` (echte klantnaam + eigen sjabloon),
  `createDemoAdmin`, `apiApprove` (deterministische API-goedkeuring — gebruiken voor data-
  integriteitscases i.p.v. de soms-race-gevoelige GUI-knop), `finaliseViaConceptUpload`,
  `assertConceptInvoicePdf`, `currentPeriodKey`.
- Les: verse `createDemoEmployee`-medewerkers gebruiken voor state-machine-cases; `creds.employee`
  (stasjo) raakt binnen een bestand gefactureerd door een eerdere case.

### Bekende blokkade / quarantaine
- **`E2E-H-025`** (`business-workflows-mail.spec.ts`) staat op `test.fixme` sinds 28 aug. Pre-existing
  render-race (twee renderpaden voor de standaardtekstenlijst), geen regressie van deze sessie. Met
  de suite nu gesharded landt hij vaker op mobile-safari in dezelfde shard en faalde daar beide
  pogingen, waardoor de 0.9.144-deploy bleef hangen. Feature blijft gedekt door `E2E-H-024` + de
  settings-/acceptatietests. **Ochtendtaak:** de twee renderpaden ontknopen en `fixme` weghalen.
- **Pipeline-trigger:** alleen een **push** naar `main` draait de deploy-jobs. `gh workflow run`
  (`workflow_dispatch`) laat Promote Test / Deploy Test **skippen**. Niet handmatig cancelen/
  hertriggeren — `concurrency: cancel-in-progress` maakt er een knoop van.

### Nog te doen (ochtend)
- **Acceptatiemail-PDF — GEDEPRIORITEERD door Gio.** Na 0.9.146 zou hij het lege
  `test-reset.php`-placeholder (`simple_pdf_text_document`, ~1 kB, tekst "TESTDOCUMENT") moeten
  weigeren en terugvallen op het gegenereerde branded NIET-BOEKEN-document. Gio meldt "werkt nog
  niet". De guard-logica in `mail_acceptance_real_invoice_attachment()` is nagelopen tegen de echte
  generator in `test-reset.php` en klopt (zowel de `TESTDOCUMENT`-marker als `< 20 kB && geen jsPDF`
  vangen dat placeholder). Meest waarschijnlijke oorzaak: opcache/deploy-versheid op TEST, of getest
  vóór de 0.9.146-deploy klaar was. Echte factuurverificatie loopt hoe dan ook via de flow
  (E2E-04/17/23/30/31, groen). Niet verder achteraan zitten tenzij Gio erom vraagt.
- **`E2E-H-025` uit quarantaine halen**: de twee renderpaden voor de standaardtekstenlijst
  ontknopen (`business-workflows-mail.spec.ts`, zie de comment daar), dan de `test.skip` weg.
- Optioneel meer chartercases (E2E-25 "Overig + Factuur meesturen" is lokaal al `E2E-H-012`;
  een live-versie vraagt route-config-plumbing via `assignment_mail_routes.include_invoice_pdf`).
- Instellingen-hulptekst noemt `{broker}`/`{medewerker}` als factuurnummer-veld; die worden nergens
  ingevuld (server noch browser) — of laten werken, of uit de hulptekst halen. Ontwerpkeuze voor Gio.
- Bevestigen dat de pipeline voor `bbb58dd` (test-only) groen werd.

### Onveranderd: PROD-grens
Niets naar PROD. `Promote Prod` blijft de handmatige gele poort; nooit zelf goedkeuren.

## Actuele Codex-aanvulling — volledige E2E-keten (lokaal, nog niet vrijgegeven)

Deze sectie is de actuele werkoverdracht voor het onderhanden E2E-werk en gaat vóór de oudere
releasehistorie hieronder.

Werkregel van Gio: werk deze sectie tijdens de sprint steeds bij na een groene mijlpaal, een nieuwe
bevinding/blokkade, een relevante ontwerpbeslissing en iedere commit, pipeline- of TEST-status. Wacht
daarmee niet tot het einde van de sessie.

### Opdracht en afgesproken uitvoervolgorde

Gio wil de volledige bedrijfsflow als echte, zichtbare Playwright-GUI-suite kunnen bekijken en zelf
kunnen starten. Iedere businesscase moet op `desktop-chromium`, `mobile-chrome` en `mobile-safari`
draaien en moet niet alleen de DOM, maar ook server-readback, databasewrites, mailinhoud,
ontvangers, onderwerpen, handtekeningen, variabelevervanging, PDF-bijlagen en cleanup bewijzen.

De afgesproken volgorde is:

1. lokaal alle native GUI-tests en isolatie afbouwen;
2. een korte lokale technische preflight uitvoeren (compile/list, isolatie en één login per browser);
3. na een groene lokale poort naar TEST deployen; Gio heeft TEST-publicatie voor deze sprint
   expliciet toegestaan;
4. daarna samen de volledige suite zichtbaar op normale snelheid tegen TEST uitvoeren;
5. na iedere case database en private opslag aantoonbaar schoon achterlaten.

Geen volledige verborgen run vóór de gezamenlijke acceptatieronde. Een kleine gerichte preflight is
wel afgesproken. Commit/push en TEST-deployment zijn na een groene lokale poort toegestaan.

### Permanente releasegrens: TEST en PROD blijven gescheiden

- TEST mag de nieuwste gevalideerde E2E-versie krijgen; PROD blijft bewust op zijn eigen oudere,
  afzonderlijke versie staan.
- Iedere releasepipeline moet na TEST altijd stoppen op de beschermde GitHub-omgeving `prod`, bij
  de handmatige `Promote Prod`-review. De workflow heeft hiervoor `environment: prod`; die
  repository-environmentbescherming mag niet worden omzeild of verwijderd.
- Codex/een opvolger keurt `Promote Prod` nooit goed, start geen afzonderlijke
  productiepromotieworkflow en voert `Deploy Prod to TransIP` nooit uit zonder een nieuwe,
  ondubbelzinnige opdracht van Gio.
- Geen echte productie-mail en geen andere PROD-mutatie. Een wachtende gele PROD-review na een
  geslaagde TEST-deployment is de gewenste eindtoestand, niet iets dat moet worden opgelost.

### Exacte huidige stand

- Werkmap: `path-urenregistratie`; branch `main`; uitgangs-SHA `5fdf8faed2a7`.
- De werkboom bevat bestaande én nieuwe lokale wijzigingen. Niets resetten of blind overschrijven.
- Bronversie staat lokaal op `0.9.139`; TEST stond bij aanvang op `0.9.138`.
- `tests/playwright/features/end-to-end-workflows.feature` bevat **25 scenario's**: H001–H019,
  H022 en N017–N021. Het hoogste nummer is 022; dit is dus niet hetzelfde als het aantal cases.
  Over drie browserprojecten is de beoogde matrix **75 uitvoeringen**.
- H001–H008 bestaan als native browsertests in `business-workflows-e2e.spec.ts`.
- H009–H015 bestaan nog als request/API-tests in `email-queue.spec.ts`; zij moeten nog door echte
  GUI-besturing worden vervangen en daarna een niet-conflicterend API-contract-ID krijgen als de
  onderliggende requesttests behouden blijven.
- H022 is toegevoegd als eerste echte GUI-case met de nieuwe automatische isolatiefixture en is
  groen op desktop Chromium, mobiel Chrome en mobiel Safari. De case bewijst GUI-write/readback,
  gekoppelde DB-rijen en een byte-identieke database-/bestandsbaseline na cleanup.
- H016–H019 en N017–N021 zijn nog niet als native tests gebouwd. De feature beschrijft dus het
  gewenste contract, maar de volledige uitvoerbare dekking mag nog niet als afgerond worden gemeld.

### Reeds lokaal gewijzigd voor deze sprint

- `tests/playwright/features/end-to-end-workflows.feature`: alle gewenste ketens expliciet gemaakt,
  inclusief CRUD-veldmatrix, toegestane en verboden statusovergangen, idempotency, autorisatie,
  mailtemplates, TEST-sinkregels, fysieke PDF-controles en schoonmaakcontract.
- `scripts/run-playwright-e2e.mjs`: iedere run krijgt een unieke tijdelijke private opslagroot;
  server en testoracle delen dezelfde root en de runner verwijdert hem gecontroleerd na afloop.
- `server/scripts/e2e-state-inspect.php`: CLI-oracle voor `_test`-databasefingerprint,
  tabelaantallen, scenario-marker, foreign-keywezen en databasegekoppelde PDF-bestanden.
- `tests/playwright/fixtures/e2eIsolation.ts`: automatische fixture die vóór iedere case de gedeelde
  TEST-baseline herstelt en daarna fingerprint, tabelaantallen, marker=0, scenario-rijen=0,
  wezen=0, geldige PDF-verwijzingen en exact passende private bestanden eist. De browser wordt vóór
  teardown naar `about:blank` gestuurd om polling-/bootstrap-races te stoppen. Voor- en nasnapshots
  worden als JSON aan het Playwright-resultaat toegevoegd.
- `tests/playwright/business-workflows-isolation.spec.ts`: nieuwe H022-GUI-case die via het echte
  medewerkersformulier account, medewerker en opdracht schrijft, GUI-readback en gekoppelde
  databaserijen controleert en de fixture daarna cleanup laat bewijzen.
- `tests/playwright/pages/TeamManagementPage.ts`: gedeeld page-object voor zichtbare Teambeheer-
  navigatie, alle medewerker-/opdracht-/routevelden, create/update/deactivate/delete en beheerder-
  create. Iedere save vangt request, HTTP-response en responsebody af. Dit bestand is als laatste
  stap toegevoegd en is **nog niet gecompileerd of in een case gebruikt**; begin een vervolgsessie
  dus met een gerichte Playwright `--list`/case-run en herstel eventuele TypeScript- of selectorfout.
- `playwright.config.ts`: beide mobiele projecten matchen nu `business-workflows-*.spec.ts`, zodat
  opgesplitste businessspecs niet ongemerkt alleen op desktop draaien.
- Contractveld: lokale applicatie-/API-/migratiewijzigingen bewaren en lezen `contract_label` terug
  (migratie 025). Dit werk zat al in de dirty werkboom en hoort bij de velddekking.
- Mailinspectie: lokale aanzet om niet alleen attachmentbeleid maar bestand bestaan, grootte en
  `%PDF`-inhoud te controleren. Nog gericht verifiëren voordat hierop vertrouwd wordt.

Reeds uitgevoerde goedkope controles na de laatste patches:

- `php -l server/scripts/e2e-state-inspect.php`: groen;
- `node --check scripts/run-playwright-e2e.mjs`: groen;
- `git diff --check`: geen whitespacefouten, alleen bestaande LF→CRLF-waarschuwingen.

De H022-ontwikkeling vond eerst een onjuiste multisetvergelijking voor gedeelde voorbeeld-PDF's en
daarna niet-deterministische auto-increment-ID's in `time_entries` en `timesheet_corrections`.
De TEST-seed gebruikt daar nu vaste ID's; de inspector rapporteert daarnaast fingerprints per tabel.
Eindbewijs: desktop `1/1` groen en mobiele matrix `2/2` groen. Dit bewijst de isolatielaag, nog niet
de volledige nieuwe suite.

### Inhoudelijk dekkingscontract

De uiteindelijke native tests moeten minimaal bewijzen:

- alle velden die een formulier verstuurt komen exact terug uit request, bootstrap, database en GUI,
  of staan met veldnaam en reden in een expliciete uitzonderingslijst;
- aanmaken, wijzigen, deactiveren en definitief verwijderen laten geen gebruiker, medewerker,
  opdracht, route, token, delivery, document of andere wees achter;
- onderwerp, body, vijf handtekeningvelden en eigen/standaardtekst staan exact in de delivery;
  geen onvervangen `{...}` blijft in onderwerp of body staan;
- TEST levert fysiek uitsluitend aan de vaste sink en vaste CC; het bedoelde adres blijft als audit-
  bestemming aantoonbaar. LOCAL doet geen echte netwerklevering;
- `Factuur meesturen` resulteert in een werkelijk bestaand, niet-leeg PDF-bestand met `%PDF-` en
  `%%EOF`; salarisadministratie krijgt exact nul bijlagen;
- documentdownload heeft veilige bestandsnaam en headers en ongeautoriseerde toegang faalt;
- iedere toegestane statusovergang muteert exact eenmaal; stale, dubbelklik, forbidden transition en
  medewerker-adminpogingen laten toestand en tellers intact;
- na iedere case is de oorspronkelijke DB-/bestandsbaseline exact hersteld.

Werkelijke ontvangst in een externe persoonlijke mailbox is geen lokale assertie. Op TEST wordt de
gecontroleerde sandbox/sink bewezen; een echte externe inboxronde blijft een aparte, expliciet
geautoriseerde acceptatiepoort.

### Directe vervolgstappen

1. H022 laten compileren en gericht op desktop uitvoeren; fouten in fixture/inspector oplossen.
2. H022 gericht op mobile Chrome en mobile Safari uitvoeren.
3. De isolatiefixture aan alle businessspecs koppelen en H006 losmaken van het gedeelde
   demowachtwoord.
4. Page objects/helpers bouwen voor Teambeheer, Urenstaat, Werkvoorraad, Facturatie en
   Mailinstellingen; zakelijke writes uitsluitend via zichtbare locators uitvoeren.
5. H009–H021 als echte GUI-tests bouwen, request/DB alleen gebruiken voor voorbereiding,
   read-only oracle, gecontroleerde foutinjectie en cleanup.
6. Dubbele E2E-ID's in `email-queue.spec.ts` en `mail-delivery.feature` opruimen.
7. Pas nadat native specs de bron van waarheid zijn `docs:sync` aanpassen/draaien; de huidige
   generator kent slechts het oude bestand en kan handmatige feature-uitbreidingen overschrijven.
8. Lokale preflight afronden, bevindingen in deze handoff zetten en Gio om deployakkoord vragen.

Status bij de laatste usage-stop: stappen 1 en 2 zijn afgerond (`1/1` desktop en `2/2` mobiel groen),
en `business-workflows-e2e.spec.ts` importeert inmiddels de automatische isolatiefixture. Stap 3 is
dus gedeeltelijk gedaan; H006 moet nog inhoudelijk naar een disposable account. Het page-object voor
stap 4 is aangemaakt maar nog niet geverifieerd. H009–H021 zijn nog niet als native GUI-cases gereed.
Schatting voor afbouw en gerichte regressie: circa 2–4 uur, exclusief de gezamenlijke zichtbare
acceptatieronde. Er is nog niets gecommit, gepusht of naar TEST/PROD gedeployed.

### Aanvulling Claude Code — 24 augustus, na de Codex-sectie hierboven

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

### Bevindingen van Gio uit de handmatige ronde op TEST (24 augustus)

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

## Actuele overdracht — v0.9.138 (24 augustus 2026)

Deze sectie vervangt alles hieronder; de rest van het bestand blijft als historische context staan.

### Waar het staat

| Omgeving | Versie | Toestand |
|---|---|---|
| TEST | `0.9.138` | uitgerold, https://uren-test.pathconsultancy.nl |
| PROD | `0.9.117` | wacht op de goedkeuringspoort van Gio; niet handmatig promoveren |

Werkwijze in deze periode: rechtstreeks op `main`, geen PR's. Elke wijziging krijgt een versienummer,
draait lokaal `npm run check` plus de volledige suite, en gaat daarna de pipeline in.

### Wat er in deze reeks is veranderd

De volledige verantwoording staat in `MASTERCHECKLIST.md` onder *v0.9.133 t/m v0.9.138*. De kern:

1. **Eén regel voor de begeleidende tekst.** Eigen tekst bij de ontvanger wint, anders de
   standaardtekst van zijn soort. De tussenlaag "tekst bij de opdracht" bestaat niet meer — dat is de
   eigen tekst van de broker geworden. Zie het TO, sectie *Welke begeleidende tekst een ontvanger
   krijgt*.
2. **Standaardteksten aanpasbaar** bij Instellingen → Teksten, per soort ontvanger. Tabel
   `mail_channel_templates` (migratie 024). Geen rij = de meegeleverde tekst uit `templates.php`.
3. **Twee bedieningselementen die logen** zijn rechtgezet: de soort ontvanger die stil werd
   overschreven bij opslaan (migratie 023), en het vinkje *Factuur meesturen* dat bij Overig werd
   genegeerd.
4. **E2E is een eigen, draaibare laag** (`npm run test:e2e:group:e2e`). De vier lagen en de
   naamgevingsregel staan in `TESTCOMMANDOS.md`.

### Wat een opvolger moet weten

**De migratieloper knipt op puntkomma, ook binnen commentaar.** Zet dus geen puntkomma in een
toelichting boven een migratie. Dat heeft al een keer een migratie laten falen.

**Kolomtypes volgen de bestaande tabellen, niet `001_core_schema.sql`.** Dat bestand zegt `INT`,
maar de werkelijke schema's gebruiken `BIGINT UNSIGNED`. Een verwijzing met het verkeerde type
weigert MySQL.

**Een test die alleen naar de uitkomst kijkt, kan een echte fout missen.** Bij de standaardteksten is
een opgeslagen tekst die gelijk is aan de meegeleverde aan de buitenkant niet te onderscheiden van
géén opgeslagen tekst — en juist dat verschil is het probleem. Daarom meldt `bootstrap.php` apart
welke kanalen een eigen rij hebben. Controleer bij dit soort werk altijd of je test ook faalt met de
fix eruit; dat is hier drie keer nuttig gebleken en heeft twee zwakke tests aan het licht gebracht.

**Een walkthrough vindt wat asserties niet vinden.** Drie schermfouten (labels naast in plaats van
boven de velden, te kleine tekstvakken, het blok onder het verkeerde tabblad) kwamen door de suite
heen. Schrijf zo'n ronde als schermafdrukken die je zelf bekijkt, niet als verwachtingen — een
assertie controleert alleen wat je al had bedacht.

**Wisselvallige tests hebben hier één terugkerende oorzaak:** wachten op iets wat er toevallig bij
staat in plaats van op wat werkt. Drie gevallen zijn opgelost via `tests/playwright/pages/TopbarMenu.ts`
(`openPaneel`). Het patroon is niet uitputtend nagelopen.

**De TEST-host begrenst verbindingen.** `Verify public TEST account logins` viel twee keer om op een
connect-time-out vanaf de GitHub-runner terwijl de site vanaf elders binnen een tiende seconde
antwoordde; na een kwartier lukte het wel. Het script heeft daarom een herkansing met een luide
`LET OP`-regel. Komt die regel vaker terug, dan is het een firewall- of rate-limitkwestie bij TransIP
— en dat is infrastructuur, dus niet zelf aanpassen.

### Aanvulling Claude Code — 26 augustus

**Een echte bug gevonden en verholpen: een status die na verversen achterliep.**

Bij het bouwen van `E2E-N-020` viel op dat het urenscherm direct na een pagina-verversing
"Correctie nodig" toonde terwijl de server op dat moment `submitted` teruggaf — gemeten, niet
vermoed: het netwerkverkeer laat de lezing én het juiste antwoord zien. Klikte je daarna ergens
anders heen en terug, dan klopte het wel.

De oorzaak zit in `refreshTimesheetReadApi()` in `assets/app.js`. Stuitte die functie op een lezing
die al onderweg was, dan gaf hij `null` terug. `renderHoursGrid()` leidde daaruit af dat er niets te
doen was en tekende níet opnieuw — terwijl die lopende lezing even later wel degelijk een nieuwe
status neerzette. Precies bij het openen van je urenstaat vlak na het laden van de pagina liepen die
twee door elkaar. De functie geeft nu de lopende belofte terug, zodat de aanroeper hertekent zodra
het antwoord er is. Dezelfde fout stond in `refreshCustomerTimesheetReadApi()` en is meteen
meegenomen: daar liet de `null` de takentellers achterlopen.

Dit is vermoedelijk de verklaring voor twee van Gio's bevindingen die tot nu toe niet te reproduceren
waren — "ik vul alle uren in en krijg steeds de melding dat de uren openstaan" en "de urenstaat
gedaan maar kwam niet als taak". Het is een tijdsafhankelijke fout, en dat is waarom hij hem wél zag
en een schone testronde niet. **Niet als afgesloten beschouwen tot Gio het op TEST bevestigt.**

De regressie eromheen is bewust breed gedraaid, want dit raakt kernlogica van de lees-API.

**Een tweede echte bug: een ingediende urenstaat zat alleen in de browser op slot.**

De FO zegt in hoofdstuk 5 (regel 83) dat ook `submitted` vergrendeld is: de medewerker wacht op
Backoffice en komt er pas weer bij na een correctieverzoek. Het scherm deed dat ook netjes. De
server niet: `timesheets.php` blokkeerde alleen `approved`, `invoiced` en `rejected`. Wie de app
omzeilde en rechtstreeks een `save_draft` stuurde, kon zijn uren ná het indienen alsnog aanpassen
zonder dat Backoffice iets merkte.

Dat dit niet eerder opviel, heeft een leerzame oorzaak. De bestaande assertie in `E2E-H-017` stuurde
haar payload in **camelCase** (`expectedVersion`, `dayEntries`), terwijl de API **snake_case**
verwacht. De server antwoordde dus 400 `invalid-payload`, de test zag "geweigerd" en werd groen --
terwijl het slot nooit was aangeraakt. Een assertie die om de verkeerde reden slaagt is erger dan
geen assertie: hij geeft rust die er niet is.

Verholpen in `server/api/timesheets.php`: een medewerker die op `submitted` wil schrijven krijgt nu
409 `timesheet-locked`. Beheerders zijn ongemoeid gelaten. `E2E-N-017` en `E2E-H-017` eisen nu niet
"een weigering" maar exact dat foutcontract, zodat deze val niet terug kan komen.

**Verder in deze ronde:**

- `E2E-N-020` gebouwd (`business-workflows-authz.spec.ts`), 3/3 groen op desktop, mobile-chrome en
  mobile-safari. De case eist niet alleen dat beheerdersknoppen verborgen zijn, maar forceert elk
  beheerdersscherm alsnog open — anders bewijst die lus niets zodra de knoppen ontbreken.
- `npm run test:design` weer werkend gekregen. Twee oorzaken: de scenario-regex accepteerde maar één
  tag per regel, terwijl scenario's nu `@happy @gui @desktop @mobile` dragen; en een aantal
  scenario's had `# Assertioncontract:` in plaats van de vereiste telling. Die tellingen zijn
  **geteld in de specs**, niet geschat.
- ID-botsing opgelost: de nieuwe GUI-scenario's droegen de ID's van de al draaiende API-cases
  `E2E-H-009/010/011`. De draaiende cases houden hun ID; de GUI-varianten zijn `E2E-H-023/024/025`.

### Stand einde 27 augustus — alles groen

**354 passed, 0 failed (15,0 min).** `npm run test:design` groen: 294 cases, 184 happy en 110
negatief, elk gekoppeld aan zijn scenario. Alle 25 E2E-cases draaien op desktop-chromium,
mobile-chrome en mobile-safari.

**Het mobiele probleem met `E2E-H-025` was geen bug.** Onder 700px zijn de instellingenpanelen
bewust ingeklapt (`styles.css` regel 2285): de kop blijft staan en werkt als knop. Het tekstveld
stond er dus wel, met hoogte nul, omdat de test het paneel nooit opentikte. De eerdere inschatting in
de vorige sectie hieronder — "waarschijnlijk een echte bug" — is daarmee weerlegd. Laten staan als
waarschuwing: hoogte nul ziet er van buitenaf uit als een kapot scherm.

**Wel een echte vondst bij het uitzoeken daarvan.** De assertie "opslaan zonder wijziging mag geen
eigen standaardtekst vastleggen" stond groen om niets. `mail_channel_customised` is een **lijst met
kanaalnamen**, geen object, dus `.accountant` was altijd `undefined` en de controle slaagde ongeacht
wat er werkelijk was opgeslagen. Dat is precies de stille freeze-bug uit 0.9.135, met een bewaker die
niets bewaakte. Nu op `.includes('accountant')`.

**Flakiness bij de bron aangepakt, niet weggemaskeerd.** `TS-REV-UI-H-008` viel twee regressies
achter elkaar om, elke keer op een andere stap. Oorzaak overal hetzelfde: klikken en meteen de nieuwe
toestand eisen, zonder de write af te wachten. In een losse run gaat dat net goed, in de volle suite
niet. Vier plekken voorzien van een wachtmoment. Ditzelfde patroon zat ook in de nieuwe mailcases en
in `E2E-N-018`.

Niets gecommit, gepusht of uitgerold. Lokaal 0.9.139; TEST draait 0.9.138.

**Volgende stap, wachtend op Gio's akkoord:** versie bumpen, naar TEST, en daarna de GUI-walkthrough
met schermafdrukken op TEST draaien — daar staat de mailsandbox aan, dus onderwerp, body en bijlage
zijn daar echt te zien. Gio moet daar de drie serverbugs van deze ronde zelf narekenen.

### Stand einde 26 augustus

Alle 25 E2E-cases zijn gebouwd. `npm run test:design` is groen: 294 cases, elk gekoppeld aan zijn
scenario, 184 happy en 110 negatief.

Laatste volledige regressie: **352 passed, 2 failed (15,1 min)**. Beide failures zijn dezelfde case
op dezelfde plek: `E2E-H-025` op mobile-chrome en mobile-safari, in de eerste stap, waar het
tekstveld met de standaardtekst voor Boekhouding niet zichtbaar wordt. Op desktop-chromium is die
case groen.

**Wat daar aan de hand is, voor wie het oppakt.** De lijst met standaardteksten wordt door twee
renderpaden opgebouwd — `renderAll()` en de functie die het instellingenformulier vult — en welke
er wint hangt af van de timing van de serverlezing. Kom je daar net tussenin, dan sta je op een leeg
blok. Een langere wachttijd helpt niet (met 20s faalt hij ook), opnieuw naar Instellingen navigeren
loste het op desktop wel op en op mobiel niet. **Dit is waarschijnlijk een echte bug in de app en
niet alleen een testprobleem**: als het blok op een telefoon leeg kan blijven, ziet Gio daar zijn
standaardteksten ook niet. Eerst reproduceren met de hand op een telefoon, dán pas de test aanpassen.
Niet oplossen door de case desktop-only te maken; dat verbergt precies het probleem.

**Nieuw in deze ronde, alles groen behalve het bovenstaande:** `E2E-N-017`, `E2E-N-018`, `E2E-N-019`,
`E2E-N-020`, `E2E-N-021`, `E2E-H-018`, `E2E-H-019`, `E2E-H-023`, `E2E-H-024`.

**Derde bug verholpen:** de factuur-PDF ging de deur uit zonder `Cache-Control: private, no-store`
en zonder `X-Content-Type-Options: nosniff`, terwijl de klanturenstaat die headers wél had. Juist het
document met tarieven en NAW-gegevens kon dus in een cache blijven liggen. Rechtgezet in
`server/api/invoices.php`.

**Twee testlaagfouten die zelf iets zeiden.** De keuzelijst "type ontvanger" was via `selectOption`
niet te bedienen: de app vervangt die `<select>` door een eigen widget en verbergt het origineel.
Dat pad was dus nog nooit via het scherm getest. En `E2E-H-019` stond groen zonder iets te bewijzen —
de tweede klik leverde helemaal geen tweede verzoek op, omdat de GUI de knop uitzet. Op mobile-safari
komt hij er wél doorheen. De case beproeft de server nu met twee werkelijk gelijktijdige verzoeken.

Niets gecommit, gepusht of uitgerold. Lokaal is 0.9.139; TEST draait 0.9.138.

### Wat openstaat

- **Nog geen executable test:** `E2E-H-018`, `E2E-H-019`, `E2E-H-023`, `E2E-H-024`, `E2E-H-025`,
  `E2E-N-017`, `E2E-N-018`, `E2E-N-019`, `E2E-N-021`. De scenario's staan er volledig; de audit valt
  daar terecht op om. Dat is de eerstvolgende bouwlijst.
- **Drie waarnemingen van Gio zijn niet gereproduceerd:** na Herstel blijft een nieuw aangemaakte
  persoon staan, na aanmaken eerst opslaan en F5 voordat je iets kunt invullen, en verkeerde vinkjes
  na aanmaken. Op een schone database klopt alles, server én scherm. De verklaring die ervoor lag —
  een botsende ontvangersleutel na Herstel — is uitgelokt en **weerlegd**. Meest waarschijnlijke
  resterende verklaring is een oude `app.js` in de browsercache. Wacht op een harde ververs en de
  exacte klikvolgorde voordat je hier iets bouwt.
- **De suite sharden** (825s naar ~210s, zonder een assertie in te leveren). Afgesproken voor ná
  PROD, omdat het verborgen koppelingen tussen tests bloot zal leggen.
- **Fase 16** blijft de enige echte openstaande fase: echte mail op PROD, backup én restore, fysieke
  toestellen, monitoring, rollback en één echte maandronde.

### Vaste afspraken met Gio

- Versienummer ophogen zodra werk werkelijk uitgaat, niet eerder.
- Lokaal testen vóór pushen; geen infrastructuurwijziging zonder overleg.
- Per release vertellen wat er veranderd is en wat hij zelf kan nakijken — beginnend bij welke versie
  er **werkelijk** op TEST draait, en eindigend met wat er níet in zit.
- PROD gaat alleen via zijn eigen goedkeuring in GitHub.

## Startstatus

- Werkmap: `C:\Users\gchli\Documents\path site\Path_Urenregistratie_Veilige_Demo_Path_App`
- Applicatie: `path-urenregistratie`
- Lokale branch: `main`
- Applicatie-release-SHA vóór deze documentatiecommit: `543044d1a3682c750a3b63f11945f2bd9381e748`
- Actuele release in pipeline: `v0.9.101`
- Laatste PR: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/pull/27
- Actieve main-releasepipeline: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/32544919862
- Laatste PR-CI: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/32544839548

PR #26 is gemerged en de PR-CI is groen. Releasepipeline `32541800789` is volledig afgerond met
conclusie `success` voor exact main-SHA `c703ee310455deec409a94a4245d35b761b1e497`. `Validate`,
`Promote Test`, `Deploy Test to TransIP`, `Publish Live Docs`, `Promote Prod` en
`Deploy Prod to TransIP` zijn allemaal groen. Versie `0.9.100` staat daardoor op TEST en PROD.
De TEST-migratie, publieke live-smoke, beide publieke TEST-logins, PROD-cutover en read-only
PROD-live-smoke zijn geslaagd. Onafhankelijke publieke controles geven op beide omgevingen HTTP 200
en versie `0.9.100`; PROD-health retourneert bewust alleen het afgeschermde `{"ok":true}`.
PR #27 is daarna gemerged op main-SHA `543044d1a3682c750a3b63f11945f2bd9381e748`; de bijbehorende
PR-CI is groen en versie `0.9.101` is gestart in releasepipeline `32544919862`. Op het moment van deze
handoff is `Validate` groen en draait `Promote Test`. Deze pipeline vervangt de eerder live gezette
`0.9.100` pas nadat de volgende gates en daadwerkelijke deployments slagen.

Dit handoffbestand wordt met `[skip ci]` als documentatie-only commit toegevoegd, zodat die push geen
extra releasepipeline naast `32544919862` start.

## Wat is opgelost

### Versie 0.9.114 — een stil mislukt wachtwoordherstel

- **`E2E-H-006`** wijzigt een gedeeld demo-wachtwoord. Het herstel in de `finally` was
  voorwaardelijk op een token dat de throttle (drie per kwartier) kan weigeren; dan werd er stil
  niets hersteld en viel alles daarna om met 401. Het herstel faalt nu hard.
- **Zelfde patroon, echte omgeving:** de TEST-uitrol strandde vandaag twee keer op
  `Public TEST login failed for administrator`. Wie een wachtwoord op TEST wijzigt, moet de
  CI-secret `PLAYWRIGHT_ADMIN_PASSWORD` meenemen — of het wachtwoord terugzetten.
- FO aangevuld met de drie nieuwste cases.

### Versie 0.9.109 — verkeerde naam na inloggen, en één begeleidende tekst

Door Gio gemeld: inloggen als Stasjo, daarna kwam hij terug in het menu en zag `Welkom Marc`.

- **Reproduceerbaar voor beide rollen.** `AUTH-H-020` en `AUTH-H-021` doorlopen alle medewerkers en
  beheerders van het bedrijf onder test. Vóór de fix toonde inloggen als Marc `Stasjo van Bakel` en
  inloggen als Joyce een andere beheerder. Het herstelde zichzelf niet, ook niet na 15 seconden.
- **Oorzaak.** Het profiel werd alleen aan de ingelogde gebruiker gekoppeld wanneer de
  servercatalogus leidend was. De demo-hosts (localhost, `uren-test`) houden die catalogus bewust in
  stand, dus daar sloeg de koppeling nooit aan en bleef de standaard demo-selectie staan.
- **Fix in twee delen.** Het profiel volgt nu op elke omgeving de sessie (op `dbUserId`, met het
  sessie-e-mailadres als terugval), en `profileForRole()` gebruikt bij verschil de naam uit de sessie.
  Die tweede regel is het vangnet: `currentEmployee()` viel bij een onbekend id terug op de eerste
  actieve medewerker, en zo werd "onbekend" andermans naam.
- **`AUTH-H-022`** legt vast dat productie niet geraakt werd, zodat het defect aantoonbaar tot de
  demo-hosts beperkt bleef in plaats van dat aan te nemen.
- **Dode verwijzing gevonden:** `employee.demo@example.invalid` krijgt in migratie 005 een
  wachtwoordhash, maar wordt nergens als gebruiker aangemaakt. `admin@example.invalid` hoort bij een
  tweede demobedrijf ("Demo BV"). Beide vallen buiten het bedrijf onder test.
- **Eén begeleidende tekst voor iedere ontvanger.** De opdrachttekst bereikte alleen de broker;
  boekhouding en salaris hielden bewoording die vastzat in `queue.php`. Eén factuur gaf zo drie
  verschillende teksten, waarvan er één aanpasbaar was. `$templateFor($channel)` laat de opdrachttekst
  nu voor elk kanaal winnen. `EQ-H-022` eist dat de drie mails hetzelfde onderwerp uit de opdracht
  dragen; tegencontrole gedaan.
- **Let op bij uitbreiden:** `mail_assert_vars()` laat verzenden falen op een onbekende variabele.
  Een vrij tekstveld zonder die controle kan de facturatie blokkeren.

### Versie 0.9.106 — dry-run-jargon op productie

Op productie waargenomen: wie een resetverzoek deed kreeg `Resetverzoek verstuurd (dry-run). Token:
(zie server) · Geldig tot: onbekend`.

- **Geen lek.** De server geeft op productie geen token terug en maakt er zelfs geen aan zolang
  verzending niet beschikbaar is; `(zie server)` was de fallbacktekst van de browser. De
  enumeratiebescherming bleef intact.
- **Oorzaak.** De frontend testte eerst op `dry_run`. Productie meldt dat óók — echte verzending
  staat daar bewust uit — maar zonder token, waardoor de juiste productietekst nooit werd bereikt.
  De conditie is nu `dry_run && token`.
- **`PWD-N-016`** bootst het productie-antwoord exact na. Tegencontrole gedaan: met de oude code valt
  de test om.
- **Blijft open, en is geen bug:** op productie kan niemand zelf een wachtwoord herstellen zolang
  echte SMTP-verzending daar uitstaat. Dat is Fase 16. Tot dan is doorverwijzen naar Backoffice het
  juiste antwoord, en dat is nu ook wat het scherm zegt.

### Versie 0.9.105 — bedieningselementen verwijderd die niets deden

PR #30 is gemerged. Daarna zijn twee bevindingen uit de scan opgeruimd.

- **Drie schakelaars in Instellingen deden niets.** `Goedkeuring verplicht`, `Factuurnummer
  vastzetten` en `Auditlog bijhouden` werden alleen in het formulier gezet en weer uitgelezen. De
  server heeft er geen kolommen voor en negeerde ze volledig; een beheerder kon `Auditlog bijhouden`
  uitzetten terwijl de server gewoon doorlogde. Vervangen door een read-only lijst. Ze alsnog bouwen
  zou betekenen: drie manieren toevoegen om veiligheidsmaatregelen uit te zetten.
- **Dode renderlaag opgeruimd.** `#open-periods-panel` is in v0.9.16 bewust uit `index.html` gehaald
  toen "Alle open acties per maand" het overnam; de JS en CSS bleven staan. `renderOpenPeriods()`,
  beide click-handlers, de weesknop `Toon volledig team` en de `attention`-scope zijn verwijderd.
  **`openPeriodSummaries()` blijft** — die voedt `adminOpenTasks()`, de opvolger.
- **Herinneringen bewust ongewijzigd.** Het blok is al gelabeld als `Voorbereiding · niet
  automatisch` en dat klopt: er is geen scheduler. Let op bij het alsnog bouwen daarvan: de
  week-, maandeinde-, achterstand- en goedkeuringsinstellingen hebben ook **geen serverkolommen**,
  dus dat vraagt zowel opslag als uitvoering.

### Versie 0.9.104 — instellingenformulier en wachtwoord-vergeten

PR #29 is gemerged. De scan is daarna voortgezet door elk element-id in `index.html` te vergelijken
met wat de tests aanraken. Dat legde één echte bug en één ongedekt scherm bloot.

- **Bedrijfsgegevens konden worden overschreven.** `populateSettings()` stond niet in `renderAll()`.
  Het instellingenformulier werd één keer bij het opstarten gevuld uit de lokaal herstelde state —
  dus vóór de server-bootstrap — en daarna nooit meer. Na een herlaad stonden er verouderde
  bedrijfsgegevens, en `Wijzigingen opslaan` verstuurde exact die verouderde waarden over de juiste
  serverdata heen. Dit verklaart het eerder waargenomen verlies van bedrijfsgegevens. Het formulier
  wordt nu bij elke render gevuld, met een guard die dat nooit doet terwijl iemand erin typt.
- **Waarom niets dit ving:** `INV-ID-H-003` dekte de settings-API, maar bouwde zijn payload uit de
  bestaande waarden. Die case slaagt dus ook als IBAN nooit bewaard blijft. Het formulier zelf werd
  door geen enkele test gebruikt.
- **`INV-ID-H-006`** loopt nu de route van de beheerder en zet de oorspronkelijke waarden in een
  `finally` terug.
- **Wachtwoord-vergeten had nul dekking** — het eerste scherm dat iemand zonder toegang opent.
  `PWD-H-014` bewijst dat een bestaand en een onbekend adres woordelijk dezelfde melding krijgen
  (de server had die enumeratie-guard al; niets bewees dat de UI hem nakwam). `PWD-N-015` dekt het
  overnemen van het inlogadres, het weigeren van een leeg adres en het terugkeren naar inloggen.

### Versie 0.9.103 — mobiele scan

PR #28 is gemerged. Daarna is de volledige applicatie ook op de mobiele weergave nagelopen. De
telefoonsuite dekte de dagelijkse keten al, maar twee schermen die een medewerker juist op een
telefoon opent hadden geen enkele mobiele case.

- **`MOB-H-006`** — een uitgenodigde collega stelt op de telefoon een wachtwoord in. Bewaakt geen
  zijwaartse scroll, tikdoelen van minimaal 40px, de bevestiging `Gelukt!` en de werkende knop
  `Nu inloggen`. Dit is exact het scherm dat in 0.9.102 is gewijzigd; die wijziging was tot nu toe
  alleen op desktop bewezen.
- **`MOB-H-007`** — een medewerker leest een lange mededeling op de telefoon; de volledige tekst moet
  aanwezig zijn en de pagina mag niet zijwaarts scrollen.
- **Let op bij nieuwe mobiele cases:** het mededelingenarchief van een medewerker wordt in
  auth-modus opgebouwd uit `notifications.php`, niet uit `announcements.php`. Een mock op het
  announcements-endpoint heeft daar geen effect.
- **Testrace, geen applicatiefout:** `MOB-H-007` slaagde los maar viel in de volledige suite om op
  een 401 van een urenophaling die met de verse sessie racete. De urenophaling wordt in die case nu
  gestubd. Daarna drie opeenvolgende volledige `mobile-chrome`-runs groen plus `mobile-safari` groen.

### Versie 0.9.102 — volledige applicatiescan

Na een scan van alle schermen bleek Mededelingen het grootste gat: nul geautomatiseerde cases,
terwijl de acceptatielijst er acht punten over bevat. Die scan legde twee echte bugs bloot.

- **Mededelingen versturen was volledig kapot.** `announcements.php` riep `mb_substr()` direct aan;
  op een PHP-installatie zonder de `mbstring`-extensie liep de hele actie stuk op
  `Call to undefined function`. Vervangen door `announcement_truncate()`, met dezelfde
  `function_exists`-guard die `simple_pdf.php` al gebruikte en een UTF-8-bewuste fallback die
  meerbyte-tekens niet halverwege afkapt.
- **Concept verwijderen crashte met een 500 inclusief stacktrace.** De actie wiste alleen de
  `announcements`-rij terwijl `announcement_recipients` en `notifications` foreign keys houden.
  Ruimt nu eerst de gekoppelde rijen op binnen één transactie; de oorzaak gaat naar het serverlog en
  de externe melding blijft generiek.
- De opslagactie ving fouten af en gooide de oorzaak weg, waardoor mislukte opslag niet te
  onderzoeken was. De oorzaak wordt nu gelogd.
- Nieuw `announcements.spec.ts` met `ANN-H-001` t/m `ANN-N-006`.
- `PWD-H-013` doorloopt voor **beide rollen** de volledige toegangsketen: account aanmaken met
  uitnodiging, uitnodiging daadwerkelijk verzonden, wachtwoord instellen via de eenmalige link,
  expliciete bevestiging, en daarna echt kunnen inloggen.
- Na het instellen van een wachtwoord verschijnt nu een duidelijke bevestiging met een knop
  `Nu inloggen`; het scherm schakelt niet meer vanzelf om. Een leeg formulier was voorheen het enige
  zichtbare resultaat van een geslaagde actie en las als "er gebeurde niets".
- Smoke-test uitgebreid met drie bewakingen; FO en TO bijgewerkt.

### PR #27 / versie 0.9.101

- Wachtwoordherstel en uitnodigingen worden nu daadwerkelijk via de maildispatch verzonden in plaats
  van alleen in de lokale queue klaargezet.
- De bijbehorende Playwright- en BDD-dekking en documentatie zijn bijgewerkt.

### PR #26 / versie 0.9.100

- Klanturenstaten accepteren PDF, JPG en PNG tot 2 MB.
- JPG/PNG worden server-side fail-closed naar een geldige PDF geconverteerd.
- Corrupte afbeeldingen, onveilige afbeeldingsdimensies en nep-PDF's worden geweigerd zonder een
  bestaand concept te vervangen.
- De medewerker krijgt de eigen klanturenstaat na login en maandwissel opnieuw uit de server.
- Een oudere GET kan een geslaagde upload niet meer overschrijven.
- De documentactie heet in de gewone klanturenstaatflow overal `Klanturenstaat bekijken`.
- De preview opent inline met een veilige `.pdf`-naam, `Cache-Control: private, no-store` en
  `X-Content-Type-Options: nosniff`.
- Historische ruwe JPG/PNG-records kunnen niet worden goedgekeurd of als PDF worden gemaild; eerst
  opnieuw uploaden is vereist.
- GD en fileinfo zijn toegevoegd aan alle CI-PHP-runtimes; de healthcheck bewaakt beeldconversie.
- De TEST-deployguard verwacht nu dezelfde gesloten mailsandbox als de canonieke configuratie:
  Giovanno als primaire sink en Kenrich als vaste CC.

## Waarom de vorige pipeline faalde

Run `32535972097` was inhoudelijk groen tot de daadwerkelijke TEST-deploy. Een tweede, verouderde
guard in `scripts/deploy-test-remote.sh` stond alleen Giovanno toe, terwijl de actuele TEST-sandbox
Giovanno plus Kenrich als CC vereist. De run stopte vóór cutover: TEST bleef ongewijzigd en er is
geen mail verstuurd. De guard en `scripts/deployment-contract-check.mjs` zijn nu gelijkgetrokken.

## Bewijs

- Volledige lokale Playwright-run: `238/238` groen.
- Volledige GUI-smoke: groen.
- `npm run check`: groen.
- `npm run build`: groen.
- `npm run docs:sync` en `npm run docs:bundle`: groen.
- `npm run test:db:crud`: groen.
- `npm run security:deps`: 0 kwetsbaarheden.
- PHP-lint en shell-syntaxcontrole: groen.

De twee tussentijdse rode tests waren testproblemen en zijn gericht hersteld:

- `MOB-H-003` wacht nu expliciet op de echte `action=submit`-response in WebKit.
- `DASH-N-009` mockt de nieuwe klanturenstaat-readback, zodat echte suitedata de geïsoleerde
  tellertest niet beïnvloeden.

## Belangrijkste bestanden

- `path-urenregistratie/server/api/customer-timesheets.php`
- `path-urenregistratie/server/mail/dispatch.php`
- `path-urenregistratie/server/health.php`
- `path-urenregistratie/assets/app.js`
- `.github/workflows/release-pipeline.yml`
- `path-urenregistratie/scripts/deploy-test-remote.sh`
- `path-urenregistratie/scripts/deployment-contract-check.mjs`
- `path-urenregistratie/tests/playwright/customer-timesheet-api.spec.ts`
- `path-urenregistratie/tests/playwright/dashboard.spec.ts`
- `path-urenregistratie/tests/playwright/mobile-ui.spec.ts`

## Directe volgende stap

1. Volg releasepipeline `32544919862` voor exact SHA `543044d1` tot een terminale status.
2. Ga alleen bij groen verder via de bestaande automatische TEST- en PROD-gates; start geen tweede
   run. Bij rood eerst de exacte job- en steplog lezen.
3. Controleer na een succesvolle deployment dat versie `0.9.101` publiek op TEST en PROD staat en
   dat de health- en read-only live-smokes slagen.
4. Daarna blijft de menselijke mailacceptatie open: controleer op TEST via Instellingen →
   mailacceptatieconsole de vijf routes, inclusief inhoud en bijlagen:

   - Broker: factuur (de klanturenstaat gaat via een eigen verzendflow, niet mee met de factuurmail).
   - Boekhouder: alleen factuur.
   - Salaris/EasySalary: geen bijlage.
   - Wachtwoordherstel.
   - Uitnodiging nieuw account.

**Twee dingen die tijd kosten als je ze niet weet.** De acceptatieconsole stuurt een *gegenereerde*
test-PDF mee (`ACCEPTATIETEST-NIET-BOEKEN-...pdf`), geen echte factuur - die knoppen bewijzen de
leidingen, niet de inhoud van een factuur. En de resetlink is juist wel echt: elke druk op die knop
wist eerst alle bestaande tokens van dat account, dus een tweede druk maakt de link uit de eerste mail
stil ongeldig terwijl die mail er identiek uitziet. Link is 2 uur geldig en eenmalig.

Echte TEST-mail mag uitsluitend naar Giovanno met Kenrich als vaste CC. PROD SMTP-real-delivery
blijft uitgeschakeld; dat is een bewuste veiligheidsinstelling en geen openstaande releasefout.

## Veiligheidsgrenzen

- Geen wachtwoorden, tokens of databasegeheimen in documentatie of logs opnemen.
- De PROD-deploy van exact `c703ee3` is met expliciete toestemming voltooid. Verbreed die toestemming
  niet automatisch naar latere functionele releases; controleer daarvoor opnieuw de actuele scope.
- PROD-mail en verbreding van de TEST-allowlist blijven buiten scope.
- Nieuwe documentatie-only commits bij voorkeur met `[skip ci]`; normale main-pushes starten een
  volledige releasepipeline.
- Verwijder of reset geen andere lokale wijzigingen als die later naast dit bestand verschijnen.
