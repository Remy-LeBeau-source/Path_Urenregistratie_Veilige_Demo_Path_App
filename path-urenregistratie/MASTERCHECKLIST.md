# Masterchecklist Path Uren & Facturatie

Dit is vanaf nu de volledige masterchecklist en vaste technische bron van waarheid.
Na iedere stap wordt deze lijst bijgewerkt met wat klaar, gedeeltelijk klaar, open of geblokkeerd is.

## Betekenis van de statussen

- [x] afgerond, getest en waar nodig gecommit/gepusht
- [~] gedeeltelijk klaar of nog wachtend op definitief bewijs
- [ ] nog open
- [!] geblokkeerd of test mislukt

## Actuele stand

- Datum: 2026-08-09
- Main/HEAD: 98220af
- Referentiecommit fase 8/9 backend: fc27723
- Appversie: 0.9.40
- Lokale check: geslaagd
- Lokale e2e regressie: 100 tests (92 desktop Chromium + 4 Pixel 7 Chromium + 4 iPhone 13 WebKit)
- Mobile/stale-state slice: lokaal aanwezig, nog niet gecommit of gepusht
- GitHub pipeline-status: lokaal niet verifieerbaar zonder gh auth login
- Laatste commit: feat(notifications): notificaties API, 4 tests, 90 total tests v0.9.39

---

## Fase 1 - Lokale ontwikkelbasis

- PHP 8.4 lokaal geinstalleerd.
- MySQL lokaal geinstalleerd.
- pdo_mysql actief.
- Lokale database path_urenregistratie.
- PHP kan verbinding maken met MySQL.
- server/config.local.php voor lokale instellingen.
- server/config.local.php staat buiten Git.
- server/.php-path staat buiten Git.
- Geen productiewachtwoorden in Git.
- server/config.local.php.example met veilige placeholders.
- Lokaal startscript:
  - start-path-app.cmd
  - start-path-app.ps1
- API-controlescript:
  - test-path-api.cmd
  - test-path-api.ps1
- Groot controlescript:
  - check-after-big-change.cmd
  - check-after-big-change.ps1
- Automatische lokale databaseback-up bij grote controles.
- Lokale PHP-server op poort 8000.
- health.php, install.php en API kunnen lokaal worden gecontroleerd.

Status Fase 1:
- [x] afgerond

---

## Fase 2 - Database, schema en migraties

- app_state als eerste werkende serveropslag.
- Tabel schema_migrations.
- Core databaseschema.
- server/install.php.
- server/health.php.
- server/migrate.php.
- Core migratie.
- Demo-seed.
- Auth-schema.
- Demo-medewerker-authseed.
- Veilige migratiehistorie.
- Bestaande migraties worden niet opnieuw gewijzigd voor nieuwe features.
- Nieuwe databasewijzigingen worden als nieuwe migration toegevoegd.
- Demo-migraties kunnen apart worden beheerd.
- Demo-migraties zijn standaard niet voor productie bedoeld.
- Tabellen voor:
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
- Demo-inhoud voor juni, juli en augustus 2026.
- Browseropslag is nog niet voor alle onderdelen volledig vervangen:
  - read-data grotendeels uit database
  - uren-writeflow uit database
  - resterende factuur-, upload-, mail- en beheerschermen volledig transactioneel maken

Status Fase 2:
- [x] databasestructuur afgerond
- [~] volledige afbouw van app_state/localStorage nog niet afgerond

---

## Fase 3 - Read-API en frontendlezing

- server/api/common.php.
- server/api/bootstrap.php.
- server/api/dashboard.php.
- server/api/invoices.php.
- Frontend leest bootstrapgegevens via API.
- Frontend leest dashboardgegevens via API.
- Frontend leest facturen via API.
- Periodefilter via API.
- Medewerkers via API.
- Opdrachten via API.
- Stamgegevens via API.
- Beschermde read-endpoints vereisen een sessie.
- Zonder sessie geven endpoints 401 not-authenticated.
- Administrator ziet organisatiebrede gegevens.
- Medewerker ziet alleen eigen gegevens.
- Medewerker krijgt geen volledige ontvangerslijst.
- Medewerker krijgt geen volledige medewerkerslijst.
- Employee- en company-scope in queries.
- app_state blijft een gecontroleerde fallback, niet de primaire database in auth-modus.
- Role enforcement eerder bewezen en gecommit als 23c07a0.

Status Fase 3:
- [x] afgerond

---

## Fase 4 - Authenticatie, sessies en rollen

- server/auth/session.php.
- server/auth/login.php.
- server/auth/logout.php.
- server/auth/me.php.
- password_hash.
- password_verify.
- Veilige PHP-sessie.
- Administratorrol.
- Employeerol.
- Admin-login via backend.
- Medewerker-login via backend.
- Frontend-loginformulier gekoppeld aan backend.
- Frontend controleert bij app-start de sessie.
- /auth/me.php geeft huidige gebruiker terug.
- Logout vernietigt de sessie.
- Na logout terug naar login.
- Geen wachtwoorden in debugoutput.
- Geen wachtwoorden in consolelogging.
- Loginformulier vult geen wachtwoord automatisch in.
- Demo-rolknoppen alleen als gecontroleerde fallback.
- window.__PATH_AUTH_DEBUG bevat geen gevoelige waarden.
- CI-adminaccount afgestemd op gio@example.invalid.
- CI-employeeaccount afgestemd op stasjo@example.invalid.
- Browserflow login -> dashboard -> facturen -> logout eerder getest zonder console/page errors.

Status Fase 4:
- [x] afgerond voor huidige authscope

---

## Fase 5 - CSRF, validatie en securitybasis

- CSRF-token in sessie.
- X-CSRF-Token header.
- CSRF-endpoint.
- CSRF op login.
- CSRF op logout.
- CSRF op state-write.
- CSRF op timesheetwrites.
- Veilige JSON-body parsing.
- Validatie van verplichte velden.
- E-mailvalidatie.
- Maximale veldlengtes.
- Enumvalidatie.
- Numerieke validatie.
- Nette 400, 401, 403, 405 en 409 responses.
- Geen SQL-details in normale API-responses.
- Geen stacktraces naar browser.
- Production-safety Playwright-tests.
- Geen plaintext demo-wachtwoorden in frontend.
- Demo-migraties voor productie begrensd.
- Productie-origin voorbereid via configuratie.
- Nog open als aanvullende hardening:
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
- [ ] extra productiehardening open

---

## Fase 6 - Playwright, Allure, Living Documentation en agents

- Playwright-only testopzet.
- Geen Cypress in deze repository.
- Geen Cucumber-runner.
- Native Playwright-specs zijn leidend.
- playwright.config.ts.
- Page objects.
- API helpers.
- Fixtures.
- Environment-/stageconfiguratie.
- Dev-stage.
- Test-stage.
- Acceptatie-stage.
- Productiestage.
- Auth-tests.
- Dashboardtests.
- Factuurtests.
- Rollen/API-tests.
- Securitytests.
- Production-safety tests.
- Timesheet-write tests.
- Timesheet-reviewflow test.
- Herhaalbare toekomstige testperioden.
- Allure reporter.
- Allure-resultaten.
- Allure-rapportgeneratie.
- Playwright HTML-report.
- Traces bij failures.
- Screenshots bij failures.
- Video bij failures.
- Nederlandse .feature-bestanden als Living Documentation.
- .steps.ts-bestanden als BDD-mapping/documentatie.
- TEST-BDD-MAPPING.md.
- LIVING-DOC.md.
- PROJECT-CONTEXT.md.
- Live Docs-bundel.
- Planner-agent.
- Builder-agent.
- Test-agent.
- Security-review-agent.
- Release-agent.
- Gescheiden Playwright-projecten voor desktop Chromium, Pixel 7 Chromium en iPhone 13 WebKit.
- Mobile UI-spec draait alleen op de twee mobiele projecten; desktop- en API-specs worden niet verdrievoudigd.
- Mobiele regressie dekt login, navigatie, dashboard, uren, correctie/herindiening, goedkeuring, factuurkaartweergave, upload, notificaties, touch, modal en overflow.

Status Fase 6:
- [x] afgerond

---

## Fase 7 - CI/CD, release-pipeline en GitHub-documentatie

- GitHub Actions-workflow.
- Verse MySQL 8-database in CI.
- PHP 8.4 in CI.
- Node in CI.
- Playwright Chromium in CI.
- npm ci.
- Build in pipeline.
- Smoke-test in pipeline.
- Migraties in pipeline.
- Tijdelijke CI-wachtwoorden.
- Tijdelijke password hashes in CI-database.
- Playwright-regressie in pipeline.
- Dev -> Test -> Acc -> Prod-opzet.
- Stageconfiguratie.
- Lokale fallbackstack zolang echte stage-URL's ontbreken.
- Live Docs-publicatie.
- Allure/Living Docs-koppeling.
- Commitnotificatie geintegreerd in release-pipeline.
- Ken/Gio-notificaties technisch aanwezig maar functioneel geen prioriteit.
- Definitieve notificatieontvangers later bevestigen.
- Echte aparte Dev/Test/Acc-hosts later invullen.
- Branch protection op main.
- Verplichte groene statuschecks voor merge.
- Productieapproval instellen voor echte deploy.

Status Fase 7:
- [x] CI/CD-basis lokaal en in repository afgerond
- [~] fase als geheel gedeeltelijk: echte stage-hosting en productieapproval nog open

---

## Fase 8 - Uren concept opslaan en indienen

- server/api/timesheets.php.
- Uren als concept opslaan in echte database.
- Concept teruglezen.
- Uren indienen.
- Periode veilig bepalen/aanmaken.
- Medewerker schrijft alleen eigen uren.
- Administrator blijft binnen eigen organisatie.
- CSRF op writes.
- Sessie op GET en POST.
- employee_id-scope.
- Periodeformaat YYYY-MM.
- Kalenderdatumvalidatie.
- Dagregel moet binnen gekozen maand liggen.
- Daguren numeriek.
- Daguren tussen 0 en 24.
- Som dagregels moet overeenkomen met factureerbare uren.
- Audit-event timesheet.draft_saved.
- Audit-event timesheet.submitted.
- Database-transactie.
- Rollback bij fout.
- submitted urenstaat vergrendeld.
- approved urenstaat vergrendeld.
- invoiced urenstaat vergrendeld.
- TimesheetApi.ts.
- timesheet-write.spec.ts.
- timesheets.feature.
- timesheets.steps.ts.
- BDD-mapping.
- Allure-opname.
- Gecommit.
- Gepusht.

Status Fase 8:
- [x] afgerond

---

## Fase 9 - Correctieverzoek, opnieuw indienen en goedkeuren

Deze fase heette eerder Fase 8. Omdat de concept-/indienflow hierboven nu een eigen afgeronde fase is, staat de correctieflow hier apart.

### Backend en database

- Actie request_correction.
- Alleen administrator mag correctie aanvragen.
- Alleen overgang submitted -> correction.
- Correctietoelichting verplicht.
- Maximale lengte correctietoelichting.
- review_note vullen.
- Record in timesheet_corrections.
- Audit-event timesheet.correction_requested.
- Correctiestatus bewaren tijdens conceptopslaan.
- Medewerker kan correctie opnieuw indienen.
- Overgang correction -> submitted.
- Open correctierecord krijgt resubmitted_at.
- Audit-event timesheet.resubmitted.
- Actie approve.
- Alleen administrator mag goedkeuren.
- Alleen overgang submitted -> approved.
- approved_at.
- approved_by.
- Audit-event timesheet.approved.
- Correctiehistorie teruggeven.
- Dagregels teruggeven.
- Uren en notities teruggeven.
- Optimistic locking met expected_version.
- Stale version geeft 409 stale-version.
- Version wordt na succesvolle write verhoogd.
- Frontend bewaart de serverversie voor volgende write.
- Transacties en rollback.
- Employee mag geen adminreviewactie uitvoeren.
- Ongeldige statusovergangen geven 409.

### Tests en documentatie

- timesheet-review-flow.spec.ts.
- Employee maakt concept.
- Employee dient in.
- Admin vraagt correctie.
- Stale correctieverzoek wordt geweigerd.
- Tweede ongeldige correctieovergang wordt geweigerd.
- Employee kan zelf geen correctieverzoek uitvoeren.
- Employee dient opnieuw in.
- Admin keurt goed.
- Stale goedkeuring wordt geweigerd.
- Correctiehistorie wordt gecontroleerd.
- resubmitted_at wordt gecontroleerd.
- Living Doc bijgewerkt.
- BDD-mapping bijgewerkt.
- Gecommit.
- Gepusht.
- Browserflow testcase aanwezig: TS-REV-UI-001.

### Nog niet volledig bewezen

- [~] Frontend bewaart en verstuurt expected_version (blijft monitorpunt).
- [~] Definitieve pipelinebevestiging op deze machine nog niet aantoonbaar zonder gh auth login.

Status Fase 9:
- [x] backend/API/test/documentatie gecommit en gepusht
- [x] browser-UI-flow met Playwright bewezen
- [x] correctie/herindiening/goedkeuring ook op Pixel 7 Chromium en iPhone 13 WebKit bewezen
- [~] pipelinebevestiging nog open op deze machine

---

## Fase 10 - Klanturenstaten en uploads

### Technische basis

- Databasetabel customer_timesheets.
- Statusvelden in schema.
- Opslagvelden in schema.
- Upload-/reviewvelden in schema.
- Demo-UI en schermconcept bestaan.
- API endpoint customer-timesheets.php toegevoegd (GET/POST).
- Beveiligde download via server/api/customer-timesheets.php?action=download toegevoegd.
- Uploadvalidatie toegevoegd (PDF/JPG/PNG, max 2 MB, employee/company scope).
- Statusacties toegevoegd: save_draft, submit(received), approve, request_resubmit, mark_sent, mark_sent_to_broker, mark_skipped, restore_missing.
- Auditevents voor customer_timesheet acties toegevoegd.
- Playwright API tests toegevoegd: CTS-API-001 en CTS-API-002.

### Nog bouwen of productieharden

- JPG/PNG server-side omzetten naar PDF.
- Opslag buiten publiek toegankelijke webmap.
- Virusscanstrategie.

### Recent afgerond in deze fase

- End-to-end UI koppeling naar de backendflow is werkend in auth-mode.
- Statusacties mark_skipped en restore_missing zijn functioneel getest.
- Extra statuspad sent_to_broker is ondersteund in frontend/backendflow.
- MIME-type, bestandsgrootte, veilige bestandsnaam en unieke storage key worden server-side gevalideerd/opgebouwd.
- Employee- en administratorscope, status missing, auditlog en beveiligde download zijn aanwezig.
- Playwright regressie voor customer-timesheets is uitgebreid met happy en negative scenario's.
- Allure en live-doc bundel zijn opnieuw opgebouwd en visueel geverifieerd.
- Living Doc en BDD mapping zijn bijgewerkt met H/N-id conventie en actuele scenario-overzichten.

Status Fase 10:
- [x] schema, API basis, UI-koppeling en regressietests bestaan
- [x] Playwright, Allure en Living Doc dekken de customer-timesheet flow af
- [~] productieafbouw/hardening nog open (o.a. storage-hardening, virusscanstrategie, uploadconversie)

---

## Fase 11 - Facturen en server-side PDF

### Al aanwezig

- Facturentabel.
- Factuur-read-API.
- Factuuroverzicht in frontend.
- Periodefilter.
- Demo-factuurnummers.
- Demo-bedragen.
- Ontvangerkoppelingen in database.
- Client-side/demo-PDFfunctionaliteit bestaat.

### Nog bouwen

- Server-side factuur-PDF.
- Path/QSI-briefpapier.
- PDF veilig bewaren.
- pdf_storage_key.
- PDF alleen geautoriseerd downloaden.
- Credit-/correctiestrategie.
- PDF-inhoudscontrole.

### Recent afgerond in deze fase

- Invoice read-API berekent voor open facturen server-side subtotal, btw en totaal op basis van billable_hours en hourly_rate.
- Vergrendelde facturen blijven in read-output op opgeslagen bedragen zodat lock-gedrag behouden blijft.
- De write/lock-flow gebruikt goedgekeurde uren en opdrachtuurtarief, reserveert het factuurnummer transactioneel en vult locked_at.
- Een vergrendelde factuur is immutable; dubbele en gelijktijdige lockrequests hebben regressiedekking.
- Extra regressietests toegevoegd: INV-H-003 en INV-N-003 voor berekening en periodevalidatie.
- Invoice-lock API/Playwright-regressies INV-H-004 en INV-N-008 t/m INV-N-012 zijn aanwezig.
- Security tests geharmoniseerd naar Given/When/Then-stapstijl voor consistente rapportleesbaarheid.

Status Fase 11:
- [x] overzicht, server-side berekening en transactionele lock/write-flow met immutable bedragen bestaan
- [~] fase als geheel gedeeltelijk: definitieve server-side PDF, beveiligde PDF-opslag/download en correctiestrategie open

---

## Fase 12 - E-mailqueue van de webapp

Let op: dit staat los van GitHub commitnotificaties.

### Al aanwezig

- Tabel email_deliveries.
- Mailontvangers in database.
- Assignment mail routes.
- Brokerconcept.
- Boekhouderconcept.
- EasySalaryconcept.
- Demo-/previewteksten.
- Frontend bevat al delen van de mailworkflow.
- Queue-service en API voor lijst/enqueue/retry.
- Assignment-routes en kanaalspecifieke templates.
- Dry-runmodus is standaard en maakt geen echte verzending.
- Broker krijgt factuurbeleid; EasySalary-route heeft geen factuurbijlage.
- Veertien happy/negative Playwright API-tests.

### Nog bouwen

- Factuur-PDF als bijlage.
- Klanturenstaat als bijlage waar nodig.
- Retry na tijdelijke fout.
- Maximaal aantal retries.
- Foutstatus.
- Gmail/Google Workspace-config.
- SMTP of Gmail API-keuze.
- Echte verzending als allerlaatste activeren.

Status Fase 12:
- [x] dry-runqueue, routes, templates, frontendkoppeling en regressietests bestaan
- [~] fase als geheel gedeeltelijk: echte transportconfiguratie, bijlagen/retry-afbouw en verzending open

---

## Fase 13 - Definitieve bedrijfsgegevens en accounts

- Demo-instellingen voor Path/QSI aanwezig.
- Password-reset API en wachtwoord-vergeten frontend bestaan.
- Login rate-limiting en force_password_change flow bestaan.
- Gebruikersbeheer-API kan gebruikers lezen, deactiveren, heractiveren en wachtwoordwijziging afdwingen.
- Role- en companyscope, CSRF en audit-events zijn door regressietests afgedekt.
- Definitief kiezen:
  - QSI Consultancy B.V.
  - Path Consultancy B.V.
- Definitieve statutaire naam.
- Definitief factuuradres.
- KvK-nummer controleren.
- Btw-nummer controleren.
- IBAN controleren.
- Betalingstermijn.
- Definitieve factuurprefix.
- Definitieve Circle8-route.
- Circle8 factuuradres.
- Circle8 e-mailadres of portaal.
- Boekhoudernaam.
- Boekhoudere-mailadres.
- EasySalary-e-mailadres.
- Definitieve brokerontvangers.
- Definitieve mailteksten.
- Definitieve herinneringsmomenten.
- Productieaccount Gio.
- Productieaccount Joyce.
- Productieaccounts medewerkers.
- Eerste wachtwoorden veilig uitgeven.
- Gebruikers deactiveren/verwijderenbeleid.
- Google Workspace-koppeling.
- Eerste tijdelijke wachtwoord veilig uitgeven.
- Tweefactorauthenticatie voor beheerders beoordelen (sterk aanbevolen).
- Bepalen wie productiebeheerder is naast Gio.
- Privacy- en bewaartermijnen vastleggen voor uren, uploads, facturen en auditlogs.
- Vastleggen wie gegevens mag exporteren, corrigeren en archiveren.

Status Fase 13:
- [x] auth-hardening, resetflow en gebruikersbeheer technisch aanwezig en getest
- [~] fase als geheel gedeeltelijk: definitieve bedrijfsgegevens, productieaccounts, Google Workspace en beleid open

---

## Fase 14 - TransIP productieomgeving

Dit is de oorspronkelijke productielijst en blijft volledig onderdeel van de masterchecklist.

### Al afgerond volgens jouw TransIP-informatie

- Subsite uren.pathconsultancy.nl aangemaakt.
- Subsite ingeschakeld.
- MySQL-database pathco_Urenuru aangemaakt.
- Databasehost gevonden.
- Databasegebruiker aangemaakt.
- Demo-app gebouwd.
- Demo-app lokaal getest.
- Productieguards voor install.php, migrate.php en health.php.
- server/.htaccess hardening en veilige config.example.php defaults.
- Production-safety regressietests voor de guards.

### Nog door jou in TransIP controleren

- Productiedatabasewachtwoord wijzigen/roteren.
- Nieuw wachtwoord niet in chat plaatsen.
- Nieuw wachtwoord niet in Git zetten.
- PHP-versie op TransIP controleren.
- PHP op 8.4 zetten/bevestigen.
- Screenshot van PHP-instellingen bewaren.
- SSL-certificaat controleren.
- Geldig slotje op https://uren.pathconsultancy.nl.
- Exact documentroot/sitepad controleren.
- Controleren waar de subsitebestanden moeten staan.
- Controleren of TransIP-back-ups de database meenemen.
- Retentieperiode van TransIP-back-ups controleren.
- Handmatige database-export voor livegang.

### Productie-installatie nog uitvoeren

- Productiebestanden uploaden.
- Productie server/config.local.php handmatig maken.
- environment = production.
- allow_demo_migrations = false.
- app_origin = https://uren.pathconsultancy.nl.
- Productiedatabasehost invullen.
- Productiedatabasenaam invullen.
- Productiedatabasegebruiker invullen.
- Productiedatabasewachtwoord lokaal op server invullen.
- health.php op TransIP testen.
- install.php uitvoeren indien nodig.
- migrate.php uitvoeren.
- Controleren dat demo-seeds niet draaien.
- Productieaccounts aanmaken.
- Productielogin testen.
- Productie-smoketest.
- Schrijfrechten upload-/PDF-map.
- PHP uploadlimits controleren.
- PHP sessioninstellingen controleren.
- Cronmogelijkheden controleren voor e-mailqueue.
- Foutlogging buiten publieke output configureren.
- PHP `display_errors` uitzetten in productie; fouten alleen naar serverlogs.
- Logs buiten de publiek bereikbare webmap bewaren + logrotatie instellen.
- Demo-accounts en demo-seeds volledig uitschakelen in productie.
- Alle lokale/testwachtwoorden vóór livegang vervangen.
- Uploads en PDF's buiten de publieke webroot bewaren.
- Bestandsrechten zo beperkt mogelijk instellen.
- Cronjob of worker voor de e-mailqueue instellen.
- Maximale uploadgrootte en toegestane bestandstypen instellen.
- Databaseverbinding met zo weinig mogelijk rechten configureren.
- Back-upretentie en opslaglocatie controleren.

Status Fase 14:
- [x] subsite/databasebasis en applicatiehardening aanwezig
- [~] fase als geheel gedeeltelijk: TransIP-productieconfiguratie, deployment en operationele controles open

---

## Fase 15 - Acceptatie, mobiel, PWA en livegang

### Lokaal al bewezen

- Administrator kan lokaal inloggen.
- Medewerker kan lokaal inloggen.
- Rollen worden lokaal afgedwongen.
- Medewerker ziet lokaal alleen eigen data.
- Concepturen opslaan werkt.
- Indienen werkt.
- Correctieverzoek werkt op API-niveau.
- Herindienen werkt op API-niveau.
- Goedkeuren werkt op API-niveau.
- Auditlog voor urenflow.
- Optimistic locking op API-niveau.
- Playwright-testarchitectuur.
- Allure.
- Living Documentation.
- Smoke-tests.
- Grote controlescripts.
- Volledige correctie/herindiening/goedkeuring in desktopbrowser en mobiele emulatie.
- Pixel 7 Chromium- en iPhone 13 WebKit-projecten met responsive layout-, touch-, modal- en overflowcontroles.

### Nog voor livegang

- Volledige correctie- en goedkeuringsflow handmatig op productie testen.
- Productie-adminlogin.
- Productie-medewerkerlogin.
- Productieprivacytest.
- Productie concept opslaan.
- Productie indienen.
- Productie correctie.
- Productie herindienen.
- Productie goedkeuren.
- Klanturenstaat upload.
- Klanturenstaat download.
- Factuurbedragen controleren.
- Btw controleren.
- Factuurnummering controleren.
- PDF controleren.
- Broker-mail dry-run.
- Boekhouder-mail dry-run.
- EasySalary zonder factuur dry-run.
- Echte mailroute afzonderlijk testen.
- Back-up maken.
- Database herstellen uit back-up.
- Bestanden herstellen uit back-up.
- Mobiele admin- en medewerkerflow op fysieke toestellen.
- Fysieke iPhone-/Safari-test.
- Fysieke Android-/Chrome-test.
- Tablet-test.
- PWA-manifest.
- Service worker.
- PWA-installatie.
- Offline-/updategedrag bepalen.
- Monitoring.
- Health monitoring.
- Securitylogging.
- Logrotatie.
- Go-live runbook.
- Rollbackrunbook.
- Echte automatische e-mail als allerlaatste activeren.
- Volledig schone productie-installatie vanaf nul uitvoeren.
- Controleren dat er geen demo-gebruikers, demo-mails of toekomsttestperioden aanwezig zijn.
- Één volledige maandflow doorlopen: invoer → indienen → correctie → herindienen → goedkeuren → factuur definitief → mails dry-run.
- Dubbelklikken en dubbele requests testen.
- Gelijktijdig gebruik door twee beheerders testen.
- December → januari en jaarwisseling testen.
- Grote uploads en foutieve bestanden testen.
- Basiscontrole op toetsenbordbediening en leesbaarheid.
- Dependency/securityscan uitvoeren.
- Rollback naar vorige release daadwerkelijk oefenen.
- Release-tag aanmaken van de productieversie.
- Acceptatie laten bevestigen door Gio, Joyce en één medewerker.
- Pas daarna echte mail activeren.

Status Fase 15:
- [x] desktop- en mobiele emulatieregressie lokaal ingericht en bewezen
- [~] fase als geheel gedeeltelijk: fysieke toestellen, productieacceptatie, PWA en livegang open

---

## Fase 16 - Beheer na livegang

- Auditlog-API voor beheerders met entity/event filters en secret-redactie.
- Zes API-regressies voor toegang, filters en gevoelige data.
- Eerste week dagelijks errorlogs controleren.
- Mailqueue dagelijks controleren.
- Mislukte mails opnieuw aanbieden.
- Backupstatus controleren.
- Uptime/health controleren.
- Eerste echte maandflow volgen en narekenen.
- Eerste echte correctie/goedkeuring volgen.
- Eerste echte factuur controleren.
- Eerste echte broker-mail controleren.
- Eerste EasySalary-route controleren.
- Kleine productiebugs oplossen.
- Vastleggen wie verantwoordelijk is voor mislukte mails.
- Waarschuwing instellen als mailqueue blijft hangen.
- Waarschuwing instellen wanneer health.php faalt.
- Vastleggen hoe medewerkers productieproblemen melden.
- Incidentlog bijhouden.
- Maandelijkse dependency-updates plannen.
- Elk kwartaal een hersteltest van de back-up uitvoeren.
- Database- en opslaggroei controleren.
- Verlopen/inactieve accounts periodiek controleren.
- Auditlogs periodiek controleren.
- Daarna normaal beheerregime.

Status Fase 16:
- [x] technische audit-API-basis aanwezig en getest
- [~] fase als geheel gedeeltelijk: operationeel post-live beheer start pas na livegang

---

## Harde blokkades vóór livegang

Deze mogen **absoluut niet open** blijven wanneer echte medewerkers starten:

- [ ] Geen demo-accounts of demo-wachtwoorden in productie
- [ ] install.php en migrate.php beschermd of uitgeschakeld
- [ ] health.php lekt geen technische gegevens
- [ ] Productiewachtwoorden geroteerd
- [ ] Back-up én herstel succesvol getest
- [ ] Employee ziet uitsluitend eigen data
- [ ] Definitieve factuur is immutable
- [ ] E-mail blijft dry-run tot afzonderlijke goedkeuring
- [ ] Rollbackprocedure getest
- [ ] Volledige productieflow geaccepteerd

---

## Na eerste livegang (mag wachten)

- [ ] Volledige PWA/offlinefunctionaliteit
- [ ] Uitgebreid monitoringdashboard
- [ ] Geavanceerde performance-/loadtests
- [ ] Uitgebreide rapportage-export
- [ ] Automatische archivering
- [ ] Extra beheerdersdashboard voor auditlogs

---

## Samenvatting huidige stand

- [x] Fase 1 - lokale basis
- [~] Fase 2 - databaseschema/migraties klaar; volledige afbouw app_state/localStorage open
- [x] Fase 3 - read-API
- [x] Fase 4 - auth en rollen
- [x] Fase 5 - securitybasis
- [x] Fase 6 - Playwright, Allure, Living Doc en agents
- [~] Fase 7 - CI/CD-basis klaar; echte stages en productieapproval open
- [x] Fase 8 - uren concept opslaan en indienen
- [~] Fase 9 - correctie/goedkeuring desktop en mobiel bewezen; pipelinebevestiging open op deze machine
- [~] Fase 10 - klanturenstaat: schema + API + UI-koppeling + regressie afgerond; productiehardening open
- [~] Fase 11 - factuur lock/write en serverberekening bewezen; server-side PDF/opslag/download open
- [~] Fase 12 - e-mail: queue-service + dry-run + assignment-routes + tests afgerond; echte dispatch open
- [~] Fase 13 - bedrijfsdata: gebruikersbeheer-API, wachtwoord-reset, rate-limiting, force_password_change afgerond; definitieve bedrijfsgegevens + accounts open
- [~] Fase 14 - TransIP: hardening (install/migrate/health guards, .htaccess) afgerond; deployment + productie-config open
- [~] Fase 15 - lokaal 100 tests over desktop/Pixel/iPhone; fysieke toestellen en productieacceptatie open
- [~] Fase 16 - audit-API-basis klaar; operationeel post-live beheer nog niet gestart

Telling fasestatussen:
- [x] 6 fasen volledig bewezen voor hun afgebakende scope: 1, 3, 4, 5, 6 en 8.
- [~] 10 fasen gedeeltelijk: 2, 7 en 9 t/m 16.
- [ ] 0 fasen volledig ongestart; open werk staat onder de gedeeltelijke fasen.

## Directe volgende stap

1. GitHub pipeline-status van recente main-commits bevestigen (na gh auth login).
2. Fase 11 vervolg: server-side factuur-PDF met beveiligde opslag/download bouwen.
3. Fase 13/14: definitieve bedrijfsdata en TransIP-productieconfiguratie bevestigen.

## Dagelijkse werkwijze (verplicht)

1. Gebruik deze masterchecklist elke werkdag als enige technische voortgangslijst.
2. Werk de checklist direct bij na elke commit en push.
3. Vink af wat aantoonbaar klaar is en testbewijs heeft.
4. Voeg nieuwe taken of nieuwe cases meteen toe onder de juiste fase.
5. Markeer nieuwe problemen direct als [!] en zet ze na oplossing terug naar [x] of [~].

## Rapportage na elke stap

A. Wat voor de stap al af was
B. Wat in deze stap is afgerond
C. Wat gedeeltelijk klaar is
D. Wat nog openstaat
E. De volledige bijgewerkte masterchecklist
F. Lokaal getest / gecommit / gepusht / pipeline-status

## Bronnen

- PRODUCTIE-CHECKLIST.md
- LIVING-DOC.md
- TEST-BDD-MAPPING.md
- tests/playwright/*.spec.ts
