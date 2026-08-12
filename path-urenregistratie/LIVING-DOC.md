# Living Doc - Path Uren & Facturatie

De native Playwright specs zijn de uitvoerbare waarheid. Deze Living Documentation maakt dezelfde 152 Playwright-cases leesbaar en voegt 1 directe DB/SQL-case(s) toe zonder een tweede testrunner te introduceren.

## Actuele regressiestatus

- Playwright executable cases: 152 unieke case-ID's
- SQL/DB executable cases: 1 unieke case-ID('s)
- Totaal executable cases: 153 unieke case-ID's
- Playwright features: 21
- Database features: 1
- Playwright steps mappings: 21
- Database steps mappings: 1
- Uitvoeringen: 156
- Niet-mobile projectuitvoeringen: 148
- Mobile functionele cases: 4
- Pixel 7 / Chromium-uitvoeringen: 4
- iPhone 13 / WebKit-uitvoeringen: 4

De 4 Mobile-cases worden op twee devices uitgevoerd. Daarom leveren 152 Playwright-functionele cases in totaal 156 resultaten op: 148 + (4 x 2) = 156.

## Documentatieketen

1. `.feature`: businessleesbaar gedrag en compacte KRPI-tags.
2. `.steps.ts`: expliciete case-ID naar spec-mapping; geen uitvoerbare Cucumber-code.
3. `.spec.ts`: uitvoerbare Playwright-test.
4. SQL/DB smoke: `database/queries/crud-smoke.sql` en `scripts/run-db-crud-smoke.mjs` voor directe infrastructuurvalidatie.
5. Allure: functionele Suites en Behaviors, met project/device als metadata.

## Dekking

### Basistoegankelijkheid en toetsenbordbediening

- Feature: `tests/playwright/features/accessibility.feature`
- Source: `tests/playwright/accessibility.spec.ts`
- Cases: 2

- [A11Y-H-001] loginformulier is volledig met het toetsenbord bruikbaar en correct gelabeld
- [A11Y-H-002] admin-dashboard hoofdnavigatie is toetsenbordbereikbaar met herkenbare namen

### Server-led beheer- en instellingenwrites

- Feature: `tests/playwright/features/admin-writes.feature`
- Source: `tests/playwright/admin-writes.spec.ts`
- Cases: 3

- [ADM-WR-H-001] admin kan company/settings server-led opslaan
- [ADM-WR-H-002] admin kan beheerder server-led aanmaken en wijzigen
- [ADM-WR-H-003] admin kan medewerker server-led aanmaken en bootstrap ziet deze terug

### Auditlog en traceerbaarheid

- Feature: `tests/playwright/features/audit-log.feature`
- Source: `tests/playwright/audit-log.spec.ts`
- Cases: 10

- [AUD-H-001] admin kan auditlog ophalen
- [AUD-H-002] auditlog filtert op entity_type
- [AUD-H-003] auditlog filtert op event_type
- [AUD-H-004] auditlog bevat geen wachtwoorden of tokens in event_data
- [AUD-N-005] anonieme gebruiker krijgt 401 op auditlog
- [AUD-N-006] medewerker mag auditlog niet lezen
- [AUD-H-007] auditlog combineert entity- en eventfilter
- [AUD-H-008] auditlog begrenst een nullimiet op een record
- [AUD-H-009] auditlog begrenst een hoge limiet op tweehonderd records
- [AUD-N-010] auditlog weigert POST

### Authenticatie en sessiebeheer

- Feature: `tests/playwright/features/auth.feature`
- Source: `tests/playwright/auth.spec.ts`
- Cases: 6

- [AUTH-H-001] Admin logt in en auth/me geeft de juiste gebruiker terug
- [AUTH-H-002] Medewerker logt in en auth/me geeft de juiste gebruiker terug
- [AUTH-H-003] Gebruiker logt uit en auth/me geeft authenticated false terug
- [AUTH-H-004] Lokale beheeraccount wordt automatisch ingevuld en opent na een klik
- [AUTH-N-005] onbekend account geeft dezelfde generieke loginfout
- [AUTH-N-006] ongeldig e-mailformaat wordt als invalid-payload geweigerd

### Klanturenstaten via API

- Feature: `tests/playwright/features/customer-timesheets.feature`
- Source: `tests/playwright/customer-timesheet-api.spec.ts`
- Cases: 7

- [CTS-API-H-001] employee uploadt klanturenstaat, dient in en downloadt; admin kan goedkeuren en resubmit vragen
- [CTS-API-N-006] employee kan geen klanturenstaat voor andere medewerker wijzigen
- [CTS-API-N-007] employee kan geen admin reviewactie uitvoeren op klanturenstaat
- [CTS-API-H-004] employee kan mark_skipped registreren en restore_missing terugdraaien
- [CTS-API-N-005] employee krijgt 400 bij ongeldig bestandstype
- [CTS-API-H-005] JPG-upload wordt server-side automatisch als PDF opgeslagen
- [CTS-API-N-008] employee krijgt 400 bij een te grote klanturenstaat-upload

### Dashboardweergave

- Feature: `tests/playwright/features/dashboard.feature`
- Source: `tests/playwright/dashboard.spec.ts`
- Cases: 14

- [DASH-H-001] admin dashboard opent zonder console errors
- [DASH-H-002] employee dashboard opent zonder console errors
- [DASH-N-007] afwijkend API-totaal overschrijft de concrete werkvoorraad niet
- [DASH-N-008] voorbeeldgegevens herstellen houdt alle werkvoorraadtellers gelijk
- [DASH-N-010] herstel blijft na F5 leidend boven een oude serverstatus
- [DASH-H-008] GUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice
- [DASH-N-009] medewerker teller blijft stabiel bij aug-juli-aug en dashboard triggert geen verborgen timesheet-read
- [DASH-H-012] GUI-smoke scheidt werkacties van medewerkers- en beheerdersaccounts
- [DASH-H-013] dashboardmodules tonen compacte documenten, procesfasen en teamacties
- [DASH-H-003] medewerkerdashboard ververst meteen na ureninvoer en themakiezer blijft leesbaar
- [DASH-H-004] terugkeren naar medewerkerdashboard ververst de uren en behoudt maandlabels bij themawissel
- [DASH-H-005] medewerker ziet open maanden compact en kan direct naar de juiste maand springen
- [DASH-H-006] vooruit bladeren maakt geen lege toekomstmaand zichtbaar als medewerkeractie
- [DASH-H-007] dashboardknop behoudt de geldige maand en medewerkeroverzichten

### E-mailqueue en afleverbeleid

- Feature: `tests/playwright/features/email-queue.feature`
- Source: `tests/playwright/email-queue.spec.ts`
- Cases: 14

- [EQ-H-001] factuurlock maakt queue-items aan met dry_run=true
- [EQ-H-002] broker-channel bundelt factuur en klanturenstaat
- [EQ-H-003] EasySalary-channel heeft attachment_policy none
- [EQ-H-004] action=enqueue voor gelockte factuur maakt nieuwe items aan
- [EQ-H-005] action=list response bevat verplichte velden
- [EQ-N-006] anonieme gebruiker krijgt 401 op list
- [EQ-N-007] medewerker krijgt 403 op list
- [EQ-N-008] action=enqueue zonder invoice_id geeft 400
- [EQ-N-009] action=enqueue niet-bestaande factuur geeft 404
- [EQ-N-010] action=enqueue niet-gelockte factuur geeft 409
- [EQ-N-011] action=retry op queued item geeft 409
- [EQ-N-012] ongeldige status-filter geeft 400
- [EQ-N-013] anonieme enqueue geeft 401
- [EQ-N-014] unknown action geeft 400

### Definitieve facturen en locking

- Feature: `tests/playwright/features/invoice-locking.feature`
- Source: `tests/playwright/invoice-lock.spec.ts`
- Cases: 7

- [INV-H-004] admin lockt approved timesheet naar definitieve immutable factuur
- [INV-N-008] anonieme gebruiker kan factuur niet locken
- [INV-N-009] medewerker mag factuur niet finaliseren
- [INV-N-010] niet-goedgekeurde urenstaat kan niet worden gelockt
- [INV-N-011] tweede lock-oproep op dezelfde factuur wordt geblokkeerd
- [INV-N-012] gelijktijdige lock-requests leveren exact één winnaar
- [INV-N-013] anonieme gebruiker kan factuur-PDF niet downloaden

### Facturerende ondernemingsidentiteit

- Feature: `tests/playwright/features/invoice-company-identity.feature`
- Source: `tests/playwright/invoice-company-identity.spec.ts`
- Cases: 5

- [INV-ID-H-001] handelsnaam en juridische naam staan samen op de factuurpreview
- [INV-ID-H-002] alleen juridische naam is als factuurweergave te kiezen
- [INV-ID-H-003] factuuridentiteit wordt door settings API opgeslagen en via bootstrap herladen
- [INV-ID-N-004] settings API weigert een onbekende factuurweergave
- [INV-ID-H-005] instellingen tonen verkoopklare bedrijfsidentiteit en beveiligde verzendmodus

### Factuurweergave in de desktop-UI

- Feature: `tests/playwright/features/invoices-ui.feature`
- Source: `tests/playwright/invoices.spec.ts`
- Cases: 7

- [INV-H-001] admin facturen zichtbaar en console errors 0
- [INV-N-005] employee facturen zichtbaar maar beperkt en console errors 0
- [INV-H-002] periodefilter juli en augustus werkt
- [INV-H-003] server berekent bedrag uit uren en uurtarief voor open facturen
- [INV-H-006] admin kan het gekozen maanddetail inklappen en weer uitklappen
- [INV-H-007] factuurnavigatie onderscheidt geblokkeerde en controleklare maanden met oranje en groen
- [INV-N-007] ongeldige periodefilter geeft nette 400-fout

### Mobiele gebruikerservaring

- Feature: `tests/playwright/features/mobile.feature`
- Source: `tests/playwright/mobile-ui.spec.ts`
- Cases: 4

- [MOB-H-001] mobiele login navigatie en dashboard blijven volledig bereikbaar
- [MOB-H-002] mobiele medewerker kan concepturen opslaan indienen en documentupload bereiken
- [MOB-H-003] mobiele correctie herindiening en administratieve goedkeuring zijn bereikbaar
- [MOB-N-004] mobiele facturen touch targets en modals blijven binnen viewport

### Notificaties via API

- Feature: `tests/playwright/features/notifications.feature`
- Source: `tests/playwright/notifications.spec.ts`
- Cases: 8

- [NOT-H-001] ingelogde gebruiker kan notificaties ophalen
- [NOT-H-002] mark_all_read werkt zonder fouten
- [NOT-N-003] anonieme gebruiker krijgt 401 op notificaties
- [NOT-N-004] unknown action geeft 400
- [NOT-H-005] notificatielimiet wordt op minimaal een begrensd
- [NOT-H-006] unread-filter retourneert uitsluitend ongelezen meldingen
- [NOT-N-007] mark_read zonder notification_id geeft 400
- [NOT-H-008] mark_read voor onbekende melding wijzigt nul records

### Wachtwoordherstel en rate limiting

- Feature: `tests/playwright/features/password-reset.feature`
- Source: `tests/playwright/password-reset.spec.ts`
- Cases: 10

- [PWD-H-001] request-reset retourneert token in demo-modus
- [PWD-H-002] onbekend e-mailadres retourneert ook ok=true (geen email-enumeration)
- [PWD-H-003] me.php bevat force_password_change veld
- [PWD-H-004] ingelogde gebruiker kan het eigen wachtwoord veilig wijzigen
- [PWD-N-004] reset-password met ongeldig token geeft 400
- [PWD-N-005] reset-password met te kort wachtwoord geeft 400
- [PWD-N-006] hergebruik van al-gebruikt token geeft 409
- [PWD-N-007] login wordt geblokkeerd na 5 mislukte pogingen (rate-limit)
- [PWD-N-008] request-reset weigert GET
- [PWD-N-009] request-reset met leeg e-mailadres geeft 400

### Periodebeheer via API

- Feature: `tests/playwright/features/period-management.feature`
- Source: `tests/playwright/period-management.spec.ts`
- Cases: 10

- [PER-H-001] admin kan periodes ophalen met overzicht
- [PER-H-002] admin kan periode sluiten en heropenen
- [PER-N-003] anonieme gebruiker krijgt 401 op periods
- [PER-N-004] medewerker mag geen periodes beheren
- [PER-N-005] dubbel sluiten van periode geeft 409
- [PER-N-006] heropenen van open periode geeft 409
- [PER-N-007] driecijferig jaar geeft 400
- [PER-N-008] vijfcijferig jaar geeft 400
- [PER-N-009] ongeldige maand geeft 400
- [PER-N-010] onbekende periodeactie geeft 400

### Productieveiligheid

- Feature: `tests/playwright/features/production-safety.feature`
- Source: `tests/playwright/production-safety.spec.ts`
- Cases: 9

- [SAFE-H-001] login picker vult alleen lokaal demo-wachtwoord in wanneer hints beschikbaar zijn
- [SAFE-N-001] frontend source bevat geen plaintext demo-credentials
- [SAFE-N-002] writes zonder csrf blijven geblokkeerd
- [SAFE-H-002] timesheet writeflow blijft werkend (draft + submit)
- [SAFE-N-003] productieconfig zet demo-migraties standaard uit
- [SAFE-H-003] health.php bevat productieguard die technische details onderdrukt
- [SAFE-N-004] install.php en migrate.php bevatten productieguards
- [SAFE-H-004] config.example.php bevat mail.enabled=false als standaard
- [SAFE-H-005] SMTP-dispatch en operationele scripts blijven fail-closed

### Rollen en gegevensscope

- Feature: `tests/playwright/features/roles-api.feature`
- Source: `tests/playwright/roles-api.spec.ts`
- Cases: 3

- [ROLE-N-003] zonder sessie geeft protected API 401
- [ROLE-H-001] admin ziet volledige data
- [ROLE-H-002] employee ziet alleen eigen data

### CSRF en authenticatiebeveiliging

- Feature: `tests/playwright/features/security.feature`
- Source: `tests/playwright/security.spec.ts`
- Cases: 14

- [SEC-H-001] csrf token endpoint werkt
- [SEC-H-002] login met csrf werkt
- [SEC-H-003] logout met csrf werkt
- [SEC-N-001] login zonder csrf faalt netjes
- [SEC-N-002] logout zonder csrf faalt netjes
- [SEC-N-003] invalid login payload geeft nette error
- [SEC-N-004] zonder sessie protected API blijft 401
- [SEC-H-004] csrf-token blijft stabiel binnen dezelfde sessie
- [SEC-N-005] csrf-endpoint weigert POST
- [SEC-N-006] login-endpoint weigert GET
- [SEC-N-007] logout-endpoint weigert GET
- [SEC-H-005] sessiecode bevat expliciete timeout-check en sliding expiration
- [SEC-H-006] herhaalde mislukte loginpogingen maken security-audit event
- [SEC-H-007] config voorbeeld bevat voorbereide CSP/CORS/HSTS flags

### Correctie en goedkeuring met optimistic locking

- Feature: `tests/playwright/features/timesheets-review-integration.feature`
- Source: `tests/playwright/timesheet-review-flow.spec.ts`
- Cases: 3

- [TS-REV-API-H-005] admin vraagt correctie, employee dient opnieuw in, admin keurt goed met optimistic locking
- [TS-REV-API-H-006] gelijktijdige approve-requests door twee beheerders leveren exact één winnaar
- [TS-REV-API-H-007] jaarwisseling december naar januari verwerkt urenstaten correct over de jaargrens

### Correctie en goedkeuring in de desktop-UI

- Feature: `tests/playwright/features/timesheets-review-ui.feature`
- Source: `tests/playwright/timesheet-review-ui.spec.ts`
- Cases: 4

- [TS-REV-UI-H-008] browserflow: admin vraagt correctie, medewerker dient opnieuw in, admin keurt goed
- [TS-REV-UI-H-009] medewerker kan een ingediende urenstaat opnieuw indienen
- [TS-REV-UI-H-010] submitknop is verborgen bij goedgekeurde urenstaat
- [TS-REV-UI-N-011] localhost kan demo-uren zonder serverversie voor correctie terugsturen

### Urenregistratie via API

- Feature: `tests/playwright/features/timesheets-api.feature`
- Source: `tests/playwright/timesheet-write.spec.ts`
- Cases: 5

- [TS-API-H-001] employee save draft, read back, submit, bewerkt en dient opnieuw in
- [TS-API-N-010] employee mag geen andere medewerker schrijven
- [TS-API-N-011] write zonder csrf geeft 403
- [TS-API-N-003] write zonder sessie geeft 401
- [TS-API-N-004] ongeldige payload geeft 400

### Gebruikersbeheer via API

- Feature: `tests/playwright/features/user-management.feature`
- Source: `tests/playwright/user-management.spec.ts`
- Cases: 7

- [USR-H-001] admin ziet alle gebruikers van het bedrijf
- [USR-H-002] admin kan medewerker deactiveren en heractiveren
- [USR-H-003] admin kan force_password_change instellen
- [USR-N-004] anonieme gebruiker krijgt 401 op user-list
- [USR-N-005] medewerker mag geen gebruikersbeheer uitvoeren
- [USR-N-006] admin kan zichzelf niet deactiveren
- [USR-N-007] dubbel deactiveren geeft 409

### Database-integriteit en CRUD-smoke

- Feature: `tests/playwright/features/database-integrity.feature`
- Source: `database/queries/crud-smoke.sql + scripts/run-db-crud-smoke.mjs`
- Cases: 1

- [DB-H-001] CRUD smoke test werkt in een geïsoleerde tijdelijke tabel

## Rapportage

- Suites: UI Desktop, UI Mobile, API, Security, DB / SQL en DB / Integratie.
- Epic: Path Uren & Facturatie.
- SubSuite: Happy of Negative.
- API request/response-attachments worden centraal geredigeerd.
- UI-screenshots zijn selectief; trace, video en failure-screenshot volgen de Playwright failure-policy.

## Bijwerken

1. Wijzig of voeg eerst de native Playwright-case met unieke ID toe.
2. Voeg voor directe SQL/DB-validatie een case toe via de database-definitie in de sync-script.
3. Draai `node scripts/sync-living-docs.mjs`.
4. Controleer de feature/steps/spec/Allure mapping.
5. Draai `npm run test:e2e`, `npm run allure:generate` en `npm run check`.
