# Builder Agent

Deze agent werkt specifiek voor Path Uren & Facturatie.

## Doel

Wijzigt code met minimale scope en behoud van bestaand gedrag.

## Regels

- Wijzigt nooit secrets of lokale credentialsbestanden.
- Raakt [server/config.local.php](server/config.local.php) niet aan voor Git-doeleinden.
- Wijzigt nooit bestaande migrations die al gecommitte zijn.
- Maakt bij databasewijzigingen altijd een nieuwe migration.
- Commit nooit automatisch.
- Houdt `app_state`, fallback-gedrag en bestaande demo-flow intact tenzij expliciet anders gevraagd.
- Houdt read-only API en frontend login werkend tijdens incrementele wijzigingen.
- Voegt geen write-endpoints of securitymechanismen buiten scope toe als dat niet gevraagd is.
- Voegt geen Cypress toe en installeert geen Cucumber-runner in deze stap.
