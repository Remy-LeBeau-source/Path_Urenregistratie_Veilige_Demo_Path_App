# Handoff — kritische app-review + exacte deployprocedure

Bijgewerkt: 29 augustus 2026. Aangevraagd door Gio: "loop de hele app na, fix wat je ziet,
maak een handoff zodat ik ook in Codex kan kijken, en zet er precies in hoe we deployen."
Volgt op `HANDOFF-STRUCTUUR.md` en `CLAUDE_CODE_HANDOFF.md` / `COPILOT_HANDOFF.md`.

Uitgangspunt: de app staat op **0.9.149** (dashboard-herindeling 0.9.150–0.9.153 is
teruggedraaid, commit `31b99dc`). De kernbestanden `assets/`, `index.html`, `server/`
zijn 1-op-1 gelijk aan de 0.9.149-release; daarbovenop alleen testcases, `.htaccess`
cache-fix, `vite open:true` en losse handoffs.

---

## 1. Gefixt in deze ronde (in deze commit)

| # | Bestand | Bevinding | Fix |
|---|---|---|---|
| 1 | `server/api.php` | De app-state-upsert gebruikte `:state` **twee keer** in één prepared statement (`INSERT ... VALUES (1, :state) ON DUPLICATE KEY UPDATE state = :state`). Werkt vandaag alleen omdat dit losse endpoint een eigen PDO-verbinding opzet **met emulatie aan** (default). Alle andere verbindingen in de codebase draaien met `PDO::ATTR_EMULATE_PREPARES => false`; bij die instelling geeft een herhaalde benoemde placeholder `SQLSTATE[HY093]` en klapt het opslaan van de app-state eruit. Exact de bug die 0.9.147 sloopte (queue.php, `:company_id`), toen hotfixed in 0.9.148. | Insert- en update-tak hebben nu elk een eigen naam: `:state` en `:state_update`, allebei met dezelfde waarde gebonden in `execute()`. Gedrag identiek onder zowel emulatie als echte prepares. |
| 2 | `scripts/smoke-test.mjs` | Geen statische bewaking op bovenstaande valkuil in `api.php`. | `apiPhpSrc` toegevoegd + assert dat `:state` max. 1× in de `app_state`-upsert staat (zusje van de bestaande `queue.php`-`:company_id`-guard). |
| 3 | `check-invoice-timing.php` (repo-root) | Eenmalig debugscript uit 2026-08-16 (`eed016f` / v0.9.84), per ongeluk meegecommit. Onbeveiligd, maakt een directe DB-verbinding, en werd bij **elke deploy meegestuurd naar de publieke webroot** (`/check-invoice-timing.php`). Bevat zelf een SQL-fout (`FROM invoices` zonder alias `i` terwijl het `i.id` selecteert) dus de query faalt, maar `die($e->getMessage())` lekt de DB-fout. | Verwijderd. |
| 4 | `full-check.log`, `test-output.log` (repo-root) | Lokale build-/testlogs, zelfde per ongeluk-commit `eed016f`. Werden mee gedeployd naar de webroot; de root-`.htaccess` blokkeert `.log` **niet** (alleen `server/.htaccess` doet dat, en alleen binnen `server/`). | Verwijderd + patronen toegevoegd aan `.gitignore` (`full-check.log`, `test-output.log`, `*.local.log`). |
| 5 | `server/reset-token-lookup.php` | Eigen kopregel: *"Tijdelijk hulpscript ... Verwijder dit bestand voor productiegebruik."* Onbeveiligd, **niet** afgeschermd door `server/.htaccess` (die noemt alleen `install`/`migrate`/`db_inspect`). Toont de 5 recentste wachtwoord-reset-tokens met gebruikers-e-mail, aanmaaktijd en used-status. (Heeft ook een bug: selecteert `token_hash` maar print `$row['token']`, dus het tokenveld komt leeg — de e-mails en timing lekken wel.) | Verwijderd. |
| 6 | `node_modules/.vite/deps/` (2 files tracked) | Vite-dep-cache stond in git en werd bij elke `vite`-run aangeraakt → `git status` altijd vuil. | `git rm --cached` (blijft op schijf; `node_modules/` staat al in `.gitignore`). |
| — | `.vscode/settings.json` | VS Code's PHP Language Features vond geen PHP → "Cannot validate since a PHP installation could not be found". | `php.validate.executablePath` + `php.executablePath` gezet naar het pad uit `server/.php-path`. **Lokaal bestand (gitignored), zit niet in de commit.** Even VS Code-venster herladen. |

**Validatie in deze ronde:** `node --check` op `assets/app.js` en `scripts/smoke-test.mjs` → OK.
`php -l server/api.php` → OK. Volledige `npm run check` + `npm run test:e2e` draaien sowieso
in de pipeline (4 shards) vóór de TEST-deploy; de deploy heeft auto-rollback.
Remote-regressie (37 cases, `playwright.test-remote.config.ts`) vóór deze ronde: **37/37 groen**
tegen de live TEST-site.

---

## 2. Open bevindingen — NIET blind gefixt (voor Codex / een aparte branch)

Deze raken auth-semantiek of de deploy-verpakking; op een groene release wil je die
apart doen mét eigen pipelinerun en E2E-controle.

### 2.1 `GET /server/api.php?action=state` is niet geauthenticeerd — HOOG

`server/api.php` regel ~65–79: de **GET**-tak heeft geen enkele auth-check en geeft de
volledige opgeslagen `app_state`-blob terug. De **POST**-tak eist wel sessie + CSRF.

In auth-modus stuurt `assets/app.js` (`persistState()`, regel ~1206) via POST de **hele
client-`state`** naar dit endpoint (`body: JSON.stringify({ state: copy })` — `copy` is een
volledige deep-clone van `state`, alleen `currentRole`/`invoiceFilter` genulld). Er is één
globale rij (`id = 1`), geen tenant-scheiding. `MASTERCHECKLIST.md:1070` noemt `app_state`
"een gecontroleerde fallback, niet de primaire database in auth-modus" — de echte data
komt uit de geauthenticeerde `server/api/*.php`-endpoints — maar wat de laatste ingelogde
client heeft weggeschreven is nu dus anoniem opvraagbaar op
`https://uren-test.pathconsultancy.nl/server/api.php?action=state`.

**Waarom niet nu gefixt:** `loadStateFromServer()` in `app.js` (regel ~1220) is *niet*
gegate op auth-modus — het doet de GET ook vóór/zonder login. Auth op de GET zetten laat
die fetch 401 geven; `.catch(() => {})` slikt dat en de app valt terug op `freshState()`.
Kan prima zijn, kan de "teruggekeerde gebruiker ziet zijn spullen vóór login"-UX breken,
en kan door de E2E-suite heen rimpelen. Vergt een eigen branch + volledige pipeline.

**Remediatie-opties:**
- **A (aanbevolen):** GET achter `auth_start_session_secure` + rol-check zetten; in auth-modus
  alleen de UI-subset teruggeven (net als wat `persistState()` al naar localStorage schrijft),
  nooit business-data. `loadStateFromServer()` pas aanroepen ná bevestigde auth.
- **B:** POST-payload beperken tot exact de UI-subset (`schemaVersion`, `preferences`,
  `selectedPeriodKey`, reminder-instellingen, scope-vlaggen) i.p.v. de volledige `copy`,
  zodat er nooit gevoelige data in `app_state` belandt. Minste UX-risico, maar het endpoint
  blijft anoniem leesbaar.
- **C:** `app_state` in auth-modus helemaal niet meer schrijven/lezen (de `server/api/*.php`-
  endpoints zijn al de bron van waarheid).

### 2.2 `node_modules/` staat in git en wordt naar de publieke webroot gedeployd — MIDDEN

`git ls-files -- 'path-urenregistratie/node_modules/'` → **6.349 files, ~165 MB**.
`node_modules/` staat wél in `.gitignore` maar is ooit toegevoegd vóór die regel, dus blijft
getrackt. De deploy (`scripts/deploy-test-transip.sh`) doet `git archive` van
`path-urenregistratie/` → de tarball bevat `node_modules/`, en de remote-cutover zet die
integraal in de docroot. Runtime heeft het niet nodig (de app is statische
`index.html` + `assets/*` + PHP; geen composer/vendor; de `.gitignore` zegt zelf
"dist/ ... wordt niet geserveerd, assets/ is de bron"). CI draait `npm ci`, dus CI is niet
afhankelijk van de gecommitte kopie.

Gevolg: elke deploy sleept ~165 MB mee en `https://uren-test.pathconsultancy.nl/node_modules/...`
is publiek benaderbaar (kleine info-disclosure + zinloze ballast).

**Remediatie (eigen commit + volledige pipelinerun):**
1. Bevestig dat elke pipelinestap `npm ci` doet (nu: ja — `validate`, `test`, `live-docs`,
   `acc`, `prod`, `dev` hebben allemaal `run: npm ci`). Remote-deploy draait geen node.
2. `git rm -r --cached path-urenregistratie/node_modules` in één aparte commit.
3. Optioneel als vangnet: in de root-`.htaccess` `RewriteRule ^node_modules/ - [F]` (of
   `RedirectMatch 404 ^/node_modules/`).
4. Check of `scripts/deployment-contract-check.mjs` op tarball-inhoud assert.
5. Volledige pipeline + TEST-deploy + remote-regressie erna.

### 2.3 Interne `.md`-docs + `.env.example` in de publieke webroot — MIDDEN

`git archive` stuurt de hele `path-urenregistratie/`-map mee, inclusief `AGENTS.md`,
`COPILOT_HANDOFF.md`, `TEST-SECURITY.md`, `TEST-AUTH.md`, `PRODUCTION-READINESS-REPORT.md`,
`.env.example`, enz. De root-`.htaccess` beperkt `.md`/`.php`-uitvoer niet, dus die zijn
allemaal op te halen op de TEST/PROD-site.

**Remediatie:** `path-urenregistratie/.gitattributes` met `export-ignore` voor docs/tests/
tooling, óf een prune-stap in `deploy-*-remote.sh` vóór de cutover die alles behalve de
runtime-set (`index.html`, `assets/`, `server/`, `sw.js`, `manifest.webmanifest`,
`voorbeeld-klanturenstaat.pdf`, `.htaccess`) weggooit. `git archive` respecteert
`export-ignore`, dus dat is de kleinste ingreep — maar check eerst dat de remote-scripts
geen van die bestanden nodig hebben (bijv. `package.json` wordt remote wél gelezen voor de
versiecheck, dus die moet blijven).

### 2.4 Kleiner / ter info

- `server/db_inspect.php` — onbeveiligd schema-introspectie-endpoint, maar **wel**
  geblokkeerd door `server/.htaccess` (`^(install|migrate|db_inspect)\.php$` → `Require all
  denied`) en bewust als CLI-tool bedoeld. Laten staan of samen met de opschoning
  meenemen; als het blijft, zet het in de deny-lijst-comment als "CLI only".
- `install.php` blokkeert HTTP alleen bij `environment === 'production'`. Op TEST
  (`environment: 'test'`) is HTTP-toegang tot `install.php` dus niet geblokkeerd door de PHP-
  guard zelf — alleen door `server/.htaccess`. Verifieer dat `server/.htaccess` echt actief
  is op de TransIP-vhost (AllowOverride). De root-`.htaccess` wordt duidelijk wel gehonoreerd
  (CSP, HTTPS-redirect, cache-fix).
- Geen `TODO`/`FIXME`/`console.log`/`debugger` in de shipped JS. Codebase is verder netjes.

---

## 3. Exacte deployprocedure (zoals het NU werkt)

### 3.1 Trigger

- **Elke push naar `main`** start `.github/workflows/release-pipeline.yml`
  (`on: push: branches: [main]`). Ook handmatig via `workflow_dispatch` met input `ref`.
- `concurrency: { group: release-pipeline, cancel-in-progress: true }` — een nieuwe push
  annuleert de vorige lopende run.
- **Niet** handmatig runs annuleren/opnieuw triggeren (usage). Uitzondering: expliciet
  gevraagde `gh run rerun <id> --failed` voor een transient-gefaalde stap.

### 3.2 Jobvolgorde (push naar `main`)

```
notify-team                                  (commit-comment met @mentions; alleen bij push)
  └─ validate            [4 shards]          MySQL 8 + PHP 8.4, npm ci, build,
     │                                       npm run check (alleen shard 1), npm run test:e2e --shard=N/4
     ├─ dev  (Promote Dev)                   if: false  → ALTIJD OVERGESLAGEN
     └─ test (Promote Test) [4 shards]       met externe stage-URL: shard 1 draait de volledige
        │                                    suite tegen die URL, shards 2–4 skippen.
        │                                    zonder: lokale 4-way shard-fallback.
        ├─ deploy-test (Deploy Test to TransIP)   ← DE ECHTE TEST-DEPLOY, zie 3.3
        ├─ live-docs (Publish Live Docs)          npm run test:e2e opnieuw + Allure/docs-bundle;
        │                                         GH Pages alleen als vars.ENABLE_GH_PAGES == 'true'
        ├─ acc (Promote Acc)                      if: false  → ALTIJD OVERGESLAGEN
        ├─ prod-main-ref-guard                    alleen bij non-main dispatch
        └─ prod (Promote Prod)                    environment: prod  → HANDMATIGE REVIEW-GATE
           └─ deploy-prod (Deploy Prod to TransIP)   draait pas ná goedkeuring + succes van `prod`
```

**"Promote Prod: waiting" is de normale eindtoestand.** Dat is de `environment: prod`
protection-rule die op handmatige goedkeuring wacht. **Nooit goedkeuren.** Zolang niemand
op "Review deployments" klikt, gebeurt er niets richting productie en draait `deploy-prod`
niet.

### 3.3 Wat `deploy-test` precies doet

Job `deploy-test` in `release-pipeline.yml` (`needs: test`, alleen bij push naar `main` of
dispatch met `ref=main`):

1. **Checkout exacte commit** (`fetch-depth: 0`) en verifieer dat `HEAD == GITHUB_SHA`.
2. **SSH-identity plaatsen** uit secrets `TRANSIP_SSH_PRIVATE_KEY` + `TRANSIP_SSH_KNOWN_HOSTS`
   (pinned `known_hosts`, `StrictHostKeyChecking=yes`, `BatchMode=yes`, `IdentitiesOnly=yes`).
3. **`scripts/deploy-test-transip.sh`** (lokaal in de runner):
   - Valideert alle env-vars streng (host/user regex, `DEPLOY_SOURCE_SHA` = 40 hex, roots
     exact gelijk aan de verwachte TransIP-paden, `TEST_ORIGIN == https://uren-test.pathconsultancy.nl`).
   - Leest de release-versie uit `package.json` van die commit; moet `x.y.z` zijn.
   - `deployment_id = <sha12>-<run_id>-<run_attempt>`, release-map
     `…/private/path-uren-test-deployments/<deployment_id>`.
   - Bouwt `git archive --format=tar.gz --prefix=path-urenregistratie/ <SHA>:path-urenregistratie`.
   - Rekent `sha256` + bytes uit, `scp`t de tarball + `deploy-test-remote.sh` naar de
     release-map, en verifieert remote de checksum/bytes vóór uitpakken.
   - Roept remote `deploy-test-remote.sh` aan met alle parameters.
4. **`scripts/deploy-test-remote.sh`** (op de TransIP-server):
   - Herhaalt alle padvalidaties; checksum-check op de tarball.
   - Pakt uit in `…/<deployment_id>/release/path-urenregistratie`, checkt `package.json`-versie.
   - Kopieert de **canonieke** `config.local.php` uit `…/private/path-uren-test/` erin
     (chmod 600). Die staat NIET in git; is eerder gezet met `configure-test.php`.
   - `configure-test-mail-sandbox.php --execute --confirm=ENABLE_TEST_MAIL_SANDBOX`.
   - `test-preflight.php` (config-check) + een inline PHP-check dat het TEST-mailvenster óf
     helemaal dicht is óf exact de sandbox-allowlist heeft
     (`giovanno.maatsen@` / `kenrich.lieveld@pathconsultancy.nl`).
   - Wacht tot de vhost de nieuwe docroot serveert (`wait_for_test_vhost` met nonce-marker).
   - **DB-backup** (`database-backup.php --execute`, `mysqldump --single-transaction`),
     dan **`php server/migrate.php`**, dan
     **`reset-test-baseline.php --execute --confirm=RESET_SHARED_TEST_BASELINE`**.
   - **Atomische cutover met auto-rollback:** huidige live-inhoud → `rollback-pre-<id>-<ts>`,
     nieuwe release → live-root, `chmod 600 config.local.php`, `.release-sha` schrijven,
     OPcache resetten via een tijdelijk `cache-refresh-<nonce>.php`.
   - **Publieke smoke:** `curl` `index.html` (moet `Versie <x.y.z>` bevatten), `assets/app.js`,
     `assets/styles.css`, `server/health.php` (alle checks `ok`), `test-preflight.php --live`.
   - Faalt de smoke → `rollback_on_error` zet de vorige release terug en OPcache wordt ververst.
5. **`scripts/test-public-auth-smoke.mjs`** — controleert dat de publieke TEST-logins werken
   met `secrets.PLAYWRIGHT_ADMIN_PASSWORD` / `…EMPLOYEE_PASSWORD`.

Resultaat: `https://uren-test.pathconsultancy.nl` draait de nieuwe versie, met een
`rollback-pre-*`-map als terugval. Oude deployments blijven onder
`…/private/path-uren-test-deployments/`.

### 3.4 Productie (ter referentie — NIET doen)

- `prod` job: `environment: prod`, draait `npm run test:e2e` tegen de lokale fallback,
  en **wacht op handmatige review**.
- Na goedkeuring: `deploy-prod` → `scripts/deploy-production-transip.sh` →
  `scripts/deploy-production-remote.sh`, zelfde patroon (archive → scp → checksum →
  backup → migrate → atomische cutover → live smoke → auto-rollback) naar
  `…/subsites/uren.pathconsultancy.nl`, origin `https://uren.pathconsultancy.nl`.
- Staat bewust stil tot Fase 16 (menselijke mailacceptatie op TEST eerst).

### 3.5 Zelf een deploy uitlokken

- Normaal: `git push origin main`. Klaar. Pipeline doet de rest tot en met `deploy-test`.
- Alleen een specifieke gefaalde stap opnieuw: `gh run rerun <run_id> --failed`.
- Status opvragen zonder te veel te pollen:
  `gh run list --branch main --limit 3` / `gh run view <id> --json status,conclusion,jobs`.
- `gh` staat niet op de shell-PATH in de Bash-tool; volledig pad:
  `"C:\Program Files\GitHub CLI\gh.exe"` (of via PowerShell).

---

## 4. Lokaal draaien (voor Codex-verificatie)

Vanuit `path-urenregistratie/`, met PHP op PATH:

```bash
export PATH="$(dirname "$(cat server/.php-path)"):$PATH"   # git-bash
npm run check          # node --check + smoke + taalcheck + contrast + design + bdd:design + db:config + ops
node scripts/smoke-test.mjs        # alleen de jsdom-smoke (asserteert exacte DOM-tekst)
npm run test:e2e                   # lokale Playwright: eigen php -S :8000 + *_test DB
```

Remote-regressie tegen de live TEST-site (read-only spec):

```bash
npx playwright test --config=playwright.test-remote.config.ts --project=desktop
```

- Dev-omgeving hier: native MySQL 8.0 (scheduled task `PathMySQL`) + winget PHP 8.4, geen Docker.
- DB Client-extensie in VS Code kan de TEST/PROD-DB's op TransIP niet bereiken (ProxySQL) —
  gebruik phpMyAdmin of de SSH-shell; datawijzigingen via migrations.
- `npm run check` kan op een net-gereset/koude machine door Windows ge-OOM-kill'd worden
  (exit 137). Dat is omgeving, geen code — gewoon opnieuw draaien als de machine tot rust is.

---

## 5. Statusregel

- [x] App nagelopen; 5 concrete fixes gedaan (sectie 1), 3 grotere bevindingen
  gedocumenteerd voor een aparte branch (sectie 2).
- [x] Deployprocedure volledig uitgeschreven (sectie 3).
- [ ] Sectie 2.1 / 2.2 / 2.3 — open voor Codex.
- [ ] `HANDOFF-STRUCTUUR.md` 0.9.154 e.v. — los hiervan, nog niet begonnen.
