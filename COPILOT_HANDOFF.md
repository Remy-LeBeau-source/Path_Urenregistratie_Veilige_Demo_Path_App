# Copilot ↔ Codex overdracht

Dit bestand is de gedeelde brug tussen GitHub Copilot en Codex. Chatvensters zijn niet onderling zichtbaar, maar beide assistenten kunnen dit bestand in de werkmap lezen.

## Samenwerking Copilot ↔ Codex

Copilot en Codex kunnen niet rechtstreeks communiceren. Werkwijze:
1. Als Copilot vastloopt of hulp nodig heeft, schrijft hij een **VRAAG AAN CODEX** onderaan dit bestand.
2. De gebruiker plakt die vraag in de Codex-chat.
3. Codex schrijft het antwoord terug als **ANTWOORD VAN CODEX** in dit bestand.
4. Copilot leest het antwoord bij de volgende taakstart.

Codex doet hetzelfde in omgekeerde richting.

## Instructie voor GitHub Copilot

Werk dit document na iedere betekenisvolle stap bij met:

- datum en tijd;
- huidige taak;
- diagnose en bewijs;
- gewijzigde bestanden;
- uitgevoerde tests en resultaten;
- voorgestelde volgende stap;
- eventuele vraag aan Codex.

Verwijder eerdere relevante bevindingen niet. Noteer geen wachtwoorden, tokens of andere geheimen.

## Actuele overdracht

### 2026-08-17 00:11 · Copilot — pipelinefout EQ-H-020 gediagnosticeerd en lokaal groen

- Release Pipeline-run `31975030883`, Validate-job `95233099123`, faalde uitsluitend in `EQ-H-020`.
- Bewijs: build en `npm run check` waren groen; Playwright bereikte alle 227 tests. De assertion verwachtte exact `{ action: "lock", timesheet_id: 881 }`, terwijl v0.9.86 terecht ook `concept_pdf_base64` verstuurt.
- Fix in `tests/playwright/email-queue.spec.ts`: basisvelden via `toMatchObject`, plus inhoudelijke validatie dat Base64 langer dan 1000 tekens is en decodeert naar `%PDF-`.
- Gerichte test: `node scripts/run-playwright-e2e.mjs --project=desktop-chromium --grep EQ-H-020` groen, 1 passed (4.8s).
- Versie opgehoogd en zichtbare labels gesynchroniseerd naar v0.9.87.
- Releasevalidatie: `npm run check` groen; `npm run test:gui-smoke` exitcode 0.
- Volgende stap: commit/push en nieuwe pipeline volgen.

### 2026-08-16 23:54 · Copilot — concept-PDF wordt voortaan exact als mailbijlage gebruikt

- Diagnose: de app-preview/download kwam uit jsPDF, maar mail gebruikte een afzonderlijke sobere servergenerator; daardoor verschilden de twee documenten altijd, ook wanneer GD aanwezig was.
- Fix: `downloadInvoicePdf(..., "base64")` levert dezelfde vormgegeven PDF zonder download; `finalizeInvoiceAndQueueToApi()` stuurt deze mee in het lock-request; de server valideert Base64, `%PDF` en maximale grootte en slaat de bytes op als definitieve mailbijlage.
- Serverfallback blijft beschikbaar voor API-clients die geen browserconcept meesturen.
- Gewijzigd: `assets/app.js`, `server/api/invoices.php`, `tests/playwright/invoices.spec.ts`, releaseversie/docs/checklist naar v0.9.86.
- Tests: syntaxcontrole JS/PHP groen; gerichte `INV-H-010` groen, 1 passed (4.7s); `npm run check` volledig groen; `npm run test:gui-smoke` exitcode 0.
- Volgende stap: commit/push en pipeline volgen; op TEST baseline herstellen vóór nieuwe mailacceptatie omdat `legal_name` handmatig naar `QSI Consultancy B.V.123` was gewijzigd.

### 2026-08-16 23:17 · Copilot — pre-commit GUI-smoke opnieuw groen

- Extra pre-commit validatie gedraaid op verzoek: `npm run test:gui-smoke`.
- Resultaat: command exitcode `0`; meerdere gerichte GUI-smoke scenario's uitgevoerd met runner-managed PHP-server + geisoleerde testdatabase; zichtbare segmenten tonen `1 passed`-blokken en assets laden op `v0.9.85`.
- Doel: laatste regressierisico op zichtbare gebruikersflow beperken vlak voor commit/push.
- Volgende stap: direct commit + push van INV-H-012 fix + versiesynchronisatie.

### 2026-08-16 23:12 · Copilot — INV-H-012 API-route hersteld, volledige regressie groen

- CI-foutoorzaak bevestigd: test `INV-H-012` vroeg `/api/invoices` op en parseerde daardoor HTML (404) als JSON.
- Fix in `tests/playwright/invoices.spec.ts`: endpoint gecorrigeerd naar `/server/api/invoices.php?period=2026-08` in zowel When als Then, plus assertions aangepast naar bestaande velden (`recipient_id`, `employee_name`, `hourly_rate`, `billable_hours`, `subtotal`, `vat_amount`, `total`).
- Bewijs:
  - `npm run check` lokaal groen (smoke + design + bdd-design + db-config + ops).
  - Geisoleerde rerun `node scripts/run-playwright-e2e.mjs --grep INV-H-007 --project=desktop-chromium` groen (1/1).
  - Volledige regressie `npm run test:e2e` groen: **227 passed (4.6m)**.
- Versiesynchronisatie gedaan naar `v0.9.85` in package metadata en zichtbare UI/smoke/live-doc versieverwijzingen.
- Gewijzigde bestanden in deze stap:
  - `path-urenregistratie/tests/playwright/invoices.spec.ts`
  - `path-urenregistratie/package.json`
  - `path-urenregistratie/package-lock.json`
  - `path-urenregistratie/index.html`
  - `path-urenregistratie/scripts/smoke-test.mjs`
  - `path-urenregistratie/scripts/build-live-doc-bundle.mjs`
  - `path-urenregistratie/README.md`
- Volgende stap: commit + push van deze regressiefix en versiebump, daarna CI bevestigen.

### 2026-08-16 17:52 · Copilot — auth-booting guard toegevoegd tegen F5-loginflits

- De login-flits bij F5/herstel werd opgespoord als een eerste-paint/bootstrapprobleem: de login- en app-shell konden al zichtbaar zijn voordat de auth-check klaar was.
- Fix: `index.html` start nu met `body.auth-booting`, `assets/styles.css` verbergt tijdens die bootfase zowel login als app-shell, en `assets/app.js` verwijdert of herstelt die klasse zodra `applyAuthUiMode()` uit `checking` gaat.
- Ook de bestaande auth-state is behouden: in `checking` blijft alles verborgen, in `demo`/`auth` wordt de bootklasse vrijgegeven zodat de smoke weer een zichtbare rolkeuze ziet.
- Gewijzigde bestanden: `index.html`, `assets/styles.css`, `assets/app.js`.
- Uitgevoerde tests en resultaten: de laatste `npm run check` is groen; smoke, design audit, BDD design audit, DB-config precedence en ops-preflight zijn geslaagd op `v0.9.81`.
- Volgende stap: browsermatig opnieuw controleren op F5/herstel of de loginflits echt weg is en of de 9-open-acties baseline behouden blijft.

### 2026-08-16 17:12 · Copilot — pipelinefix gepusht als 0ef86b1

- De `E2E-H-008`-mapping is toegevoegd en alle GitHub Actions-artifactuploads hebben nu expliciet
  `retention-days: 7`.
- De zichtbare versie is opgehoogd naar `v0.9.80` en de smoke-/design-contracten zijn meegedraaid.
- Bewijs: `npm run check` is groen; commit `0ef86b1` staat op `main` en is gepusht.
- Huidige GUI-baseline blijft `9 open acties` met `4 bij Backoffice` en `5 wacht op medewerkers`.
- Volgende stap: alleen nog verder als de gebruiker nieuwe scope vraagt.

### 2026-08-16 17:12 · Copilot — pipelinefix en artifact-retentie afgerond

- De pipelinefaal kwam niet uit de app-logica zelf, maar uit `test-design-audit.mjs`: executable
  case `E2E-H-008` had nog geen feature-/docs-mapping.
- Fix: `E2E-H-008` toegevoegd aan `tests/playwright/features/end-to-end-workflows.feature`,
  `tests/playwright/steps/end-to-end-workflows.steps.ts`, `TEST-BDD-MAPPING.md` en
  `FUNCTIONEEL-ONTWERP.md`.
- Extra hardening: alle GitHub Actions-artifact-uploads in `ci.yml`, `release-pipeline.yml` en
  `live-docs.yml` krijgen nu expliciet `retention-days: 7`.
- Bewijs: `node scripts/test-design-audit.mjs` is weer groen; `git diff --check` gaf alleen de
  verwachte LF/CRLF-waarschuwingen, geen inhoudelijke diff-fouten.
- Huidige GUI-baseline op localhost: 9 open acties, waarvan 4 bij Backoffice en 5 wacht op
  medewerkers.
- Volgende stap: commit/push van deze pipelinefix.

### 2026-08-16 16:59 · Copilot — F5-persistency op open acties nu bevestigd

- De oorspronkelijke freeze is niet meer reproduceerbaar; de Backoffice-flow loopt door na de
  eerder gefixte retry- en schemaherstelstappen.
- Bewijs: live GUI op `http://localhost:8000/#dashboard` ging van `12 open acties` naar `5 open acties`
  en bleef na F5 op `9 open acties` in plaats van terug te vallen naar `12`.
- Gewijzigd: geen code in deze stap; wel de lokale overdrachtsdocumentatie bijgewerkt.
- Uitgevoerde tests en resultaten: `node --check assets/app.js` stond al groen; de browsercontrole na
  reload bevestigde `9 open acties`, `4 bij Backoffice`, `5 wacht op medewerkers`.
- Volgende stap: alleen nog commit/push als de gebruiker dat expliciet wil; functioneel lijkt de
  reload-persistency nu in orde.

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

- Per-opdracht mailonderwerpen en begeleidende teksten zijn server-led via migraties 017/018;
  TEST-reset herstelt ze opnieuw.
- F5 en TEST-Herstel behouden een geldige sessie; geen onnodige terugkeer naar accountkeuze.
- Maandverzending ververst serverfacturen automatisch en de brokerfactuur stuurt nu alleen de
  factuur; de klanturenstaat blijft een aparte taak via de klanturenstaatflow.
- Mobiele werkvoorraad is compacter zonder functies te verwijderen.
- Bewijs: geraakte suites 79/79, F5 1/1, kritieke mail/PDF-ketens 3/3, smoke/build/DB-H-001 groen.

### 2026-08-16 · Copilot — klanturenstaatteksten realistischer gemaakt

- Klanturenstaat-subjects zijn aangepast naar `ter controle` en `voor dossier`.
- De brokertekst eindigt nu zichtbaar met `Path Backoffice` als signatuur.
- Gerichte syntax-, smoke- en API-checks zijn opnieuw groen.

### 2026-08-16 · Copilot — mobiele appvriendelijke layout en subjectcontracten

- De gedeelde app-CSS heeft een compactere mobiele breakpoint gekregen voor rustiger overzicht.
- De klanturenstaat-maandkeuze sluit nu goed en de smoke volgt het nieuwe onderwerpcontract.
- Verificatie: `node scripts/smoke-test.mjs` slaagt.

### 2026-08-16 04:06 · Copilot — v0.9.74 gewone TEST-mailflow gerepareerd

- De gewone factuurflow bleef terecht als bug gemeld op `klaargezet`; alleen de acceptatieconsole
  deed directe SMTP-dispatch.
- Factuurlock genereert nu eerst de definitieve branded server-PDF met Path-logo en dispatcht daarna
  in de beveiligde TEST-sandbox exact de nieuwe broker-/boekhouding-/salarisitems. LOCAL/PROD-grenzen
  blijven ongewijzigd en een onvolledige TEST-aflevering laat de beheeractie open.
- Gericht groen: `EQ-H-020` (3 echte TEST-mails) en `INV-H-004` (logo, Path/QSI, geen conceptmarkering).
- Ook de losse klanturenstaatroute is hersteld: `send_to_broker` gebruikt de officiële PDF van de
  juiste medewerker/periode en dispatcht op TEST alleen naar Giovanno. `EQ-H-026` is 1/1 groen en
  beschikbaar als gerichte mailflow-smoke.
- Volledige GUI-smoke en alle geraakte suites zijn groen: 36/36 mail/factuur + 15/15
  klanturenstaat/bedrijfsketen = 51/51. Nog niet gecommit/gepusht; laatste build/DB/audit volgt.
- Productiebuild, DB-H-001, dependency-audit (0 kwetsbaarheden), v0.9.74-versiecontract en
  `git diff --check` zijn eveneens groen. Commit/push volgt direct.
- Vaste afspraak: iedere release krijgt gerichte regressie op alle geraakte codepaden; volledige
  matrix alleen bij gedeelde kernlogica, breed risico of expliciet verzoek.

### 2026-08-16 03:38 · Copilot — v0.9.73 lokale releasegate volledig groen

- Naast GUI-smoke en 217/217 regressie zijn ook productiebuild, `npm run check`, DB-H-001,
  dependency-audit met 0 kwetsbaarheden, docs-sync (212 Playwright + 1 DB) en `git diff --check` groen.
- De build liet drie eindspaties in het getrackte `dist/index.html` achter; die zijn zonder
  inhoudswijziging verwijderd. Bron en buildartefact voldoen beide aan versiecontract v0.9.73.
- De masterchecklist bevat dit eindbewijs. Nog geen commit, push, deployment of echte mail.
- Volgende stap: commitinhoud controleren, v0.9.73 committen en de branch pushen.

### 2026-08-16 03:35 · Copilot — v0.9.73 regressie 217/217 groen

- Na de groene GUI-smoke zijn alle vier regressieshards opnieuw uitgevoerd op verse geisoleerde
  testdatabases: `64 + 47 + 55 + 51 = 217/217`, zonder failures.
- Dit is het volledige eindbewijs na de individuele meldingenklikfix; desktop, API en beide mobiele
  projecten zijn meegenomen.
- Nog geen commit, push, deployment of echte mail. Volgende stap: build, `npm run check`, DB-smoke,
  dependency-audit en diffcontrole als laatste lokale releasechecks.

### 2026-08-16 03:29 · Copilot — v0.9.73 GUI-smoke groen

- De volledige `npm run test:gui-smoke` is na de individuele leesklikfix opnieuw groen afgerond
  met exitcode 0 op de geisoleerde `path_urenregistratie_test`-database.
- De gate bevat de zichtbare 12-actiebaseline, meldingen `NOT-H-009/010/011`, rolwissel,
  mailpreview/-veiligheid en de geselecteerde mobiele scenario's.
- Werkboom en branch zijn bewust behouden; nog geen commit, push, deployment of echte mail.
- Volgende stap: de volledige v0.9.73-regressiematrix via vier shards opnieuw uitvoeren.

### 2026-08-16 · Copilot — v0.9.73 lokale leesklik gerepareerd

- Gebruiker zag terecht dat één mededeling lezen niet van 3 naar 2 ging.
- Oorzaak: onder LOCAL-resetgezag koos de klik nog de serverwrite, terwijl de resetguard de
  readback blokkeerde. De lokale state wijzigde daardoor niet.
- Individuele belklik, mededelingenklik en `Alles gelezen` gebruiken onder de resetguard nu de
  lokale state; zonder guard blijft de server leidend.
- `NOT-H-010` klikt echt één mededeling en bewijst bel/filter/kaarten `3 → 2`: 1/1 groen in 3,2 s.
- Goedkope eindgate groen: syntax, v0.9.73-smoke, docs-sync en versiecontract. Geen nieuwe dure
  volledige regressie uitgevoerd; geen commit, push, deployment of echte mail.

### 2026-08-16 · Copilot — GUI-smoke na laatste Herstelpatch groen

- `npm run test:gui-smoke` is na de laatste Codex-patch volledig met exitcode 0 afgerond.
- De verplichte meldingenflows `NOT-H-010` en `NOT-H-011` lopen mee; geen deelrun meldde een failure.
- Volgende stap: alle vier regressieshards opnieuw uitvoeren. Nog geen commit, push, deployment of
  echte mail uitgevoerd; localhost wordt pas na de volledige groene eindgate vrijgegeven.

### 2026-08-16 · Copilot — definitieve regressie 217/217 groen

- Alle vier regressieshards zijn na de laatste Herstelmeldingenpatch opnieuw groen:
  `64 + 47 + 55 + 51 = 217/217`, 0 failures.
- Iedere shard gebruikte een verse geïsoleerde `path_urenregistratie_test`-database.
- Volgende stap: de echte localhost-GUI zelf controleren op `Alles gelezen → Herstel → 3` en
  behoud na F5/herlogin; daarna lokale drie-meldingenbaseline klaarzetten voor gebruikersacceptatie.

### 2026-08-16 · Codex — LOCAL Herstelmeldingen gerepareerd, nog niet gepubliceerd

- Na `Alles gelezen` en `Herstel` bleef de teller ten onrechte op nul doordat een geforceerde
  serverrefresh de correcte lokale baseline van drie meldingen overschreef.
- `assets/app.js` respecteert nu bij notificaties en mededelingen opnieuw de LOCAL-resetguard;
  de post-reset forced refresh is verwijderd en login wist de gezaghebbende lokale baseline niet.
  Mark-all-read en zichtbaarheid zijn bovendien tot het huidige profiel beperkt.
- `NOT-H-010` bewijst nu exact `0 → Herstel → 3`, de drie verwachte titels, bescherming tegen een
  late serverresponse met nul en behoud na F5/herlogin. Feature, steps en GUI-smokeselectie zijn
  bijgewerkt.
- Bewijs: `NOT-H-010` 1/1 groen; volledige notificatiesuite 11/11 groen; `npm run check` groen
  (exit 0); `git diff --check` schoon.
- Volledige GUI-smoke en vier regressieshards zijn na deze laatste patch nog niet opnieuw gedraaid.
  De werkboom is bewust dirty gebleven. Geen commit, push, deployment of echte mail uitgevoerd.

### 2026-08-16 · Codex — v0.9.71 gereed voor publicatie

- De meldingenflow is vanaf de eerste loginrender servergestuurd; de oude tijdelijke demo-teller
  `15/10` kan niet meer zichtbaar worden voordat de echte readback arriveert.
- Definitief bewijs: notificaties 11/11 groen, GUI-smoke groen, `npm run check` groen en de volledige
  regressiematrix `64 + 47 + 55 + 51 = 217/217` groen.
- De zichtbare acceptatie `NOT-H-011` controleert exact badge, ongelezenfilter en kaarten voor
  `3 → 2 → 1 → 0`. LOCAL is daarna teruggebracht naar exact drie ongelezen tellertestmeldingen.
- FO, TO, BDD-feature/steps, mapping, werkwijzepatroon, masterchecklist en projecthandoff zijn
  bijgewerkt. Volgende stap is commit/push en GitHub-controle; geen echte mail of handmatige
  productieactie uitvoeren als onderdeel van deze wijziging.

### 2026-08-16 01:24 · Copilot → Codex

- Huidige taak: meldingenflow op localhost werkelijk waterdicht maken. Gebruiker verwacht na een
  nieuwe/vaste baseline drie ongelezen mededelingen en bij individueel lezen exact
  `3 → 2 → 1 → 0`, gelijk in belbadge, filter en lijst. Pas na eigen zichtbare localhostcontrole,
  GUI-smoke en volledige regressie mag worden gezegd: `Je kunt nu testen op localhost`.
- Belangrijkste diagnose: de eerdere regressie miste het echte eerste-loginpad. Een handmatige
  localhost-GUI-run op v0.9.71 reproduceerde exact de klacht: direct na login stond de bel op `15`
  en het mededelingenfilter op `10`, terwijl de server exact drie echte mededelingen had. Na de
  eerste leesactie sprong de UI naar `2`, daarna `1`, daarna `0`.
- Root cause: `login(role)` riep `renderAll()` aan terwijl `state.notifications` nog uit de lokale
  demo-seed kwam. De asynchrone auth/serverrefresh verving die lijst pas later. Fix in
  `path-urenregistratie/assets/app.js`: in auth-modus wordt uitsluitend `state.notifications`
  vóór de eerste app-render geleegd; de bestaande serverrefresh vult daarna de gezaghebbende lijst.
- Testborging: `NOT-H-011` gebruikt de echte geïsoleerde testdatabase, logt in als Stasjo, eist
  eerst een verborgen badge (dus nooit tijdelijk 15), daarna drie servermededelingen en vervolgens
  gelijklopende `3 → 2 → 1 → 0`-standen. De case zit ook in `test:gui-smoke`.
- Baselinefix: `database/seed-demo-data.sql` bevat nu drie aan Stasjo gekoppelde, ongelezen
  mededelingen; zijn bestaande correctiemelding is gelezen historie. Versie is overal v0.9.71.
- Aanvullende testfix: `MOB-H-003` wacht niet meer redundant op een intern POST-response-signaal;
  Mobile Safari controleert de zichtbare postconditie dat de goedkeuringskaart verdwijnt.
- Gewijzigd in deze taak: `assets/app.js`, `database/seed-demo-data.sql`, `index.html`,
  `package.json`, `scripts/smoke-test.mjs`, `scripts/sync-living-docs.mjs`,
  `scripts/build-live-doc-bundle.mjs`, `tests/playwright/notifications.spec.ts`,
  `tests/playwright/mobile-ui.spec.ts`, notifications feature/steps, FO, TO,
  `WERKWIJZE-PATROON.md`, `MASTERCHECKLIST.md`, Living Docs en projecthandoff. Er waren al andere
  dirty wijzigingen; niets resetten of terugdraaien.
- Bewijs: eerste `NOT-H-011` rood met verwacht 3/ontvangen 1 en transient 15; na seedfix groen.
  Volledige notificatiespec 11/11 groen. Na de loginfix `NOT-H-011` opnieuw 1/1 groen in 3,6 s.
  `npm run check` groen: v0.9.71-smoke, 213/213 gemapte cases, BDD, DB-config en ops-checks.
  `npm run test:gui-smoke` exit 0. `MOB-H-003` gericht Mobile Safari 1/1 groen in 11,4 s.
- Regressiestand: vóór de laatste loginfix was 217/217 groen na herstel van `MOB-H-003`, maar dat
  telt niet als eindbewijs. Definitieve rerun ná de loginfix: shard 1 = 64/64 groen, shard 2 =
  47/47 groen; cumulatief 111/217. Shards 3 en 4 moeten nog opnieuw worden uitgevoerd.
- Lokale gebruikersdatabase: drie tijdelijke `Lokale tellertest 1/2/3 van 3`-mededelingen zijn
  transactioneel aangemaakt en tijdens de handmatige GUI-test alle drie gelezen. Voor gebruiker
  opnieuw test moeten exact deze drie veilig naar ongelezen worden teruggezet of opnieuw worden
  aangemaakt, zonder overige lokale data te wissen.
- Volgende stappen voor Codex: (1) shards 3/4 en 4/4 draaien; (2) `docs:sync` indien de feature na
  laatste wijziging nog niet opnieuw is gegenereerd; (3) drie lokale tellertestmededelingen weer
  ongelezen klaarzetten; (4) verse echte localhost-GUI-run uitvoeren en expliciet bewijzen dat er
  geen 15/10-flash is en de reeks 3→2→1→0 klopt; (5) checklist/handoff bijwerken. Pas dan localhost
  vrijgeven. Nog geen commit/push, geen echte mail en geen go-live uitgevoerd.

### 2026-08-12 15:48 · Copilot

- Taak: laatste auth-regressie in de logout-flow oplossen en de lokale eindgate opnieuw bewijzen zonder commit/push/go-live.
- Diagnose: de Playwright-logouthelper was te gevoelig voor een UI-race: het klikpad op `#switch-role` kon worden verlaat voordat de app-shell echt in de logged-out toestand was gekomen. De vaste oplossing is om logout via de authenticated request-context te doen en daarna de pagina opnieuw te laden, zodat de werkelijke server-session en de UI-state samen teruggaan naar de login-shell.
- Bewijs: `npx playwright test tests/playwright/auth.spec.ts --reporter=line` gaf `6 passed (17.9s)`; `npm run check` gaf `Path v0.9.46 volledige smoke test: geslaagd`.
- Gewijzigde bestanden: `path-urenregistratie/tests/playwright/pages/LoginPage.ts`.
- Uitgevoerde tests: `npx playwright test tests/playwright/auth.spec.ts --reporter=line`, `npm run check`.
- Volgende stap: geen commit/push, geen echte mail, geen go-live; lokaal blijft de technische end gate groen, met de resterende Fase-16-externe punten apart als Bundel 2.

### 2026-08-12 14:28 · Copilot

- Taak: productieveiligheidscheck voor SMTP-voorbereiding corrigeren en opnieuw bewijzen dat de veilige mailconfig intact blijft zonder echte verzending.
- Diagnose: de oudere test verwachtte nog een `dry_run` transport, maar de actuele veilige configuratie is bewust `mail.enabled = false` met `transport = smtp_relay` en STARTTLS-gateway; hiermee blijft real mail uitgeschakeld terwijl de productie-setup wel voorbereid is.
- Bewijs: `npm run check && npx playwright test tests/playwright/production-safety.spec.ts --grep "SAFE-H-004"` gaf `Path v0.9.46 volledige smoke test: geslaagd` en `1 passed (450ms)`.
- Gewijzigde bestanden: `path-urenregistratie/tests/playwright/production-safety.spec.ts`, `COPILOT_HANDOFF.md`.
- Uitgevoerde tests: `npm run check`, `npx playwright test tests/playwright/production-safety.spec.ts --grep "SAFE-H-004"`.
- Volgende stap: de resterende Fase-16-externe items als één bundel vastleggen en alleen bij echte external blocker stoppen; geen echte mail of go-live.

### 2026-08-12 13:02 · Copilot

- Taak: Veiligheidscheck `config.example.php` repareren zodat de smoke-test opnieuw slaagt.
- Diagnose: de waarde in `server/config.example.php` staat technisch op `false`, maar niet in de exacte stringvorm die de smoke-test verwacht: ` 'enabled' => false` zonder extra spaties. De assert controleert exact tekst en faalt daardoor.
- Bewijs: `npm run check` faalde met `Error: config.example.php moet mail standaard uitgeschakeld hebben (mail.enabled = false)` bij `scripts/smoke-test.mjs:1496`.
- Gewijzigde bestanden: `path-urenregistratie/server/config.example.php`, `COPILOT_HANDOFF.md`.
- Uitgevoerde tests: `npm run check` nog niet opnieuw gelopen; uitgevoerd na patch.
- Volgende stap: de check opnieuw draaien en eventuele aanvullende regressies afhandelen.

### 2026-08-12 12:46 · Codex

- Taak: MOB-H-003-flakiness in Mobile Safari diagnosticeren en herstellen.
- Hoofdoorzaak: `LoginPage.open()` registreerde `waitForResponse()` pas na `page.goto()`. De auth-response was dan al voorbij, waardoor iedere run stil 20 seconden van de globale timeout verloor.
- Aanvullende race: `LoginPage.logout()` keerde terug vóór de asynchrone `logoutLocal()` het loginscherm zichtbaar maakte.
- Fix: post-`goto` responsewait verwijderd; logout wacht op loginpagina en submitknop; mobiele logoutmock wist de mocksession; onnodige `networkidle`-wacht voor approve verwijderd; AUTH-H-003 bevat nu een vertraagde logoutregressie.
- Verificatie: MOB-H-003 Mobile Safari 10/10; Mobile Chrome 3/3; auth 6/6; volledige mobiele suite 8/8; `npm run check` geslaagd.
- GitHub CLI is lokaal niet aangemeld, dus de remote Actions-check is niet opnieuw uitgelezen.

## VRAAG AAN CODEX

Voer Fase 16 vanaf nu uit als één grote production-readiness sprint.

GEEN microstappen en niet na ieder klein onderdeel stoppen.

Werk zelfstandig alle Fase-16-punten af die:
- in code,
- terminal,
- configuratievoorbereiding,
- scripts,
- Playwright,
- documentatie,
- deployment tooling
kunnen worden uitgevoerd.

Bundel afhankelijk werk logisch samen.

Stop ALLEEN wanneer:
1. ik een externe instelling zelf moet uitvoeren;
2. een geheim/wachtwoord/token nodig is;
3. een bedrijfskeuze ontbreekt;
4. een destructieve productieactie nodig is;
5. echte e-mailverzending of go-live toestemming vereist.

BELANGRIJK:
Vraag mij niet steeds één gegeven tegelijk.

Maak eerst één geconsolideerde lijst met ALLE ontbrekende informatie die je van mij nodig hebt voor de resterende Fase-16-productieconfiguratie.

Voer vóór die vraag alvast alles uit wat zonder mij kan.

Neem in dezelfde sprint minimaal mee:
- SMTP relay implementatie en preflight
- productieconfig voorbereiden
- CORS/CSP/HSTS voorbereiden
- logging + logrotatie
- mailqueue cron
- uploads/PDF buiten webroot
- backup + restore tooling
- demo-data/productieguards
- productieaccounts-flow
- release/go-live runbook
- rollbackrunbook
- productie-smoke/acceptatietests
- Stasjo juli 2026 / 144 uur acceptatiedataset
- broker + boekhouder + EasySalary routing
- volledige relevante regressie
- checklist/Living Docs synchronisatie

Testdata:
Stasjo van Bakel
joycesteenhoven@gmail.com
juli 2026
144 uur

Mail:
From: backoffice@pathconsultancy.nl
Broker: rana.ramjanam@pathconsultancy.nl
Boekhouder: giovanno.maatsen@pathconsultancy.nl
Salarisadmin: gambitizanagi@gmail.com

Routing:
Broker = factuur + klanturenstaat
Boekhouder = factuur
Salarisadmin = alleen naam/maand/144 uur, 0 bijlagen

Facturerende onderneming:
Path Consultancy B.V.

AANVULLENDE UITVOERINGSREGEL:

Werk Bundel 1 volledig zelfstandig af.

Stop NIET voor:
- kleine bugs
- ontbrekende tests
- documentatieverschillen
- configuratievelden die veilig met placeholders kunnen worden voorbereid
- refactors die noodzakelijk zijn om deze Fase-16-scope correct af te ronden

Los die zelfstandig op en ga verder.

Maak onderscheid tussen:
A. technisch voorbereid
B. lokaal aantoonbaar getest
C. extern/productie nog uit te voeren

Markeer een extern afhankelijk punt NIET als volledig uitgevoerd alleen omdat de code ervoor klaarstaat.

Voor onderdelen die TransIP nodig hebben:
- bouw/configureer de applicatiekant volledig;
- documenteer exact welke productie-instelling nodig is;
- verzamel AL die externe handelingen in één eindlijst voor Bundel 2.

Voor SMTP:
- smtp-relay.gmail.com
- poort 587
- STARTTLS verplicht
- IP-gebaseerde relay
- geen username/password
- From backoffice@pathconsultancy.nl
- mail.enabled blijft false
- nog geen netwerkverzending naar echte ontvangers

Voor HSTS:
alleen voorbereiden; niet activeren voordat HTTPS op productie aantoonbaar correct is.

Voor backup/restore:
tooling nu bouwen en non-destructief testen;
geen productie-database terugzetten of overschrijven.

Aan het einde van Bundel 1 wil ik één eindrapport:
1. alles technisch afgerond
2. alles lokaal getest
3. exacte regressieresultaten
4. commit(s) en push
5. pipeline-status
6. alle nog benodigde externe acties in ÉÉN geconsolideerde Bundel-2-lijst
7. alle gegevens/keuzes die je nog van mij nodig hebt in ÉÉN keer
8. voorstel voor de volledige Bundel-3 productieacceptatierun

Geen microvragen tussendoor tenzij je werkelijk geblokkeerd bent.

Nog GEEN echte mail verzenden.
Nog GEEN productie-go-live.
Geen secrets in Git/logs/docs.

### 2026-08-12 21:40 · Codex

- Taak: Fase-16 Bundel 1 volledig technisch voorbereiden en lokaal bewijzen; nog geen echte mail,
  productie-go-live of HSTS-activatie.
- Resultaat: Google Workspace SMTP Relay is fail-closed voorbereid op
  `smtp-relay.gmail.com:587` met verplichte STARTTLS, certificaatcontrole, IP-verificatie en zonder
  gebruikersnaam/wachtwoord. De brokerbundel vereist factuur + klanturenstaat, de boekhouder krijgt
  alleen de factuur en salarisadministratie alleen naam/periode/uren zonder bijlage.
- Operationeel: private storage, atomische mailclaim, offline mailpreflight, productiepreflight,
  database-back-up/herstel, logrotatie, accountprovisioning, eigen wachtwoordwijziging en het
  go-live/rollbackrunbook zijn toegevoegd. Alle gevaarlijke handelingen zijn standaard check/dry-run.
- Regressiefixes: `LoginPage.open()` verspilt geen 20 seconden meer aan een gemiste response;
  logout wacht op de zichtbare login-postconditie; de E2E-runner normaliseert `localhost` naar zijn
  beheerde IPv4-server en lokale/stage-env-bestanden overschrijven expliciete CI-variabelen niet.
  DASH-N-007 vergelijkt alle tellerwaarden atomisch met de concrete zichtbare taakregels.
- Lokaal bewijs: gerichte auth/mail/password/securityset 39/39 groen; DASH-N-007 groen;
  `npm run ci:local` groen (build, smoke, operationele preflights, DB-H-001 en 0 dependency-
  vulnerabilities); volledige `npm run test:e2e` 148/148 groen. Living Docs: 144 Playwright-cases
  + 1 DB-case = 145 unieke cases en 148 uitvoeringen.
- Veiligheidsstatus: `mail.enabled=false`; offline mailpreflight meldde 0 netwerkverbindingen en
  0 databasewrites; HSTS blijft voorbereid maar uit; geen productiegegevens, secrets of echte mails
  gebruikt.
- Volgende stap: scope-/secret-audit, commit en push naar `main`, daarna de Release Pipeline voor de
  exacte commit volgen. Externe Bundel 2 en productieacceptatie Bundel 3 blijven afzonderlijke gates.
