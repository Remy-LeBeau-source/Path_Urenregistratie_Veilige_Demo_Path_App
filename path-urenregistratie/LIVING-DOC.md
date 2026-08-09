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
- Resultaat: 37/37 geslaagd
- Datum: 2026-08-09

## Scope en scenario-overzicht

### Auth

Feature: tests/playwright/features/auth.feature

Scenario's:
- [AUTH-H-001] Administrator logt succesvol in en ziet backoffice
- [AUTH-H-002] Medewerker logt succesvol in en ziet alleen eigen omgeving
- [AUTH-H-003] Ingelogde gebruiker kan veilig uitloggen
- [AUTH-N-001] Auth me endpoint meldt geen sessie na uitloggen

### Dashboard

Feature: tests/playwright/features/dashboard.feature

Scenario's:
- [DASH-H-001] Administrator ziet open werkvoorraad en beheeropties
- [DASH-H-002] Medewerker ziet alleen eigen dashboardinformatie
- [DASH-N-001] Dashboard gebruikt API-data met veilige fallback
- [DASH-N-002] Dashboard laadt zonder console of page errors

### Invoices

Feature: tests/playwright/features/invoices.feature

Scenario's:
- [INV-H-001] Administrator ziet facturen per gekozen periode
- [INV-H-002] Periodefilter wisselt correct tussen juli en augustus 2026
- [INV-H-003] Open facturen gebruiken server-side berekende bedragen
- [INV-N-001] Medewerker ziet alleen eigen facturen en geen collega-data
- [INV-N-002] Facturenscherm laadt zonder console of page errors
- [INV-N-003] Ongeldige periodefilter wordt afgewezen met een duidelijke 400-validatiefout

### Roles API

Feature: tests/playwright/features/roles-api.feature

Scenario's:
- [ROLE-H-001] Administrator heeft volledige read-only inzage
- [ROLE-H-002] Medewerker ziet alleen eigen afgebakende gegevens
- [ROLE-N-001] Protected read-only endpoints blokkeren anonieme toegang
- [ROLE-N-002] Medewerker krijgt geen brede medewerkers- of mailingdata

### Timesheet write API

Feature: tests/playwright/features/timesheets.feature

Scenario's:
- [TS-API-H-001] Medewerker slaat concepturen op met versiebeheer
- [TS-API-H-002] Medewerker leest volledige conceptinhoud terug
- [TS-API-H-003] Medewerker dient eigen uren in met versieverhoging
- [TS-API-H-004] Indienen schrijft audit-event voor traceerbaarheid
- [TS-REV-API-H-001] Administrator vraagt correctie aan met optimistic locking
- [TS-REV-API-H-002] Medewerker dient na correctieverzoek opnieuw in
- [TS-REV-API-H-003] Administrator keurt heringediende uren goed met version check
- [TS-REV-UI-H-001] Administrator vraagt via de browser-UI een correctie aan
- [TS-REV-UI-H-002] Medewerker dient na UI-correctie opnieuw in en administrator keurt goed
- [TS-API-N-001] Medewerker kan geen uren van een andere medewerker aanpassen
- [TS-API-N-002] Ingediende urenstaat kan niet opnieuw als concept worden opgeslagen
- [TS-REV-API-N-001] Verouderde expected_version wordt geblokkeerd

### Customer timesheet API

Feature: tests/playwright/features/customer-timesheets.feature

Scenario's:
- [CTS-API-H-001] Medewerker uploadt klanturenstaat als concept
- [CTS-API-H-002] Medewerker dient klanturenstaat in en leest terug
- [CTS-API-H-003] Administrator keurt goed en vraagt daarna resubmit
- [CTS-API-H-004] Medewerker markeert als rechtstreeks gemaild en herstelt daarna naar missing
- [CTS-API-N-001] Ongeldig bestandstype wordt geblokkeerd
- [CTS-API-N-002] Medewerker kan geen andere employee scope forceren
- [CTS-API-N-003] Medewerker kan geen admin-reviewacties uitvoeren

## Technische mapping

Zie de volledige mapping in:
- TEST-BDD-MAPPING.md

## Richtlijnen voor bijwerken

Bij iedere functionele wijziging:

1. Update eerst de native Playwright spec.
2. Werk daarna de bijbehorende feature scenario's bij.
3. Werk vervolgens TEST-BDD-MAPPING.md bij als paden veranderen.
4. Draai minimaal:
   - npm run test:e2e
   - npm run check

## Wat dit expliciet niet is

- Geen Cucumber-runner output.
- Geen tweede test-engine.
- Geen vervanging van de Playwright testresultaten.

Deze living doc is een leeslaag bovenop native Playwright.
