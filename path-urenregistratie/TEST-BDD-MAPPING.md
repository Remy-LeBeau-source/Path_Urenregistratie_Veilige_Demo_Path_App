# TEST BDD Mapping

## Mapping van feature files naar stepdefinitions en native Playwright specs

## Case ID-conventie

- Ieder uitvoerbaar Playwright testgeval krijgt een unieke ID in de titel met duidelijke flowmarkering, bijvoorbeeld `[AUTH-H-001]`, `[INV-N-006]` of `[TS-REV-UI-H-009]`.
- `-H-` staat voor happy flow en `-N-` staat voor negative flow.
- Feature-scenario's dragen dezelfde ID in de scenarionaam, bijvoorbeeld `Scenario: [AUTH-H-001] ...`, zodat documentatie en testreport direct 1-op-1 te koppelen zijn.
- Nummering loopt per prefix oplopend bij nieuwe cases (bijv. `INV-H-004` na `INV-H-003` en `INV-N-008` na `INV-N-007`).
- Gebruik geen hergebruik of herschikking van bestaande IDs; verwijderde cases laten desnoods een gat achter om historische traceerbaarheid te behouden.

## Voorgestelde definitieve tagconventie

Deze compacte conventie is als referentie toegepast op `mobile.feature`. De overige featurefiles worden pas na review gemigreerd.

Feature-level, waar inhoudelijk eenduidig:

```gherkin
@regressie
@ui | @api | @security | @db | @integration
@desktop | @mobile
@fase:<nummer>
```

Scenario-level:

```gherkin
@happy | @negative
```

Regels:

- Precies één `@happy` of `@negative` per scenario.
- De case-ID staat in de scenarionaam en is exact gelijk aan de Playwright-titel en Allure `testCaseId`.
- Businessdomeinen staan in Feature- en scenarionamen en in Allure suite/feature/story, niet in extra Gherkin-tags.
- Alleen uitzonderingen zoals `@ignore` of `@contract` krijgen een aanvullende scenariotag wanneer filtering die echt vereist.
- Gemengde featurefiles worden bij rollout waar zinvol opgesplitst, zodat ieder bestand één eenduidige hoofdcategorie houdt.
- Fasen gebruiken in Gherkin `@fase:15`; de Allure-helper normaliseert dit naar `fase-15`.
- Er wordt geen Cucumber-runner toegevoegd; `.feature` en `.steps.ts` blijven Living Documentation.

Voorgestelde feature-level migratiematrix:

| Featurefile | Primaire tags | Scenario-aanvulling waar nodig |
|---|---|---|
| `auth.feature` | `@regressie @ui @desktop @fase:4` | `@happy` of `@negative` |
| `dashboard.feature` | `@regressie @ui @desktop @fase:15` | `@happy` of `@negative` |
| `customer-timesheets.feature` | `@regressie @api @fase:10` | `@happy` of `@negative` |
| `roles-api.feature` | `@regressie @security @fase:4` | `@happy` of `@negative` |
| `mobile.feature` | `@regressie @ui @mobile @fase:15` | `@happy` of `@negative` |
| `invoices.feature` | `@regressie @ui @desktop @fase:11` | Splits integratiecases later naar `invoice-lock.feature` |
| `timesheets.feature` | `@regressie @api @fase:8` | Splits review-integratie en review-UI later naar eigen features |

Voorgestelde Allure-mapping:

| Gherkin-tag | Allure |
|---|---|
| `@ui @desktop` | `parentSuite=UI Desktop`, `platform=desktop` |
| `@ui @mobile` | `parentSuite=UI Mobile`, `platform=mobile` |
| `@api` | `parentSuite=API`, `type=api` |
| `@security` | `parentSuite=Security`, `type=security` |
| `@integration` | `parentSuite=DB / Integratie`, `type=integration` |
| `@happy` / `@negative` | `subSuite=Happy` / `subSuite=Negative` |
| `@fase:15` | tag/label `fase-15` |
| `[MOB-H-001]` in scenarionaam | `testCaseId=MOB-H-001` |

- [tests/playwright/features/auth.feature](tests/playwright/features/auth.feature) → [tests/playwright/steps/auth.steps.ts](tests/playwright/steps/auth.steps.ts) → [tests/playwright/auth.spec.ts](tests/playwright/auth.spec.ts)
- [tests/playwright/features/dashboard.feature](tests/playwright/features/dashboard.feature) → [tests/playwright/steps/dashboard.steps.ts](tests/playwright/steps/dashboard.steps.ts) → [tests/playwright/dashboard.spec.ts](tests/playwright/dashboard.spec.ts)
- [tests/playwright/features/invoices.feature](tests/playwright/features/invoices.feature) → [tests/playwright/steps/invoices.steps.ts](tests/playwright/steps/invoices.steps.ts) → [tests/playwright/invoices.spec.ts](tests/playwright/invoices.spec.ts), [tests/playwright/invoice-lock.spec.ts](tests/playwright/invoice-lock.spec.ts)
- [tests/playwright/features/roles-api.feature](tests/playwright/features/roles-api.feature) → [tests/playwright/steps/roles-api.steps.ts](tests/playwright/steps/roles-api.steps.ts) → [tests/playwright/roles-api.spec.ts](tests/playwright/roles-api.spec.ts)
- [tests/playwright/features/timesheets.feature](tests/playwright/features/timesheets.feature) → [tests/playwright/steps/timesheets.steps.ts](tests/playwright/steps/timesheets.steps.ts) → [tests/playwright/timesheet-write.spec.ts](tests/playwright/timesheet-write.spec.ts), [tests/playwright/timesheet-review-flow.spec.ts](tests/playwright/timesheet-review-flow.spec.ts), [tests/playwright/timesheet-review-ui.spec.ts](tests/playwright/timesheet-review-ui.spec.ts)
- [tests/playwright/features/customer-timesheets.feature](tests/playwright/features/customer-timesheets.feature) → [tests/playwright/steps/customer-timesheets.steps.ts](tests/playwright/steps/customer-timesheets.steps.ts) → [tests/playwright/customer-timesheet-api.spec.ts](tests/playwright/customer-timesheet-api.spec.ts)
- [tests/playwright/features/mobile.feature](tests/playwright/features/mobile.feature) → [tests/playwright/steps/mobile.steps.ts](tests/playwright/steps/mobile.steps.ts) → [tests/playwright/mobile-ui.spec.ts](tests/playwright/mobile-ui.spec.ts)

## Status van de testlaag

Native Playwright specs zijn nu leidend. De feature files en step files zijn living documentation en mapping, zodat het testontwerp leesbaar blijft zonder een extra runner toe te voegen.

## Waarom er nog geen Cucumber-runner is

Een echte BDD-runner kan later bewust worden toegevoegd als die extra laag nodig blijkt. In deze stap houden we de uitvoerbare tests bewust bij native Playwright om complexiteit en onderhoudslast laag te houden.

## Geen Cypress

Dit project gebruikt geen Cypress. Er is geen `cypress/` map, geen Cypress-config en geen Cypress-runner onderdeel van deze setup.

