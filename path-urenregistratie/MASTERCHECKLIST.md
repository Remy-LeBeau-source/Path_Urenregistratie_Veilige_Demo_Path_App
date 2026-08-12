# Masterchecklist Path Uren & Facturatie

Dit is vanaf nu de volledige masterchecklist en vaste technische bron van waarheid.
Na iedere stap wordt deze lijst bijgewerkt met wat klaar, gedeeltelijk klaar, open of geblokkeerd is.

## Betekenis van de statussen

- [x] afgerond, getest en waar nodig gecommit/gepusht
- [-] nog niet afgerond of nog open
- [!] geblokkeerd of test mislukt

## Path Uren & Facturatie — hoofdstatus (managementoverzicht)

Dit is het compacte overzicht om in één oogopslag te zien wat klaar is, wat nog in VS Code
gebouwd kan worden, en wat pas als allerlaatste (buiten VS Code) aan bod komt. Volledige details
staan onder de genummerde fases verderop in dit document.

| Onderdeel | Status | Wat betekent dit? |
|---|---|---|
| Fase 1 — Lokale basis | ✅ Klaar | PHP/MySQL/lokale tooling |
| Fase 2 — Database/server-led state | ✅ Klaar | Alle businesskritische writes server-led; localStorage beperkt tot UI-state |
| Fase 3 — Read-API | ✅ Klaar | Frontend leest serverdata |
| Fase 4 — Auth & rollen | ✅ Klaar | Admin/medewerker/sessies |
| Fase 5 — Security | ✅ VS Code-scope klaar | Timeout, sliding session, login-audit, dependency-scan; productieheaders (CORS/CSP/HSTS) later op echt domein |
| Fase 6 — Playwright/Allure/Living Docs | ✅ Klaar | Testarchitectuur compleet |
| Fase 7 — CI/CD | ✅ VS Code-scope klaar | Release Pipeline #31649794848 volledig groen; GitHub-beveiligingsinstellingen later |
| Fase 8 — Uren indienen | ✅ Klaar | Concept → indienen |
| Fase 9 — Correctie/goedkeuring | ✅ Technisch klaar | Productieacceptatie later |
| Fase 10 — Klanturenstaat | ✅ VS Code-scope klaar | JPG/PNG → PDF server-side gebouwd en getest (CTS-API-H-005) |
| Fase 11 — Facturen | ✅ VS Code-scope klaar | Server-side PDF + storage key + geautoriseerde download + inhoudscontrole gebouwd en getest (INV-H-004, INV-N-013) |
| Fase 12 — Mailqueue | ✅ VS Code-scope klaar | Attachments/retry/max retries/foutstatus al aanwezig en getest; PDF-bijlage nu beschikbaar via Fase 11 |
| Fase 13 — Bedrijfsgegevens | ✅ VS Code-scope klaar | Definitieve gegevens/accounts → Fase 16 |
| Fase 14 — TransIP | ✅ VS Code-scope klaar | Deployment/config → Fase 16 |
| Fase 15 — Release-hardening | ✅ VS Code-scope klaar | Concurrency, jaarwisseling, uploads, accessibility en PWA-manifest/service worker gebouwd en getest |
| **Fase 16 — Operationeel/live** | 🛠️ Bundel 1 technisch voorbereid | Tooling/runbooks lokaal; TransIP, externe acceptatie, echte mail en go-live blijven gated |

### Technische eindsprint (in VS Code afgerond deze sessie)

```
TECHNISCHE EINDSPRINT
        │
        ├── Fase 10
        │     JPG/PNG → PDF (server-side, GD + hand-rolled PDF-writer)
        │
        ├── Fase 11
        │     Server-side factuur-PDF
        │     pdf_storage_key
        │     geautoriseerde download
        │     PDF-inhoudscontrole
        │
        ├── Fase 12
        │     PDF als mailbijlage (nu mogelijk via Fase 11)
        │     klanturenstaat als bijlage
        │     retry / max retries / foutstatus (al aanwezig, geverifieerd)
        │
        └── Fase 15
              dubbele/gelijktijdige requests (2 beheerders)
              december → januari jaarwisseling
              grote/foute uploads
              accessibility basis (toetsenbord + labels)
              dependency scan (al bestaand script)
              PWA manifest + service worker
```

### Fase 16 — laatste fase (verzameld, buiten VS Code)

```
FASE 16 — LAATSTE FASE

GitHub website (branch protection, statuschecks, approval)
TransIP (hosting, SSL, documentroot, wachtwoorden)
Productiedatabase
Backups + restore
Productieaccounts
Definitieve Path/QSI gegevens
Circle8 / boekhouder / EasySalary gegevens
Google Workspace / Gmail
SMTP vs Gmail API
Echte mail activeren
Productieacceptatie
Fysieke iPhone / Android / tablet
PWA-installatie op een echt toestel
Monitoring
Go-live
Rollback
Eerste echte maandflow
Post-live beheer
```

## Actuele stand

- [x] Datum: 2026-08-13 (Fase-16 Bundel 1 technisch, lokaal en in CI afgerond; externe activatie blijft gated)
- [x] Appversie: 0.9.47
- [x] Technische eindsprint afgerond: Fase 10 (JPG/PNG server-side naar PDF via GD + hand-rolled
  PDF-writer `server/lib/simple_pdf.php`), Fase 11 (server-side factuur-PDF, `pdf_storage_key`
  gevuld na lock, geautoriseerde download-endpoint met company-/employee-scope, PDF-inhoudscontrole
  via `simple_pdf_looks_valid()`), Fase 12 (retry/max-retries/foutstatus bleken al aanwezig en
  getest; PDF-bijlage nu structureel beschikbaar dankzij Fase 11), Fase 15 (gelijktijdige
  approve-requests door twee beheerders, jaarwisseling december→januari, te grote upload-afwijzing,
  basis toetsenbord-/labelcontrole, PWA-manifest + defensieve service worker).
- [x] Actuele testinventaris: 157 Playwright + 1 DB = 158 unieke cases en 161 browseruitvoeringen
  (153 niet-mobiel + 4 mobiele cases x 2 devices).
- [x] Volledige lokale Playwright-regressie: 161/161 groen, inclusief SAFE-N-007 als
  fail-closed productieconfiguratiecase.
  `npm run ci:local`, de 39 gerichte auth/mail/securitytests en DASH-N-007 zijn apart groen bevestigd.
- [x] Living Documentation-telling wordt uit de uitvoerbare specs berekend en met een expliciete
  inventarisguard bewaakt. Actueel: 157 Playwright-cases, 1 DB-case, 158 unieke cases en 161 uitvoeringen.
- [x] Root cause/fix gevonden voor twee omgevingsvalkuilen tijdens dit werk (vastgelegd in
  repo-memory): de PHP GD-extensie stond lokaal standaard uit (`;extension=gd` in php.ini) en moest
  worden ingeschakeld; en een stale achtergrond-PHP-proces (van vóór de GD-fix) op poort 8000
  veroorzaakte verwarrende "onmogelijke" testresultaten totdat het werd gestopt.
- [x] HEAD: v0.9.46 releasebaseline `cb0c7da` (fix MOB-H-003 + DASH-N-008); laatste checklist-commit `b8d8cd1`.
  HEAD wordt niet meer statisch bijgehouden — zie git log voor actuele stand.
- [x] Reorganisatie: alle openstaande punten die je buiten VS Code moet doen (TransIP-paneel, GitHub-website-instellingen, Google Workspace, fysieke toestellen, bedrijfsgegevens/administratie, menselijke acceptatie) zijn verzameld en verplaatst naar Fase 16 als laatste, verzamelende fase. De oorspronkelijke fasen (5, 7, 9, 10, 11, 12, 13, 14, 15) bevatten nu alleen nog wat in VS Code zelf (code/terminal/Playwright/git) haalbaar is.
- [x] Releasebewijs: commit `23b14fa26e0ab840a189e8ab4d7a890a5c65cec9` staat op `main`;
  Release Pipeline #31649794848 is volledig groen (Validate, Test, Live Docs en Prod-regressie).
- [x] GitHub Actions pipeline-run #91 (commit 998716b) volledig groen — historisch bewijs.
- [x] GitHub Actions pipeline-run #99 (commit 821b175, main) volledig groen: alle stappen
  (Validate, Promote Dev/Test/Acc/Prod, Publish Live Docs) completed successfully.
- [x] GitHub Actions pipeline-run #100–#104 (commits 375cfc3–b8d8cd1, main) — groen bevestigd.
- [x] MOB-H-003 (Safari correctie/goedkeuring flakiness) structureel opgelost in v0.9.46:
  de te laat geregistreerde 20s-responsewait is verwijderd, logout wacht op de zichtbare postconditie
  en de runner normaliseert `localhost` naar zijn beheerde IPv4-server; volledig groen bewezen.
- [x] DASH-N-008 (dashboardtellers na reset) structureel opgelost in v0.9.46: deterministische
  post-reset-baseline, bewezen stabiel na 138-test muterende reeks.
- [x] Historisch geconsolideerd: v0.9.41 (releasehardening, DB-isolatie, DB-H-001, Slice B/C/D/E
  server-led, 127/127→139/139 groen), v0.9.44 (DASH-N-008 reset-fix, 139/139 groen),
  v0.9.45 (technische eindsprint Fase 10/11/12/15, 146/146 groen, pipeline #91 groen).
- [x] DB-H-001: SQL/DB-smoke groen via `node scripts/run-db-crud-smoke.mjs`
- [x] Lokale automatische Playwright-testdatabase aanwezig: `path_urenregistratie_test`
- [x] DB-isolatie-onderdeel toegevoegd: bootstrap-script voor aparte lokale Playwright-testdatabase aanwezig
- [x] Slice B afgerond: invoice/verzendstatus auth-mode server-led; lokale regressie 127/127 is opnieuw bewezen op de huidige state
- [x] Slice C deelstap afgerond: notifications auth-mode server-led via notifications.php (read, mark_read, mark_all_read, mark_announcement_read)

### Kort overzicht: waar we nu staan

- [x] Kernbouw en functionele basis zijn aanwezig en lokaal gevalideerd.
- [x] De meest recente volledige Playwright-regressie is opnieuw volledig groen bewezen: 146/146, 0 failed, 0 skipped, 0 interrupted (bewezen op v0.9.46, inclusief MOB-H-003 Safari 10/10).
- [x] DB/infrastructuursmoke aanwezig: DB-H-001 via `node scripts/run-db-crud-smoke.mjs` groen.
- [x] Lokale automatische Playwright-testdatabase aanwezig: `path_urenregistratie_test` via bootstrap.
- [x] De checklist is nu bijgewerkt naar de actuele repo- en teststatus; de fase-indeling is intact gebleven.
- [-] We werken vanaf nu strikt van boven naar beneden op open punten in de checklist.
- [-] Fases worden alleen overgeslagen als een punt aantoonbaar geblokkeerd is.

### Samenvatting huidige stand

- [x] De app is functioneel op basis van de bestaande lokale backend/frontend-flow en de recente DB-onderdelen.
- [x] De DB-H-001 smoke is groen.
- [x] De aparte lokale Playwright-testdatabase is ingebouwd.
- [x] De volledige regressie na de DB-isolatie-aanpassing is opnieuw volledig groen bewezen; dit onderdeel is afgerond.
- [x] Productieveiligheidscheck voor SMTP-voorbereiding is opnieuw groen: `mail.enabled` staat standaard op `false`; `transport` is `smtp_relay` met STARTTLS-relay en zonder echte activering; de locale check en smoke zijn groen.
- [x] De logout-regressie is opgelost: de Playwright-helper gebruikt de echte zichtbare uitlogknop en wacht daarna expliciet op de login-shell, waardoor het gebruikerspad zelf getest blijft.
- [x] Lokale eindgate opnieuw bewezen: `npx playwright test tests/playwright/auth.spec.ts --reporter=line` => `6 passed (17.9s)` en `npm run check` => `Path v0.9.46 volledige smoke test: geslaagd`.

### Directe volgende stap

- [x] Volledige eindvalidatie opnieuw gedraaid en bewezen: 146/146 groen, 0 failed, 0 skipped, 0 interrupted, met dev/demo DB delta 0.

### Nieuwe werklijst (van boven naar beneden)

- [x] Stap 1: Fase 2 - afwikkelen van de nog open lokale/overige write-flowstatus en bevestigen welke onderdelen nog werkelijk lokaal/open zijn.
- [x] Stap 2: Fase 5 - niet-productie-afhankelijke securityhardening bevestigd; expliciete sessie-time-out en sliding session expiration zijn aantoonbaar getest.
- [x] Stap 3: Fase 7 - alleen niet-geblokkeerde CI/CD-afwerking; volledige pipeline end-to-end
  groen bewezen op run #91 (2026-08-12). Resterend binnen Fase 7 is extern-afhankelijk (branch
  protection, echte hosts, productieapproval, notificatieontvangers) — zie Fase blokkades.
- [x] Stap 4: Fase 10 - JPG/PNG server-side omzetten naar PDF gebouwd en getest (CTS-API-H-005); rest van Fase 10 verplaatst naar Fase 16.
- [x] Stap 5: Fase 11 - server-side factuur-PDF, pdf_storage_key, geautoriseerd downloaden, PDF-inhoudscontrole gebouwd en getest (INV-H-004, INV-N-013); rest verplaatst naar Fase 16.
- [x] Stap 6: Fase 12 - factuur-PDF-bijlage nu structureel mogelijk; retry/max-retries/foutstatus geverifieerd al aanwezig en getest (Gmail-activatie verplaatst naar Fase 16).
- [x] Stap 7: Fase 13 - volledig verplaatst naar Fase 16 (alles resterend is bedrijfsbeslissing/administratie, niets meer in VS Code te doen).
- [x] Stap 8: Fase 14 - volledig verplaatst naar Fase 16 (alles resterend is TransIP-paneel/SSH, niets meer in VS Code te doen).
- [x] Stap 9: Fase 15 - lokaal/VS Code haalbaar afgerond: dubbelklik/dubbele requests, twee-beheerders (TS-REV-API-H-006), jaarwisseling (TS-REV-API-H-007), grote-upload-afwijzing (CTS-API-N-008), accessibility (A11Y-H-001/002), dependency-scan, PWA-manifest/service worker; rest verplaatst naar Fase 16.
- [-] Stap 10: Fase 16 - laatste fase: alle buiten-VS-Code taken (deel A) + post-live beheer (deel B).

### Uitvoeringsbundels (afhankelijkheid-gedreven)

- [x] Slice B: factuurstatus + verzendstatus server-led (Fase 2 + 11 + 12)
- [x] Slice C: notifications + announcements server-led (Fase 2 + 12)
- [x] Slice D: users + settings server-led (Fase 2 + 13) — toggleEmployee/Admin server-led; dbUserId bewaard via bootstrap; persistState auth-mode slanker
- [x] Slice E: persistState/localStorage beperken tot UI/demo/fallback (afronding Fase 2) — auth-mode sloeg geen business-data meer op
- [x] Slice C deelstap afgerond: auth-mode notificatiepaneel en markeren-als-gelezen lopen server-led via server/api/notifications.php (read, mark_read, mark_all_read en mark_announcement_read).
- [x] Slice C volledig: announcements API aangemaakt (send/withdraw/hide/draft); admin write-flow server-led; employee read via notifications.
- [x] Slice D+E volledig: toggleEmployee/Admin server-led via users.php; dbUserId opgeslagen via bootstrap-merge; persistState in auth-mode beperkt tot UI-state (rol, periode, filters, branding, reminders); business-data (employees/admins/records/notifications/announcements) niet meer lokaal gepersisteert in auth-mode.
- [x] DB-isolatie en test-DB-scheiding: aparte lokale Playwright-testdatabase `path_urenregistratie_test` is ingericht en via bootstrap beschikbaar; dev/demo DB blijft `path_urenregistratie`.
- [x] Volledige bewijscheck dat de volledige regressie de dev/demo DB onaangeroerd laat, is bewezen: volledige run 127/127 groen en dev/demo DB delta 0.

Voor iedere slice geldt verplicht:
- [x] Extra controle op afgeleide dubbeling: invoiceStatus, payrollStatus, email_deliveries,
  verzonden/sent-flags, dashboard/KPI-afleidingen en batch-acties — Slice B bewezen via
  invoices.php + email-queue.php als enige bron; 146/146 regressie groen.
- [x] In auth-mode blijft per businessstatus precies een autoritatieve serverbron over.
- [x] Na succesvolle server-write synchroniseert frontend state direct met serverresponse.
- [x] Na write blijft reload opnieuw server-led lezen.
- [x] Frontend voorspelt of vooruitzet geen lokale businessstatus voordat de serverwrite bevestigd is.
- [x] Verplichte pre-check voor iedere review/demo: eerst `npm run test:closeout` (DEMO-CLOSEOUT-TO-ZERO), daarna pas handmatig beoordelen.
- [x] F5/herstel-guard actief: F5 behoudt de lokale werkstaat; alleen Herstel zet de baseline terug. Na Herstel blijft die lokale baseline ook na F5 leidend en worden business-readbacks niet toegepast.
- [x] Verplichte GUI-smoke voor zichtbaar gedrag: `npm run test:gui-smoke` controleert Herstel, F5, opnieuw inloggen en Stasjo's zichtbare 3 open acties zonder business-readbacks. Nieuwe zichtbare bevindingen worden aan deze GUI-smoke toegevoegd.
- [x] Reset-authoritative caching-les (v0.9.44): elke functie die state muteert op basis van server-/read-API-data moet `isLocalResetAuthoritative()` checken, en Herstel moet ALLE module-level read-API caches legen (niet alleen de `state`-variabele) om te voorkomen dat stale serverdata na Herstel terugsijpelt.

### Fase blokkades / later doen

- [!] Fase 7: echte aparte Dev/Test/Acc-hosts en productieapproval voor echte deploy zijn extern afhankelijk.
- [!] Fase 12: echte Gmail/Google Workspace-verzendconfig en productie-mailafhandeling pas als allerlaatste, na acceptatie en expliciete goedkeuring.
- [!] Fase 14/15/16: productie-operationalisatie en post-live onderdelen pas uitvoeren na vrijgave van hosting en productieconfig.
- [!] PWA/offlinefunctionaliteit mag na eerste livegang als dit geen harde livegangeis is.

---

## Fase 1 - Lokale ontwikkelbasis

- [x] PHP 8.4 lokaal geinstalleerd.
- [x] MySQL lokaal geinstalleerd.
- [x] pdo_mysql actief.
- [x] Lokale database path_urenregistratie.
- [x] PHP kan verbinding maken met MySQL.
- [x] server/config.local.php voor lokale instellingen.
- [x] server/config.local.php staat buiten Git.
- [x] server/.php-path staat buiten Git.
- [x] Geen productiewachtwoorden in Git.
- [x] server/config.local.php.example met veilige placeholders.
- [x] Lokaal startscript:
  - start-path-app.cmd
  - start-path-app.ps1
- [x] API-controlescript:
  - test-path-api.cmd
  - test-path-api.ps1
- [x] Groot controlescript:
  - check-after-big-change.cmd
  - check-after-big-change.ps1
- [x] Automatische lokale databaseback-up bij grote controles.
- [x] Lokale PHP-server op poort 8000.
- [x] health.php, install.php en API kunnen lokaal worden gecontroleerd.

Status Fase 1:
- [x] afgerond

---

## Fase 2 - Database, schema en migraties

- [x] app_state als eerste werkende serveropslag.
- [x] Tabel schema_migrations.
- [x] Core databaseschema.
- [x] server/install.php.
- [x] server/health.php.
- [x] server/migrate.php.
- [x] Core migratie.
- [x] Demo-seed.
- [x] Auth-schema.
- [x] Demo-medewerker-authseed.
- [x] Veilige migratiehistorie.
- [x] Bestaande migraties worden niet opnieuw gewijzigd voor nieuwe features.
- [x] Nieuwe databasewijzigingen worden als nieuwe migration toegevoegd.
- [x] Demo-migraties kunnen apart worden beheerd.
- [x] Demo-migraties zijn standaard niet voor productie bedoeld.
- [x] Tabellen voor:
  - bedrijven
  - gebruikers
  - medewerkers
  - opdrachten
  - perioden
  - urenstaten
  - dagregels
  - correcties
  - klanturenstaten
  - facturen
  - ontvangers
  - e-mailleveringen
  - mededelingen
  - notificaties
  - auditlog
- [x] Demo-inhoud voor juni, juli en augustus 2026.
- [x] Correctie/goedkeuring UI-migratie afgerond voor auth-mode: request_correction, resubmit en approve lopen via server/api/timesheets.php met serverversie als bron.
- [x] Slice B afgerond in auth-mode: factuurstatus en verzendstatus worden server-led gesynchroniseerd via server/api/invoices.php en server/api/email-queue.php; dashboard-, KPI- en batchstatus volgen dezelfde serverbron.
- [x] Auth-mode verzendacties zetten geen lokale businessstatus meer vooruit; eerst server enqueue/sync, daarna UI-update op basis van serverresponse.
- [x] Slice C volledig: auth-mode mededelingen read/write server-led; notifications lees/markeer server-led.
- [x] Slice D+E volledig: users deactivate/reactivate auth-mode server-led; persistState auth-mode beperkt tot UI/branding/reminders; employees/admins/records/notifications/announcements niet meer lokaal gepersisteert in auth-mode.
- [x] Lokale dev/demo database = `path_urenregistratie`.
- [x] Lokale automatische testdatabase = `path_urenregistratie_test`.
- [x] DB-H-001 via SQL/Node-runner beschikbaar en groen.
- [x] database-integrity.feature + database.steps.ts aanwezig als Living Documentation/mapping; er is geen database-integrity.spec.ts.
- [x] Browseropslag volledig afgebouwd in auth-mode: alle sub-onderdelen (read-data server-led,
  uren-writeflow server-led, factuur/upload/mail/beheer server-led) zijn bewezen door Slices B/C/D/E;
  persistState beperkt tot UI-state (rol, periode, filters, branding, reminders).

Status Fase 2:
- [x] databasestructuur afgerond
- [x] alle businesskritische write-flows in auth-mode server-led (timesheets, invoices, email-queue, notifications, announcements, users status)
- [x] persistState/localStorage in auth-mode beperkt tot UI-state; server is de enige autoritatieve bron voor businessdata
- [x] settings/company-data-writes en employee/admin create/edit zijn server-led bewezen met ADM-WR-H-001 t/m ADM-WR-H-003 en opgenomen in de volledige regressie (127/127 groen)
- [x] alle cross-cutting server-led bewijspunten afgedaan door Slices B/C/D/E + 146/146 regressie

---

## Fase 3 - Read-API en frontendlezing

- [x] server/api/common.php.
- [x] server/api/bootstrap.php.
- [x] server/api/dashboard.php.
- [x] server/api/invoices.php.
- [x] Frontend leest bootstrapgegevens via API.
- [x] Frontend leest dashboardgegevens via API.
- [x] Frontend leest facturen via API.
- [x] Periodefilter via API.
- [x] Medewerkers via API.
- [x] Opdrachten via API.
- [x] Stamgegevens via API.
- [x] Beschermde read-endpoints vereisen een sessie.
- [x] Zonder sessie geven endpoints 401 not-authenticated.
- [x] Administrator ziet organisatiebrede gegevens.
- [x] Medewerker ziet alleen eigen gegevens.
- [x] Medewerker krijgt geen volledige ontvangerslijst.
- [x] Medewerker krijgt geen volledige medewerkerslijst.
- [x] Employee- en company-scope in queries.
- [x] app_state blijft een gecontroleerde fallback, niet de primaire database in auth-modus.
- [x] Role enforcement eerder bewezen en gecommit als 23c07a0.

Status Fase 3:
- [x] afgerond

---

## Fase 4 - Authenticatie, sessies en rollen

- [x] server/auth/session.php.
- [x] server/auth/login.php.
- [x] server/auth/logout.php.
- [x] server/auth/me.php.
- [x] password_hash.
- [x] password_verify.
- [x] Veilige PHP-sessie.
- [x] Administratorrol.
- [x] Employeerol.
- [x] Admin-login via backend.
- [x] Medewerker-login via backend.
- [x] Frontend-loginformulier gekoppeld aan backend.
- [x] Frontend controleert bij app-start de sessie.
- [x] /auth/me.php geeft huidige gebruiker terug.
- [x] Logout vernietigt de sessie.
- [x] Na logout terug naar login.
- [x] Geen wachtwoorden in debugoutput.
- [x] Geen wachtwoorden in consolelogging.
- [x] Loginformulier vult alleen op localhost via de afgeschermde loopback-hints een lokaal demo-wachtwoord in; productie krijgt deze hints niet.
- [x] Demo-rolknoppen alleen als gecontroleerde fallback.
- [x] window.__PATH_AUTH_DEBUG bevat geen gevoelige waarden.
- [x] CI-adminaccount afgestemd op gio@example.invalid.
- [x] CI-employeeaccount afgestemd op stasjo@example.invalid.
- [x] Browserflow login -> dashboard -> facturen -> logout eerder getest zonder console/page errors.

Status Fase 4:
- [x] afgerond voor huidige authscope

---

## Fase 5 - CSRF, validatie en securitybasis

- [x] CSRF-token in sessie.
- [x] X-CSRF-Token header.
- [x] CSRF-endpoint.
- [x] CSRF op login.
- [x] CSRF op logout.
- [x] CSRF op state-write.
- [x] CSRF op timesheetwrites.
- [x] Veilige JSON-body parsing.
- [x] Validatie van verplichte velden.
- [x] E-mailvalidatie.
- [x] Maximale veldlengtes.
- [x] Enumvalidatie.
- [x] Numerieke validatie.
- [x] Nette 400, 401, 403, 405 en 409 responses.
- [x] Geen SQL-details in normale API-responses.
- [x] Geen stacktraces naar browser.
- [x] Production-safety Playwright-tests.
- [x] Geen plaintext demo-wachtwoorden in frontend.
- [x] Demo-migraties voor productie begrensd.
- [x] Productie-origin voorbereid via configuratie.
- [x] Expliciete sessie-time-out aantoonbaar getest (SEC-H-005).
- [x] Sliding session expiration aantoonbaar getest (SEC-H-005).
- [x] Auditmelding bij herhaalde mislukte loginpogingen aantoonbaar getest (SEC-H-006).
- [x] Periodieke controle op kwetsbare dependencies kan lokaal via `npm run security:deps` / `npm run security:deps:full`.
- [-] Verplaatst naar de laatste fase (buiten VS Code, echt productiedomein nodig): productie-CORS/CSP/HSTS finaliseren, centrale securitylogging en logrotatie op de productieserver. Zie Fase 16.

Status Fase 5:
- [x] noodzakelijke securitybasis afgerond
- [-] extra productiehardening die het echte productiedomein/de TransIP-server vereist, is verplaatst naar Fase 16; sessie-time-out/sliding expiration (SEC-H-005) en failed-login-auditmelding (SEC-H-006) zijn groen bevestigd binnen de volledige regressie (127/127)

---

## Fase 6 - Playwright, Allure, Living Documentation en agents

- [x] Lokale dev/demo database = `path_urenregistratie`.
- [x] Lokale automatische testdatabase = `path_urenregistratie_test`.
- [x] DB-H-001 via SQL/Node-runner aanwezig en groen.
- [x] database-integrity.feature + database.steps.ts aanwezig als Living Documentation/mapping.
- [x] Geen database-integrity.spec.ts; de executable source of truth is de native Playwright-suite plus de DB-smoke runner.

- [x] Playwright-only testopzet.
- [x] Geen Cypress in deze repository.
- [x] Geen Cucumber-runner.
- [x] Native Playwright-specs zijn leidend.
- [x] playwright.config.ts.
- [x] Page objects.
- [x] API helpers.
- [x] Fixtures.
- [x] Environment-/stageconfiguratie.
- [x] Dev-stage.
- [x] Test-stage.
- [x] Acceptatie-stage.
- [x] Productiestage.
- [x] Auth-tests.
- [x] Dashboardtests.
- [x] Factuurtests.
- [x] Rollen/API-tests.
- [x] Securitytests.
- [x] Production-safety tests.
- [x] Timesheet-write tests.
- [x] Timesheet-reviewflow test.
- [x] Herhaalbare toekomstige testperioden.
- [x] Allure reporter.
- [x] Allure-resultaten.
- [x] Allure-rapportgeneratie.
- [x] Playwright HTML-report.
- [x] Traces bij failures.
- [x] Screenshots bij failures.
- [x] Video bij failures.
- [x] Nederlandse .feature-bestanden als Living Documentation.
- [x] .steps.ts-bestanden als BDD-mapping/documentatie.
- [x] TEST-BDD-MAPPING.md.
- [x] LIVING-DOC.md.
- [x] PROJECT-CONTEXT.md.
- [x] Live Docs-bundel.
- [x] Planner-agent.
- [x] Builder-agent.
- [x] Test-agent.
- [x] Security-review-agent.
- [x] Release-agent.
- [x] Gescheiden Playwright-projecten voor desktop Chromium, Pixel 7 Chromium en iPhone 13 WebKit.
- [x] Mobile UI-spec draait alleen op de twee mobiele projecten; desktop- en API-specs worden niet verdrievoudigd.
- [x] Mobiele regressie dekt login, navigatie, dashboard, uren, correctie/herindiening, goedkeuring, factuurkaartweergave, upload, notificaties, touch, modal en overflow.
- [x] AUTH-H-004 borgt dat de lokale beheeraccount na asynchrone auth-initialisatie automatisch wordt ingevuld en met één klik opent.
- [x] Periodebeheer valideert het bestaande viercijferige UI-bereik 1000–9999 en maand 1–12 voordat gegevens worden opgeslagen.
- [x] PER-H-002 normaliseert zijn eigen testperiode en controleert expliciete close/reopen-statusresponses, onafhankelijk van vervuilde globale periodedata.
- [x] Living Documentation bevat 142 unieke Playwright-cases, 146 uitvoeringen, 1 directe SQL/DB-case DB-H-001 en 143 unieke executable cases totaal.
- [x] De actuele volledige regressie is opnieuw volledig groen bewezen: 146/146, 0 failed, 0 skipped, 0 interrupted, met dev/demo DB delta 0.
- [x] Recente slice afgerond: production-safety- en timesheet-write-specs bijgewerkt, TESTCOMMANDOS.md afgestemd op de actuele scripts en de lokale Playwright-regressie groen.
- [x] Living Doc viewer uitgebreid met suite-groepering in sidebar (API/Security/UI Desktop/UI Mobile/DB/Integratie) identiek aan Allure-stijl; commit 387ea63.

Status Fase 6:
- [x] afgerond

---

## Fase 7 - CI/CD, release-pipeline en GitHub-documentatie

- [x] GitHub Actions-workflow.
- [x] Verse MySQL 8-database in CI.
- [x] PHP 8.4 in CI.
- [x] Node in CI.
- [x] Playwright Chromium in CI.
- [x] npm ci.
- [x] Build in pipeline.
- [x] Smoke-test in pipeline.
- [x] Migraties in pipeline.
- [x] Tijdelijke CI-wachtwoorden.
- [x] Tijdelijke password hashes in CI-database.
- [x] Playwright-regressie in pipeline.
- [x] Dev -> Test -> Acc -> Prod-opzet.
- [x] Stageconfiguratie.
- [x] Lokale fallbackstack zolang echte stage-URL's ontbreken.
- [x] Live Docs-publicatie.
- [x] Allure/Living Docs-koppeling.
- [x] Commitnotificatie geintegreerd in release-pipeline.
- [-] Verplaatst naar de laatste fase (buiten VS Code, via GitHub-website en overleg): Ken/Gio-notificaties/definitieve notificatieontvangers, echte aparte Dev/Test/Acc-hosts, branch protection op main, verplichte groene statuschecks voor merge, productieapproval voor echte deploy. Zie Fase 16.

Status Fase 7:
- [x] CI/CD-basis lokaal en in repository afgerond
- [x] Volledige pipeline end-to-end groen bewezen op run #91 (998716b) en run #99 (821b175,
  2026-08-12); alle stappen Validate→Prod→Live Docs completed successfully.
- [-] Pipeline #100 nog in uitvoering/te bevestigen — zie Actuele stand.
- [-] fase als geheel gedeeltelijk: notificatieontvangers, echte stage-hosting, branch protection/checks en productieapproval nog open (extern afhankelijk, zie Fase blokkades)

---

## Fase 8 - Uren concept opslaan en indienen

- [x] server/api/timesheets.php.
- [x] Uren als concept opslaan in echte database.
- [x] Concept teruglezen.
- [x] Uren indienen.
- [x] Periode veilig bepalen/aanmaken.
- [x] Medewerker schrijft alleen eigen uren.
- [x] Administrator blijft binnen eigen organisatie.
- [x] CSRF op writes.
- [x] Sessie op GET en POST.
- [x] employee_id-scope.
- [x] Periodeformaat YYYY-MM.
- [x] Kalenderdatumvalidatie.
- [x] Dagregel moet binnen gekozen maand liggen.
- [x] Daguren numeriek.
- [x] Daguren tussen 0 en 24.
- [x] Som dagregels moet overeenkomen met factureerbare uren.
- [x] Audit-event timesheet.draft_saved.
- [x] Audit-event timesheet.submitted.
- [x] Database-transactie.
- [x] Rollback bij fout.
- [x] submitted urenstaat vergrendeld.
- [x] approved urenstaat vergrendeld.
- [x] invoiced urenstaat vergrendeld.
- [x] TimesheetApi.ts.
- [x] timesheet-write.spec.ts.
- [x] timesheets.feature.
- [x] timesheets.steps.ts.
- [x] BDD-mapping.
- [x] Allure-opname.
- [x] Gecommit.
- [x] Gepusht.

Status Fase 8:
- [x] afgerond

---

## Fase 9 - Correctieverzoek, opnieuw indienen en goedkeuren

Deze fase heette eerder Fase 8. Omdat de concept-/indienflow hierboven nu een eigen afgeronde fase is, staat de correctieflow hier apart.

### Backend en database

- [x] Actie request_correction.
- [x] Alleen administrator mag correctie aanvragen.
- [x] Alleen overgang submitted -> correction.
- [x] Correctietoelichting verplicht.
- [x] Maximale lengte correctietoelichting.
- [x] review_note vullen.
- [x] Record in timesheet_corrections.
- [x] Audit-event timesheet.correction_requested.
- [x] Correctiestatus bewaren tijdens conceptopslaan.
- [x] Medewerker kan correctie opnieuw indienen.
- [x] Overgang correction -> submitted.
- [x] Open correctierecord krijgt resubmitted_at.
- [x] Audit-event timesheet.resubmitted.
- [x] Actie approve.
- [x] Alleen administrator mag goedkeuren.
- [x] Alleen overgang submitted -> approved.
- [x] approved_at.
- [x] approved_by.
- [x] Audit-event timesheet.approved.
- [x] Correctiehistorie teruggeven.
- [x] Dagregels teruggeven.
- [x] Uren en notities teruggeven.
- [x] Optimistic locking met expected_version.
- [x] Stale version geeft 409 stale-version.
- [x] Version wordt na succesvolle write verhoogd.
- [x] Frontend bewaart de serverversie voor volgende write.
- [x] Transacties en rollback.
- [x] Employee mag geen adminreviewactie uitvoeren.
- [x] Ongeldige statusovergangen geven 409.

### Tests en documentatie

- [x] timesheet-review-flow.spec.ts.
- [x] Employee maakt concept.
- [x] Employee dient in.
- [x] Admin vraagt correctie.
- [x] Stale correctieverzoek wordt geweigerd.
- [x] Tweede ongeldige correctieovergang wordt geweigerd.
- [x] Employee kan zelf geen correctieverzoek uitvoeren.
- [x] Employee dient opnieuw in.
- [x] Admin keurt goed.
- [x] Stale goedkeuring wordt geweigerd.
- [x] Correctiehistorie wordt gecontroleerd.
- [x] resubmitted_at wordt gecontroleerd.
- [x] Living Doc bijgewerkt.
- [x] BDD-mapping bijgewerkt.
- [x] Gecommit.
- [x] Gepusht.
- [x] Browserflow testcase aanwezig: TS-REV-UI-001.

### Nog niet volledig bewezen

- [x] Frontend bewaart en verstuurt expected_version via server-writeflow; nieuwe version wordt na serverwrite teruggezet in de UI-state.
- [x] Pipeline #62 via GitHub bevestigd: Validate, Test, Live Docs en Prod groen.

Status Fase 9:
- [x] backend/API/test/documentatie gecommit en gepusht
- [x] browser-UI-flow met Playwright bewezen
- [x] correctie/herindiening/goedkeuring ook op Pixel 7 Chromium en iPhone 13 WebKit bewezen
- [x] correctie/goedkeuring UI in auth-mode gebruikt server/api/timesheets.php als bron voor status, review_note, correction_history, approved_at, approved_by en version
- [x] pipelinebevestiging bewezen
- [-] Verplaatst naar de laatste fase (buiten VS Code): productieacceptatie van de correctie/goedkeuringsflow. Zie Fase 16.

---

## Fase 10 - Klanturenstaten en uploads

### Technische basis

- [x] Databasetabel customer_timesheets.
- [x] Statusvelden in schema.
- [x] Opslagvelden in schema.
- [x] Upload-/reviewvelden in schema.
- [x] Demo-UI en schermconcept bestaan.
- [x] API endpoint customer-timesheets.php toegevoegd (GET/POST).
- [x] Beveiligde download via server/api/customer-timesheets.php?action=download toegevoegd.
- [x] Uploadvalidatie toegevoegd (PDF/JPG/PNG, max 2 MB, employee/company scope).
- [x] Statusacties toegevoegd: save_draft, submit(received), approve, request_resubmit, mark_sent, mark_sent_to_broker, mark_skipped, restore_missing.
- [x] Auditevents voor customer_timesheet acties toegevoegd.
- [x] Playwright API tests toegevoegd: CTS-API-001 en CTS-API-002.

### Nog bouwen of productieharden

- [x] JPG/PNG server-side omzetten naar PDF (server/lib/simple_pdf.php + GD; getest via CTS-API-H-005).
- [-] Verplaatst naar de laatste fase (buiten VS Code): opslag buiten de publiek toegankelijke webmap op de productieserver, en de virusscanstrategie (productkeuze/externe dienst). Zie Fase 16.

### Recent afgerond in deze fase

- [x] End-to-end UI koppeling naar de backendflow is werkend in auth-mode.
- [x] Statusacties mark_skipped en restore_missing zijn functioneel getest.
- [x] Extra statuspad sent_to_broker is ondersteund in frontend/backendflow.
- [x] MIME-type, bestandsgrootte, veilige bestandsnaam en unieke storage key worden server-side gevalideerd/opgebouwd.
- [x] Employee- en administratorscope, status missing, auditlog en beveiligde download zijn aanwezig.
- [x] Playwright regressie voor customer-timesheets is uitgebreid met happy en negative scenario's.
- [x] Allure en live-doc bundel zijn opnieuw opgebouwd en visueel geverifieerd.
- [x] Living Doc en BDD mapping zijn bijgewerkt met H/N-id conventie en actuele scenario-overzichten.

Status Fase 10:
- [x] schema, API basis, UI-koppeling en regressietests bestaan
- [x] Playwright, Allure en Living Doc dekken de customer-timesheet flow af
- [x] JPG/PNG-conversie naar PDF is gebouwd en getest (CTS-API-H-005); resterende productiehardening (opslaglocatie, virusscan) is verplaatst naar Fase 16

---

## Fase 11 - Facturen en server-side PDF

### Al aanwezig

- [x] Facturentabel.
- [x] Factuur-read-API.
- [x] Factuuroverzicht in frontend.
- [x] Periodefilter.
- [x] Demo-factuurnummers.
- [x] Demo-bedragen.
- [x] Ontvangerkoppelingen in database.
- [x] Client-side/demo-PDFfunctionaliteit bestaat.

### Nog bouwen

- [x] Server-side factuur-PDF (server/lib/simple_pdf.php, gegenereerd bij invoice-lock).
- [x] pdf_storage_key (kolom bestond al in database/schema.sql; wordt nu gevuld na lock).
- [x] PDF alleen geautoriseerd downloaden (action=download op invoices.php, company-/employee-scope; getest via INV-H-004 en INV-N-013).
- [x] PDF-inhoudscontrole (simple_pdf_looks_valid() vóór opslag + %PDF-/%%EOF-assertie in tests).
- [-] Verplaatst naar de laatste fase (buiten VS Code): definitief Path/QSI-briefpapier (brandingkeuze), PDF veilig bewaren op de productieserver, en de credit-/correctiestrategie (bedrijfsbeleid). Zie Fase 16.

### Recent afgerond in deze fase

- [x] Invoice read-API berekent voor open facturen server-side subtotal, btw en totaal op basis van billable_hours en hourly_rate.
- [x] Vergrendelde facturen blijven in read-output op opgeslagen bedragen zodat lock-gedrag behouden blijft.
- [x] De write/lock-flow gebruikt goedgekeurde uren en opdrachtuurtarief, reserveert het factuurnummer transactioneel en vult locked_at.
- [x] Een vergrendelde factuur is immutable; dubbele en gelijktijdige lockrequests hebben regressiedekking.
- [x] Extra regressietests toegevoegd: INV-H-003 en INV-N-003 voor berekening en periodevalidatie.
- [x] Invoice-lock API/Playwright-regressies INV-H-004 en INV-N-008 t/m INV-N-012 zijn aanwezig.
- [x] Security tests geharmoniseerd naar Given/When/Then-stapstijl voor consistente rapportleesbaarheid.
- [x] Auth-mode factuurstatus in UI wordt na serverwrites en reload opnieuw uit invoices read-API gesynchroniseerd; dubbele lokale autoriteit is verwijderd.

Status Fase 11:
- [x] overzicht, server-side berekening en transactionele lock/write-flow met immutable bedragen bestaan
- [x] server-side factuur-PDF, pdf_storage_key, geautoriseerde download en inhoudscontrole zijn gebouwd en getest
- [-] briefpapier, definitieve opslaglocatie en creditstrategie zijn bedrijfsbeslissingen, verplaatst naar Fase 16

---

## Fase 12 - E-mailqueue van de webapp

Let op: dit staat los van GitHub commitnotificaties.

### Al aanwezig

- [x] Tabel email_deliveries.
- [x] Mailontvangers in database.
- [x] Assignment mail routes.
- [x] Brokerconcept.
- [x] Boekhouderconcept.
- [x] EasySalaryconcept.
- [x] Demo-/previewteksten.
- [x] Frontend bevat al delen van de mailworkflow.
- [x] Queue-service en API voor lijst/enqueue/retry.
- [x] Assignment-routes en kanaalspecifieke templates.
- [x] Dry-runmodus is standaard en maakt geen echte verzending.
- [x] Broker krijgt factuurbeleid; EasySalary-route heeft geen factuurbijlage.
- [x] Veertien happy/negative Playwright API-tests.
- [x] Auth-mode verzendstatus in UI wordt afgeleid uit email_deliveries via email-queue read-API; geen lokale voorspelling vóór serverbevestiging.
- [x] Auth-mode notificaties gebruiken server/api/notifications.php als lees- en read-statusbron; klikken op melding, alles-lezen en mededeling-lezen schrijven eerst serverstatus en verversen daarna server-led.

### Nog bouwen

- [x] Factuur-PDF als bijlage (code; nu structureel mogelijk dankzij Fase 11's pdf_storage_key, attachment_policy-mechanisme bestond al en is getest via EQ-H/EQ-N-cases).
- [x] Klanturenstaat als bijlage technisch gebouwd en getest in de mailflow; de operationele live-verzending blijft als laatste stap in Fase 16.
- [x] Retry na tijdelijke fout (al aanwezig, getest: EQ-N-011).
- [x] Maximaal aantal retries (al aanwezig, MAIL_MAX_ATTEMPTS).
- [x] Foutstatus (al aanwezig, status='failed').
- [-] Verplaatst naar de laatste fase (buiten VS Code): Gmail/Google Workspace-config, keuze SMTP vs. Gmail API, en het activeren van echte verzending (pas na acceptatie en expliciete goedkeuring). Zie Fase 16.

Status Fase 12:
- [x] dry-runqueue, routes, templates, frontendkoppeling en regressietests bestaan
- [x] retry/max-retries/foutstatus geverifieerd aanwezig en getest; factuur-PDF-bijlage nu structureel mogelijk
- [-] echte transportconfiguratie (Gmail/SMTP) en verzending zijn extern-afhankelijk, verplaatst naar Fase 16

---

## Fase 13 - Definitieve bedrijfsgegevens en accounts

- [x] Demo-instellingen voor Path/QSI aanwezig.
- [x] Password-reset API en wachtwoord-vergeten frontend bestaan.
- [x] Login rate-limiting en force_password_change flow bestaan.
- [x] Gebruikersbeheer-API kan gebruikers lezen, deactiveren, heractiveren en wachtwoordwijziging afdwingen.
- [x] Role- en companyscope, CSRF en audit-events zijn door regressietests afgedekt.
- [-] Verplaatst naar de laatste fase (buiten VS Code, bedrijfsbeslissingen/administratie): definitieve bedrijfsnaam (QSI/Path), statutaire naam, factuuradres, KvK/btw/IBAN, betalingstermijn, factuurprefix, Circle8-route/adres/e-mailadres, boekhoudernaam/e-mailadres, EasySalary-e-mailadres, definitieve brokerontvangers/mailteksten/herinneringsmomenten, productieaccounts (Gio, Joyce, medewerkers), veilige uitgifte eerste wachtwoorden, gebruikersbeleid, Google Workspace-koppeling, 2FA-beoordeling, productiebeheerder naast Gio, privacy-/bewaartermijnenbeleid en exportbeleid. Zie Fase 16 voor de volledige lijst.

Status Fase 13:
- [x] auth-hardening, resetflow en gebruikersbeheer technisch aanwezig en getest
- [-] fase als geheel: alle resterende punten zijn bedrijfsbeslissingen/administratie buiten VS Code, verplaatst naar Fase 16

---

## Fase 14 - TransIP productieomgeving

Dit is de oorspronkelijke productielijst en blijft volledig onderdeel van de masterchecklist.

### Al afgerond volgens jouw TransIP-informatie

- [x] Subsite uren.pathconsultancy.nl aangemaakt.
- [x] Subsite ingeschakeld.
- [x] MySQL-database pathco_Urenuru aangemaakt.
- [x] Databasehost gevonden.
- [x] Databasegebruiker aangemaakt.
- [x] Demo-app gebouwd.
- [x] Demo-app lokaal getest.
- [x] Productieguards voor install.php, migrate.php en health.php.
- [x] server/.htaccess hardening en veilige config.example.php defaults.
- [x] Production-safety regressietests voor de guards.

### Nog door jou in TransIP controleren, en productie-installatie

- [-] Verplaatst naar de laatste fase (buiten VS Code, TransIP-controlepaneel/SSH/hostingpaneel): wachtwoordrotatie, PHP-versie/SSL-controle, documentroot/sitepad, back-upbeleid en -retentie, handmatige database-export, volledige productie-installatie (config.local.php, environment=production, databasegegevens, health/install/migrate op TransIP, productieaccounts, schrijfrechten, PHP-uploadlimits/sessie-instellingen, cron voor e-mailqueue, foutlogging/logrotatie, demo-uitschakeling, wachtwoordvervanging, bestandsrechten, databaserechten). Zie Fase 16 voor de volledige lijst.

Status Fase 14:
- [x] subsite/databasebasis en applicatiehardening aanwezig
- [-] fase als geheel: TransIP-productieconfiguratie, deployment en operationele controles zijn verplaatst naar Fase 16 (buiten VS Code)

---

## Fase 15 - Acceptatie, mobiel, PWA en livegang

### Lokaal al bewezen

- [x] Administrator kan lokaal inloggen.
- [x] Medewerker kan lokaal inloggen.
- [x] Rollen worden lokaal afgedwongen.
- [x] Medewerker ziet lokaal alleen eigen data.
- [x] Concepturen opslaan werkt.
- [x] Indienen werkt.
- [x] Correctieverzoek werkt op API-niveau.
- [x] Herindienen werkt op API-niveau.
- [x] Goedkeuren werkt op API-niveau.
- [x] Auditlog voor urenflow.
- [x] Optimistic locking op API-niveau.
- [x] Playwright-testarchitectuur.
- [x] Allure.
- [x] Living Documentation.
- [x] Smoke-tests.
- [x] Grote controlescripts.
- [x] Volledige correctie/herindiening/goedkeuring in desktopbrowser en mobiele emulatie.
- [x] Pixel 7 Chromium- en iPhone 13 WebKit-projecten met responsive layout-, touch-, modal- en overflowcontroles.
- [x] Alle zichtbare dashboardtellers gebruiken dezelfde concrete werkvoorraad; een afwijkend API-aggregaat kan hero, KPI, CTA en taakregels niet meer laten verschillen.
- [x] `start-path-app.cmd mobile` ondersteunt een smalle lokale browserpreview en gebruikt dezelfde gecontroleerde PHP-startflow.
- [x] Dashboardhiërarchie is compacter en rustiger gemaakt met beter leesbare ondersteunende tekst.

### Nog voor livegang - lokaal/VS Code haalbaar

- [x] Dubbelklikken en dubbele requests testen (Playwright) — INV-N-012 (facturen) en TS-REV-API-H-006 (urenstaten) bewijzen dit met twee gelijktijdige contexten.
- [x] Gelijktijdig gebruik door twee beheerders testen (Playwright) — zie TS-REV-API-H-006.
- [x] December → januari en jaarwisseling testen (Playwright met gesimuleerde periodes) — TS-REV-API-H-007.
- [x] Grote uploads en foutieve bestanden testen (Playwright) — CTS-API-N-008 (>2 MB) en de bestaande CTS-API-N-005 (ongeldig type).
- [x] Basiscontrole op toetsenbordbediening en leesbaarheid (lokaal in browser) — A11Y-H-001 en A11Y-H-002.
- [x] Dependency/securityscan uitvoeren (`npm run security:deps` / `security:deps:full`) — bestaand script, herbevestigd bruikbaar.
- [x] PWA-manifest (`manifest.webmanifest`, gelinkt in index.html).
- [x] Service worker (`sw.js`, defensief geregistreerd; bewust nog geen offline-cachingstrategie, zie Fase 16).

### Verplaatst naar de laatste fase (buiten VS Code)

- [-] Alle productie-praktijktests (adminlogin, medewerkerlogin, privacy, concept/indienen/correctie/herindienen/goedkeuren, klanturenstaat upload/download, factuurbedragen/btw/nummering/PDF-controle, broker-/boekhouder-/EasySalary dry-run, echte mailroute), back-up maken en herstellen, fysieke toestellen (iPhone/Android/tablet), PWA-installatie/offline-gedrag, monitoring/health/securitylogging/logrotatie, go-live/rollback-runbook (inclusief daadwerkelijk oefenen), volledig schone productie-installatie, controle op afwezigheid van demo-data, één volledige maandflow op productie, release-tag van de productieversie, en de acceptatie door Gio, Joyce en één medewerker met pas daarna echte mail activeren. Zie Fase 16 voor de volledige lijst.

Status Fase 15:
- [x] desktop- en mobiele emulatieregressie lokaal ingericht en bewezen
- [x] v0.9.41 releasepipeline #62 inclusief Test, Living Docs en Prod geslaagd
- [x] dashboardwerkvoorraad en mobiele previewstart lokaal hersteld en gericht getest
- [x] volledige vervolgmatrix lokaal opnieuw groen: 146/146 uitvoeringen, 0 failed, 0 skipped, 0 interrupted
- [x] alle lokaal/VS-Code-haalbare Fase 15-punten (concurrency, jaarwisseling, uploads, accessibility, dependency-scan, PWA) zijn gebouwd en getest
- [-] alles wat productieomgeving/fysieke toestellen/menselijke acceptatie vereist is verplaatst naar Fase 16

---

## Fase 16 - Laatste fase: alles wat buiten VS Code moet gebeuren (verzameld) + beheer na livegang

Dit is nu het verzamelpunt voor ieder open punt uit de hele checklist waarvoor je een browser naar een extern paneel (TransIP, GitHub-website, Google Workspace), een fysiek toestel, of een gesprek/administratieve actie nodig hebt. Alles wat in VS Code zelf (code, terminal, Playwright, git) gedaan kan worden, is in de eigen fase blijven staan.

- [x] Auditlog-API voor beheerders met entity/event filters en secret-redactie.
- [x] Zes API-regressies voor toegang, filters en gevoelige data.

### A. Eenmalig, vóór livegang (buiten VS Code)

**Uit Fase 5 - productiehardening op het echte domein:**
- [x] Productie-CORS technisch beperkt tot `https://uren.pathconsultancy.nl`; externe domeincontrole blijft open.
- [x] Content-Security-Policy technisch voorbereid en door preflight bewaakt.
- [x] HSTS veilig voorbereid maar bewust uitgeschakeld; activering blijft open tot HTTPS is bewezen.
- [x] PHP-errorlogging buiten publieke output technisch voorbereid.
- [x] Niet-mutatieve logrotatiecheck en uitvoerscript gebouwd; croninstallatie blijft extern open.

**Uit Fase 7 - GitHub-website en overleg:**
- [-] Ken/Gio-notificaties en definitieve notificatieontvangers bevestigen.
- [-] Echte aparte Dev/Test/Acc-hosts invullen.
- [-] Branch protection op main instellen.
- [-] Verplichte groene statuschecks voor merge instellen.
- [-] Productieapproval instellen voor echte deploy.

**Uit Fase 9:**
- [-] Productieacceptatie van de correctie/goedkeuringsflow.

**Uit Fase 10:**
- [x] Private storagepaden en containmentchecks buiten de webroot gebouwd; echt TransIP-pad/rechten blijven extern te bewijzen.
- [-] Virusscanstrategie bepalen (productkeuze/externe dienst).

**Uit Fase 11:**
- [x] Facturerende identiteit bevestigd als Path Consultancy, handelsnaam van QSI Consultancy B.V.; visuele controle van eerste productie-PDF blijft open.
- [x] Factuur- en klanturenstaatopslag technisch buiten de webroot gekoppeld; productiepad/rechten blijven extern te bewijzen.
- [-] Credit-/correctiestrategie (bedrijfsbeleid).

**Uit Fase 12 - Gmail/Google Workspace:**
- [x] Applicatieconfig voor Google Workspace SMTP Relay technisch voorbereid zonder credentials.
- [x] Transportkeuze bevestigd: IP-gebaseerde SMTP Relay op poort 587 met verplichte STARTTLS.
- [-] Echte verzending activeren (pas na acceptatie en expliciete goedkeuring).

**Uit Fase 13 - definitieve bedrijfsgegevens en accounts:**
- [x] Facturerende identiteit bevestigd: Path Consultancy, handelsnaam van QSI Consultancy B.V.
- [-] Definitieve statutaire naam, factuuradres, KvK-nummer, btw-nummer, IBAN, betalingstermijn, factuurprefix.
- [-] Definitieve Circle8-route, factuuradres en e-mailadres/portaal.
- [x] Boekhouderroute bevestigd voor `giovanno.maatsen@pathconsultancy.nl` (factuur, 1 bijlage).
- [x] Salarisroute bevestigd voor `gambitizanagi@gmail.com` (naam/maand/uren, 0 bijlagen).
- [x] Eerste brokerroute bevestigd voor `rana.ramjanam@pathconsultancy.nl` (factuur + klanturenstaat).
- [-] Productieaccounts voor Gio, Joyce en medewerkers; eerste wachtwoorden veilig uitgeven.
- [-] Gebruikers deactiveren/verwijderenbeleid vastleggen.
- [-] Google Workspace-koppeling.
- [-] Tweefactorauthenticatie voor beheerders beoordelen (sterk aanbevolen).
- [-] Bepalen wie productiebeheerder is naast Gio.
- [-] Privacy- en bewaartermijnen vastleggen voor uren, uploads, facturen en auditlogs.
- [-] Vastleggen wie gegevens mag exporteren, corrigeren en archiveren.

**Uit Fase 14 - TransIP-controlepaneel/SSH:**
- [x] Productiedatabasewachtwoord door eigenaar geroteerd zonder het in chat of Git te plaatsen; verbinding wordt door de interactieve configurator nog gevalideerd.
- [x] PHP-versie op TransIP read-only bevestigd: 8.4.24.
- [x] HTTPS/SSL op `https://uren.pathconsultancy.nl` bereikbaar en TransIP Let's Encrypt ingeschakeld; HSTS blijft bewust uit tot observatie na cutover.
- [x] Exacte documentroot via controlepaneel en SSH bevestigd: `/data/sites/web/pathconsultancynl/subsites/uren.pathconsultancy.nl`.
- [x] SSH-keytoegang bevestigd voor `pathconsultancynl@pathco.ssh.transip.me`.
- [x] Private productiemappen bestaan onder `/data/sites/web/pathconsultancynl/private/path-urenregistratie`.
- [-] TransIP-back-ups controleren (database inbegrepen, retentieperiode).
- [-] Handmatige database-export voor livegang.
- [-] Productiebestanden uploaden.
- [-] Productie `server/config.local.php` via de interactieve fail-closed configurator maken; script is gebouwd, DB-secret moet nog rechtstreeks in de SSH-terminal worden ingevoerd.
- [-] health.php/install.php/migrate.php op TransIP uitvoeren; demo-seeds uitschakelen bevestigen.
- [-] Productieaccounts aanmaken; productielogin en productie-smoketest.
- [-] Schrijfrechten upload-/PDF-map; PHP-uploadlimits en sessie-instellingen controleren.
- [-] Cronmogelijkheden voor de e-mailqueue controleren/instellen.
- [-] Foutlogging buiten publieke output; `display_errors` uit in productie; logs buiten webroot + logrotatie.
- [-] Alle lokale/testwachtwoorden vóór livegang vervangen.
- [-] Uploads/PDF's buiten de publieke webroot; bestandsrechten zo beperkt mogelijk.
- [-] Databaseverbinding met zo weinig mogelijk rechten configureren.
- [-] Back-upretentie en opslaglocatie controleren.

**Uit Fase 15 - productie-praktijktests en acceptatie:**
- [-] Volledige correctie/goedkeuringsflow en alle overige flows (concept, indienen, correctie, herindienen, goedkeuren, klanturenstaat upload/download) handmatig op productie testen.
- [-] Productieprivacytest; productie-adminlogin en -medewerkerlogin.
- [-] Factuurbedragen, btw, factuurnummering en PDF controleren op productie.
- [-] Broker-, boekhouder- en EasySalary-mail dry-run; echte mailroute afzonderlijk testen.
- [-] Back-up maken en database/bestanden herstellen uit back-up.
- [-] Mobiele admin-/medewerkerflow op fysieke iPhone, Android en tablet.
- [-] PWA-installatie en offline-/updategedrag bepalen op een echt toestel.
- [-] Monitoring, health monitoring, securitylogging en logrotatie inrichten.
- [x] Go-live- en rollbackrunbook geschreven in `OPERATIONS-RUNBOOK.md`; daadwerkelijk oefenen blijft extern open.
- [-] Volledig schone productie-installatie vanaf nul uitvoeren.
- [-] Controleren dat er geen demo-gebruikers/demo-mails/toekomsttestperioden aanwezig zijn.
- [-] Eén volledige maandflow op productie doorlopen (invoer → indienen → correctie → herindienen → goedkeuren → factuur definitief → mails dry-run).
- [-] Release-tag aanmaken van de productieversie.
- [-] Acceptatie laten bevestigen door Gio, Joyce en één medewerker; pas daarna echte mail activeren.

### B. Doorlopend beheer na livegang

- [-] Eerste week dagelijks errorlogs controleren.
- [-] Mailqueue dagelijks controleren; mislukte mails opnieuw aanbieden.
- [-] Backupstatus en uptime/health controleren.
- [-] Eerste echte maandflow, correctie/goedkeuring, factuur, broker-mail en EasySalary-route volgen en narekenen.
- [-] Kleine productiebugs oplossen.
- [-] Vastleggen wie verantwoordelijk is voor mislukte mails; waarschuwingen instellen (mailqueue vast, health.php faalt).
- [-] Vastleggen hoe medewerkers productieproblemen melden; incidentlog bijhouden.
- [-] Maandelijkse dependency-updates plannen; elk kwartaal een hersteltest van de back-up.
- [-] Database-/opslaggroei, verlopen/inactieve accounts en auditlogs periodiek controleren.
- [-] Daarna normaal beheerregime.

Status Fase 16:
- [x] technische audit-API-basis aanwezig en getest
- [x] Bundel-1-tooling voorbereid: SMTP/STARTTLS, offline mailpreflight, private storage, logging/rotatie, queuecron, back-up/restore, productiepreflight, interactieve productieconfiguratie, accountprovisioning en runbooks
- [x] Release Pipeline #31649794848 voor basiscommit `23b14fa` volledig groen; actuele lokale
  regressie 161/161 groen inclusief SAFE-N-007.
- [-] fase als geheel: Bundel 2 is read-only geaudit; live serveert nog de TransIP-placeholder en mist `server/config.local.php`. DB-secret-invoer, gecontroleerde cutover en alle Bundel-3-handelingen blijven afzonderlijke gates; geen echte mail en geen go-live uitgevoerd.

---

## Harde blokkades vóór livegang

Deze mogen **absoluut niet open** blijven wanneer echte medewerkers starten:

- [-] Geen demo-accounts of demo-wachtwoorden in productie
- [-] install.php en migrate.php beschermd of uitgeschakeld
- [-] health.php lekt geen technische gegevens
- [-] Productiewachtwoorden geroteerd
- [-] Back-up én herstel succesvol getest
- [-] Employee ziet uitsluitend eigen data
- [-] Definitieve factuur is immutable
- [-] E-mail blijft dry-run tot afzonderlijke goedkeuring
- [-] Rollbackprocedure getest
- [-] Volledige productieflow geaccepteerd

---

## Na eerste livegang (mag wachten)

- [-] Volledige PWA/offlinefunctionaliteit
- [-] Uitgebreid monitoringdashboard
- [-] Geavanceerde performance-/loadtests
- [-] Uitgebreide rapportage-export
- [-] Automatische archivering
- [-] Extra beheerdersdashboard voor auditlogs

---

## Samenvatting huidige stand

- [x] Fase 1 - lokale basis
- [x] Fase 2 - database/server-led state: alle businesskritische writes server-led, localStorage
  beperkt tot UI-state, alle cross-cutting bewijspunten afgedaan door Slices B/C/D/E; 148/148 groen.
- [x] Fase 3 - read-API
- [x] Fase 4 - auth en rollen
- [x] Fase 5 - securitybasis afgerond; resterende productiehardening (CORS/CSP/HSTS/logging op echt domein) verplaatst naar Fase 16
- [x] Fase 6 - Playwright, Allure, Living Doc en agents
- [x] Fase 7 - CI/CD-basis + volledige pipeline end-to-end groen bewezen (run #91); resterend (branch protection, echte hosts, productieapproval, notificatieontvangers) verplaatst naar Fase 16
- [x] Fase 8 - uren concept opslaan en indienen
- [x] Fase 9 - correctie/goedkeuring desktop en mobiel bewezen; pipeline bevestigd; productieacceptatie volledig verplaatst naar Fase 16
- [x] Fase 10 - klanturenstaat: schema + API + UI-koppeling + regressie afgerond; JPG/PNG-conversie naar PDF gebouwd en getest (CTS-API-H-005); opslagplek/virusscanstrategie verplaatst naar Fase 16
- [x] Fase 11 - factuur lock/write en serverberekening bewezen; server-side PDF/opslag-key/download-autorisatie/inhoudscontrole gebouwd en getest (INV-H-004, INV-N-013); briefpapier/opslaglocatie/creditbeleid verplaatst naar Fase 16
- [x] Fase 12 - e-mail: queue-service + dry-run + assignment-routes + tests afgerond; retry/max-retries/foutstatus geverifieerd aanwezig; factuur-PDF-bijlage nu structureel mogelijk; Gmail/Google Workspace-config en echte verzending verplaatst naar Fase 16
- [x] Fase 13 - bedrijfsdata: gebruikersbeheer-API, wachtwoord-reset, rate-limiting, force_password_change afgerond; alle definitieve bedrijfsgegevens/accounts volledig verplaatst naar Fase 16
- [x] Fase 14 - TransIP: hardening (install/migrate/health guards, .htaccess) afgerond; deployment + productie-config volledig verplaatst naar Fase 16
- [x] Fase 15 - lokaal 161/161 browseruitvoeringen groen (inclusief MOB-H-003 en DASH-N-008
  na volledige muterende reeks), GUI smoke en `npm run check` groen; concurrency/jaarwisseling/
  uploads/accessibility/PWA gebouwd en getest; productiepraktijktests/acceptatie → Fase 16
- [-] Fase 16 - Bundel 1 technisch voorbereid en lokaal groen; Bundel 2 (TransIP/Google/configuratie) en Bundel 3 (productieacceptatie) blijven extern open

Telling fasestatussen:
- [x] **15 fasen volledig bewezen of volledig verplaatst voor hun VS-Code-scope: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 en 15.**
- [x] 1 fase is de laatste, verzamelende fase: 16 (alle buiten-VS-Code-taken + post-live beheer).

## Directe volgende stap

**Fase 1 t/m 15 volledig klaar; Fase-16 Bundel 1 lokaal afgerond.** Externe activatie blijft bewust uit.

1. Publiceer de actuele release eerst als niet-actieve stagingbundel met SHA-256; schakel de live root nog niet om.
2. Start daarna via SSH de interactieve productieconfigurator en typ het DB-wachtwoord uitsluitend daar in.
3. Draai de statische en live read-only productiepreflight. Pas na groen bewijs volgt een afzonderlijk goedgekeurde cutover.
4. Voer vervolgens Bundel 3 uit met `mail.enabled=false`; echte SMTP-verzending blijft een aparte toestemming.

## Dagelijkse werkwijze (verplicht)

1. Gebruik deze masterchecklist elke werkdag als enige technische voortgangslijst.
2. Werk de checklist direct bij na elke commit en push.
3. Vink af wat aantoonbaar klaar is en testbewijs heeft.
4. Voeg nieuwe taken of nieuwe cases meteen toe onder de juiste fase.
5. Markeer nieuwe problemen direct als [!] en zet ze na oplossing terug naar [x] of [-].

## Rapportage na elke stap

A. Wat voor de stap al af was
B. Wat in deze stap is afgerond
C. Wat gedeeltelijk klaar is
D. Wat nog openstaat
E. De volledige bijgewerkte masterchecklist
F. Lokaal getest / gecommit / gepusht / pipeline-status

## Bronnen

- [x] PRODUCTIE-CHECKLIST.md
- [x] LIVING-DOC.md
- [x] TEST-BDD-MAPPING.md
- [x] tests/playwright/*.spec.ts

