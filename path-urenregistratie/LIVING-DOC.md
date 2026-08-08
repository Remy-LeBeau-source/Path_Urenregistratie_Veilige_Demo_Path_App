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

## Scope en scenario-overzicht

### Auth

Feature: tests/playwright/features/auth.feature

Scenario's:
- Admin kan inloggen op Path Uren & Facturatie
- Medewerker kan inloggen op Path Uren & Facturatie
- Gebruiker kan uitloggen
- Auth me endpoint geeft geen actieve sessie terug na logout

### Dashboard

Feature: tests/playwright/features/dashboard.feature

Scenario's:
- Admin ziet open werkvoorraad
- Medewerker ziet eigen dashboard
- Dashboard gebruikt API-data met fallback
- Dashboard laadt zonder console errors

### Invoices

Feature: tests/playwright/features/invoices.feature

Scenario's:
- Admin ziet facturen per periode
- Medewerker ziet alleen eigen facturen
- Periodefilter juli en augustus werkt
- Facturen laden zonder console errors

### Roles API

Feature: tests/playwright/features/roles-api.feature

Scenario's:
- Zonder sessie geeft protected read-only API 401
- Admin ziet bootstrap dashboard invoices
- Employee ziet alleen eigen user employee assignment invoices
- Employee ziet geen volledige medewerkerlijst

### Timesheet write API

Feature: tests/playwright/features/timesheets.feature

Scenario's:
- Medewerker slaat uren als concept op
- Medewerker leest opgeslagen concepturen terug
- Medewerker dient eigen uren in
- Medewerker kan geen uren van een ander wijzigen
- Indienen schrijft een audit-event
- Afgesloten urenstaat kan niet opnieuw worden gewijzigd
- Administrator vraagt correctie met optimistic locking
- Medewerker dient na correctie opnieuw in
- Administrator keurt ingediende uren goed
- Stale expected_version geeft conflict
- Administrator vraagt via de browser-UI een correctie aan
- Medewerker dient na UI-correctie opnieuw in en administrator keurt goed

### Customer timesheet API

Feature: tests/playwright/features/customer-timesheets.feature

Scenario's:
- Medewerker uploadt klanturenstaat als concept
- Medewerker dient klanturenstaat in en leest terug
- Administrator keurt goed en vraagt daarna resubmit
- Ongeldig bestandstype wordt geblokkeerd
- Medewerker kan geen andere employee scope forceren

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
