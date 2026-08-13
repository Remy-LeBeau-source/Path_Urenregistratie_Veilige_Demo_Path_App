# Living Doc - Path Uren & Facturatie

De native Playwright specs zijn de uitvoerbare waarheid. Deze Living Documentation maakt dezelfde 166 Playwright-cases leesbaar en voegt 1 directe DB/SQL-case(s) toe zonder een tweede testrunner te introduceren.

## Actuele regressiestatus

- Playwright executable cases: 166 unieke case-ID's
- SQL/DB executable cases: 1 unieke case-ID('s)
- Totaal executable cases: 167 unieke case-ID's
- Playwright features: 21
- Database features: 1
- Playwright steps mappings: 21
- Database steps mappings: 1
- Uitvoeringen: 170
- Niet-mobile projectuitvoeringen: 162
- Mobile functionele cases: 4
- Pixel 7 / Chromium-uitvoeringen: 4
- iPhone 13 / WebKit-uitvoeringen: 4

De 4 Mobile-cases worden op twee devices uitgevoerd. Daarom leveren 166 Playwright-functionele cases in totaal 170 resultaten op: 162 + (4 x 2) = 170.

## Documentatieketen

1. `.feature`: businessleesbaar gedrag en compacte KRPI-tags.
2. `.steps.ts`: expliciete case-ID naar spec-mapping; geen uitvoerbare Cucumber-code.
3. `.spec.ts`: uitvoerbare Playwright-test.
4. SQL/DB smoke: `database/queries/crud-smoke.sql` en `scripts/run-db-crud-smoke.mjs` voor directe infrastructuurvalidatie.
5. Allure: functionele Suites en Behaviors, met project/device als metadata.

## Dekking

### Toegankelijkheid en toetsenbordbediening

- Feature: `tests/playwright/features/accessibility.feature`
- Source: `tests/playwright/accessibility.spec.ts`
- Cases: 2

- [A11Y-H-001] loginformulier is volledig met het toetsenbord bruikbaar en correct gelabeld — Techniek: Toegankelijkheidsinspectie + toetsenbord-use-case · Assertions: 6
- [A11Y-H-002] admin-dashboard hoofdnavigatie is toetsenbordbereikbaar met herkenbare namen — Techniek: Toegankelijkheidsinspectie + toetsenbord-use-case · Assertions: 4

### Beheer- en instellingenwijzigingen via API

- Feature: `tests/playwright/features/admin-writes.feature`
- Source: `tests/playwright/admin-writes.spec.ts`
- Cases: 3

- [ADM-WR-H-001] admin kan company/settings server-led opslaan — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 6
- [ADM-WR-H-002] admin kan beheerder server-led aanmaken en wijzigen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 10
- [ADM-WR-H-003] admin kan medewerker server-led aanmaken en bootstrap ziet deze terug — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 9

### Auditlog en traceerbaarheid

- Feature: `tests/playwright/features/audit-log.feature`
- Source: `tests/playwright/audit-log.spec.ts`
- Cases: 10

- [AUD-H-001] admin kan auditlog ophalen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [AUD-H-002] auditlog filtert op entity_type — Techniek: Equivalentieklassen · Assertions: 3
- [AUD-H-003] auditlog filtert op event_type — Techniek: Equivalentieklassen · Assertions: 3
- [AUD-H-004] auditlog bevat geen wachtwoorden of tokens in event_data — Techniek: API-contract + equivalentieklasse · Assertions: 1
- [AUD-N-005] anonieme gebruiker krijgt 401 op auditlog — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [AUD-N-006] medewerker mag auditlog niet lezen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [AUD-H-007] auditlog combineert entity- en eventfilter — Techniek: Equivalentieklassen · Assertions: 4
- [AUD-H-008] auditlog begrenst een nullimiet op een record — Techniek: Grenswaardenanalyse · Assertions: 2
- [AUD-H-009] auditlog begrenst een hoge limiet op tweehonderd records — Techniek: Grenswaardenanalyse · Assertions: 2
- [AUD-N-010] auditlog weigert POST — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2

### Inloggen, uitloggen en sessiebeheer

- Feature: `tests/playwright/features/auth.feature`
- Source: `tests/playwright/auth.spec.ts`
- Cases: 8

- [AUTH-H-001] Admin logt in en auth/me geeft de juiste gebruiker terug — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [AUTH-H-002] Medewerker logt in en auth/me geeft de juiste gebruiker terug — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [AUTH-H-003] Gebruiker logt uit en auth/me geeft authenticated false terug — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 4
- [AUTH-H-004] Lokale beheeraccount wordt automatisch ingevuld en opent na een klik — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 3
- [AUTH-N-005] onbekend account geeft dezelfde generieke loginfout — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [AUTH-N-006] ongeldig e-mailformaat wordt als invalid-payload geweigerd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [AUTH-N-007] vijf mislukte logins tonen een servergestuurde aftelling — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [AUTH-N-008] de inlogblokkade en aftelling blijven zichtbaar na herladen — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6

### Klanturenstaten en documentverwerking

- Feature: `tests/playwright/features/customer-timesheets.feature`
- Source: `tests/playwright/customer-timesheet-api.spec.ts`
- Cases: 7

- [CTS-API-H-001] employee uploadt klanturenstaat, dient in en downloadt; admin kan goedkeuren en resubmit vragen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 28
- [CTS-API-N-006] employee kan geen klanturenstaat voor andere medewerker wijzigen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [CTS-API-N-007] employee kan geen admin reviewactie uitvoeren op klanturenstaat — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 12
- [CTS-API-H-004] employee kan mark_skipped registreren en restore_missing terugdraaien — Techniek: Toestandsovergang · Assertions: 9
- [CTS-API-N-005] employee krijgt 400 bij ongeldig bestandstype — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [CTS-API-H-005] JPG-upload wordt server-side automatisch als PDF opgeslagen — Techniek: Equivalentieklassen · Assertions: 9
- [CTS-API-N-008] employee krijgt 400 bij een te grote klanturenstaat-upload — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4

### Dashboard en open werkvoorraad

- Feature: `tests/playwright/features/dashboard.feature`
- Source: `tests/playwright/dashboard.spec.ts`
- Cases: 17

- [DASH-H-001] admin dashboard opent zonder console errors — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [DASH-H-002] employee dashboard opent zonder console errors — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 1
- [DASH-N-007] afwijkend API-totaal overschrijft de concrete werkvoorraad niet — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 1
- [DASH-N-008] voorbeeldgegevens herstellen houdt alle werkvoorraadtellers gelijk — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6
- [DASH-N-010] herstel blijft na F5 leidend boven een oude serverstatus — Techniek: Toestandsovergang · Assertions: 14
- [DASH-H-008] GUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 24
- [DASH-N-009] medewerker teller blijft stabiel bij aug-juli-aug en dashboard triggert geen verborgen timesheet-read — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 5
- [DASH-H-012] GUI-smoke scheidt werkacties van medewerkers- en beheerdersaccounts — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 30
- [DASH-H-013] dashboardmodules tonen compacte documenten, procesfasen en teamacties — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 11
- [DASH-H-003] medewerkerdashboard ververst meteen na ureninvoer en themakiezer blijft leesbaar — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 6
- [DASH-H-004] terugkeren naar medewerkerdashboard ververst de uren en behoudt maandlabels bij themawissel — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [DASH-H-005] medewerker ziet open maanden compact en kan direct naar de juiste maand springen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [DASH-H-014] medewerker krijgt de eerstvolgende concrete actie met juiste maand en taakroute — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 20
- [DASH-N-015] medewerkerprioriteit kiest correctie boven document en toont niets als alles klaar is — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 14
- [DASH-N-016] correctieactie ververst een verborgen rooster uit een eerdere maand — Techniek: Toestandsovergang · Assertions: 11
- [DASH-H-006] vooruit bladeren maakt geen lege toekomstmaand zichtbaar als medewerkeractie — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [DASH-H-007] dashboardknop behoudt de geldige maand en medewerkeroverzichten — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4

### E-mailqueue, ontvangers en afleverbeleid

- Feature: `tests/playwright/features/email-queue.feature`
- Source: `tests/playwright/email-queue.spec.ts`
- Cases: 14

- [EQ-H-001] factuurlock maakt queue-items aan met dry_run=true — Techniek: Toestandsovergang · Assertions: 5
- [EQ-H-002] broker-channel bundelt factuur en klanturenstaat — Techniek: API-contract + equivalentieklasse · Assertions: 2
- [EQ-H-003] EasySalary-channel heeft attachment_policy none — Techniek: Equivalentieklassen · Assertions: 2
- [EQ-H-004] action=enqueue voor gelockte factuur maakt nieuwe items aan — Techniek: Toestandsovergang · Assertions: 6
- [EQ-H-005] action=list response bevat verplichte velden — Techniek: API-contract + equivalentieklasse · Assertions: 14
- [EQ-N-006] anonieme gebruiker krijgt 401 op list — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 2
- [EQ-N-007] medewerker krijgt 403 op list — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [EQ-N-008] action=enqueue zonder invoice_id geeft 400 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [EQ-N-009] action=enqueue niet-bestaande factuur geeft 404 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [EQ-N-010] action=enqueue niet-gelockte factuur geeft 409 — Techniek: Toestandsovergang · Assertions: 2
- [EQ-N-011] action=retry op queued item geeft 409 — Techniek: Toestandsovergang · Assertions: 3
- [EQ-N-012] ongeldige status-filter geeft 400 — Techniek: Toestandsovergang · Assertions: 2
- [EQ-N-013] anonieme enqueue geeft 401 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [EQ-N-014] unknown action geeft 400 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2

### Facturen definitief maken en vergrendelen

- Feature: `tests/playwright/features/invoice-locking.feature`
- Source: `tests/playwright/invoice-lock.spec.ts`
- Cases: 8

- [INV-H-004] admin lockt approved timesheet naar definitieve immutable factuur — Techniek: Concurrency + toestandsovergang · Assertions: 20
- [INV-N-015] definitief gefactureerde uren kunnen niet voor correctie worden heropend — Techniek: Toestandsovergang · Assertions: 9
- [INV-N-008] anonieme gebruiker kan factuur niet locken — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [INV-N-009] medewerker mag factuur niet finaliseren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [INV-N-010] niet-goedgekeurde urenstaat kan niet worden gelockt — Techniek: Toestandsovergang · Assertions: 3
- [INV-N-011] tweede lock-oproep op dezelfde factuur wordt geblokkeerd — Techniek: Concurrency + toestandsovergang · Assertions: 5
- [INV-N-012] gelijktijdige lock-requests leveren exact één winnaar — Techniek: Concurrency + toestandsovergang · Assertions: 1
- [INV-N-013] anonieme gebruiker kan factuur-PDF niet downloaden — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 2

### Facturerende onderneming en handelsnaam

- Feature: `tests/playwright/features/invoice-company-identity.feature`
- Source: `tests/playwright/invoice-company-identity.spec.ts`
- Cases: 5

- [INV-ID-H-001] handelsnaam en juridische naam staan samen op de factuurpreview — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [INV-ID-H-002] alleen juridische naam is als factuurweergave te kiezen — Techniek: Equivalentieklassen · Assertions: 3
- [INV-ID-H-003] factuuridentiteit wordt door settings API opgeslagen en via bootstrap herladen — Techniek: API-contract + equivalentieklasse · Assertions: 2
- [INV-ID-N-004] settings API weigert een onbekende factuurweergave — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [INV-ID-H-005] instellingen tonen verkoopklare bedrijfsidentiteit en beveiligde verzendmodus — Techniek: API-contract + equivalentieklasse · Assertions: 8

### Facturen in de desktop-UI

- Feature: `tests/playwright/features/invoices-ui.feature`
- Source: `tests/playwright/invoices.spec.ts`
- Cases: 7

- [INV-H-001] admin facturen zichtbaar en console errors 0 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [INV-N-005] employee facturen zichtbaar maar beperkt en console errors 0 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [INV-H-002] periodefilter juli en augustus werkt — Techniek: Equivalentieklassen · Assertions: 4
- [INV-H-003] server berekent bedrag uit uren en uurtarief voor open facturen — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 7
- [INV-H-006] admin kan het gekozen maanddetail inklappen en weer uitklappen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 11
- [INV-H-007] factuurnavigatie onderscheidt geblokkeerde en controleklare maanden met oranje en groen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 10
- [INV-N-007] ongeldige periodefilter geeft nette 400-fout — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4

### Mobiele gebruikerservaring

- Feature: `tests/playwright/features/mobile.feature`
- Source: `tests/playwright/mobile-ui.spec.ts`
- Cases: 4

- [MOB-H-001] mobiele login navigatie en dashboard blijven volledig bereikbaar — Techniek: Responsive viewport + end-to-end use-case · Assertions: 22
- [MOB-H-002] mobiele medewerker kan concepturen opslaan indienen en documentupload bereiken — Techniek: Responsive viewport + end-to-end use-case · Assertions: 14
- [MOB-H-003] mobiele correctie herindiening en administratieve goedkeuring zijn bereikbaar — Techniek: Responsive viewport + end-to-end use-case · Assertions: 13
- [MOB-N-004] mobiele facturen touch targets en modals blijven binnen viewport — Techniek: Responsive viewport + end-to-end use-case · Assertions: 13

### Meldingen en notificaties

- Feature: `tests/playwright/features/notifications.feature`
- Source: `tests/playwright/notifications.spec.ts`
- Cases: 8

- [NOT-H-001] ingelogde gebruiker kan notificaties ophalen — Techniek: API-contract + equivalentieklasse · Assertions: 5
- [NOT-H-002] mark_all_read werkt zonder fouten — Techniek: Toestandsovergang · Assertions: 4
- [NOT-N-003] anonieme gebruiker krijgt 401 op notificaties — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [NOT-N-004] unknown action geeft 400 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [NOT-H-005] notificatielimiet wordt op minimaal een begrensd — Techniek: Grenswaardenanalyse · Assertions: 3
- [NOT-H-006] unread-filter retourneert uitsluitend ongelezen meldingen — Techniek: Toestandsovergang · Assertions: 3
- [NOT-N-007] mark_read zonder notification_id geeft 400 — Techniek: Toestandsovergang · Assertions: 2
- [NOT-H-008] mark_read voor onbekende melding wijzigt nul records — Techniek: Grenswaardenanalyse · Assertions: 2

### Wachtwoordherstel en misbruikbeveiliging

- Feature: `tests/playwright/features/password-reset.feature`
- Source: `tests/playwright/password-reset.spec.ts`
- Cases: 13

- [PWD-H-001] request-reset retourneert token in demo-modus — Techniek: Toestandsovergang · Assertions: 12
- [PWD-H-002] onbekend e-mailadres retourneert ook ok=true (geen email-enumeration) — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [PWD-H-003] me.php bevat force_password_change veld — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [PWD-H-004] ingelogde gebruiker kan het eigen wachtwoord veilig wijzigen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [PWD-H-005] medewerker stelt via een eenmalige e-maillink zelf een wachtwoord in — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8
- [PWD-N-010] twee verschillende wachtwoorden worden in de GUI niet verstuurd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [PWD-N-011] elf tekens ligt onder de wachtwoordgrens van twaalf — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [PWD-N-004] reset-password met ongeldig token geeft 400 — Techniek: Toestandsovergang · Assertions: 2
- [PWD-N-005] reset-password onder twaalf tekens geeft 400 — Techniek: Toestandsovergang · Assertions: 2
- [PWD-N-006] hergebruik van al-gebruikt token geeft 409 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [PWD-N-007] login wordt geblokkeerd na 5 mislukte pogingen (rate-limit) — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [PWD-N-008] request-reset weigert GET — Techniek: Toestandsovergang · Assertions: 2
- [PWD-N-009] request-reset met leeg e-mailadres geeft 400 — Techniek: Toestandsovergang · Assertions: 2

### Maanden openen en sluiten

- Feature: `tests/playwright/features/period-management.feature`
- Source: `tests/playwright/period-management.spec.ts`
- Cases: 10

- [PER-H-001] admin kan periodes ophalen met overzicht — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 6
- [PER-H-002] admin kan periode sluiten en heropenen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 9
- [PER-N-003] anonieme gebruiker krijgt 401 op periods — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [PER-N-004] medewerker mag geen periodes beheren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [PER-N-005] dubbel sluiten van periode geeft 409 — Techniek: Toestandsovergang · Assertions: 2
- [PER-N-006] heropenen van open periode geeft 409 — Techniek: Toestandsovergang · Assertions: 2
- [PER-N-007] driecijferig jaar geeft 400 — Techniek: Grenswaardenanalyse · Assertions: 2
- [PER-N-008] vijfcijferig jaar geeft 400 — Techniek: Grenswaardenanalyse · Assertions: 2
- [PER-N-009] ongeldige maand geeft 400 — Techniek: Grenswaardenanalyse · Assertions: 2
- [PER-N-010] onbekende periodeactie geeft 400 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2

### Veilige productieconfiguratie en deployment

- Feature: `tests/playwright/features/production-safety.feature`
- Source: `tests/playwright/production-safety.spec.ts`
- Cases: 13

- [SAFE-H-001] login picker vult alleen lokaal demo-wachtwoord in wanneer hints beschikbaar zijn — Techniek: API-contract + equivalentieklasse · Assertions: 9
- [SAFE-N-001] frontend source bevat geen plaintext demo-credentials — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [SAFE-N-002] writes zonder csrf blijven geblokkeerd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [SAFE-H-002] timesheet writeflow blijft werkend (draft + submit) — Techniek: API-contract + equivalentieklasse · Assertions: 8
- [SAFE-N-003] productieconfig zet demo-migraties standaard uit — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 9
- [SAFE-H-003] health.php bevat productieguard die technische details onderdrukt — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [SAFE-N-004] install.php en migrate.php bevatten productieguards — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6
- [SAFE-H-004] config.example.php bevat mail.enabled=false als standaard — Techniek: API-contract + equivalentieklasse · Assertions: 5
- [SAFE-N-005] live login verbergt lokale accountkeuze en valt gesloten uit zonder authservice — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 11
- [SAFE-N-006] destructieve DB-testsetup weigert productie en niet-testdatabases — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 15
- [SAFE-N-007] productieconfigurator verwerkt DB-secret uitsluitend interactief en fail-closed — Techniek: Toestandsovergang · Assertions: 14
- [SAFE-H-005] SMTP-dispatch en operationele scripts blijven fail-closed — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 23
- [SAFE-H-006] eerste productieorganisatie wordt gevalideerd en zonder overschrijven ingericht — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 18

### Rollen, rechten en gegevensafscherming

- Feature: `tests/playwright/features/roles-api.feature`
- Source: `tests/playwright/roles-api.spec.ts`
- Cases: 3

- [ROLE-N-003] zonder sessie geeft protected API 401 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 2
- [ROLE-H-001] admin ziet volledige data — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [ROLE-H-002] employee ziet alleen eigen data — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8

### Authenticatie- en API-beveiliging

- Feature: `tests/playwright/features/security.feature`
- Source: `tests/playwright/security.spec.ts`
- Cases: 14

- [SEC-H-001] csrf token endpoint werkt — Techniek: API-contract + equivalentieklasse · Assertions: 4
- [SEC-H-002] login met csrf werkt — Techniek: API-contract + equivalentieklasse · Assertions: 2
- [SEC-H-003] logout met csrf werkt — Techniek: API-contract + equivalentieklasse · Assertions: 1
- [SEC-N-001] login zonder csrf faalt netjes — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [SEC-N-002] logout zonder csrf faalt netjes — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [SEC-N-003] invalid login payload geeft nette error — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [SEC-N-004] zonder sessie protected API blijft 401 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [SEC-H-004] csrf-token blijft stabiel binnen dezelfde sessie — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [SEC-N-005] csrf-endpoint weigert POST — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [SEC-N-006] login-endpoint weigert GET — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [SEC-N-007] logout-endpoint weigert GET — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [SEC-H-005] sessiecode bevat expliciete timeout-check en sliding expiration — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [SEC-H-006] herhaalde mislukte loginpogingen maken security-audit event — Techniek: API-contract + equivalentieklasse · Assertions: 4
- [SEC-H-007] config voorbeeld bevat voorbereide CSP/CORS/HSTS flags — Techniek: API-contract + equivalentieklasse · Assertions: 3

### Correcties en goedkeuringen via API

- Feature: `tests/playwright/features/timesheets-review-integration.feature`
- Source: `tests/playwright/timesheet-review-flow.spec.ts`
- Cases: 3

- [TS-REV-API-H-005] admin vraagt correctie, employee dient opnieuw in, admin keurt goed met optimistic locking — Techniek: Concurrency + toestandsovergang · Assertions: 65
- [TS-REV-API-H-006] gelijktijdige approve-requests door twee beheerders leveren exact één winnaar — Techniek: Concurrency + toestandsovergang · Assertions: 7
- [TS-REV-API-H-007] jaarwisseling december naar januari verwerkt urenstaten correct over de jaargrens — Techniek: API-contract + equivalentieklasse · Assertions: 7

### Correcties en goedkeuringen in de desktop-UI

- Feature: `tests/playwright/features/timesheets-review-ui.feature`
- Source: `tests/playwright/timesheet-review-ui.spec.ts`
- Cases: 5

- [TS-REV-UI-H-008] browserflow: correctie, herindiening, goedkeuring en heropening blijven servergestuurd — Techniek: Toestandsovergang · Assertions: 27
- [TS-REV-UI-H-009] medewerker kan een ingediende urenstaat opnieuw indienen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [TS-REV-UI-H-010] submitknop is verborgen bij goedgekeurde urenstaat — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 3
- [TS-REV-UI-N-011] localhost kan demo-uren zonder serverversie voor correctie terugsturen — Techniek: Toestandsovergang · Assertions: 4
- [TS-REV-UI-N-012] gefactureerde goedkeuring blijft bij serverweigering vergrendeld — Techniek: Toestandsovergang · Assertions: 6

### Urenregistratie via API

- Feature: `tests/playwright/features/timesheets-api.feature`
- Source: `tests/playwright/timesheet-write.spec.ts`
- Cases: 5

- [TS-API-H-001] employee save draft, read back, submit, bewerkt en dient opnieuw in — Techniek: API-contract + equivalentieklasse · Assertions: 31
- [TS-API-N-010] employee mag geen andere medewerker schrijven — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [TS-API-N-011] write zonder csrf geeft 403 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [TS-API-N-003] write zonder sessie geeft 401 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [TS-API-N-004] ongeldige payload geeft 400 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4

### Gebruikers en medewerkers beheren

- Feature: `tests/playwright/features/user-management.feature`
- Source: `tests/playwright/user-management.spec.ts`
- Cases: 7

- [USR-H-001] admin ziet alle gebruikers van het bedrijf — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [USR-H-002] admin kan medewerker deactiveren en heractiveren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [USR-H-003] admin kan force_password_change instellen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [USR-N-004] anonieme gebruiker krijgt 401 op user-list — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [USR-N-005] medewerker mag geen gebruikersbeheer uitvoeren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [USR-N-006] admin kan zichzelf niet deactiveren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 2
- [USR-N-007] dubbel deactiveren geeft 409 — Techniek: Toestandsovergang · Assertions: 2

### Database-integriteit en CRUD-controle

- Feature: `tests/playwright/features/database-integrity.feature`
- Source: `database/queries/crud-smoke.sql + scripts/run-db-crud-smoke.mjs`
- Cases: 1

- [DB-H-001] CRUD smoke test werkt in een geïsoleerde tijdelijke tabel — Techniek: API-contract + equivalentieklasse · Assertions: 3

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
