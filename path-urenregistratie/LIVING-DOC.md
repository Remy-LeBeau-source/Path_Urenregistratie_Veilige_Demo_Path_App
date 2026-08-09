# Living Doc - Path Uren & Facturatie

Dit document is de functionele test-documentatie van de app.
De uitvoerbare waarheid blijft de native Playwright suite.

## Doel

- Leesbare beschrijving van gedrag per domein.
- Snelle trace van business scenario naar feature, step en spec.
- Eenduidige bron voor regressiegesprekken.

## Hoe je dit gebruikt

1. Lees scenario's in de feature files.
2. Volg de mapping naar step files en spec files.
3. Draai regressie met `npm run test:e2e`.
4. Bekijk UI met `npm run test:e2e:ui`.
5. Bekijk rapport met `npx playwright show-report`.

## Waar staat de living doc

- Hoofddocument: `LIVING-DOC.md`
- Mapping: `TEST-BDD-MAPPING.md`
- Scenario-bron: `tests/playwright/features/*.feature`

## Hoe test je de living doc

Gebruik deze volgorde:

1. `npm run test:e2e`
2. `npm run allure:generate`
3. `npm run docs:bundle`

Verwacht resultaat:

- `live-doc-site/index.html` bestaat
- `live-doc-site/playwright-report/index.html` bestaat
- `live-doc-site/allure-report/index.html` bestaat
- De auth-scenario's en testnamen zijn consistent tussen dit document en de testreports

## Live delen voor iedereen

De map `live-doc-site/` is bedoeld als publicatie-output.

Publiceer die map op een statische host (bijvoorbeeld GitHub Pages, Azure Static Web Apps, Netlify of interne webserver). Dan heeft iedereen:

- leesbare living documentatie
- Playwright-resultaten van de run
- Allure-resultaten van dezelfde run

Iedere nieuwe run kan dezelfde map opnieuw opbouwen en publiceren.

## Laatste regressiestatus

- Laatste volledige run: `npm run check` en `npm run test:e2e`
- Resultaat: 43/43 geslaagd
- Datum: 2026-08-09

## Scope en scenario-overzicht

### Auth

Feature: tests/playwright/features/auth.feature

Scenario's:
- [AUTH-H-001] Administrator logt succesvol in en ziet backoffice
- [AUTH-H-002] Medewerker logt succesvol in en ziet alleen eigen omgeving
- [AUTH-H-003] Ingelogde gebruiker kan veilig uitloggen
- [AUTH-N-004] Auth me endpoint meldt geen sessie na uitloggen
- [AUTH-H-005] Auth me bevestigt direct de actieve sessie na login
- [AUTH-N-006] Ongeldige inloggegevens maken geen actieve sessie

### Dashboard

Feature: tests/playwright/features/dashboard.feature

Scenario's:
- [DASH-H-001] Administrator ziet open werkvoorraad en beheeropties
- [DASH-H-002] Medewerker ziet alleen eigen dashboardinformatie
- [DASH-N-003] Dashboard gebruikt API-data met veilige fallback
- [DASH-N-004] Dashboard laadt zonder console of page errors
- [DASH-H-005] Dashboard toont consistente kernsamenvatting na login
- [DASH-N-006] Medewerker ziet geen administratoracties op dashboard

### Invoices

Feature: tests/playwright/features/invoices.feature

Scenario's:
- [INV-H-001] Administrator ziet facturen per gekozen periode
- [INV-H-002] Periodefilter wisselt correct tussen juli en augustus 2026
- [INV-H-003] Open facturen gebruiken server-side berekende bedragen
- [INV-H-004] Administrator lockt approved urenstaat naar definitieve immutable factuur
- [INV-H-013] Lock-actie registreert audit-event voor traceerbaarheid
- [INV-N-005] Medewerker ziet alleen eigen facturen en geen collega-data
- [INV-N-006] Facturenscherm laadt zonder console of page errors
- [INV-N-007] Ongeldige periodefilter wordt afgewezen met een duidelijke 400-validatiefout
- [INV-N-008] Anonieme gebruiker kan factuur niet locken
- [INV-N-009] Medewerker mag factuur niet finaliseren
- [INV-N-010] Niet-goedgekeurde urenstaat kan niet worden gelockt
- [INV-N-011] Tweede lock-oproep op dezelfde factuur wordt geblokkeerd
- [INV-N-012] Gelijktijdige lock-requests leveren exact een winnaar
- [INV-N-014] Lock-aanvraag met ongeldige timesheet_id wordt geweigerd

### Roles API

Feature: tests/playwright/features/roles-api.feature

Scenario's:
- [ROLE-H-001] Administrator heeft volledige read-only inzage
- [ROLE-H-002] Medewerker ziet alleen eigen afgebakende gegevens
- [ROLE-H-005] Administrator ziet mail recipient routes binnen de eigen organisatie
- [ROLE-N-003] Protected read-only endpoints blokkeren anonieme toegang
- [ROLE-N-004] Medewerker krijgt geen brede medewerkers- of mailingdata
- [ROLE-N-006] Employee ziet geen organisatiebrede mail recipient routes

### Timesheet write API

Feature: tests/playwright/features/timesheets.feature

Scenario's:
- [TS-API-H-001] Medewerker slaat concepturen op met versiebeheer
- [TS-API-H-002] Medewerker leest volledige conceptinhoud terug
- [TS-API-H-003] Medewerker dient eigen uren in met versieverhoging
- [TS-API-H-004] Indienen schrijft audit-event voor traceerbaarheid
- [TS-REV-API-H-005] Administrator vraagt correctie aan met optimistic locking
- [TS-REV-API-H-006] Medewerker dient na correctieverzoek opnieuw in
- [TS-REV-API-H-007] Administrator keurt heringediende uren goed met version check
- [TS-REV-UI-H-008] Administrator vraagt via de browser-UI een correctie aan
- [TS-REV-UI-H-009] Medewerker dient na UI-correctie opnieuw in en administrator keurt goed
- [TS-REV-API-H-013] Read-back toont resubmitted correctiehistorie
- [TS-API-N-010] Medewerker kan geen uren van een andere medewerker aanpassen
- [TS-API-N-011] Ingediende urenstaat kan niet opnieuw als concept worden opgeslagen
- [TS-REV-API-N-012] Verouderde expected_version wordt geblokkeerd
- [TS-API-N-014] Write-call zonder actieve sessie wordt geweigerd

### Customer timesheet API

Feature: tests/playwright/features/customer-timesheets.feature

Scenario's:
- [CTS-API-H-001] Medewerker uploadt klanturenstaat als concept
- [CTS-API-H-002] Medewerker dient klanturenstaat in en leest terug
- [CTS-API-H-003] Administrator keurt goed en vraagt daarna resubmit
- [CTS-API-H-004] Medewerker markeert als rechtstreeks gemaild en herstelt daarna naar missing
- [CTS-API-H-008] Ingediende klanturenstaat blijft downloadbaar
- [CTS-API-N-005] Ongeldig bestandstype wordt geblokkeerd
- [CTS-API-N-006] Medewerker kan geen andere employee scope forceren
- [CTS-API-N-007] Medewerker kan geen admin-reviewacties uitvoeren
- [CTS-API-N-009] Download zonder actieve sessie wordt geweigerd

## Technische mapping

Zie de volledige mapping in:
- TEST-BDD-MAPPING.md

## Richtlijnen voor bijwerken

Bij iedere functionele wijziging:

1. Update eerst de native Playwright spec.
2. Werk daarna de bijbehorende feature scenario's bij.
3. Werk vervolgens TEST-BDD-MAPPING.md bij als paden veranderen.
4. Houd case-IDs per domein/prefix oplopend (`...-001`, `...-002`, `...-003`, ...) en hergebruik bestaande IDs niet.
5. Draai minimaal:
   - npm run test:e2e
   - npm run check

## Wat dit expliciet niet is

- Geen Cucumber-runner output.
- Geen tweede test-engine.
- Geen vervanging van de Playwright testresultaten.

Deze living doc is een leeslaag bovenop native Playwright.

