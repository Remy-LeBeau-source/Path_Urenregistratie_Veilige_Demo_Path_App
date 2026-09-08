# HANDOFF — Codex, Fase D vervolg (herontwerp)

## 12:15 8 september — Backoffice-bevestiging klanturenstaat afgerond

De taak uit de sectie hieronder is uitgevoerd. `mark_skipped` door de
medewerker blijft oranje en blokkeert factuurafronding en mailqueue. Alleen een
goedgekeurd document, of `confirm_external` door Backoffice met reden, maakt de
klanturenstaat gereed. Browser, invoice-API en mailqueue hanteren hetzelfde
contract. Bewijs: `invoice-lock.spec.ts` 10/10 groen; zes geraakte
business-workflows 27/27 groen op desktop, mobile-chrome en mobile-safari;
living docs 446 unieke cases; design-, BDD-, DB-config- en operationele gates
groen. Nieuwe regressiecase: `INV-N-026`.

Volgende stap: CI op `herontwerp`; bij groen verzorgt de merge-queue de
fast-forward naar `main` en de release-handoff naar TEST. PROD blijft handmatig.

**Voor Codex. Geschreven door Claude, 2026-09-07, vanuit `C:\Path-herontwerp`.**
Evergreen doc zoals `HANDOFF-PILOT-DESIGN.md` — bijwerken per increment.

## 06:20 8 september — nieuwe taak voor Codex: Backoffice-bevestiging klanturenstaat (opdracht van de gebruiker)

`herontwerp`-CI is inmiddels groen (commit `36c8e53`, zie sectie hieronder) en
automatisch naar `main` doorgestroomd. Dit is een **aparte, nog openstaande
taak**, expliciet aan Codex toegewezen door de gebruiker.

**Wat er ontbreekt:** `path-urenregistratie/HANDOFF-CODEX.md` (door Copilot
geschreven, ondanks de bestandsnaam getiteld "Overdracht aan Claude") legt in
§2.1 de bedoelde regel vast: de medewerker die "Al rechtstreeks gemaild"
registreert (`mark_skipped`) blijft **oranje** en blokkeert afronding — alleen
een aparte Backoffice-actie ("Extern bevestigd", `confirm_external`) mag
groen maken. Zie ook de beslissingstabel in §3 van dat document.

**Waarom dat nu niet klopt, exact:** gecontroleerd in `server/api/
customer-timesheets.php` op zowel `main` als `herontwerp` — de acties
`mark_skipped` (medewerker) én `confirm_external` (Backoffice) schrijven
**dezelfde** `customer_timesheets.status = 'skipped'` weg. Het enige verschil
zit in het `review_note`-tekstprefix ("Extern bevestigd: ...") en wie de rij
zette (`reviewed_by`). De guard die vannacht in `6e2543d` is toegevoegd
(`server/api/invoices.php` + `server/mail/queue.php`,
`customerTimesheetReady`) checkt alleen of de status in
`['received','approved','sent','sent_to_broker','skipped']` staat — hij kan
dus niet onderscheiden of het de medewerker was of Backoffice. Op `main`
bestaat deze guard trouwens helemaal nog niet (nul regels, gecontroleerd);
die staat alleen op `herontwerp`.

**Voor Codex, concreet:**
1. Een manier om medewerker-skip en Backoffice-bevestigd te onderscheiden op
   database-niveau (bv. een eigen status-waarde `skipped_pending_confirmation`
   vs. `skipped_confirmed`, of een boolean/kolom naast `reviewed_by IS NOT
   NULL` die de guard expliciet checkt — `reviewed_by` bestaat al en wordt al
   gezet door `confirm_external`, dus dat is vermoedelijk de kleinste wijziging).
2. `customerTimesheetReady` in `invoices.php` én `queue.php` aanscherpen zodat
   kale `skipped` (medewerker, geen `reviewed_by`) **niet** meer voldoet.
3. De 9 testfixtures die ik vannacht repareerde (zie sectie "test: registreer
   klanturenstaat..." hieronder) moeten dan een stap erbij: na `mark_skipped`
   als medewerker, ook `confirm_external` als Backoffice vóór het factureren.
   Dat is dezelfde volgorde als `HANDOFF-CODEX.md` §2.1 beschrijft.
4. UI-kant: de klanturenstaat-status moet oranje blijven tonen totdat Backoffice
   bevestigt — controleer of dat al zo weergeeft of dat de frontend ook nog
   uitgaat van kale `skipped` = groen.
5. Rest van `HANDOFF-CODEX.md` (§2.2–2.5: week/maand-UX, ontvangstmails,
   goedkeuringsmail, herinneringen) is een groter, apart traject — deze taak
   hier is alleen het klanturenstaat-onderscheid uit §2.1.

## 02:04 8 september — CI rood op `7c52e23`, root cause gevonden (Claude)

`herontwerp`-CI faalt breed (shards 1/2/4 rood) met overal dezelfde kern:

```
Error: definitief maken hoort te slagen: {"ok":false,"error":"customer-timesheet-required",
"message":"De klanturenstaat moet eerst zijn ingediend of als rechtstreeks gemaild
geregistreerd voordat de factuur kan worden afgerond."}
```

Komt rechtstreeks uit `6e2543d` ("verplicht klanturenstaat en veilig
maandindienen"): die nieuwe regel wordt nu overal afgedwongen bij het
afronden van een factuur, maar veel bestaande testopstellingen
(business-workflows-failure/idempotency/mail*, invoice-lock, email-queue,
INV-*, EQ-*) zetten nog geen klanturenstaat klaar voordat ze een factuur
proberen af te ronden. Raakt geen van Claude's CSS/test-commits — puur
gevolg van de nieuwe regel zelf, nog niet doorgevoerd naar de testfixtures.

**Niet zelf gepatcht** — dit is Codex' eigen nieuwe business-regel; welke
testopstellingen bewust een uitzondering horen te zijn (bv. AVI/salaris-only
routes zonder klanturenstaat) weet ik niet zeker genoeg om blind te wijzigen.
De wachtrij (§0a) laat dit terecht niet naar `main` doorstromen zolang het
rood staat — dat is precies de bedoelde bescherming.

## Nacht 7→8 september 2026 — Claude's kant van de nacht, kort

Codex en Claude werkten deze nacht gelijktijdig op `herontwerp`; hieronder
alleen Claude's kant, in commitvolgorde met de laatste bovenaan bij het lezen
van `git log`. Elke sync met Codex' commits ging schoon, zonder conflicten.

- `0c581eb` — nieuwe regressietest `[SKIN-H-010]` (`tests/playwright/
  skin.spec.ts` + `features/skin.feature`): bewijst dat de admin-verhaallijn
  (`.new-admin-employee-row`, al verbonden aan echte medewerker-/periodedata)
  daadwerkelijk van medewerker wisselt — geselecteerde rij, verhaalkop-naam en
  vier statuskaarten kloppen na een klik. Dit was letterlijk een van de 7
  openstaande punten in Codex' eigen portal-lijst ("nieuwe Playwright-cases
  voor de storyline en de acties"). Design-audit groen.
- `2dea2dd`/`4a015e5`/`1c74c64` — drie kleine CSS-only polish-increments,
  puur additief onder `html[data-skin="new"]`, classic ongewijzigd:
  factuurdetail-modal + PDF-preview (radius/schaduw/serif op koppen en
  eindbedrag), goedkeuringenkaarten (schaduw + groene hover-ring),
  klanturenstaat-stappenblok en veiligheidsregel-kaarten (radius naar 16px/
  14px, in lijn met de rest van het fundament). Gerichte hertest 202/0 en
  350/31 gedraaid (die 31 faalden op dat moment op ongerelateerde email-
  queue/invoice-lock-cases tijdens Codex' eigen tussentijdse commits — geen
  van de CSS-wijzigingen zelf raakte die bestanden).
- `8900100` — `origin/main` (`6a8dffc`) teruggehaald in `herontwerp` nadat de
  automatische merge-wachtrij (zie hieronder) een main-commit had gemist;
  standaard sync-onderhoud, geen inhoudelijke wijziging.

**Belangrijke observatie over de CI-cyclus vannacht:** bij snel na elkaar
pushen (van beide agents) annuleert elke nieuwe push de vorige lopende
`CI`-run (`cancel-in-progress: true` in `ci.yml`). Een "failure"/"cancelled"
in de Actions-lijst hoeft dus geen echte testfout te zijn — check altijd de
laatste run op de laatste commit voor je concludeert dat iets rood staat.

**De automatische merge-wachtrij (`pilot-merge-queue.yml`, zie eerdere sectie
hieronder) werkt intussen echt**: hij heeft vannacht zelfstandig `herontwerp`
naar `main` gemerged (o.a. via `40ad8b1`) en de Release Pipeline gestart. PROD
is niet aangeraakt.

**Wat ik bewust niet heb opgepakt:** de grote functionele portal-uitbreiding
(storyline als volwaardige route verder afmaken, overige hoofdschermen in de
nieuwe stijl) — dat is precies waar Codex al middenin zat (`6e2543d` "verplicht
klanturenstaat en veilig maandindienen" e.v.). Tegelijk aan dezelfde
functionele kern werken zonder overleg zou onnodig conflictrisico geven.

## Actuele gezamenlijke werkafspraak (Claude en Codex)

Deze paragraaf gaat vóór oudere, beperktere overdrachtsregels verderop in dit
document. Claude en Codex lezen vóór ieder nieuw increment zowel `origin/main`
als `herontwerp`, nemen de nieuwste `main` eerst op in `herontwerp` en bewaren
de werkende klassieke app. De PWA-, hydratie- en dialoogfixes horen bij de
gedeelde klassieke code; de verdere visuele uitwerking van 1414/1919 hoort bij
`skin=new`. Functionele pilotbediening mag gedeelde HTML/JavaScript gebruiken
als beide skins en beide rollen aantoonbaar blijven werken.

**Beide agents kijken per wijziging kritisch naar ontwerp én gedrag.** Ze vullen
zelf ontbrekende positieve, negatieve, mobiele en regressiecases aan waar het
risico dat vraagt. Bestaande tests worden niet alleen passend gemaakt aan de
implementatie: iedere case moet het bedoelde gebruikersgedrag bewijzen. Minimaal
worden bij de huidige pilot bewaakt: Classic start licht, Nieuw start donker,
thema's worden per skin onthouden, weekinvoer en presets schrijven echte data,
alleen de laatste week kan de maand indienen, indienen vraagt een bewuste
bevestiging, de beheerderstoryline houdt alle hoofdschermen bereikbaar en
`SKIN-N-007` houdt Nieuw op PROD fail-closed verborgen.

Werk in korte Nederlandse commits zonder `Co-Authored-By`. Stage uitsluitend
expliciete paden en gebruik nooit `git add -A`. Een agent mag na groene controle
zelfstandig `herontwerp` bijwerken en naar TEST integreren volgens
`COPILOT_HANDOFF.md`; PROD blijft altijd achter de handmatige reviewerpoort.

## 0. Actuele voortgang 7 september 2026

De basisregressie is afgerond: desktop 375/375, Android/Chrome 45/45 en
iPhone/WebKit 45/45 groen; `npm run build`, `npm run check` en GitHub CI-run
`34118945695` zijn groen. De combinatie met main-kop `c37fd23` is daarna zonder
conflict opgenomen en door CI-run `34126046882` groen bevestigd. Tijdens die
run verschoof main met een PWA-hydratiefix; de herstelde kop `ac7ca6c` is
vervolgens zonder conflict opgenomen. Nu volgen gerichte controles en opnieuw
groene branch-CI vóór de merge naar main voor deployment op TEST. Gerichte
controle is groen voor `DASH-N-010`, `DASH-N-026`, `MOB-H-024` en alle negen
`SKIN-*`-cases, inclusief functionele parity van beide skins voor beide rollen.
PROD blijft Classic-only en achter de verplichte reviewerpoort.

De pilot-CI draait vanaf deze integratie in vier parallelle shards en faalt als
`herontwerp` commits van `main` mist. De main-release bevat daarnaast het
zichtbare, informerende blok `Inspect pilot branch`, zodat beide werkstromen
bij iedere release worden vergeleken zonder een gewone hotfix te blokkeren.

## 0a. Nieuw 7 september 2026 (avond) — automatische merge-wachtrij naar `main`

Er is een GitHub Actions-workflow gebouwd die de merge `herontwerp` → `main`
**zelf** doet, zodat niemand dat nog handmatig hoeft te pushen. Status en
regel hieronder — dit vervangt **niet** de regel "raak `main` niet aan" in
§1: die blijft gelden voor mensen/agents zelf; dit is de ene bewuste
automatisering die de gebruiker hiervoor heeft goedgekeurd.

**Bestand:** `.github/workflows/pilot-merge-queue.yml`, moet op de default
branch (`main`) staan om te kunnen reageren op de `workflow_run`-event van
`CI` (die op `herontwerp` draait) — dat is een GitHub-beperking, geen keuze.
**Stand bij schrijven:** het bestand staat klaar in PR
[#41](https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/pull/41)
op een losse branch `ci/pilot-merge-queue`; de gebruiker merget die PR zelf
(agents mogen niet naar `main` pushen of daar een PR op mergen — dat wordt
door de omgeving zelf geblokkeerd, niet alleen door afspraak). Controleer of
PR #41 gemerged is voordat je op de automatische wachtrij rekent; zo niet,
blijft de oude regel gelden dat de gebruiker de uiteindelijke merge doet.

**Wat de workflow doet, exact:**

1. Draait bij elke afronding van de `CI`-workflow op `herontwerp`.
2. Gaat alleen verder als die CI-run **groen** eindigde.
3. Controleert of `herontwerp` de actuele `main` al bevat (dezelfde check als
   `ci.yml` al doet). Zo niet: geen merge, alleen een waarschuwing — dan moet
   eerst iemand `main` in `herontwerp` opnemen (dat blijft mensen-/agentwerk,
   zie §1 vierde bullet).
4. Zo ja: wacht (poll elke 60s, max 3 uur) tot `main` **geen actieve** Release
   Pipeline-run meer heeft — **ongeacht of die rood of groen eindigde**, alleen
   de status (`in_progress`/`queued` vs. `completed`) telt.
5. Zodra `main` vrij is: fast-forwardt `main` naar de groene `herontwerp`-commit.

**Wat dit niet doet:** PROD promoten. Die stap blijft achter de handmatige
GitHub-environment-reviewerpoort op `prod`, ongeacht deze workflow.

**Enige resterende voorwaarde voor een storingsvrije, volautomatische
doorstroom:** houd `herontwerp` synchroon met `main`. Zolang dat zo is en de
CI groen is, gebeurt de rest zonder tussenkomst.

## 1. Waar je bent / wat je NIET aanraakt

Je werkt in een **git worktree**: `C:\Path-herontwerp`, vast op branch
**`herontwerp`**. Dit is een aparte checkout naast de hoofdmap
`C:\Path_Urenregistratie_Veilige_Demo_Path_App` (die staat vast op `main` —
de go-live/PROD-lijn, in een andere chat/sessie). Zolang de worktree bestaat
kan de hoofdmap niet naar `herontwerp` overschakelen; dat hoeft ook niet, jij
werkt gewoon in `C:\Path-herontwerp`.

- **Raak `main` niet aan.** Geen merge, geen cherry-pick naar `main`, geen
  Promote Prod — dat is een expliciete, bewuste actie van de gebruiker zelf,
  nooit van een agent.
- Werk alleen op **`herontwerp`**. Alles wat je hier commit/pusht raakt
  PROD niet: een push van `herontwerp` triggert geen Release Pipeline (die
  is `main`-getriggerd).
- `herontwerp` is afgetakt van `1.0.0` en heeft `1.0.1–1.0.3` (main) er
  periodiek in gemerged, om de latere `herontwerp` → `main`-merge klein te
  houden. Als jij lang doorwerkt: merge af en toe `main` erin, net als tot nu
  toe gedaan.
- **Pilot-bestandseigendom blijft staan**: `pilot/1919-medewerker.*` en
  `pilot/1919-beheerder.*` zijn van Claude — daar niet aankomen. Dit handoff
  gaat over iets anders: de **in-app skin** (`assets/styles-new.css`), niet
  de losse pilotpagina's.

## 2. Wat dit werk is (kort)

Fase D = een tweede vormgeving ("nieuw", 1414 Bento × 1919 Storyline) naast
de bestaande ("klassiek"), omschakelbaar via Voorkeuren → Vormgeving
(`state.preferences.skin`, toegepast door `applySkin()` in `assets/app.js`,
zet `html[data-skin]`). **Alles** zit in **`assets/styles-new.css`**, **elke
regel gescoped onder `html[data-skin="new"]`**. Classic (het bestaande
uiterlijk) mag nooit veranderen — geen JS-wijzigingen, geen HTML-wijzigingen,
puur additieve CSS. Op PROD is `skin=new` fail-closed verborgen
(`[SKIN-N-007]`); die guard niet aanraken.

De schermen-inventaris (increment 1–11, zie `HANDOFF-PILOT-DESIGN.md` §3–4)
is **compleet**: login, mededelingen, goedkeuringen, mijn uren, facturen,
medewerkers, instellingen, modals, mobiel — allemaal op het fundament
aangesloten. Wat nu rest is **fijnslijpen**, geen nieuw fundament.

## 3. Exacte stand bij overdracht

- Branch `herontwerp`, laatste commit: `acd8cf0` "handoff — worktree-opzet
  vastgelegd". Daarvoor `2fd78e7` (main/1.0.3 erin gemerged), en increment
  3–11 (`ccad481` t/m `6df5414`).
- Versie: `1.0.3` (package.json). Er is nog geen aparte `0.11.x`-lijn voor
  Fase D gestart op deze branch — bepaal dat in overleg met de gebruiker, of
  laat het nummer met rust tot de merge (zie `HANDOFF-PILOT-DESIGN.md` §5.4).
- `assets/styles-new.css`: 875 regels, alles onder `html[data-skin="new"]`.
  Niets hiervan is in deze sessie gewijzigd — ik heb alleen getest, niet
  geschreven.
- **Wat ik wél heb gedaan in deze sessie:** de worktree miste drie
  machine-lokale, gitignored bestanden die de e2e-runner nodig heeft. Die
  heb ik gekopieerd vanuit de hoofdmap (`C:\Path_Urenregistratie_Veilige_Demo_Path_App`):
  - `path-urenregistratie/.env.local`
  - `path-urenregistratie/server/.php-path`
  - `path-urenregistratie/server/config.local.php`

  Ze staan nu in de worktree en zijn (terecht) niet gecommit — check
  `git status` niet nodig, ze zitten in `.gitignore`. **Als jij in een andere
  worktree/machine werkt en ze ontbreken: kopieer ze opnieuw, of maak ze aan
  volgens `dev-environment-this-machine`-opzet (native MySQL 8.0.40 op
  127.0.0.1:3306, root/root, db `path_urenregistratie_test`, PHP 8.4 via
  winget).**

## 4. EERSTE TAAK: de volledige desktop-e2e afmaken

Ik heb `node scripts/run-playwright-e2e.mjs --project=desktop-chromium`
(375 tests) gestart om increment 3–11 in één keer te bevestigen. De run
kwam ~80 van de 375 tests ver **zonder één mislukking** voordat de sessie
werd afgebroken (de achtergrondtaak stopte met de vorige Claude Code-sessie,
niet door een testfout). **Dit is dus nog niet bevestigd 100% groen** — dat
is letterlijk de eerste taak in `HANDOFF-PILOT-DESIGN.md` en die staat nog
open. Draai 'm opnieuw en laat 'm volledig doorlopen:

```
cd path-urenregistratie
node scripts/run-playwright-e2e.mjs --project=desktop-chromium
```

Moet 100% groen. Als er iets rood is: repareer het (styles-new.css of, als
het aan een gedeeld component ligt, met uiterste terughoudendheid ook
classic — overleg eerst met de gebruiker voor je classic aanraakt). Daarna
pas verder met fijnslijpen.

## 5. Wat daarna rest (fijnslijpen)

Uit `HANDOFF-PILOT-DESIGN.md` §→WAT ER NOG MOET, in volgorde:

1. ✅ (deze sessie, deels) volledige desktop-e2e — **rond dit af, zie §4**.
2. **Handmatige mobiele doorloop** op een echt toestel (iOS + Android PWA)
   van elk scherm in `skin=new`. Kan niet door een agent alleen — vraag de
   gebruiker om mee te testen of terugkoppeling te geven.
3. **Verdere fijnslijping per scherm** waar de 1414/1919-mockups
   (`design-mockups/1414-path-bento-space/*.jpg`) dat nog vragen. Puur
   voorbeelden, geen uitputtende lijst — vergelijk zelf tegen de mockups:
   - factuurdetail-modal + PDF-preview kunnen nog polish (genoemd in de
     schermeninventaris als "kan nog").
   - week/maand-layout van "Mijn uren" kan verder verfijnd.
   - lijst-polish in Goedkeuringen.
   - per-subsectie fijnslijpen in Instellingen.
4. Als de gebruiker het herontwerp accepteert: **de gebruiker** beslist over
   de merge `herontwerp` → `main` (= `1.1.0`). Dat doe jij niet zelf.

## 6. Werkregels (verplicht, ongewijzigd t.o.v. eerdere increments)

1. Werk op **`herontwerp`**, nooit op `main`.
2. Wijzig alleen `assets/styles-new.css`, altijd onder
   `html[data-skin="new"]`. Classic blijft bit-voor-bit ongewijzigd.
3. Lokaal verifiëren: `php -S 127.0.0.1:8000 -t path-urenregistratie` en
   bekijk met `skin=new` (Voorkeuren → Vormgeving of `localStorage`). Draai
   `npm run check` + de relevante specs; vóór een grotere wijziging de
   volledige suite (§4) in **beide** skins 100% groen.
4. Gebruik een korte Nederlandse commitboodschap zonder
   `Co-Authored-By`-trailer.
5. `git add` met **expliciete paden**, **nooit** `-A` (sweept anders
   halfklaar werk van andere agents/sessies mee).
6. `git push origin herontwerp` na elke increment.
7. Werk `HANDOFF-PILOT-DESIGN.md` bij per increment (zoals increment 1–11
   deden) — dit bestand (`HANDOFF-CODEX-FASE-D.md`) alleen bij grote
   overdrachtsmomenten, niet per increment.
8. Versie via `npm run version:set` — nooit met de hand (13 plekken).

## 7. Valkuilen (uit `HANDOFF-PILOT-DESIGN.md` §6, blijven gelden)

- `set-version.mjs` is een kale string-replace — kies geen versie die
  substring is van een IP/getal (`0.0.1` botste met `127.0.0.1`).
- Windows/Bash: CWD kan tussen tool-calls terugvallen naar de repo-root —
  gebruik bij twijfel het absolute pad
  `cd /c/Path-herontwerp/path-urenregistratie && ...`.
- Poort 8000 vrij maken: `taskkill //F //IM php.exe`.
- `--grep "A|B"` breekt op de shell-pipe onder Windows.
- `<select>` in een modal wordt opgewaardeerd naar een keuzemenu-widget
  (`initializeStandardChoiceMenus`) — bedien via `#<id>-trigger` +
  `[data-standard-choice-*]`.
- Geen harde time-outs op transiënte UI-meldingen; toets de blijvende
  uitkomst.
- `skin=new` op PROD moet fail-closed verborgen blijven (`SKIN-N-007`) —
  die guard niet aanraken.

## 8. Als je vastloopt

`git fetch && git checkout herontwerp` (of werk gewoon door in
`C:\Path-herontwerp`, die staat er al op), lees `HANDOFF-PILOT-DESIGN.md`
vanaf het begin, dan dit bestand, dan §4 hierboven als eerste actie.
