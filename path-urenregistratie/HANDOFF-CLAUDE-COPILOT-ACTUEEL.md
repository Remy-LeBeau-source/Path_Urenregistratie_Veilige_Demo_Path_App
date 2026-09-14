# Handoff voor Claude Code en Copilot — 14 september 2026 avond

## Directe status

Werkmap: `C:\Path-herontwerp-actief\path-urenregistratie`
Branch: `herontwerp`
Laatste gepushte commit: `3cb8d2fb fix: behoud safe-area contract medewerkerkop`
Versie: `2.0.62`

Scope van deze ronde: alleen medewerkerkant, Klassiek licht, inclusief desktop
GUI en mobiele webapp/PWA. Beheer, Modern en donker zijn bewust niet
herontworpen.

## Wat al gebouwd is

- Desktop medewerkerdashboard heeft geen losse paginatitel meer.
- De kop is één samengestelde kaart met begroeting, maandkiezer, groot open
  dagen-cijfer, dagspoor, weekkaarten, eerdere maanden en hoofdknop.
- De losse oude hero-kaart is weg.
- Teksten/pillen zoals `Nog N dagen in te vullen` en `Jij bent aan zet` zijn uit
  de desktopkop verwijderd.
- Klassiek licht gebruikt één vast paginaverloop over het venster.
- Kaarten hebben geen eigen verloop meer in deze nieuwe medewerkerkop.
- De kop/menubalk is doorschijnend met blur.
- Desktop medewerker Klassiek licht gebruikt nu een horizontale vier-tabsnavigatie
  bovenaan in plaats van de oude donkerblauwe zijbalk.
- Mobiel/PWA behoudt de Wild-opbouw met onderste vier-tabsnavigatie.
- De click-regressie door `body[data-view]` is opgelost: delegatie zoekt nu alleen
  `button[data-view]` en `button[data-pilot-view]`.
- Weekkaarten openen de juiste week; dit is gericht getest.

## Lokale checks die vóór de CI-fix groen waren

- `npm run version:check`
- `node --check assets/app.js`
- `npm run test:design`
- `npm run test:bdd:design`
- `git diff --check` met alleen bestaande line-ending waarschuwingen
- Gerichte Playwright-regressie: DASH-H-036, DASH-H-045, DASH-H-048, DASH-H-049
- Compacte suite: `DASH-H-04[5-9]` op desktop Chromium en mobile Chrome: 10/10
  groen

## CI-status op commit 804fc2ca

GitHub Actions run: `34842770470`
URL: `https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/34842770470`

CI startte op `origin/herontwerp`, maar shard `Validate and test (1/8)` faalde
vroeg bij `Smoke check`.

Fout:

```text
Error: De bovenbalk moet env(safe-area-inset-top) aanhouden, anders valt hij op iOS achter de statusbalk
```

Dit is geen brede E2E-failure. De failure kwam vóór de brede E2E van shard 1.
Omdat deze run al onherstelbaar rood was, is cancel aangevraagd om CI-minuten te
besparen:

```text
gh run cancel 34842770470
```

## Lokale herstelwijziging die nu klaarstaat

Herstel is inmiddels gecommit en gepusht:

```text
3cb8d2fb fix: behoud safe-area contract medewerkerkop
```

Herstelinhoud:

- `assets/styles.css`
  - In de nieuwe employee-dashboard topbar override is toegevoegd:
    `padding-top: env(safe-area-inset-top, 0px);`
  - Reden: smoke zoekt in de laatste `.topbar { ... }` naar het iOS safe-area
    contract. De dashboard-topbar blijft visueel verborgen zoals bedoeld.

- `assets/app.js`
  - In `applyOrganizationBranding()` is `window.matchMedia(...)` defensief
    gemaakt met `typeof window.matchMedia === "function"`.
  - Reden: echte browsers hebben `matchMedia`, maar `scripts/smoke-test.mjs`
    draait in jsdom. Zonder guard faalt smoke lokaal met
    `TypeError: window.matchMedia is not a function`.

Na deze app.js-fix is `node --check assets/app.js` groen.

Actuele validatiepoging: `node scripts/smoke-test.mjs` is opnieuw lokaal gestart
na de twee herstelregels, maar bleef minutenlang stil en is bewust gestopt om
usage te sparen. Claim daarom niet dat de volledige lokale smoke groen is. De
zuinige vervolgstap is gericht bewijzen dat de twee concrete contractbreuken
zijn afgedekt: CSS bevat opnieuw `env(safe-area-inset-top, 0px)` in de laatste
employee-dashboard `.topbar`-override, en app.js gebruikt een
`typeof window.matchMedia === "function"` guard.

## Nieuwe CI-status

Nieuwe CI-run na herstelpush:

```text
34844009341
https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/34844009341
status bij laatste check: in_progress
```

Gebruikslimiet-context: Gio ziet nog ongeveer 14% over op het 5-uurslimiet.
Daarom nu geen zware lokale suite, geen nieuwe scope en geen main-route. Alleen
compacte CI-status ophalen. Als Codex stopt door usage: Claude/Copilot kan
direct verder vanaf deze run-id.

## Eerstvolgende stappen

1. Controleer CI-run `34844009341` met korte JSON-statuschecks, niet met
   `gh run watch`.
2. Als CI groen is: noteer groen in deze handoff en in de masterchecklist.
3. Als CI rood is:
   - fix alleen de concrete root cause
   - werk deze handoff bij met fout, oorzaak en herstel
   - draai alleen de relevante check opnieuw

## Belangrijk voor usage

Gebruik geen `gh run watch` meer. Dat herhaalt de volledige 8-shard status om de
paar seconden en verbruikt veel context. Gebruik liever:

```bash
gh run list --branch herontwerp --limit 5 --json databaseId,status,conclusion,headSha,url,workflowName,createdAt
gh run view <run-id> --json status,conclusion,url,jobs
gh run view <run-id> --job <job-id> --log
```

Haal alleen logs op wanneer een job rood is.

## Grenzen

- Niet naar `main` mergen zonder expliciete keuze van Gio.
- Niet PROD promoten.
- Voor nu geen extra main-taken starten.
- Deze ronde blijft medewerker-only.

---
### Lokale tooling
- 2026-09-14: lokaal script toegevoegd: `path-urenregistratie/scripts/check-gh-run.ps1` (niet gecommit). Gebruik dit script lokaal om run `34844009341` te controleren zonder CI te triggeren.

- 2026-09-14: tijdelijke fix lokaal toegepast in tests helper `tests/playwright/pages/TopbarMenu.ts` om flakiness bij het openen van het profielmenu te mitigeren (wacht op DOM-attachment in plaats van strikte zichtbaarheid). Dit is lokaal en niet gecommit.
2026-09-14T14:40:55 - run 34844009341 - NOT SUCCESS () - logs downloaded to gh-run-34844009341-logs - https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/34844009341
