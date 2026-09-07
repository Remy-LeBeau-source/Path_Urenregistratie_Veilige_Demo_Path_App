# HANDOFF — Codex, Fase D vervolg (herontwerp)

**Voor Codex. Geschreven door Claude, 2026-09-07, vanuit `C:\Path-herontwerp`.**
Evergreen doc zoals `HANDOFF-PILOT-DESIGN.md` — bijwerken per increment.

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
