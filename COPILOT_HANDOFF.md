# Copilot ↔ Codex overdracht

Dit bestand is de gedeelde brug tussen GitHub Copilot en Codex. Chatvensters zijn niet onderling zichtbaar, maar beide assistenten kunnen dit bestand in de werkmap lezen.

## Instructie voor GitHub Copilot

Werk dit document na iedere betekenisvolle stap bij met:

- datum en tijd;
- huidige taak;
- diagnose en bewijs;
- gewijzigde bestanden;
- uitgevoerde tests en resultaten;
- voorgestelde volgende stap;
- eventuele vraag aan Codex.

Verwijder eerdere relevante bevindingen niet. Noteer geen wachtwoorden, tokens of andere geheimen.

## Actuele overdracht

### 2026-08-12 12:46 · Codex

- Taak: MOB-H-003-flakiness in Mobile Safari diagnosticeren en herstellen.
- Hoofdoorzaak: `LoginPage.open()` registreerde `waitForResponse()` pas na `page.goto()`. De auth-response was dan al voorbij, waardoor iedere run stil 20 seconden van de globale timeout verloor.
- Aanvullende race: `LoginPage.logout()` keerde terug vóór de asynchrone `logoutLocal()` het loginscherm zichtbaar maakte.
- Fix: post-`goto` responsewait verwijderd; logout wacht op loginpagina en submitknop; mobiele logoutmock wist de mocksession; onnodige `networkidle`-wacht voor approve verwijderd; AUTH-H-003 bevat nu een vertraagde logoutregressie.
- Verificatie: MOB-H-003 Mobile Safari 10/10; Mobile Chrome 3/3; auth 6/6; volledige mobiele suite 8/8; `npm run check` geslaagd.
- GitHub CLI is lokaal niet aangemeld, dus de remote Actions-check is niet opnieuw uitgelezen.
