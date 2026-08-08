# TEST BDD Mapping

## Mapping van feature files naar stepdefinitions en native Playwright specs

- [tests/playwright/features/auth.feature](tests/playwright/features/auth.feature) → [tests/playwright/steps/auth.steps.ts](tests/playwright/steps/auth.steps.ts) → [tests/playwright/auth.spec.ts](tests/playwright/auth.spec.ts)
- [tests/playwright/features/dashboard.feature](tests/playwright/features/dashboard.feature) → [tests/playwright/steps/dashboard.steps.ts](tests/playwright/steps/dashboard.steps.ts) → [tests/playwright/dashboard.spec.ts](tests/playwright/dashboard.spec.ts)
- [tests/playwright/features/invoices.feature](tests/playwright/features/invoices.feature) → [tests/playwright/steps/invoices.steps.ts](tests/playwright/steps/invoices.steps.ts) → [tests/playwright/invoices.spec.ts](tests/playwright/invoices.spec.ts)
- [tests/playwright/features/roles-api.feature](tests/playwright/features/roles-api.feature) → [tests/playwright/steps/roles-api.steps.ts](tests/playwright/steps/roles-api.steps.ts) → [tests/playwright/roles-api.spec.ts](tests/playwright/roles-api.spec.ts)
- [tests/playwright/features/timesheets.feature](tests/playwright/features/timesheets.feature) → [tests/playwright/steps/timesheets.steps.ts](tests/playwright/steps/timesheets.steps.ts) → [tests/playwright/timesheet-write.spec.ts](tests/playwright/timesheet-write.spec.ts), [tests/playwright/timesheet-review-flow.spec.ts](tests/playwright/timesheet-review-flow.spec.ts), [tests/playwright/timesheet-review-ui.spec.ts](tests/playwright/timesheet-review-ui.spec.ts)

## Status van de testlaag

Native Playwright specs zijn nu leidend. De feature files en step files zijn living documentation en mapping, zodat het testontwerp leesbaar blijft zonder een extra runner toe te voegen.

## Waarom er nog geen Cucumber-runner is

Een echte BDD-runner kan later bewust worden toegevoegd als die extra laag nodig blijkt. In deze stap houden we de uitvoerbare tests bewust bij native Playwright om complexiteit en onderhoudslast laag te houden.

## Geen Cypress

Dit project gebruikt geen Cypress. Er is geen `cypress/` map, geen Cypress-config en geen Cypress-runner onderdeel van deze setup.
