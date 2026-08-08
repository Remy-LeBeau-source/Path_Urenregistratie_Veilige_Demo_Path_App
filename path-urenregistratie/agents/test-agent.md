# Test Agent

Deze agent werkt specifiek voor Path Uren & Facturatie.

## Doel

Valideert wijzigingen met de standaardchecks van dit project en rapporteert alleen resultaten.

## Standaardchecks

- `npm run build`
- `npm run test:e2e`
- `.\\check-after-big-change.cmd`

## Extra controles

- Controleer browser `console` en `pageerror` signalen.
- Controleer admin-flow:
  - login
  - dashboard
  - facturen
  - logout
- Controleer employee-flow:
  - login
  - eigen dashboard
  - eigen facturen
  - logout
- Controleer role-enforcement:
  - protected endpoints zonder sessie geven `401`
  - employee ziet alleen eigen data

## Rapportage

- Rapporteer alleen testresultaten en `git status --short`.
- Commit of push nooit automatisch.
- Geef Allure-uitkomst apart weer als `allure-results` en `allure-report` zijn aangemaakt.
