# Copilot handoff — lokale mailpreview en regressieherstel

## Herontwerp-doorwerknotitie — 10 september 2026, 10:20

Deze notitie hoort bij de schone worktree `C:\Path-herontwerp-current` op detached `herontwerp`-HEAD, gerebased op `origin/herontwerp` `5d5241a`.

Gebouwd:
- Persoonlijke standaardweek/standaardmaand voor medewerkers: één knop vult lege, bewerkbare werkdagen volgens `employee.dayHours` of contracturen. Bestaande handmatige uren, 0-uur-dagen en bevestigde dagen worden niet overschreven.
- Knop staat breed: Nieuw Dashboard-weekkaartje, Nieuw Mijn uren en Klassiek Mijn uren.
- Nieuw design opgepoetst: rustigere dagkaartjes, duidelijkere focus/hover en een groen herkenbare standaarduren-actie. Klassiek kreeg dezelfde actie visueel passend in de oude stijl.
- App/PWA-check gedaan: manifest + service worker + iOS home-screen + safe-area + 44px touch targets waren aanwezig; uren/verlof/ziektevelden kregen ontbrekende `inputmode="decimal"` zodat mobiel direct het goede toetsenbord opent.

Lokaal groen:
- `node --check path-urenregistratie/assets/app.js`
- `git diff --check`
- `node scripts/run-playwright-e2e.mjs --project=desktop-chromium --grep "SKIN-H-016"` → 1/1 groen vóór en ná rebase
- `node scripts/run-playwright-e2e.mjs --project=desktop-chromium --grep "SKIN-H-0"` → 19 passed, 1 skipped

Nog doen: commit, `git push origin HEAD:herontwerp`, CI volgen. Let op: `npm run check` is afgebroken omdat `scripts/smoke-test.mjs` opnieuw >90s volledig stil bleef; alle overige check-onderdelen uit de keten zijn los groen gedraaid.

## 10 september 2026, nacht — Claude Code neemt over van Codex (gebruikslimiet)

Codex liep tegen zijn gebruikslimiet aan (zie sectie hieronder) met de
dashboard-zichtbaarheidsfix al klaar maar niet gecommit/gepusht, in een
tijdelijke worktree `tmp/schermherstel` (gebaseerd op herontwerp `37905e8` +
main `97f3168`). Gebruiker vroeg mij het over te nemen.

1. **Codex' dashboardfix afgemaakt, geverifieerd en gepusht naar herontwerp**
   (`0ddd580`): `html[data-skin="new"] #view-employee-dashboard` zette
   `display:flex` onvoorwaardelijk, ook als een andere view actief was.
   Beperkt tot `.is-active`. `SKIN-H-008`/`SKIN-H-009` eisen nu `.view:visible`
   === 1 op elk bezocht scherm. Doorgezocht op hetzelfde patroon elders: geen
   andere schermen troffen dit.
2. **Eigen fout gevonden en gefixt** (`77486d0`): bij het samenstellen van
   commit `0ddd580` sloot ik `tests/playwright/auth.spec.ts` ten onrechte uit
   als "CRLF-ruis" (samen met echt-ruis `.feature`/`.steps.ts`-bestanden),
   zonder te checken dat dit specifieke bestand een van de 5 versie-dragende
   bestanden is. Veroorzaakte een 2x-identieke shard-1-fail op herontwerp-CI
   (`set-version-check.mjs`, Codex' eigen main-fix, draait bewust alleen op
   shard 1) — leek eerst op een flake, bleek dat niet te zijn. Herontwerp-CI
   nu volledig groen (8/8).
3. **Nieuwe, losstaande bug gevonden n.a.v. gebruikersmelding** ("uren boeken
   en refresh F5 gaat fout, ook bij oud design"): bevestigd, root cause en fix
   in `BESLISTABEL.md` R20. Kort: `scheduleDraftTimesheetWrite()` had geen
   `beforeunload`-bescherming tegen zijn eigen 700ms-debounce. Fix + regressie
   `[E2E-H-028]` op **main**, nog niet naar herontwerp gemerged op moment van
   schrijven (volgt via de normale merge, gedeelde code dus geen apart risico).
4. Cross-sessie samengewerkt met de herontwerp-peer (`path-herontwerp-actief-2b`)
   via `SendMessage` — geen overlap, beide kanten bevestigd.
5. **Twee UI-testfeedback-items met screenshots opgepakt (v1.0.50):** (a) de
   week-knoppenrij in Mijn uren toonde op mobiel geen betrouwbare "je kunt
   hier schuiven"-hint — de native overlay-scrollbar bleef onzichtbaar tot
   actief aanraken; eigen altijd-zichtbare balk toegevoegd
   (`#hours-week-scroll-track`/`-thumb`). (b) de 0/8/9-snelkeuzeknoppen
   bestonden al in Nieuw se bento-kaartjes maar alleen bij de actief
   gefocuste dag, en in Klassiek helemaal niet; nu in beide skins altijd
   zichtbaar per dag (gebruiker koos expliciet voor "altijd zichtbaar" bij
   een tussenvraag). Zie `BESLISTABEL.md` R21/R22 voor het volledige verhaal,
   inclusief een bijkomstige `<label>`→`<div>`-correctie in de klassieke
   celmarkup om een dubbele klik-doorzetting naar het inputveld te voorkomen.
   Nieuwe regressies `[MOB-H-002]` (uitgebreid) en `[SKIN-H-025]`.
6. **D4 (BESLISTABEL) afgerond, op expliciet verzoek gebruiker (v1.0.51):**
   de sub-seconde inlogscherm-flits bij een al-ingelogde gebruiker (F5 of
   eerste bezoek). `applyAuthUiMode()` ontgrendelde `#login-screen` altijd
   meteen zodra `mode` van `"checking"` naar `"auth"` omsloeg — óók vlak
   vóórdat bleek dat er al een geldige sessie was, wat het scherm heel kort
   liet flitsen vóór `login()` alsnog het dashboard toonde. Nu blijft
   `#login-screen` verborgen voor `mode === "auth"` totdat `login()`/
   `logoutLocal()` (beide synchroon in dezelfde auth-callback) expliciet
   bepalen wat zichtbaar wordt. Bestaande regressie `AUTH-N-009` dekt dit
   al en bleef groen in isolatie (bevestigd 2x); in de volle `auth.spec.ts`-
   batch op deze machine faalden zowel deze als een wisselende reeks
   ongerelateerde auth-tests herhaaldelijk door lokale omgevingsdruk (stale
   PHP-server op poort 8000, `Unknown database`-fouten) na uren aaneen
   Playwright draaien — niet door de wijziging zelf, telkens ontkracht via
   isolatie. Zie BESLISTABEL.md D4.
7. **Cross-sessie:** herontwerp-peer vond een gedeelde-code databug
   (`syncInvoiceStatusesFromApi()`, `assets/app.js:3508`) — `invoiceStatus`
   kan los van `timesheetStatus` naar `"simulated"` springen. Financiële
   logica, bewust niet blind gepatcht door beide kanten; vastgelegd als
   BESLISTABEL R23 (cross-branch, zodat main dit niet mist), wacht op een
   concrete falende testcase voor iemand er verder induikt.

## 10 september 2026 — vervolg door Codex: main en alle schermen

- Gebruiker vraagt main en herontwerp gezamenlijk af te werken, inclusief alle
  beheer- en medewerkersschermen. Actief eigenaarschap in deze sessie:
  `scripts/set-version.mjs`, de bijbehorende CLI-regressie en schermdiagnostiek.
- De oude werkboom `C:/Path-herontwerp-actief` bevat een omvangrijke stale dirty
  diff. Die is intact gelaten. Actuele remote herontwerp heeft dezelfde
  `assets/app.js` en `assets/styles-new.css` als main; extra commits zijn docs/merges.
- W10 gerepareerd: versie-vervanging raakt geen IP-adressen of langere getallen
  meer, en alle bestanden worden gevalideerd vóór de eerste write.
  `scripts/set-version-check.mjs` bewijst dit via de echte CLI in tijdelijke
  fixtures, inclusief behoud van dependencyversies en CRLF. Gerichte check groen.
- R18: `E2E-H-024` op desktop Chromium 3/3 groen (2,1 minuten) en Safari 3/3
  groen (2,7 minuten), zonder authwijziging. `npm run check` en build groen.
- Run `34420611936`: Validate 8/8, Promote Test 8/8 en TEST-deploy groen.
  Alleen de handmatige PROD-promotiejobs eindigden zonder deployment.
- Volgende stappen: Safari afronden, alle schermen fotograferen/controleren,
  bevindingen herstellen met regressie, lokale gates afronden, daarna branchsync
  en CI/TEST. Nog geen commit of push vanuit deze vervolgsessie.

## Vervolgsessie op main, 10 september 2026, nacht — na de 20:46/23:xx-sessie

Bouwt voort op de sessie direct hieronder (die tot commit `2d96ca4`/v1.0.46,
run `34414073007` kwam). Alles op `main`, laatste stand v1.0.47, commit
`b35d427` (Promote Test loopt op moment van schrijven; Validate volledig
groen, incl. shard 8/mobile-safari in één keer).

1. **Nog een vierde losstaande "exact N ontvangers"-plek gevonden en
   gefixt** in dezelfde `deploy-test-remote.sh`/`deployment-contract-check.mjs`-
   lockstep als hierboven al genoemd (item 4 van de vorige sessie) — bevestigd
   werkend: de live TEST-deploy die eerder faalde op
   `"TEST mail is neither closed nor protected by the exact sandbox allowlist"`
   liep hierna door.
2. **BESLISTABEL R17-R19 toegevoegd**, deels via cross-sessie-samenwerking met
   de herontwerp-peer (`path-herontwerp-actief-2b`):
   - **R17**: Validate-shard 8 se instabiliteit is nu *hard bevestigd* (niet
     langer een vermoeden) via `npx playwright test --list --shard=N/8`:
     shard 8 = 100% `mobile-safari`, shard 1 = 100% `desktop-chromium`, shard 7
     = vrijwel volledig `mobile-chrome`. Playwright's `--shard` knipt gewoon de
     `projects`-declaratievolgorde in gelijke stukken, zonder te wegen naar
     snelheid/betrouwbaarheid — vandaar dat shard 8 stelselmatig het langst
     duurt en het vaakst een andere, ongerelateerde test laat flakeren. Een
     structurele verbetering (projects-volgorde interleaven) is bewust *niet*
     doorgevoerd — raakt `playwright.config.ts` + sharding-aannames in alle 3
     workflows, te risicovol zonder overleg.
   - **R18**: `E2E-H-024` (wachtwoordreset via GUI) faalde hard (2/2, niet
     "flaky") met een leeg + verborgen feedback-element. Concreet, tweelaags
     mechanisme gevonden in `assets/app.js` (`showPasswordResetForm()` wordt
     twee keer aangeroepen rond de asynchrone `initializeAuthSession()`, en
     kan zelf nogmaals `logoutLocal()` triggeren als die async check een
     resterende sessie aantreft) — **niet bevestigd als dé oorzaak** zonder een
     gevangen trace, en bewust niet blind gefixt (raakt auth-opstartcode voor
     elke login/reset-pagina). Zie BESLISTABEL voor het volledige spoor.
   - **R19**: Stasjo's screenshot-feedback ("knop om Classic/Nieuw te
     wisselen") bleek al te bestaan en al te werken (`#quick-skin-toggle`,
     `toggleQuickSkin()`) — probleem was puur herkenbaarheid op mobiel (geen
     hover-tooltip, pictogram zei niets over "wisselen"). Rasterpictogram (◫)
     vervangen door wisselpictogram (⇄) in `assets/app.js` én `index.html`,
     v1.0.47/commit `b35d427`. Andere icoon-only knoppen in de app nagelopen
     (☀/☾ voor licht/donker, ↶ voor Herstel demo, ✓/↓/⇧ met werkwoordlabels) —
     geen vergelijkbaar probleem gevonden, dus verder niets aangepast.
3. **R16 uitgebreid**: een Release Pipeline-run die verder groen is en alleen
   nog op de handmatige `Promote Prod*`-poort wacht, is een *afgeronde*
   toestand, geen "nog bezig" — nooit op blijven pollen. Een later
   overschreven wachtende PROD-poort (door een nieuwere push, via de
   concurrency-lock) kan bovendien als `failure` tonen zonder dat er iets
   misging. Onafhankelijk hetzelfde ontdekt door de herontwerp-peer (hun
   `HANDOFF-CODEX-FASE-D.md` §8b) — via `SendMessage` cross-sessie
   uitgewisseld en op beide takken vastgelegd.
4. **Geen andere onafgeronde code-wijzigingen op main.** Eerstvolgende stap
   voor wie dit oppakt: CI-run `34420611936` (v1.0.47) volgen tot Promote
   Test/Deploy Test to TransIP groen zijn (Validate stond al volledig groen);
   daarna gewoon door met de volgende openstaande melding/feedback als die
   er is — er lag op het moment van schrijven niets concreets meer open.

## Vervolgsessie op main, 9/10 september 2026, nacht — na de 20:46-sessie

Alles hieronder bouwt voort op de 20:46-sessie (direct hieronder). Alles staat
op `main`, v1.0.46, commit `2d96ca4`, CI-run `34414073007` loopt.

1. **Kristel's punt 1-3 (tekstinkortingen) alsnog gecommit** — stonden nog
   open aan het eind van de 20:46-sessie, zijn afgerond in v1.0.41.
2. **Kristel's punt 4 (klanturenstaat-statuslijst per maand) gebouwd.**
   "Mijn maanden" (de historietabel) heeft nu een eigen kolom "Klanturenstaat"
   naast "Status", met een eigen statuspil per rij
   (`customerTimesheetStatusPill`) — niet gelijk aan de urenstatus. CSS-
   valkuil: de nieuwe kolomregel op `#employee-history.has-...-column` heeft
   hogere specificiteit dan de bestaande mobiele breakpoint-regels op
   `.employee-history-row`, dus die kregen een even specifieke tegenregel in
   alle 3 breakpoints. Regressietest `DASH-H-025`.
3. **Stasjo (echte tester) mag tot 2 jaar vooruitkijken.** Was hard
   afgekapt op de kalendermaand van nu (server + client) om fantoom-
   opentaken te voorkomen; `employeeOpenMonthSummaries()` is daar
   onafhankelijk van al hard op de échte kalendermaand gekapt, dus veilig
   los te trekken. `maxEmployeeFuturePeriodKey()` (client) + `+2 years`
   (server, `timesheet_require_employee_period_access()`). Terugkijken
   (startdatum-grens) blijft ongewijzigd. Bijgevonden bug tijdens het bouwen:
   een ongeclipte `+2 jaar` overflowt de 4-cijferige periodesleutel-
   stringvergelijking bij een gemockt jaar 9999 (`smoke-test.mjs`) —
   `Math.min(jaar + 2, 9999)` verhelpt dat structureel voor elke aanroeper.
   Regressietests `DASH-H-006`/`DASH-H-007` (herschreven, waren datum-drift-
   gevoelig) + `ROLE-N-005`.
4. **Stasjo mag op TEST écht zijn eigen wachtwoordreset ontvangen, alléén
   dat kanaal.** Zie BESLISTABEL.md R15 voor het volledige ontwerp en de
   bekende beperking (zijn echte adres overleeft geen TEST-deploy-reseed).
   Kostte drie deploy-iteraties om alle **drie** losstaande hardcoded
   "exact N ontvangers"-checks te vinden die met de nieuwe 3e ontvanger in
   lockstep moesten: `production-safety.spec.ts` (SAFE-H-013, v1.0.43),
   `server/scripts/test-preflight.php` (alleen zichtbaar tijdens een échte
   TEST-deploy, v1.0.45), en — pas gevonden via de daadwerkelijke faalregel
   in de deploy-log, niet geraden — een inline PHP-validatie in
   `scripts/deploy-test-remote.sh` zelf, met een eigen lockstep-regex in
   `scripts/deployment-contract-check.mjs` (v1.0.46). Bij een volgende
   uitbreiding van de TEST-mailallowlist: zoek op
   `kenrich.lieveld@pathconsultancy.nl` om alle plekken in één keer te
   vinden.
5. **Regressie van de peer-sessie (herontwerp) opgepakt:** het oude
   klassieke hero-blok (`.employee-hero`, "Mijn werkvoorraad" /
   "Uren verder invullen"-knop) was weer zichtbaar op het Dashboard in
   Nieuw skin, door een eerdere main-commit (`3dba199`) die het aan de
   zichtbare uitzonderingen toevoegde zonder te checken dat de al bestaande
   `#employee-open-overview`-kaart exact dezelfde "welke maanden staan
   open"-behoefte al in bento-stijl dekte. Teruggedraaid (v1.0.46);
   `SKIN-H-021` bijgewerkt naar `.employee-hero` = verborgen.

Geen andere onafgeronde code-wijzigingen op main op dit moment; CI-run
`34414073007` volgen tot groen is de eerstvolgende stap voor wie dit oppakt.

## Vervolgsessie op main, 9 september 2026, 20:46 — na REM-H-001-fix

Onderstaande bouwt voort op de REM-H-001-sessie hieronder (06:00). Alles hier
staat op `main`. `herontwerp` is via de bestaande merge-queue steeds
bijgewerkt en zit tijdens het schrijven synchroon met `main`.

### Gepusht en groen (Validate + Promote Test) op main

1. **Weekend-uren-weigering (v1.0.34, commit 44c49d3).** De client sluit
   weekenddagen al structureel uit van het weekraster
   (`periodFromKey()` in `assets/app.js`), maar de server controleerde de
   weekdag van `work_date` nooit. `timesheet_parse_day_entries()` in
   `server/api/timesheets.php` weigert nu za/zo met HTTP 400
   `invalid-payload`. Regressietest `TS-REV-API-N-001`.
2. **Collaterale testdata-fix (v1.0.36, commit 74cab7d).** Bovenstaande fix
   brak testdata in 6 bestanden die toevallig een za/zo als `work_date`
   konden kiezen (willekeurige toekomstmaand + vaste dag 1/2, of de echte
   huidige periode zonder werkdagcheck). `candidatePeriods()` filtert nu op
   ma-do voor dag 1; twee losse bestanden (`business-workflows-lock/
   status.spec.ts`) kregen een `eersteWerkdagInPeriode()`-helper omdat ze de
   échte lopende periode gebruiken i.p.v. een toekomstmaand.
3. **Sticky-topbar-scroll-margin-fix (v1.0.37, commit b501f1c).** De
   settings-section-nav-sprongknoppen (Instellingen) en de
   dashboard-werkvoorraadknoppen sprongen naar een kop die vervolgens
   verstopt zat achter de 88px hoge sticky `.topbar` (`scroll-margin-top:
   18px` was veel te weinig). Nu 104px (desktop) / 300px (mobiel, topbar
   daar ~292px gemeten). Regressietests `ADM-WR-H-021`/`ADM-WR-H-022`. **Let
   op:** twee andere kandidaten (`employee-open-overview`,
   `dashboard-team-title`) leken op hetzelfde probleem maar bleken bij
   screenshotcontrole geen bug (topbar is op die scrolldiepte zelf al
   voorbij beeld) — niet blind hetzelfde patroon toepassen zonder eerst te
   verifiëren.
4. **CI-installatiefix voor een Google-storing (v1.0.39→v1.0.40, commits
   218dfd5 → 96a1d10).** Alle 8 Validate-shards faalden identiek op `Install
   Playwright browser` door een "Hash Sum mismatch" in Google's eigen,
   ongebruikte `dl.google.com/linux/chrome-stable`-apt-bron (wij
   installeren nooit echte Chrome, alleen chromium/webkit). Eerste poging
   (de bron vooraf verwijderen) werkte niet — playwright's `--with-deps`
   voegt 'm zelf weer toe. **Definitieve fix:** een retry-lus (3 pogingen,
   15s pauze) rond de hele installatiestap, in `release-pipeline.yml` (5x),
   `ci.yml` en `live-docs.yml`. Bevestigd werkend: run 34387943271 liep
   daarna 0 mislukte jobs door Validate + Promote Test heen.
5. **Dataverlies-fix, gevonden door de herontwerp-sessie, binnengehaald via
   de merge-queue (commit b953b5c).** `timesheet_write_entries()` deed een
   blinde delete-then-reinsert van alle `time_entries` van de maand bij elke
   opslag. De nieuwe-skin bento stuurt per opslag alleen de actief bekeken
   week volledig (incl. bewuste 0-uur-dagen), andere weken alleen uren > 0
   — een bewust opgeslagen 0-uur-dag in een niet-actieve week werd zo bij de
   volgende opslag stilletjes gewist. Fix: upsert per dag (unique key
   `timesheet_id+work_date+entry_type`) voor billable-regels; verlof/ziekte
   blijven delete-then-insert (altijd een volledig maandtotaal, dus veilig).
   Regressietest `TS-API-H-017`.
6. **PROD-herinneringen alsnog geactiveerd.** Nieuwe environment
   `prod-cron` (géén `required_reviewers`) met eigen SSH-secrets +
   `TRANSIP_SSH_HOST`/`USER`-variabelen. Eerste tick faalde op een lege
   `TRANSIP_SSH_KNOWN_HOSTS`-secret (PowerShell + `ssh-keyscan` gaf stil
   niks terug) — gecorrigeerd door de host-regel uit Gio's eigen
   `~/.ssh/known_hosts` te hergebruiken. **Nog niet opnieuw succesvol
   getikt** op het moment van schrijven — GitHub's `schedule`-trigger is
   bekend vertraagd/onbetrouwbaar op publieke repo's, dit is geen
   codeprobleem. Volgende sessie: check `gh run list --workflow=
   send-reminders.yml --limit 3` voor de eerste echte groene PROD-tick.
7. **Belangrijke ontdekking, geen code-actie nodig:** PROD-mail staat al op
   `production_mode: live` (niet `pilot`/`disabled` zoals het go-live-plan
   beschreef) — dus al open voor alle echte adressen, bevestigd met echte
   `sent`-regels uit `email_deliveries` voor twee echte accounts. Zie
   BESLISTABEL.md R10.

### Vastgelegd, bewust niet (verder) gefixt — zie BESLISTABEL.md R11-R14

- PWA-installatiebanner-overlap op korte mobiele pagina's: bewust laten
  staan (al goed ingeperkt: 12s auto-hide, één tik weg, 30 dagen stil
  daarna; een sluitende fix kost blijvend scrollruimte voor iedereen).
- `SKIN-H-008` is een bekende, zeldzame flake (~1 op 10 lokale runs). Root
  cause niet gevonden ondanks 10 reproductiepogingen — geen foutdetail
  kunnen vastleggen. Niet blokkerend (CI `retries: 1` vangt het op). Een
  volgende sessie met een gevangen failing run (screenshot/trace) kan dit
  sneller afmaken dan blind verder proberen.

### Openstaand bij het schrijven van deze handoff

- **Tekstinkortingen n.a.v. echte testerfeedback (WhatsApp, Kristel/Path
  Testteam).** Drie stukken uitlegtekst ingekort omdat ze "onoverzichtelijk"
  werden gevonden (te veel tekst die vanzelf spreekt):
  1. `#hours-target-help` (Mijn uren): "Enter slaat tussentijds op en gaat
     verder" eruit, kernboodschap ("blokkeert indienen nooit... alleen
     {periode} wordt ingediend") blijft.
  2. `#employee-open-overview-note` (dashboard "Open acties per maand"):
     volledig verwijderd — dupliceerde de `N open acties`-tekst die al in
     de kaart eronder staat (element + de JS die 'm vulde beide weg).
  3. Mededelingen-archief-intro: laatste zin over wijzigen/intrekken-gedrag
     eruit, kern (waar vind je urenstatussen/correcties/herinneringen wél)
     blijft.
  `scripts/smoke-test.mjs` had een exacte-tekst-assertie op punt 1,
  bijgewerkt naar de nieuwe kortere tekst. **Nog niet gecommit** —
  `node scripts/smoke-test.mjs` en de gerichte specs (`dashboard.spec.ts`,
  `announcements.spec.ts`) liepen nog op het moment van schrijven. Los
  daarna alsnog `npm run docs:sync`, versiebump, commit, push.
  - Kristel's vierde punt (aparte klanturenstaat-statuslijst over meerdere
    maanden, zoals "Sept - ingediend, Okt - open") bestaat nog niet en is
    een apart, klein feature-idee — niet opgepakt, alleen bevestigd dat het
    geen duplicaat is van de bestaande per-maand-urenstatus in "Mijn
    maanden".
- Geen andere onafgeronde code-wijzigingen op main op dit moment.

## REM-H-001 en TEST-inlog structureel opgelost — 9 september 2026, 06:00

Na een hele nacht symptomen bestrijden (retries, extra isolatie) is de échte
oorzaak van REM-H-001's alleen-op-CI flakiness gevonden en gefixt, plus twee
losstaande problemen die pas zichtbaar werden zodra Validate weer groen ging.
Zie BESLISTABEL.md sectie 9, regels R7–R9 voor de volledige analyse. Kort:

1. **REM-H-001 (R7):** `server/scripts/cli-bootstrap.php` las voor losse
   CLI-scripts (o.a. de herinneringen-scheduler) alleen het statische
   `server/config.local.php`, terwijl de Playwright-harness de webserver via
   `PATH_APP_DB_NAME`/`PLAYWRIGHT_DB_NAME` naar een geïsoleerde testdatabase
   stuurt. `ops_database_config()` volgt nu dezelfde env-var/dotenv-
   precedentie als `auth_db_from_config()` in `session.php`. Gevonden via een
   tijdelijk debug-script (weer verwijderd) dat db-naam/host/poort/
   connection-id vergeleek tussen webserver en CLI-aanroep.
2. **Publieke TEST-inlogsmoke faalde daarna apart (R8):** een verouderde
   `test`-environment-scoped GitHub-secret `PLAYWRIGHT_ADMIN_PASSWORD`
   (voorrang op de recentere repo-brede secret) en migraties 032/033 die op
   TEST al als "applied" stonden gemarkeerd met oude inhoud (migratierunner
   trackt op bestands-id, niet op inhoud) — gecorrigeerd resp. met
   `gh secret set --env test` en een verse migratie 035.
3. **De écht persistente bron (R9):** `server/scripts/reset-test-baseline.php`
   draait op élke TEST-deploy na `migrate.php`, doet `TRUNCATE TABLE users`
   en herzaait; migratie `005_demo_auth_hashes_for_existing_seed_users.sql`
   (guarded op een lege hash, dus altijd van toepassing na een truncate) had
   nog de oude `LocalDemoAdmin2026`-hash. Dát bestand (en
   `test_reset_verify_remote_demo_credentials()` in `server/lib/test-reset.php`)
   zijn nu de bron van waarheid voor het gedeelde TEST-beheerwachtwoord
   (`888888888888`) en zijn bijgewerkt. **Belangrijk voor de toekomst:** een
   volgende wijziging van dit wachtwoord hoort in 005/test-reset.php, niet
   (alleen) in een losse correctiemigratie — anders overleeft hij de
   eerstvolgende TEST-deploy niet.

Onafhankelijk geverifieerd: directe curl-login tegen
`https://uren-test.pathconsultancy.nl` met `gio@example.invalid` /
`888888888888` geeft HTTP 200. Validate (alle 8 shards, incl. REM-H-001) en
Deploy Test to TransIP zijn groen op zowel `main` als `herontwerp` (beide op
dezelfde commit na de merge-queue). `Send Due Reminders`-cron zou vanaf nu
ook moeten slagen, aangezien `server/scripts/send-due-reminders.php` nu
eindelijk live staat op TEST.

## Actuele gecombineerde oplevering — 9 september 2026, 00:55

`origin/herontwerp` (`e6b49e6`) en lokale `main` (`f09bb2a`) zijn samengevoegd
op `herontwerp`. De release bevat samen: ontvangstmail na uren indienen,
servergestuurde herinneringen, TEST-beheerwachtwoordcorrectie, 8 CI-shards,
harde test-time-outs, branch-hygiëne en de bestaande New-skin. De standaard
weekherinnering is vrijdag 14:00. Living Docs hergebruikt uitsluitend de reeds
gemaakte shardrapporten en start geen eigen database/browser-suite.

Bewezen groen: build, versiecheck 1.0.17, PHP-lint, docs-sync (449 cases),
deploymentcontract, `REM-H-001` en `SKIN-H-006`. De brede lokale smoke gaf
ruim vijf minuten geen uitvoer en is beëindigd; de begrensde 8-shard-CI is de
brede releasepoort. Stage nooit `node_modules`. Push alleen `herontwerp`;
groene CI mag via de queue naar `main` en TEST. PROD blijft handmatig geblokkeerd.

## VASTE BRANCHREGEL — altijd eerst lezen

`main` draagt functionele wijzigingen en releases; `herontwerp` draagt de
New-skin. Na iedere nieuwe `main`-commit wordt die actuele `main` eerst in
`herontwerp` opgenomen. Pas daarna wordt nieuw design gepusht. Alleen een
herontwerp-kop die actuele `main` bevat en volledig groene CI heeft, mag via de
merge-queue naar `main` fast-forwarden. Werk nooit tegelijk aan hetzelfde
bestand in beide worktrees. PROD blijft achter de handmatige reviewerpoort.

Een melding "nog niet pushen" is uitsluitend tijdelijk tijdens een actieve
main-hotfix; daarna geldt weer bovenstaande vaste volgorde.

### Actieve werkstromen / agents

**Doorwerkopdracht voor Claude en Codex:** ga zelfstandig door op zowel
`main` als `herontwerp`, onderzoek en herstel iedere regressie en blijf de
pipeline volgen totdat de actuele combinatie volledig groen op TEST staat.
Stop niet bij een eerste rode run: lees de fout, herstel de oorzaak en start
opnieuw. Raak PROD niet aan; promotie naar PROD blijft uitsluitend een
handmatige beslissing van de eigenaar.

**Vaste opdracht "pollen en fixen" (expliciet vastgelegd, 9 sept nacht):**
elke ~10 minuten de laatste CI-run checken (`gh run list`/`gh run view`),
bij rood de exacte falende stap/test opzoeken (niet aannemen, echt de log
lezen), root cause fixen, gericht lokaal testen, committen en pushen — en
daarna weer pollen. Blijf dit herhalen, ook na een sessie-onderbreking
(bv. een usage-limiet), totdat de actuele combinatie op main én herontwerp
volledig groen is. Elke nieuwe regressie die zo gevonden wordt, hoort een
eigen testcase te krijgen, niet alleen een losse code-fix.

- **Codex op `main`:** REM-H-001-testisolatie is opgelost en 28/28 groen;
  commit en push volgen direct na deze handoff-update.
- **Claude/herontwerp-sessie:** mag daarna weer verder, maar moet eerst de
  nieuwe `origin/main` in `herontwerp` opnemen en de combinatie testen. Niet
  dezelfde vier bestanden tegelijk wijzigen.
- **GitHub CI:** `main` en `herontwerp` gebruiken acht testshards. Dit zijn
  parallelle CI-jobs, geen acht lokale assistenten. Een oudere run mag worden
  geannuleerd zodra de nieuwe commit hem aantoonbaar vervangt.
- **Integratie:** alleen groene actuele `herontwerp` mag via de bestaande
  merge-queue fast-forward naar `main`; daarna automatisch naar TEST. PROD
  blijft handmatig.

De workflow `branch-hygiene.yml` controleert dagelijks en verwijdert alleen
tijdelijke branches met een bekende prefix die minimaal twee dagen oud én
volledig in `main` of `herontwerp` gemerged zijn. Niet-gemergde branches en de
twee vaste branches worden nooit automatisch verwijderd.

## Actuele fix — main, 9 september 2026 (Codex) — ook voor Claude

Claude heeft de productbug in de reminder-scheduler correct opgelost. De
resterende `REM-H-001`-combinatiefout zat niet in de scheduler, maar in de
test: `EmailQueueApi.list()` bekeek standaard slechts de eerste tien mails.
Na `admin-writes.spec.ts` bevat de gedeelde testdatabase meer deliveries en
items met dezelfde timestamp hebben geen vaste onderlinge volgorde. Daardoor
kon de correct aangemaakte mail buiten die pagina vallen. De test zoekt nu
server-side op het unieke medewerkeradres (`q`) met limiet 100. Dit verzwakt
geen productassertie en vereist geen reset van gedeelde testdata.

Bewijs: 28/28 groen met
`node scripts/run-playwright-e2e.mjs --project=desktop-chromium tests/playwright/admin-writes.spec.ts tests/playwright/reminders.spec.ts`
(3,2 minuten, exitcode 0).

## Actuele overdracht — main, 9 september 2026 nacht (Claude Code) — voor Codex

### Wat is klaar op main (t/m v1.0.18, commit `4e3f974`)

- Medewerker-ontvangstmail (v1.0.12) inclusief PDF-bijlage (v1.0.18):
  `buildTimesheetReceiptPdfBase64()` in `assets/app.js` genereert bij
  submit een urenoverzicht-PDF, server valideert/slaat op
  (`timesheet_receipt_store_pdf()` in `server/mail/queue.php`,
  `private-root/timesheet-receipts/`), `attachment_policy=timesheet_receipt`
  in `server/mail/dispatch.php`. Migratie 034.
- Serverplanning herinneringen (v1.0.13): vier types, cron
  `.github/workflows/send-reminders.yml` — **alleen TEST**, `environment: test`
  (geen protection rules). PROD bewust nog niet aangesloten: `environment: prod`
  heeft een verplichte `required_reviewers`-poort (3 reviewers), dus een
  15-minuten-cron zou daar telkens handmatige goedkeuring vragen. PROD-
  herinneringen zijn een aparte, bewuste vervolgstap.
- Demo-beheerwachtwoord (v1.0.14) en Living Docs uitgeschakeld op main
  (v1.0.15, zelfde als eerder al op herontwerp, `0ad42aa`) — nu vervangen
  door Codex' herontwerp van Live Docs die bestaande blob-reports
  hergebruikt (`playwright merge-reports`) i.p.v. de suite nogmaals te
  draaien; dat patroon staat nu ook op main.
- **main naar 8 shards** (`release-pipeline.yml`), zelfde gratis
  GitHub-hosted opschaling als op herontwerp's `ci.yml`.
- **Echte bug gefixt in `send-due-reminders.php`**: alle vier queries
  gebruikten `INNER JOIN user_preferences`. Nieuwe medewerkers (via
  `server/api/staff.php`) krijgen **nergens in de API** een
  `user_preferences`-rij — ze werden daardoor altijd stilzwijgend
  uitgesloten van elke herinnering. Nu `LEFT JOIN` + `COALESCE(..., 1)`,
  zodat de bedoelde default (aan) geldt zoals het schema al zegt.

### Opgelost door Codex: REM-H-001-combinatiefout

De scheduler maakte de mail correct aan. De test bekeek alleen de standaard-
pagina van tien queue-items; na `admin-writes.spec.ts` kon de nieuwe mail door
gelijke timestamps buiten die pagina vallen. `EmailQueueApi.list()` ondersteunt
nu `query`, en REM-H-001 zoekt server-side op het unieke medewerkeradres.
De eerder falende combinatie is opnieuw gedraaid: **28/28 groen**, exitcode 0.

## Documentenkaart

## Actuele parallelle werkafspraak — 8 september 2026

`main` en `herontwerp` mogen tegelijk doorwerken, maar niet aan dezelfde
bestanden. `main` bezit functionele server-/mail-/releasewijzigingen en klassieke
regressies. `herontwerp` bezit de New-skin en de visuele medewerkerroute.

### Open voor `main`

- receipt-PDF en herindieningsmail volledig afronden en gericht bewijzen;
- definitieve medewerkergoedkeuringsmail en configureerbare templates afronden;
- servergestuurde, idempotente herinneringen/scheduler bouwen;
- reproduceerbare oude UI-meldingen alleen na concrete reproductie oppakken;
- lokale gate, individuele GitHub-jobstatussen en TEST-deploy controleren.

### Open voor `herontwerp`

- `Mijn uren` en klanturenstaat visueel als één New-medewerkerroute afwerken;
- resterende dashboard-/mededelingen-/profielpolish klein en uitsluitend onder
  `html[data-skin="new"]` houden;
- desktop- en mobiele screenshots/walkthroughs uitvoeren zodra de lokale runtime
  beschikbaar is;
- New-skin cases en mobiele regressie groen houden; Classic en PROD fail-closed
  niet aanraken.

### Niet vergeten bij samenwerking

- Nieuwe `main` eerst opnemen in `herontwerp` vóór CI/integratie.
- Geen `node_modules` of testartefacten stagen; de huidige lokale wijzigingen
  daarin zijn bestaand en worden niet teruggedraaid.
- Geen PROD-promotie door een agent.
- Lokale browservalidatie is momenteel geblokkeerd door ontbrekende
  `server/config.local.php` in deze werkboom; syntax- en diffchecks zijn wel
  uitgevoerd.

- **Centrale actuele checklist:** `MASTERCHECKLIST.md` — wat klaar, open of
  geblokkeerd is en welke releasepoort nog ontbreekt.
- **Besluiten:** `BESLISTABEL.md` — vastgelegde productkeuzes zoals MO5b.
- **Technisch contract:** `TECHNISCH-ONTWERP.md` — statusmachine, taakprojectie,
  API- en synchronisatieregels.
- **Functioneel contract:** `FUNCTIONEEL-ONTWERP.md` — gebruikersgedrag en
  acceptatieregels.
- **Deze handoff:** actuele Copilot/Codex-overdracht met diagnose, gewijzigde
  bestanden, bewijs en eerstvolgende stap.
- **Herontwerp:** `HANDOFF-CODEX-FASE-D.md` en `HANDOFF-PILOT-DESIGN.md` — alleen
  voor branch `herontwerp`; PROD blijft daar los van.

Bij verschil tussen oudere historische tekst en de actuele stand zijn in deze
volgorde leidend: `BESLISTABEL.md`, daarna de actuele sectie in
`MASTERCHECKLIST.md`, daarna de laatste actuele handoff.

## Actuele overdracht — main, 8 september 2026 avond (Claude Code)

### Wat is gedaan (v1.0.11 → v1.0.16, allemaal op `main`)

1. **v1.0.12 — medewerker-ontvangstmail na indienen.** Submit maakt een
   idempotente `timesheet_submission_receipt`-delivery (medewerker, periode,
   totaaluren, dagregels incl. `0,00 uur`). Idempotency via
   `timesheet_id + timesheet_version` (migratie 030). PDF-bijlage en
   herindienings-/definitieve goedkeuringsmail **bewust nog niet gebouwd**.
2. **v1.0.13 — serverplanning voor de vier herinneringstypen.** Wekelijks
   (vrijdag 14:00 — **op verzoek gewijzigd van 15:00 naar 14:00**),
   maandeinde (laatste werkdag), achterstand en goedkeuring (beide eerste
   werkdag van de nieuwe maand). Migratie 031 (`reminder_log` voor
   idempotency + companies-kolommen), `server/scripts/send-due-reminders.php`,
   cron-workflow `.github/workflows/send-reminders.yml` (elke 15 min, SSH
   naar zowel TEST als PROD). Afzendertekst "Robot Path IT" staat **hard
   gecodeerd**, nog niet aanpasbaar via Instellingen (bewust, zelfde lijn als
   de ontvangstmail).
3. **v1.0.14 — demo-beheerwachtwoord TEST/lokaal hersteld.** De publieke
   TEST-smoke ("Verify public TEST account logins") faalde omdat het
   handmatig beheerde TEST-beheerwachtwoord uit de pas liep met het
   GitHub-secret `PLAYWRIGHT_ADMIN_PASSWORD`. Op expliciet verzoek van de
   gebruiker is het gedeelde demo-beheerwachtwoord (`gio@`/`joyce@`/
   `admin@example.invalid`) overal naar `888888888888` gezet: migratie 032
   (`_demo_` in bestandsnaam ⇒ **nooit op productie**, PROD gebruikt sowieso
   persoonlijke accounts), secret bijgewerkt, README/.env.local gesynchroniseerd.
   Medewerkerwachtwoord ongewijzigd.
4. **v1.0.15 — Living Docs uitgeschakeld op main.** Zelfde fix als eerder al
   op `herontwerp` (commit `0ad42aa`): de "Publish Live Docs"-job liep
   herhaaldelijk vast op een browserproces en blokkeerde daarmee de hele
   releasewachtrij (concurrency-group `release-pipeline` is repo-breed, niet
   per branch/ref!). `if: ${{ false }}` op de job. **Extra fix t.o.v.
   herontwerp:** "Deploy Prod to TransIP" vereiste
   `needs.live-docs.result == 'success'`, wat met de job uit altijd
   `'skipped'` oplevert — dat had PROD-deploys permanent geblokkeerd.
   Geaccepteerd nu ook `'skipped'`. `deployment-contract-check.mjs`
   meegewerkt.
5. **v1.0.16 — smoke-test bijgewerkt naar 14:00.** Drie bestaande
   asserties in `smoke-test.mjs` verwachtten nog de oude 15:00-default voor
   de wekelijkse herinnering; CI faalde daarop (`Validate (1)`).

### Actuele stand (bij overdracht, 21:55 UTC)

- Laatste lokale commit: v1.0.16 + deze handoff (2 commits bovenop
  origin/main). **Nog niet gepusht** — de gebruiker wilde bewust eerst een
  `herontwerp`-CI-run laten doorlopen voordat er weer naar `main` gepusht
  wordt.
- **`herontwerp`-CI (`34282855047`) draait nu gezond**, alle 4 shards
  `in_progress`, geen ingrijpen nodig — laat deze gewoon doorlopen.
- **`main`-run `34281353301` (de vórige, nog vóór v1.0.16) staat na meerdere
  cancel-verzoeken nog steeds vast** op stap "Run E2E tests" (Validate-shard),
  gestart 21:42:10 UTC. Die stap heeft een eigen 12-min steptimeout, dus hij
  zou rond 21:54 UTC vanzelf moeten falen/stoppen — controleer dit bij
  hervatten (`gh run view 34281353301 --json status,conclusion`) vóór je iets
  naar `main` pusht.
- Eerder liep ook run `34275122342` vast (een echt vastgelopen Live-Docs-job,
  vóór de v1.0.15-fix) en is geannuleerd.
- **Belangrijke les herbevestigd (tweemaal vandaag gezien):** de
  `release-pipeline`-concurrency-group is **repo-breed**, niet per branch.
  Eén vastgelopen job op één run blokkeert daarmee elke volgende push naar
  `main`, ook via `workflow_dispatch` — GitHub's `gh run cancel` werkt niet
  altijd direct op een echt vastgelopen/lang lopend proces, alleen een
  step-timeout is dan betrouwbaar. `ci.yml` (herontwerp) heeft wél een eigen
  per-ref concurrency-group (`ci-${{ github.workflow }}-${{ github.ref }}`),
  dus die twee blokkeren elkaar niet. Bij een hangende `main`-run: eerst de
  job zelf identificeren (`gh api .../jobs/<id>` → `.steps[] | select(status=="in_progress")`)
  en diens steptimeout afwachten i.p.v. blind te blijven cancelen.

### Volgende stap

1. Bevestig dat er niets meer `in_progress` staat
   (`gh run list --limit 10 --json status -q '.[] | select(.status != "completed")'`).
2. `git push origin main` (laatste lokale commit staat al klaar, versie
   1.0.16 + deze handoff).
3. Volg de nieuwe run t/m minimaal "Deploy Test to TransIP" groen.

### Openstaande issues (voor Codex om op te pakken)

1. **PDF-bijlage bij de medewerker-ontvangstmail.** `mail_enqueue_timesheet_submission_receipt()`
   in `server/mail/queue.php` stuurt nu platte tekst zonder bijlage. Kijk naar
   hoe `downloadInvoicePdf(..., "base64")` in `assets/app.js` en
   `server/api/invoices.php` de browser-gegenereerde PDF als bijlage
   meesturen bij factuurmails; hetzelfde patroon toepassen voor een
   "Urenoverzicht"-PDF bij submit.
2. ~~**Herindieningsmail na correctie.**~~ **Opgelost (9 sept, geen code-fix
   nodig):** al gecontroleerd — `submit` na een `request_correction`-cyclus
   loopt gewoon opnieuw door de bestaande `if ($action === 'submit')`-tak in
   `server/api/timesheets.php`, en de idempotency-check in
   `mail_enqueue_timesheet_submission_receipt()` is versiegebonden
   (`timesheet_id + timesheet_version`). Omdat een correctie de versie
   verhoogt, maakt een herindiening vanzelf een eigen, tweede
   `timesheet_submission_receipt`-rij aan. Bewezen met nieuwe case
   **EQ-H-038** (submit → correctie → herindienen → 2 aparte queue-items).
3. ~~**Definitieve goedkeuringsmail.**~~ **Opgelost (9 sept, MO5c):**
   `mail_enqueue_timesheet_final_approval()` toegevoegd aan
   `server/mail/queue.php`, gehaakt in de `approve`-actie van
   `server/api/timesheets.php`. Kanaal `timesheet_final_approval` bestond al
   (migratie 030) en had al een default-template in `server/mail/templates.php`,
   werd alleen nergens aangeroepen. Bewezen met nieuwe case **EQ-H-037**.
4. ~~**Aanpasbare standaardteksten.**~~ **Opgelost (9 sept) voor de
   ondertekening:** "Robot Path IT" stond hard gecodeerd op drie plekken
   (ontvangstmail, definitieve goedkeuringsmail, de vier reminder-mails).
   Nieuwe kolom `companies.mail_signature` (migratie 036, default 'Robot Path
   IT'), helper `mail_signature_for()` in `server/mail/templates.php`,
   gebruikt op alle drie plekken i.p.v. de letterlijke string. Aanpasbaar via
   Instellingen → Organisatie ("Ondertekening automatische mails"). Bewezen
   met nieuwe case **EQ-H-039**. De per-kanaal onderwerp/tekst zelf (broker/
   accountant/payroll/klanturenstaat) waren al aanpasbaar via
   `mail_channel_templates_for()` — dat deel van dit punt was al klaar.
5. **CI-shard-opschaling 4→8** — al voorbereide analyse in
   `docs/ci-scaling-review`-branch (`agents/shard-strategy.md`,
   `agents/provision-runners.md`). Gebruiker koos voor "gewoon meer
   GitHub-hosted shards", geen self-hosted runners nodig. Nog niet
   doorgevoerd.
6. **Repo-brede `release-pipeline`-concurrency-lock.** Zag vandaag twee keer
   dat één vastgelopen job (Live Docs, en losstaand een lang lopende
   Validate-shard) elke volgende push naar `main` blokkeerde, ook via
   `workflow_dispatch`, omdat `concurrency: group: release-pipeline` (in
   `.github/workflows/release-pipeline.yml`) repo-breed is i.p.v. per ref.
   Overwegen: group-naam met `${{ github.ref }}` suffixen zodat een hangende
   `main`-run een latere `herontwerp`-gerelateerde dispatch niet blokkeert
   (en andersom) — nu blokkeert alles elkaar.

## Actuele overdracht — MO5b, 8 september 2026

- **Taak/conclusie (aangescherpt 8 sep):** MO5b blokkeert factuurafronding totdat
  Backoffice de klanturenstaat echt heeft gecontroleerd. Een ontvangen document
  moet `approved` zijn. `Al rechtstreeks gemaild` blijft oranje totdat Backoffice
  de aparte actie `confirm_external` met verplichte reden uitvoert.
- **Diagnose/bewijs:** `showInvoiceDeliveryCheck()` controleerde eerder alleen
  uren- en factuurstatus. `server/api/invoices.php` zette een goedgekeurde
  urenstaat zonder klanturenstaatcontrole door naar `invoiced`. De UI-, server-
  en mailqueue-gates zijn als één contract vereenvoudigd: `customer-timesheet-required`
  met HTTP 409 zodra de klanturenstaat ontbreekt.
- **Gewijzigde bestanden:** `assets/app.js`, `server/api/invoices.php`,
  `server/api/email-queue.php`, `server/mail/queue.php`,
  `index.html`, `README.md`, `FUNCTIONEEL-ONTWERP.md`,
  `TECHNISCH-ONTWERP.md`, `PRODUCTIE-CHECKLIST.md`,
  `WERKWIJZE-PATROON.md`, `MASTERCHECKLIST.md`,
  `tests/playwright/invoices.spec.ts`,
  `tests/playwright/features/invoices.feature` en
  `tests/playwright/steps/invoices-ui.steps.ts`, plus de lock-fixtures in
  `tests/playwright/invoice-lock.spec.ts`,
  `tests/playwright/business-workflows-attachments.spec.ts` en
  `tests/playwright/business-workflows-documents.spec.ts`.
- **Gedrag:** dashboard, teamstatus, urenstaat, maandhistorie en New-storyline
  tonen `Wacht op klanturenstaat` voor goedgekeurde uren zonder gereed document.
  De factuurcontrole toont dan geen modal. De server weigert de lock met
  `customer-timesheet-required` en HTTP 409. Ook herhaalde mailqueue-enqueue
  wordt met hetzelfde contract geweigerd. Alleen `approved`/verzonden of een
  aantoonbare Backoffice-`confirm_external` laten de factuur door;
  `send_to_broker` blijft een aparte actie.
- **Tests/bewijs:**
  - `node scripts/run-playwright-e2e.mjs --grep=INV-N-025 tests/playwright/invoices.spec.ts`
    exited met status `0`.
  - `invoice-lock.spec.ts`: 10/10 groen, inclusief `INV-N-016`, `INV-H-020`
    en de nieuwe `INV-N-026` (rechtstreeks gemaild blokkeert vóór en deblokkeert
    pas ná Backoffice-`confirm_external`).
  - Zes geraakte business-workflowbestanden: 27/27 groen over desktop,
    mobile-chrome en mobile-safari.
  - `docs:sync`: groen, 446 unieke uitvoerbare cases; `test:design` en
    `test:bdd:design` groen. `test:db:config` en `test:ops` groen.
  - De volledige smoke-test en taal-/contrastcontroles binnen `npm run check`
    zijn groen. De aanvankelijke design-auditfout bleek een ontbrekende
    `skin.spec.ts`-definitie in de documentatiesynchronisatie en een dubbele
    `SAFE-H-013`; beide zijn hersteld en de losse designgates zijn groen.
- **Volgende stap voor Codex:**
  1. commit deze bewezen increment en synchroniseer hem met de actuele
     `origin/herontwerp`;
  2. push uitsluitend naar `herontwerp` en laat CI plus merge-queue beslissen;
  3. controleer na groene CI de automatische handoff naar `main` en TEST.
     PROD blijft achter de handmatige reviewerpoort.

### Actuele overdracht 8 september 2026 — receipt-vervolgf fixes

- Timesheet-deliveries tonen in de queue nu de medewerker, ook zonder factuurrelatie,
  en gebruiken het configureerbare `timesheet_submission_receipt`-template met de
  vaste Robot Path IT-signatuur.
- Idempotency is versiegebonden via `timesheet_id + timesheet_version`: dezelfde
  submit dupliceert niet; resubmit na correctie kan een nieuwe receipt maken.
- Gewijzigd: `server/api/email-queue.php`, `server/mail/queue.php`,
  `server/api/timesheets.php`, `database/schema.sql` en migratie 030.
- `get_errors` en `php -l` zijn groen. Playwright blijft geblokkeerd door
  `PLAYWRIGHT_EMPLOYEE_PASSWORD`. PDF-bijlage en runtime-resubmit-test staan nog
  open; niets is gecommit, gepusht of gedeployed.
- De vaste Robot Path IT-signatuur staat alleen nog in de afzendershell, zodat
  standaardtemplates geen dubbele handtekening opleveren. PHP-lint is daarna
  opnieuw groen uitgevoerd.

### Actuele overdracht 8 september 2026 — New-skin statusvisualisatie

- De mobiele/New urenkaart heeft nu de gewenste kleuren: actieve dag donker
  navy met mint marker en focusring; nuluren zijn gedempt; focus is duidelijker.
- De admin-storyline heeft losse statussegmenten: alleen afgeronde buursegmenten
  worden groen en die lijn tekent eenmalig rustig in bij de eerste render.
- `node --check`, `npm run test:design` (`447/447`) en `git diff --check` zijn
  groen. Browser-screenshotcheck staat nog open; niets is gecommit, gepusht of
  gedeployed.

### Actuele overdracht 8 september 2026 — medewerker-New-slice

- Alleen de medewerkerroute is verder gebracht: New `Mijn uren` heeft nu een
  eigen donkere medewerker-shell zonder oude sidebar, met ureninvoer als primaire
  werkruimte en klanturenstaat als aparte vervolgstap. Backoffice is ongemoeid.
- Gewijzigd: `assets/styles-new.css`.
- Syntax, editorvalidatie, design-audit (`447/447`) en diff-check zijn groen.
  De gerichte browsercase `SKIN-H-006` kon niet starten door ontbrekende lokale
  `server/config.local.php` en een testdatabase zonder `users`-tabel.
- Volgende stap: lokale testomgeving herstellen en desktop/mobile screenshot- en
  gedragscontrole uitvoeren; niets is gecommit, gepusht of gedeployed.

### Mijlpaal 8 september 2026 — documentatieconsistentie

- FO, TO, README, productiechecklist, werkwijze en stamgegevens beschrijven nu
  dezelfde MO5b-regel; oude uitzonderingen “factuur mag zonder klanturenstaat”
  zijn verwijderd.
- Historische `CLAUDE_CODE_HANDOFF.md` bevat nu bovenaan een actuele verwijzing
  naar de centrale checklist en deze Copilot-handoff.
- Historische root-README en TEST/PROD-handoffs verwijzen nu expliciet naar de
  actuele checklist, zodat oude demo- of acceptatieregels niet als bronwaarheid
  worden gebruikt.
- Statische mockup-/video-pilotbestanden zijn bewust niet aangepast; zij zijn
  illustratief en vallen onder apart pilot-eigenaarschap.
- `scripts/smoke-test.mjs` bewaakt nu statisch dat de MO5b-gates in browser,
  invoice-API en mailqueue aanwezig blijven.
- Resterende releasepoort: lokale server starten, gerichte MO5b/locktests,
  `docs:sync`, `npm run check`, GUI-smoke en brede regressie.

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
