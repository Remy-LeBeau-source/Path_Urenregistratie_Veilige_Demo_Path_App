# Masterchecklist Path Uren & Facturatie

Dit is vanaf nu de volledige masterchecklist en vaste technische bron van waarheid.
Na iedere stap wordt deze lijst bijgewerkt met wat klaar, gedeeltelijk klaar, open of geblokkeerd is.

## Betekenis van de statussen

- [x] afgerond, getest en waar nodig gecommit/gepusht
- [-] nog niet afgerond of nog open
- [!] geblokkeerd of test mislukt

## Actuele stand

- [x] Datum: 2026-08-10
- [x] Main/HEAD: 387ea63
- [x] Referentiecommit fase 8/9 backend: fc27723
- [x] Appversie: 0.9.41
- [x] Lokale check: geslaagd
- [x] Lokale e2e regressie: 121 tests (113 niet-mobile Chromium + 4 Pixel 7 Chromium + 4 iPhone 13 WebKit)
- [x] Functionele regressiecatalogus: 117 unieke cases met 117 feature- en 117 steps-mappings
- [x] Releasehardening v0.9.41: gecommit en gepusht naar main
- [x] GitHub pipeline-status: run #68 gestart voor f05ccff; Validate+Test+Live Docs+Prod verwacht groen na afronding
- [x] Laatste commit: 387ea63 — feat(living-doc): add suite grouping to sidebar matching Allure suites
- [x] Recente commits gepusht: Slice B (a3d66cc), Slice C notifications (f05ccff), Living Doc suite-sidebar (387ea63)
- [x] Slice B afgerond: invoice/verzendstatus auth-mode server-led; lokale regressie 121/121 en pipeline groen
- [x] Slice C deelstap afgerond: notifications auth-mode server-led via notifications.php (read, mark_read, mark_all_read, mark_announcement_read)

### Kort overzicht: waar we nu staan

- [x] Kernbouw en functionele basis zijn aanwezig en lokaal gevalideerd.
- [x] Regresietesten zijn lokaal groen.
- [-] We werken vanaf nu strikt van boven naar beneden op open punten in de checklist.
- [-] Fases worden alleen overgeslagen als een punt aantoonbaar geblokkeerd is.

### Nieuwe werklijst (van boven naar beneden)

- [-] Stap 1: Fase 2 - resterende app_state/localStorage-afbouw.
- [-] Stap 2: Fase 5 - alleen niet-productie-afhankelijke securityhardening.
- [-] Stap 3: Fase 7 - alleen niet-geblokkeerde CI/CD-afwerking.
- [-] Stap 4: Fase 10 - resterende lokale productiehardening uploads.
- [-] Stap 5: Fase 11 - server-side factuur-PDF en veilige opslag/download.
- [-] Stap 6: Fase 12 - dry-run/bijlagen/retry technisch afronden; echte Gmail-verzending nog niet activeren.
- [-] Stap 7: Fase 13 - definitieve bedrijfsgegevens/accounts zodra beschikbaar.
- [-] Stap 8: Fase 14 - TransIP/productieconfig zodra we daar bewust aan beginnen.
- [-] Stap 9: Fase 15 - productieacceptatie/livegang.
- [-] Stap 10: Fase 16 - post-live beheer.

### Uitvoeringsbundels (afhankelijkheid-gedreven)

- [x] Slice B: factuurstatus + verzendstatus server-led (Fase 2 + 11 + 12)
- [-] Slice C: notifications + announcements server-led (Fase 2 + 12)
- [-] Slice D: users + settings server-led (Fase 2 + 13)
- [-] Slice E: persistState/localStorage beperken tot UI/demo/fallback (afronding Fase 2)
- [x] Slice C deelstap afgerond: auth-mode notificatiepaneel en markeren-als-gelezen lopen server-led via server/api/notifications.php (read, mark_read, mark_all_read en mark_announcement_read).

Voor iedere slice geldt verplicht:
- [-] Extra controle op afgeleide dubbeling: invoiceStatus, payrollStatus, email_deliveries, verzonden/sent-flags, dashboard/KPI-afleidingen en batch-acties.
- [-] In auth-mode blijft per businessstatus precies een autoritatieve serverbron over.
- [-] Na succesvolle server-write synchroniseert frontend state direct met serverresponse.
- [-] Na write blijft reload opnieuw server-led lezen.
- [-] Frontend voorspelt of vooruitzet geen lokale businessstatus voordat de serverwrite bevestigd is.

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
- [-] Browseropslag is nog niet voor alle onderdelen volledig vervangen:
  - read-data grotendeels uit database
  - uren-writeflow uit database
  - resterende factuur-, upload-, mail- en beheerschermen volledig transactioneel maken

Status Fase 2:
- [x] databasestructuur afgerond
- [-] volledige afbouw van app_state/localStorage nog niet afgerond

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
- [-] Nog open als aanvullende hardening:
  - Expliciete sessie-time-out
  - Sliding session expiration
  - Auditmelding bij herhaalde mislukte logins
  - Productie-CORS definitief beperken tot https://uren.pathconsultancy.nl
  - Content-Security-Policy voor productie
  - HSTS na bevestigde HTTPS-productieconfig
  - Centrale securitylogging
  - Logrotatie
  - Periodieke controle op kwetsbare dependencies

Status Fase 5:
- [x] noodzakelijke securitybasis afgerond
- [-] extra productiehardening open

---

## Fase 6 - Playwright, Allure, Living Documentation en agents

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
- [x] Living Documentation bevat 117 unieke cases, 121 uitvoeringen en volledige 117/117/117 traceability.
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
- [-] Ken/Gio-notificaties technisch aanwezig maar functioneel geen prioriteit.
- [-] Definitieve notificatieontvangers later bevestigen.
- [-] Echte aparte Dev/Test/Acc-hosts later invullen.
- [-] Branch protection op main.
- [-] Verplichte groene statuschecks voor merge.
- [-] Productieapproval instellen voor echte deploy.

Status Fase 7:
- [x] CI/CD-basis lokaal en in repository afgerond
- [-] fase als geheel gedeeltelijk: notificatieontvangers, echte stage-hosting, branch protection/checks en productieapproval nog open

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
- [-] productieacceptatie blijft open

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

- [-] JPG/PNG server-side omzetten naar PDF.
- [-] Opslag buiten publiek toegankelijke webmap.
- [-] Virusscanstrategie.

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
- [-] productieafbouw/hardening nog open (o.a. storage-hardening, virusscanstrategie, uploadconversie)

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

- [-] Server-side factuur-PDF.
- [-] Path/QSI-briefpapier.
- [-] PDF veilig bewaren.
- [-] pdf_storage_key.
- [-] PDF alleen geautoriseerd downloaden.
- [-] Credit-/correctiestrategie.
- [-] PDF-inhoudscontrole.

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
- [-] fase als geheel gedeeltelijk: definitieve server-side PDF, beveiligde PDF-opslag/download en correctiestrategie open

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

- [-] Factuur-PDF als bijlage.
- [-] Klanturenstaat als bijlage waar nodig.
- [-] Retry na tijdelijke fout.
- [-] Maximaal aantal retries.
- [-] Foutstatus.
- [-] Gmail/Google Workspace-config wordt als late-stage productie-/operational concern behandeld.
- [-] SMTP of Gmail API-keuze wordt pas in de late release-/livegangfase definitief gemaakt.
- [-] Echte verzending wordt als allerlaatste activeren, na acceptatie en alleen na goedkeuring.
- [-] Deze mail- en transporttaken vallen dus niet in de kernbouwfase, maar in de late release-/livegangfase.

Status Fase 12:
- [x] dry-runqueue, routes, templates, frontendkoppeling en regressietests bestaan
- [-] fase als geheel gedeeltelijk: echte transportconfiguratie, bijlagen/retry-afbouw en verzending open

---

## Fase 13 - Definitieve bedrijfsgegevens en accounts

- [x] Demo-instellingen voor Path/QSI aanwezig.
- [x] Password-reset API en wachtwoord-vergeten frontend bestaan.
- [x] Login rate-limiting en force_password_change flow bestaan.
- [x] Gebruikersbeheer-API kan gebruikers lezen, deactiveren, heractiveren en wachtwoordwijziging afdwingen.
- [x] Role- en companyscope, CSRF en audit-events zijn door regressietests afgedekt.
- [-] Definitief kiezen:
  - QSI Consultancy B.V.
  - Path Consultancy B.V.
- [-] Definitieve statutaire naam.
- [-] Definitief factuuradres.
- [-] KvK-nummer controleren.
- [-] Btw-nummer controleren.
- [-] IBAN controleren.
- [-] Betalingstermijn.
- [-] Definitieve factuurprefix.
- [-] Definitieve Circle8-route.
- [-] Circle8 factuuradres.
- [-] Circle8 e-mailadres of portaal.
- [-] Boekhoudernaam.
- [-] Boekhoudere-mailadres.
- [-] EasySalary-e-mailadres.
- [-] Definitieve brokerontvangers.
- [-] Definitieve mailteksten.
- [-] Definitieve herinneringsmomenten.
- [-] Productieaccount Gio.
- [-] Productieaccount Joyce.
- [-] Productieaccounts medewerkers.
- [-] Eerste wachtwoorden veilig uitgeven.
- [-] Gebruikers deactiveren/verwijderenbeleid.
- [-] Google Workspace-koppeling.
- [-] Eerste tijdelijke wachtwoord veilig uitgeven.
- [-] Tweefactorauthenticatie voor beheerders beoordelen (sterk aanbevolen).
- [-] Bepalen wie productiebeheerder is naast Gio.
- [-] Privacy- en bewaartermijnen vastleggen voor uren, uploads, facturen en auditlogs.
- [-] Vastleggen wie gegevens mag exporteren, corrigeren en archiveren.

Status Fase 13:
- [x] auth-hardening, resetflow en gebruikersbeheer technisch aanwezig en getest
- [-] fase als geheel gedeeltelijk: definitieve bedrijfsgegevens, productieaccounts, Google Workspace en beleid open

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

### Nog door jou in TransIP controleren

- [-] Productiedatabasewachtwoord wijzigen/roteren.
- [-] Nieuw wachtwoord niet in chat plaatsen.
- [-] Nieuw wachtwoord niet in Git zetten.
- [-] PHP-versie op TransIP controleren.
- [-] PHP op 8.4 zetten/bevestigen.
- [-] Screenshot van PHP-instellingen bewaren.
- [-] SSL-certificaat controleren.
- [-] Geldig slotje op https://uren.pathconsultancy.nl.
- [-] Exact documentroot/sitepad controleren.
- [-] Controleren waar de subsitebestanden moeten staan.
- [-] Controleren of TransIP-back-ups de database meenemen.
- [-] Retentieperiode van TransIP-back-ups controleren.
- [-] Handmatige database-export voor livegang.

### Productie-installatie nog uitvoeren

Deze punten worden in de masterchecklist als late-stage release-/operational items behandeld: TransIP-deployment, productieconfiguratie, productieaccounts en operationele controles komen pas in de livegang-/beheerfase aan bod, nadat de appfunctionaliteit lokaal en in acceptatie is bevestigd.

- [-] Productiebestanden uploaden.
- [-] TransIP-productieconfiguratie, SSL, documentroot, deploy en productieaccounts worden daarom naar de late release-/livegangfase verschoven.
- [-] Productie server/config.local.php handmatig maken.
- [-] environment = production.
- [-] allow_demo_migrations = false.
- [-] app_origin = https://uren.pathconsultancy.nl.
- [-] Productiedatabasehost invullen.
- [-] Productiedatabasenaam invullen.
- [-] Productiedatabasegebruiker invullen.
- [-] Productiedatabasewachtwoord lokaal op server invullen.
- [-] health.php op TransIP testen.
- [-] install.php uitvoeren indien nodig.
- [-] migrate.php uitvoeren.
- [-] Controleren dat demo-seeds niet draaien.
- [-] Productieaccounts aanmaken.
- [-] Productielogin testen.
- [-] Productie-smoketest.
- [-] Schrijfrechten upload-/PDF-map.
- [-] PHP uploadlimits controleren.
- [-] PHP sessioninstellingen controleren.
- [-] Cronmogelijkheden controleren voor e-mailqueue.
- [-] Foutlogging buiten publieke output configureren.
- [-] PHP `display_errors` uitzetten in productie; fouten alleen naar serverlogs.
- [-] Logs buiten de publiek bereikbare webmap bewaren + logrotatie instellen.
- [-] Demo-accounts en demo-seeds volledig uitschakelen in productie.
- [-] Alle lokale/testwachtwoorden vóór livegang vervangen.
- [-] Uploads en PDF's buiten de publieke webroot bewaren.
- [-] Bestandsrechten zo beperkt mogelijk instellen.
- [-] Cronjob of worker voor de e-mailqueue instellen.
- [-] Maximale uploadgrootte en toegestane bestandstypen instellen.
- [-] Databaseverbinding met zo weinig mogelijk rechten configureren.
- [-] Back-upretentie en opslaglocatie controleren.

Status Fase 14:
- [x] subsite/databasebasis en applicatiehardening aanwezig
- [-] fase als geheel gedeeltelijk: TransIP-productieconfiguratie, deployment en operationele controles open

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

### Nog voor livegang

- [-] Volledige correctie- en goedkeuringsflow handmatig op productie testen.
- [-] Productie-adminlogin.
- [-] Productie-medewerkerlogin.
- [-] Productieprivacytest.
- [-] Productie concept opslaan.
- [-] Productie indienen.
- [-] Productie correctie.
- [-] Productie herindienen.
- [-] Productie goedkeuren.
- [-] Klanturenstaat upload.
- [-] Klanturenstaat download.
- [-] Factuurbedragen controleren.
- [-] Btw controleren.
- [-] Factuurnummering controleren.
- [-] PDF controleren.
- [-] Broker-mail dry-run.
- [-] Boekhouder-mail dry-run.
- [-] EasySalary zonder factuur dry-run.
- [-] Echte mailroute afzonderlijk testen.
- [-] Back-up maken.
- [-] Database herstellen uit back-up.
- [-] Bestanden herstellen uit back-up.
- [-] Mobiele admin- en medewerkerflow op fysieke toestellen.
- [-] Fysieke iPhone-/Safari-test.
- [-] Fysieke Android-/Chrome-test.
- [-] Tablet-test.
- [-] PWA-manifest.
- [-] Service worker.
- [-] PWA-installatie.
- [-] Offline-/updategedrag bepalen.
- [-] Monitoring.
- [-] Health monitoring.
- [-] Securitylogging.
- [-] Logrotatie.
- [-] Go-live runbook.
- [-] Rollbackrunbook.
- [-] Echte automatische e-mail als allerlaatste activeren.
- [-] Volledig schone productie-installatie vanaf nul uitvoeren.
- [-] Controleren dat er geen demo-gebruikers, demo-mails of toekomsttestperioden aanwezig zijn.
- [-] Één volledige maandflow doorlopen: invoer → indienen → correctie → herindienen → goedkeuren → factuur definitief → mails dry-run.
- [-] Dubbelklikken en dubbele requests testen.
- [-] Gelijktijdig gebruik door twee beheerders testen.
- [-] December → januari en jaarwisseling testen.
- [-] Grote uploads en foutieve bestanden testen.
- [-] Basiscontrole op toetsenbordbediening en leesbaarheid.
- [-] Dependency/securityscan uitvoeren.
- [-] Rollback naar vorige release daadwerkelijk oefenen.
- [-] Release-tag aanmaken van de productieversie.
- [-] Acceptatie laten bevestigen door Gio, Joyce en één medewerker.
- [-] Pas daarna echte mail activeren.

Status Fase 15:
- [x] desktop- en mobiele emulatieregressie lokaal ingericht en bewezen
- [x] v0.9.41 releasepipeline #62 inclusief Test, Living Docs en Prod geslaagd
- [x] dashboardwerkvoorraad en mobiele previewstart lokaal hersteld en gericht getest
- [x] volledige vervolgmatrix lokaal opnieuw groen: 121/121 uitvoeringen
- [-] fase als geheel gedeeltelijk: fysieke toestellen, productieacceptatie, PWA en livegang open

---

## Fase 16 - Beheer na livegang

- [x] Auditlog-API voor beheerders met entity/event filters en secret-redactie.
- [x] Zes API-regressies voor toegang, filters en gevoelige data.
- [-] TransIP-hosting, SSL, documentroot, backupretentie en productieaccounts opvolgen als late release-/operationalisatie.
- [-] Gmail/Google Workspace-mailroute, mailboxacceptatie en productie-transportstatus opvolgen als late release-/operationalisatie.
- [-] Eerste week dagelijks errorlogs controleren.
- [-] Mailqueue dagelijks controleren.
- [-] Mislukte mails opnieuw aanbieden.
- [-] Backupstatus controleren.
- [-] Uptime/health controleren.
- [-] Eerste echte maandflow volgen en narekenen.
- [-] Eerste echte correctie/goedkeuring volgen.
- [-] Eerste echte factuur controleren.
- [-] Eerste echte broker-mail controleren.
- [-] Eerste EasySalary-route controleren.
- [-] Kleine productiebugs oplossen.
- [-] Vastleggen wie verantwoordelijk is voor mislukte mails.
- [-] Waarschuwing instellen als mailqueue blijft hangen.
- [-] Waarschuwing instellen wanneer health.php faalt.
- [-] Vastleggen hoe medewerkers productieproblemen melden.
- [-] Incidentlog bijhouden.
- [-] Maandelijkse dependency-updates plannen.
- [-] Elk kwartaal een hersteltest van de back-up uitvoeren.
- [-] Database- en opslaggroei controleren.
- [-] Verlopen/inactieve accounts periodiek controleren.
- [-] Auditlogs periodiek controleren.
- [-] Daarna normaal beheerregime.

Status Fase 16:
- [x] technische audit-API-basis aanwezig en getest
- [-] fase als geheel gedeeltelijk: operationeel post-live beheer start pas na livegang

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
- [-] Fase 2 - databaseschema/migraties klaar; volledige afbouw app_state/localStorage open
- [x] Fase 3 - read-API
- [x] Fase 4 - auth en rollen
- [x] Fase 5 - securitybasis
- [x] Fase 6 - Playwright, Allure, Living Doc en agents
- [-] Fase 7 - CI/CD-basis klaar; echte stages en productieapproval open
- [x] Fase 8 - uren concept opslaan en indienen
- [-] Fase 9 - correctie/goedkeuring desktop en mobiel bewezen; pipeline bevestigd; productieacceptatie open
- [-] Fase 10 - klanturenstaat: schema + API + UI-koppeling + regressie afgerond; productiehardening open
- [-] Fase 11 - factuur lock/write en serverberekening bewezen; server-side PDF/opslag/download open
- [-] Fase 12 - e-mail: queue-service + dry-run + assignment-routes + tests afgerond; echte dispatch open
- [-] Fase 13 - bedrijfsdata: gebruikersbeheer-API, wachtwoord-reset, rate-limiting, force_password_change afgerond; definitieve bedrijfsgegevens + accounts open
- [-] Fase 14 - TransIP: hardening (install/migrate/health guards, .htaccess) afgerond; deployment + productie-config open
- [-] Fase 15 - lokaal 121 tests en pipeline #62 groen; autofill-, periode-, teller- en mobile-regressie bewezen; fysieke toestellen, PWA en productieacceptatie open
- [-] Fase 16 - audit-API-basis klaar; operationeel post-live beheer nog niet gestart

Telling fasestatussen:
- [x] 6 fasen volledig bewezen voor hun afgebakende scope: 1, 3, 4, 5, 6 en 8.
- [-] 10 fasen gedeeltelijk: 2, 7 en 9 t/m 16.
- [x] 0 fasen volledig ongestart; open werk staat onder de gedeeltelijke fasen.

## Directe volgende stap

1. Fase 2 - resterende app_state/localStorage-afbouw.
2. Fase 5 - alleen niet-productie-afhankelijke securityhardening.
3. Fase 7 - alleen niet-geblokkeerde CI/CD-afwerking.
4. Fase 10 - resterende lokale productiehardening uploads.
5. Fase 11 - server-side factuur-PDF en veilige opslag/download.
6. Fase 12 - dry-run/bijlagen/retry technisch afronden; echte Gmail-verzending nog niet activeren.
7. Fase 13 - definitieve bedrijfsgegevens/accounts zodra beschikbaar.
8. Fase 14 - TransIP/productieconfig zodra we daar bewust aan beginnen.
9. Fase 15 - productieacceptatie/livegang.
10. Fase 16 - post-live beheer.

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

