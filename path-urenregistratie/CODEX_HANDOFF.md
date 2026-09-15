# Overdracht aan Codex — medewerker Klassiek (14 september 2026, avond)

Vervangt de eerdere versie van dit bestand. Zelfstandig leesbaar.

## Update Claude Code nacht 14→15 sep — monkey-verkenning Klassiek (2.0.77)

- Nieuw: seeded monkey-verkenner `tests/verkenning/klassiek-monkey.spec.ts` met eigen config
  `playwright.verkenning.config.ts` (buiten CI-regressie, eigen geïsoleerde DB). Draaien:
  `MONKEY_SEEDS="1-12" MONKEY_STAPPEN=150 node scripts/run-playwright-e2e.mjs --config=playwright.verkenning.config.ts --project=verkenning-desktop`
  (of `verkenning-telefoon`). Harde invarianten H1–H8 (JS-fout, 5xx, één actief scherm, geen
  undefined/NaN/null in beeld, sessie blijft, menu = scherm, titel niet leeg, geen stale-version); logboek per
  seed in `verkenning-rapport/`. Tegenproef gedaan (invariant omgedraaid → rood → hersteld).
- Vondsten omgezet naar vaste cases in `tests/playwright/klassiek-verkenning.spec.ts` (desktop-chromium in CI):
  - **KLV-N-001** snel achter elkaar uren invullen gaf "Niet gesynchroniseerd: … door iemand anders gewijzigd"
    (409 stale-version) bij één medewerker. Oorzaak: in `scheduleDraftTimesheetWrite` kreeg bij "A slaagt met B in
    de wachtrij" alleen B de nieuwe versie, niet `record.serverVersion`; invoer C binnen B's debounce ging met de
    oude versie. Fix in app.js. Case was rood vóór de fix (echte bug), groen erna.
  - **KLV-N-002** maandkeuzepaneel op Vandaag bij 821px 21px rechts buiten beeld (maanden afgekapt). Fix:
    `houdPaneelBinnenBeeld()` schuift het paneel bij openen binnen beeld via `translate`. 27 combinaties scherm×breedte.
- Impactregressie lokaal groen: 8 autosave-cases (desktop) + 10 maandpaneel-cases desktop + 8 mobile-chrome;
  smoke v2.0.77 geslaagd.
- **2.0.78**: **KLV-N-003** menubalk medewerker 821-1079px: testbalk-label lag over Maanden/Berichten; in CI
  (Linux-fonts) onderschepte het zelfs de klik op Maanden (KLV-N-002 rood in run 34915147803, shard 3). Fix:
  compacte menubalk in dat bereik (styles.css, blok NA de menubalkregels i.v.m. gelijke specificiteit) en het
  label in twee spans (`.testbalk-omgeving` / `.testbalk-versie`), de versie verborgen in dat bereik. Speling
  gemeten ≥75px. Monkey: terug-uit-app (about:blank) is browser, geen app-bug; rapporten nu in `verkenning-rapport/`.
- **2.0.79**: **KLV-N-004** een opslag die al onderweg was en pas NA de lezing van de herladen pagina op de
  server aankwam (traag netwerk), liet elke volgende invoer falen met "door iemand anders gewijzigd. Ververs de
  pagina". Fix: `herstelAchterhaaldConcept()` in app.js — bij `stale-version` op een eigen concept de actuele
  versie ophalen (alleen status draft/correction) en één keer opnieuw opslaan wat op het scherm staat.
  `writeTimesheetToApi` geeft nu `error.code` mee. Monkey: H8 kijkt nu naar wat de medewerker ziet (niet naar een
  409 in het netwerk), en het rapport bevat een netwerklogboek van de urenstaat.
- **KLV-N-005** (test-only): geen inhoud buiten de rechterrand op de vier medewerkerschermen, elke breedte vanaf
  smaller én breder benaderd (64 combinaties). Tegenproef gedaan.
- **2.0.80**: monkey nu ook op de beheerkant (`MONKEY_ROL=beheer`). **KLV-N-006** (84 combinaties beheerscherm ×
  breedte × richting) vond: Teambeheer-overzicht 92px buiten beeld bij 821px; mailfilters in Instellingen tot 148px
  buiten beeld (ook op 1024/1280); mailsjablonen en herinneringsregels 150px buiten beeld bij 821px. Oorzaak: vanaf
  821px staat bij beheer de zijbalk (250px), dus de inhoud is even smal als op een tablet onder 820px, maar de
  smalle indelingen golden alleen tot 820px. Fix (styles.css, onderaan): de inhoudsindelingen uit het 820px-blok
  gelden nu ook voor beheer tussen 821-1023px (`body:not([data-role="employee"])`, zonder navigatieregels);
  teamoverzicht één kolom in dat bereik; mailfilters als flex-wrap op elke breedte. Visueel gecontroleerd.
- **2.0.81**: **KLV-N-007** "Bekijk klanturenstaten →" op het beheerdashboard opende een scherm met lege
  paginatitel (`pageTitles` miste `customer-timesheet-admin`). Case controleert ook dat elk `.view`-scherm een titel heeft.
- **2.0.87** (main 2.0.84 en 2.0.86 gemerged): testpil voor de medewerker in Klassiek op telefoon (tot 820px).
  #testbalk-open ("LOKAAL ▾"/"TEST ▾") opent #testbalk-paneel met Herstel demo, Licht/Donker, Klassiek/Nieuw,
  voluit en 44px; dicht na een keuze, bij tik ernaast en met Escape (zetTestpil). Versie op telefoon onderaan het
  profielmenu (#profile-menu-versie). Desktop, beheer en Modern ongewijzigd. **KLV-H-010**. Specs gebruiken nu
  fixtures/testknoppen.ts (klikTestknop/openTestknoppen/sluitTestknoppen) in plaats van direct op de knoppen te
  klikken. Bewezen: mobile-chrome volledige suite 234/235 (E2E-H-002 daarna gefixt), tablet skin+a11y 45/45,
  desktop admin-writes+invoices 54/54. **KLV-N-009** bewaakt dat het klanturenstaatlabel in Klassiek niet op Mijn
  uren staat (besluit met main: niets weghalen, al verhuisd sinds 2.0.68).
- Prod-poort: regel Gio 15 sep, niet binnen 10 min goedgekeurd = afwijzen; main bouwde "Promote Prod (wekker)"
  (2.0.86). Test loopt altijd door.
- **2.0.89**: vondsten uit release 34950426101 (eerste met reducedMotion echt actief): mailgeschiedenis in
  Instellingen 38-63px buiten beeld met echte maildata (KLV-N-011, nieuwe case met nagebootste regels, CSS-fix); gloed
  onder de teller op Vandaag telefoon schoof onder reduce 58px over de rand omdat translateX(-50%) alleen in de
  keyframes stond (MOB-H-031, basis-transform); KLV-N-002 en DASH-H-049 wachten nu op het eindbeeld (onder reduce
  wordt een translate- of themawissel pas later meetbaar).
- Open vondst (15 sep): dialoog met open toetsenbord onder reducedMotion "reduce" (SKIN-H-036). Chromium hield
  de max-height van .modal op 824px (100dvh-20) terwijl --zichtbaar-hoogte 300px was en de juiste regel matchte;
  dialoog 534px boven het scherm, kruisje onbereikbaar. Geprobeerd en teruggedraaid (niet betrouwbaar, wisselend
  rood): scrollen per frame, alleen de scrollende laag scrollen, animation:none onder [data-zichtbaar], inline
  max-height. Of het op een echte iPhone met Minder beweging gebeurt is niet bewezen. SKIN-H-036 draait nu
  expliciet met no-preference. Vervolg: op echt iOS-toestel controleren.
- Open vondst: monkey seed 15 (desktop, licht) toont na "Herstel demo"-klik, herladen en snelle klikken nog
  "door iemand anders gewijzigd": de app stuurde expected=7 terwijl de server op 8 stond, en herladen haalde de
  maand niet opnieuw op. Niet deterministisch te reproduceren (gewoon herladen, andere maand, lokaal demoherstel
  gaan allemaal goed). Reproduceren: `MONKEY_SEEDS=15 MONKEY_STAPPEN=150 ... --project=verkenning-desktop`.
- Open (zacht, alleen met echte maildata): in Instellingen steekt een mailgeschiedenisregel 14px uit bij 1024px
  (grid minmax(180px) + auto-kolom), en een statuspil naast een sjabloonkop 8px bij 360px. Niet met een rode
  deterministische case vastgelegd, dus nog niet gefixt.
- **2.0.83**: **KLV-N-008** meer dan 24 uur op een dag: vak krijgt aria-invalid en rode rand, regel onderin
  "Niet opgeslagen: een dag kan maximaal 24 uur hebben", vorige geldige waarde blijft in de totalen en er gaat
  niets naar de server tot het klopt (`updateHoursTotal`). Grenswaarden 24 / 24,5 / 25. Main 2.0.82 gemerged.

## Update Claude Code 14 sep, later op de avond — CI-shardtimeout (exit 124) opgelost

- De wachtrij naar main liep vast: shard 6 (commit `d9ed7c31`, run `34887610479`) en shard 7 (commit
  `085e96dc`, run `34894362929`) liepen allebei tegen de interne `timeout ... 22m` van de "Run E2E tests"-stap
  aan (exitcode 124), terwijl alle tot dan gedraaide cases groen waren. Bevestigd via `gh api` dat dit al
  bestond vóór deze sessies eigen commits — een structureel capaciteitsprobleem: `mobile-ui.spec.ts`
  (mobile-safari-zwaar) plus retries op de bekende flaky cases `MOB-H-018`/`MOB-H-025` (elk ~34s per retry)
  bovenop `dashboard-medewerker.spec.ts` (114 ondeelbare cases) duwden die shards over de 22m heen.
- `.github/workflows/ci.yml` is aangepast op de `herontwerp`-branch (op expliciet verzoek van Gio zelf gedaan,
  niet doorgegeven aan main/-a0, om main niet te blokkeren):
  - interne E2E-timeout `timeout --signal=TERM --kill-after=30s 22m` → **32m**;
  - staplimiet "Run E2E tests" `timeout-minutes: 23` → **33m**;
  - joblimiet `timeout-minutes: 35` → **50m** (marge boven de staplimiet plus shard 1's extra stappen: smoke,
    DB-CRUD, security audit, BDD-pilot, die vóór de E2E-stap lopen).
  - Het bestaande, uitgebreide commentaar over "acht shards, niet meer" (empirisch getest, geen verbetering
    bij twaalf) is intact gelaten — dat blijft de juiste conclusie, alleen de tijdslimiet was te krap.
- Run `34898857468` met de ruimere timeout: geen exit 124 meer, maar shard 6 wel rood (exit 1) door 20
  mobile-safari-inloguitvallers. Vergelijking over runs: ook de laatst groene run (`34871247686`, 16:52) had al
  18 inloguitvallers, gered door retries. Oorzaak: de test klikte terwijl de pagina nog vloeiend scrolde
  (pointerdown op de knop, pointerup ernaast); de reduced-motion-emulatie lijkt in CI-WebKit niet te gelden.
- Opgelost door `dd6db2fd` van -a0 (LoginPage.ts: wacht tot de scroll stilstaat, klik dan op het midden)
  over te nemen als `ca2d051f`. Lokaal `auth.spec.ts` op mobile-safari 17/17 groen.
- **Resultaat run `34902829940` op `ca2d051f`: 8/8 groen, nul inloguitvallers, traagste shard 17m** (was
  22-31m). -a0 heeft "klaar" gekregen; de wachtrij naar main kan door. `dd6db2fd` op main is identiek en
  merget schoon.

## Update Codex 14 sep 19:40 — 2.0.74 in voorbereiding

- 2.0.70 is gepusht: Maanden als uitklapkaarten, klanturenstaat-kolom weg, één statuspil, weektotalen,
  vijf stappen, hoofdactie, PDF Urenoverzicht alleen bij afgerond.
- 2.0.71 is gepusht: dubbele noemer in de Vandaag-kop verwijderd (`22` niet nog eens als `van 22 werkdagen`).
- 2.0.72 is gepusht: Mijn uren donker beter leesbaar en testknoppen duidelijker. `node_modules` is met expliciet
  akkoord van Gio hersteld; `git status` was daarna schoon.
- 2.0.73 is gepusht als bundel bovenop alles, maar CI-run `34875604352` is op verzoek gecanceld omdat default
  **Donker + Klassiek** nog mee moest.
- 2.0.74 wordt nu gemaakt met alle vorige fixes plus:
  - verse/default sessie start in `skin: classic` en `theme: dark`;
  - oude defaultvoorkeuren migreren naar Klassiek + donker via `themeDefaultVersion: 2` en
    `skinThemeDefaultVersion: 2`;
  - instellingen-copy zegt nu: `Klassiek begint standaard donker; je keuze wordt per vormgeving onthouden`;
  - `SKIN-H-005` is aangepast van “Klassiek start licht” naar “Klassiek start donker”.
- Nog te doen vóór push 2.0.74: `docs:sync`, `test:design`, `test:bdd:design`, `version:check`, gerichte
  `SKIN-H-005`, daarna commit/push. Geen automatische CI-poll; alleen compact checken als Gio vraagt.

## Update Codex 14 sep 19:15 — lokaal klaar, nog niet gepusht

- Vorige CI-run `34871247686` op `d2f4a441` stond bij de laatste check nog `in_progress`. Daarom is 2.0.70
  lokaal gecommit in deze 2.0.70-commit maar nog niet gepusht.
- **Maanden als uitklaplijst is lokaal gebouwd in 2.0.70**:
  - `renderEmployeeHistory` rendert maandkaarten in plaats van een tabel.
  - Klanturenstaat-kolom is weg; elke maandkaart heeft één statuspil via `historyStatusPill()`.
  - Uitklap bevat weektotalen via `historyWeekTotalsHtml()`, de vijf stappen uit `statusKetenStappen()`,
    één hoofdactie via `historyMainAction()`, en alleen bij afgerond `PDF Urenoverzicht` met de vaste regel
    `Dezelfde PDF die je per mail kreeg — je uren per week.`
  - Nieuwe clickhandlers: `[data-history-receipt-period]` downloadt de bestaande urenoverzicht-PDF zonder
    navigatie; `[data-history-customer]` opent de klanturenstaatroute voor die maand.
- Tests/documentatie aangepast:
  - `DASH-H-025` gaat nu over één statuspil per maand en géén losse klanturenstaat-kolom.
  - `DASH-H-031` dekt nu ook weektotalen, actieblok en PDF-regel alleen bij afgerond.
- Lokaal groen:
  - `node --check assets/app.js`
  - `npm run test:design`
  - `node scripts/run-playwright-e2e.mjs --project=desktop-chromium --grep "DASH-H-025"`
  - `node scripts/run-playwright-e2e.mjs --project=desktop-chromium --grep "DASH-H-031"`
  - `node scripts/run-playwright-e2e.mjs --project=mobile-chrome --grep "DASH-H-025"`
  - `node scripts/run-playwright-e2e.mjs --project=mobile-chrome --grep "DASH-H-031"`
  - `node scripts/contrast-licht-donker.mjs`
  - `npm run test:bdd:design`
  - `npm run docs:sync`
  - `npm run version:check`
  - `git diff --check -- . ':!node_modules'` geeft alleen CRLF-waarschuwingen, geen whitespace-fout.
- Let op: `tests/playwright/features/skin.feature` en `tests/playwright/steps/skin.steps.ts` blijven in status
  modified door CRLF-only ruis; ze hebben geen inhoudelijke diff en moeten niet mee in de commit.

## Stand

- Branch `herontwerp`, werkmap `C:\Path-herontwerp-actief\path-urenregistratie`.
- Gepusht: `132a1fbe` (**2.0.68**). CI-run `34869007628` op die commit: 7 shards groen, shard 1 rood op
  `CTS-API-H-006` (zie hieronder, al gerepareerd maar nog niet gepusht).
- Lokaal gecommit, **nog niet gepusht**: `7c75e0e4` en `eb2caf90` (**2.0.69**), plus een ongecommitte
  regelwijziging in `tests/playwright/customer-timesheet-api.spec.ts` (fix CTS-API-H-006). Deze overdracht
  wordt samen daarmee gecommit en gepusht.
- Lokale server van Gio: `start-path-app.ps1 -Mode desktop` op http://localhost:8000/. Lokale Playwright
  kan ernaast op een andere poort: `PATH_APP_BASE_URL=http://127.0.0.1:8010 node scripts/run-playwright-e2e.mjs ...`
  (let op: dezelfde testdatabase, dus lokale uitslagen kunnen verstoord zijn als Gio tegelijk klikt).

## Werkwijze (vastgelegd door Gio — volgen)

1. **Volledige regressie alleen via CI.** Lokaal nooit een suite over meerdere spec-bestanden.
2. Vóór elke push: alleen de geraakte cases lokaal (`-g '"ID|ID"'` met dubbele aanhalingstekens binnen
   enkele, anders breekt Windows de `|`), op desktop-chromium en mobile-chrome waar relevant.
3. **Tegenproef** per nieuwe/gewijzigde assertion: verwachting in de test omdraaien (niet `app.js`), rood
   zien, terugzetten, controleren op achtergebleven `TEGENPROEF`.
4. Goedkope poorten: `node --check assets/app.js`, `npm run test:design`, `npm run test:bdd:design`,
   `node scripts/contrast-licht-donker.mjs`, `npm run docs:sync` (gegenereerde bestanden meecommitten),
   `npm run version:check`. Nieuwe case = scenario in `tests/playwright/features/*.feature` + stappen in
   `tests/playwright/steps/*.steps.ts`, anders faalt de design-audit in shard 1.
5. **Versienummer ophogen bij elke bundel die Gio bekijkt**, ook lokaal: `npm run version:set -- 2.0.70`.
6. Niet pushen terwijl een CI-run loopt als het kan wachten: elke push breekt de lopende run af.
7. CI-fouten ophalen: `gh api --allow-escape-sequences repos/{owner}/{repo}/actions/jobs/<id>/logs`, filteren op
   `N) [` en `Error:`. Geen `gh run watch`.
8. Geen `git stash` (gedeelde .git met andere sessies). `node_modules` staat in git en is lokaal gewijzigd:
   niet committen. `handoff/` staat in `.gitignore`.
9. Modern (`styles-new.css`) niet aanraken. Niet naar main mergen of PROD promoten zonder Gio.
10. Gio's woord gaat voor documenten. Bij twijfel vragen.

## Designbron

`handoff/OPDRACHT.md`, `handoff/DESIGN-BESLUITEN.md`, `handoff/medewerker-gui.html` (desktop, leidend voor kop en
Mijn uren) en `handoff/medewerker-wild.html` (telefoon). Leesbare bron uitpakken met
`node <scratchpad>/uitpakken.mjs handoff/medewerker-gui.html handoff/medewerker-gui.bron.txt` (script: haalt de
string uit `<script type="__bundler/template">` en ontsnapt `\n`, `\"`). Waarden 1-op-1 overnemen.
Export 16:26 + gui-herexport daarna (salie-palet in `pas()` gecorrigeerd naar doorschijnend) staan in `handoff/`.

## Wat er deze ronde gebouwd is (2.0.63 – 2.0.69)

- **Menubalk (desktop ≥821, medewerker Klassiek licht én donker):** horizontaal; testknoppen als pictogrammen
  in `#testbalk` (plaatsTestknoppen); bel + profielmenu verhuisd naar rechts in de menubalk
  (`plaatsKopBediening`); topbalk (`.topbar`) verborgen bij de medewerker; alleen de menubalk plakt.
  `body.dataset.scherm` (niet `data-view`: botste met `[data-view]`-selectors in admin-tests).
- **Maandkiezer:** de echte `#global-period-control` verhuist als pil in de kopkaart (Vandaag) of naast de
  schermtitel (`.view-heading`) op andere schermen. Geen dubbele titel of avatar.
- **Vandaag, kop variant 5c:** `vandaagKopWaarden`, `vandaagWekenHtml`, `vandaagDagvakHtml` in `app.js`; weekvlakken
  met dagvakjes (mint gevuld / amber leeg ademend / laag weekend). Dagvakje → Mijn uren met focus in dat vak;
  weekvlak → die week; op telefoon (≤820) zijn vakjes `pointer-events:none`. Tokens `--weekvlak`,
  `--dag-leeg`, `--dag-leeg-ink` (licht en donker).
- **Kaarten doorschijnend:** `--surface rgba(255,255,255,.78)`, `--surface-muted .46`, body `#cfe1d8` +
  vast veldverloop (desktop); telefoon volgens wild `:root` (`.66`, `#dfe9e4`).
- **Mijn uren desktop (gui r319-371):** één kaart, weeknummers in de segmentknop, "36 OPEN" per rij, lege dag "–",
  voetregel "Automatisch opgeslagen. Nog N werkdagen niet ingevuld." (oranje blok met dagchips weg),
  statuspil blijft zichtbaar (elf E2E-cases van main wachten erop — op de lijst voor main).
  Maand indienen verschijnt ook in weekweergave zodra de maand vol is. Pijl links/rechts in de weekkeuze,
  Tab op vrijdagveld → volgende week, vegen 55px (`stapUrenPeriode`). Dagen buiten de maand: datum +
  gedempt, niet invulbaar veld (`.hours-buiten-veld`), tekst `--muted`. Focus blijft in urenvak na hertekenen.
- **Klanturenstaatpaneel:** van Mijn uren naar het eigen scherm `#view-customer-timesheet`
  (`restoreCustomerTimesheetPanelHome` kiest in Klassiek dat anker). Ingang: "Andere maand of concept
  opslaan →" op de kaart op Vandaag.
- **Voettekst** links bij elkaar binnen `--pagina`.
- Nieuwe/aangepaste cases: DASH-H-032, -045 t/m -051, SKIN-H-025, -037, MOB-H-002, CTS-API-H-006/-016,
  GUI-smoke in dashboard.spec.

## Eerstvolgende taak: Maanden als uitklaplijst (besluit Gio, 14 sep)

Bron: gui r377-420 (markup) en r1194-1270 (`maanden`-logica); DESIGN-BESLUITEN.
- Kop: label "MIJN MAANDEN", titel "N urenstaten", maandpil, pil "‹ Terug naar dashboard".
- Per maand een kaart (radius 15, rand `--line-zacht`, open = rand `--mint`), dicht bij openen; klik klapt open
  (één tegelijk). Rij: naam (15.5px kop), uren, **één statuspil** die de stap noemt waar het op wacht
  ("Uren open", "Correctie gevraagd", "Ingediend", "Urenstaat open", "Afgerond" …; nooit "in behandeling").
  Pilkleuren: afgerond mint `rgba(58,189,157,.16)`/`--mint-tekst`; wacht op medewerker amber
  `rgba(187,118,35,.14)`/`--warning-tekst`; anders `--surface-muted`/`--muted`.
- Uitgeklapt: uren per week, de vijf verloopstappen (gebruik `statusKetenStappen`), één hoofdknop per stand
  (Uren invullen / Correctie doorvoeren / Klanturenstaat aanleveren), en **alleen bij afgerond** de knop
  "PDF Urenoverzicht" met eronder exact: "Dezelfde PDF die je per mail kreeg — je uren per week."
  Geen geldbedragen, geen woord "bedragen". De PDF bestaat al: `buildTimesheetReceiptPdfBase64(employee, period,
  record)` in `app.js` (r2071); downloadhelper rond r12660 (bestand afleveren zonder weg te navigeren).
- De Klanturenstaat-kolom vervalt. **DASH-H-025** verhuist naar de pil; **DASH-H-031** (verloop openklappen
  in Mijn maanden) aanpassen. Bestaande code: `renderEmployeeHistory`-blok rond `app.js` r6700-6770,
  toggles `[data-history-verloop]` / `state.historyVerloopOpen`, `[data-history-period]`.
  Let op andere cases die `#employee-history .employee-history-row` gebruiken (DASH-N-024, DASH-H-007,
  DASH-H-038, TS-REV-UI) — grep vóór bouwen.

## Stil houden / op de lijst

- **Berichten** niet aanraken tot Gio de tabs (Alles / Ongelezen / Ingetrokken) heeft nagelopen.
- **"Hulp & contact"** zweeft over de inhoud: echte fout, maar main-tests klikken erop — laten staan tot main.
- **Statuspil op Mijn uren**: weghalen zodra main die elf E2E-cases aanpast.
- Donker thema is deze ronde niet herontworpen, alleen de menubalk loopt mee.
- Afwijking `--muted` i.p.v. `--line` voor dagen buiten de maand is door Gio goedgekeurd en in de referentie
  overgenomen.
