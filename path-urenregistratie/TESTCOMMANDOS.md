# Test- en ontwikkelcommando's

Praktisch overzicht voor Path Uren & Facturatie v0.9.41. Voer deze commando's uit vanuit de map `path-urenregistratie` in PowerShell.

## Meest gebruikt

```powershell
.\start-path-app.cmd
.\start-path-app.cmd mobile

npm run check
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:mobile
npm run test:e2e:mobile:headed

npm run allure:generate
npm run allure:open
```

- `.\start-path-app.cmd` start de lokale PHP-app op `http://localhost:8000`.
- `.\start-path-app.cmd mobile` start dezelfde app en opent een Edge- of Chrome-preview van 430 x 932 pixels.
- `npm run test:e2e` draait de volledige regressie via de projectrunner: 117 unieke cases en 121 uitvoeringen.
- `npm run test:e2e:ui` opent Playwright UI Mode om zelf tests te selecteren en uit te voeren.

Laat het terminalvenster van `start-path-app.cmd` open zolang de app of tests draaien.
Voer muterende volledige suites niet meerdere keren achter elkaar uit op dezelfde demo-database zonder de serverdata opnieuw te seeden. Factuur-, review- en mobiele flows wijzigen bewust persistente testdata.

## App, controle en build

| Commando | Doel |
| --- | --- |
| `.\start-path-app.cmd` | Lokale app normaal starten. |
| `.\start-path-app.cmd mobile` | Lokale app starten met smalle browserpreview. |
| `npm run dev` | Vite-ontwikkelserver starten. |
| `npm run check` | JavaScript-syntax en uitgebreide JSDOM-smokecheck draaien. |
| `npm run build` | Productiebestanden in `dist/` bouwen. |
| `.\check-after-big-change.ps1` | Uitgebreide controle na een grote wijziging. |
| `.\check-after-big-change.cmd` | Dezelfde grote controle via de CMD-wrapper. |

## Volledige en visuele Playwright-runs

| Commando | Doel |
| --- | --- |
| `npm run test:e2e` | Alle 121 ingestelde uitvoeringen draaien. |
| `npm run test:e2e:headed` | Volledige run met zichtbare browsers. |
| `npm run test:e2e:ui` | Playwright UI Mode openen. |
| `npm run test:e2e:ui-all:headed` | Desktop- en mobiele UI-groepen headed draaien. |
| `npm run test:e2e:mobile` | Vier mobiele cases op Pixel 7 en iPhone 13 draaien: acht uitvoeringen. |
| `npm run test:e2e:mobile:headed` | Mobiele tests met zichtbare browsers draaien. |
| `npm run test:e2e:mobile:ui` | Mobiele projecten in UI Mode openen. |

Er bestaan momenteel geen scripts met de namen `test:e2e:all` of `test:e2e:ui-all`. Gebruik respectievelijk `npm run test:e2e` en `npm run test:e2e:ui`.

## Groepen via de veilige projectrunner

Deze scripts laden `.env.local`, controleren de app en vereiste testwachtwoorden, schonen Allure-resultaten op en starten daarna Playwright.

| Commando | Selectie |
| --- | --- |
| `npm run test:e2e:group:auth` | Authenticatiecases. |
| `npm run test:e2e:group:security` | Security- en production-safetycases. |
| `npm run test:e2e:group:dashboard` | Dashboardcases. |
| `npm run test:e2e:group:invoices` | Factuurcases. |
| `npm run test:e2e:group:roles` | Rollen- en autorisatiecases. |
| `npm run test:e2e:group:timesheets` | Uren- en reviewcases. |
| `npm run test:e2e:group:customer` | Klanturenstaatcases. |
| `npm run test:e2e:group:api` | Belangrijkste API-cases. |
| `npm run test:e2e:group:ui` | Desktop UI-cases. |
| `npm run test:e2e:group:ui-desktop` | Desktop UI op Chromium. |
| `npm run test:e2e:group:ui-mobile` | Mobile UI op Pixel 7 en iPhone 13. |

Andere ondersteunde groepen worden zo gestart:

```powershell
$env:PLAYWRIGHT_GROUP = "happy"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_GROUP

$env:PLAYWRIGHT_GROUP = "negative"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_GROUP

$env:PLAYWRIGHT_GROUP = "api,security"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_GROUP
```

Ondersteunde waarden: `auth`, `security`, `dashboard`, `invoices`, `roles`, `timesheets`, `customer`, `customer-timesheets`, `api`, `ui`, `ui-desktop`, `ui-mobile`, `mobile`, `happy`, `negative`, `phase10` en `phase11`.

## Een project, bestand of case draaien

Gebruik bij voorkeur de projectrunner, zodat lokale configuratie en rapportage correct worden voorbereid:

```powershell
node scripts/run-playwright-e2e.mjs --project=desktop-chromium --grep "DASH-"
node scripts/run-playwright-e2e.mjs --project=desktop-chromium --grep "AUTH-"
node scripts/run-playwright-e2e.mjs --project=desktop-chromium --grep "SEC-"
node scripts/run-playwright-e2e.mjs --project=desktop-chromium --grep "DASH-H-001"
node scripts/run-playwright-e2e.mjs tests/playwright/dashboard.spec.ts --project=desktop-chromium
```

Playwright-projecten:

```powershell
node scripts/run-playwright-e2e.mjs --project=desktop-chromium
node scripts/run-playwright-e2e.mjs --project=mobile-chrome
node scripts/run-playwright-e2e.mjs --project=mobile-safari
```

De projectnamen staan voor Desktop Chrome, Pixel 7 met Chromium en iPhone 13 met WebKit.

## Directe Playwright-debugcommando's

Directe `npx playwright`-commando's laden `.env`, de gekozen stage en `.env.local` via `playwright.config.ts`. Ze omzeilen wel de controle of de app bereikbaar is en de voorbereiding van Allure. Zorg daarom vooraf dat de app draait. Gebruik voor normale regressies bij voorkeur de `npm run test:e2e:*`-commando's.

| Commando | Doel |
| --- | --- |
| `npx playwright test --ui` | UI Mode direct openen met de lokale testconfiguratie. |
| `npx playwright test --headed` | Tests met zichtbare browser draaien. |
| `npx playwright test --debug` | Playwright Inspector openen. |
| `npx playwright test --list` | Gevonden tests tonen zonder uitvoering. |
| `npx playwright test --last-failed` | Alleen tests van de vorige mislukte run herhalen. |
| `npx playwright test --workers=1` | Tests serieel draaien. Dit is al de projectstandaard. |
| `npx playwright test --retries=0` | Automatische retries uitschakelen. |
| `npx playwright show-report` | Laatste Playwright HTML-report openen. |
| `npx playwright show-trace <trace.zip>` | Een opgeslagen trace onderzoeken. |
| `npx playwright codegen http://localhost:8000` | Selectors en Playwright-code opnemen tijdens klikken. |
| `npx playwright install chromium webkit` | Benodigde browserengines installeren. |

De tags `@happy`, `@negative`, `@security`, `@mobile` en `@fase:15` staan in de Living Documentation, niet in de uitvoerbare testtitels. `--grep "@happy"` selecteert daarom in dit project niets. Gebruik `PLAYWRIGHT_GROUP=happy`, `PLAYWRIGHT_GROUP=negative` of een case-ID-filter.

## Rapporten en Living Documentation

| Commando | Doel |
| --- | --- |
| `npm run allure:generate` | Allure HTML-report uit `allure-results/` genereren. |
| `npm run allure:open` | Gegenereerd Allure-report lokaal openen. |
| `npm run allure:serve` | Allure-resultaten tijdelijk genereren en serveren. |
| `npm run docs:sync` | Specs, features, steps en mapping synchroniseren. |
| `npm run docs:bundle` | Interactieve Living Documentation-site bouwen. |
| `npm run docs:refresh` | Docs synchroniseren, volledige E2E-run draaien en beide reports/bundel vernieuwen. |

De uitvoerbare waarheid staat in `tests/playwright/*.spec.ts`. De `.feature`-bestanden zijn leesbare documentatie en `.steps.ts` bevat alleen de case-mapping; er draait geen Cucumber-runner.

## Stages

Deze scripts zijn gereserveerd voor afzonderlijk ingerichte stageomgevingen:

```powershell
npm run test:e2e:dev
npm run test:e2e:test
npm run test:e2e:acc
npm run test:e2e:prod
```

Gebruik ze alleen wanneer iedere stage een eigen URL, credentials en schone testdatabase heeft. De meegeleverde `environments/*.env`-bestanden zijn placeholders die allemaal naar `http://localhost:8000` wijzen. Vier stage-runs achter elkaar op die ene lokale database zijn daarom geen geldige regressiecontrole en laten latere runs falen op al gewijzigde dossiers. Gebruik lokaal `npm run test:e2e`.
