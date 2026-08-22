# Handoff voor Claude Code

Bijgewerkt: 22 augustus 2026, Europe/Amsterdam.

## Startstatus

- Werkmap: `C:\Users\gchli\Documents\path site\Path_Urenregistratie_Veilige_Demo_Path_App`
- Applicatie: `path-urenregistratie`
- Lokale branch: `main`
- Applicatie-release-SHA vóór deze documentatiecommit: `543044d1a3682c750a3b63f11945f2bd9381e748`
- Actuele release in pipeline: `v0.9.101`
- Laatste PR: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/pull/27
- Actieve main-releasepipeline: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/32544919862
- Laatste PR-CI: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/32544839548

PR #26 is gemerged en de PR-CI is groen. Releasepipeline `32541800789` is volledig afgerond met
conclusie `success` voor exact main-SHA `c703ee310455deec409a94a4245d35b761b1e497`. `Validate`,
`Promote Test`, `Deploy Test to TransIP`, `Publish Live Docs`, `Promote Prod` en
`Deploy Prod to TransIP` zijn allemaal groen. Versie `0.9.100` staat daardoor op TEST en PROD.
De TEST-migratie, publieke live-smoke, beide publieke TEST-logins, PROD-cutover en read-only
PROD-live-smoke zijn geslaagd. Onafhankelijke publieke controles geven op beide omgevingen HTTP 200
en versie `0.9.100`; PROD-health retourneert bewust alleen het afgeschermde `{"ok":true}`.
PR #27 is daarna gemerged op main-SHA `543044d1a3682c750a3b63f11945f2bd9381e748`; de bijbehorende
PR-CI is groen en versie `0.9.101` is gestart in releasepipeline `32544919862`. Op het moment van deze
handoff is `Validate` groen en draait `Promote Test`. Deze pipeline vervangt de eerder live gezette
`0.9.100` pas nadat de volgende gates en daadwerkelijke deployments slagen.

Dit handoffbestand wordt met `[skip ci]` als documentatie-only commit toegevoegd, zodat die push geen
extra releasepipeline naast `32544919862` start.

## Wat is opgelost

### PR #27 / versie 0.9.101

- Wachtwoordherstel en uitnodigingen worden nu daadwerkelijk via de maildispatch verzonden in plaats
  van alleen in de lokale queue klaargezet.
- De bijbehorende Playwright- en BDD-dekking en documentatie zijn bijgewerkt.

### PR #26 / versie 0.9.100

- Klanturenstaten accepteren PDF, JPG en PNG tot 2 MB.
- JPG/PNG worden server-side fail-closed naar een geldige PDF geconverteerd.
- Corrupte afbeeldingen, onveilige afbeeldingsdimensies en nep-PDF's worden geweigerd zonder een
  bestaand concept te vervangen.
- De medewerker krijgt de eigen klanturenstaat na login en maandwissel opnieuw uit de server.
- Een oudere GET kan een geslaagde upload niet meer overschrijven.
- De documentactie heet in de gewone klanturenstaatflow overal `Klanturenstaat bekijken`.
- De preview opent inline met een veilige `.pdf`-naam, `Cache-Control: private, no-store` en
  `X-Content-Type-Options: nosniff`.
- Historische ruwe JPG/PNG-records kunnen niet worden goedgekeurd of als PDF worden gemaild; eerst
  opnieuw uploaden is vereist.
- GD en fileinfo zijn toegevoegd aan alle CI-PHP-runtimes; de healthcheck bewaakt beeldconversie.
- De TEST-deployguard verwacht nu dezelfde gesloten mailsandbox als de canonieke configuratie:
  Giovanno als primaire sink en Kenrich als vaste CC.

## Waarom de vorige pipeline faalde

Run `32535972097` was inhoudelijk groen tot de daadwerkelijke TEST-deploy. Een tweede, verouderde
guard in `scripts/deploy-test-remote.sh` stond alleen Giovanno toe, terwijl de actuele TEST-sandbox
Giovanno plus Kenrich als CC vereist. De run stopte vóór cutover: TEST bleef ongewijzigd en er is
geen mail verstuurd. De guard en `scripts/deployment-contract-check.mjs` zijn nu gelijkgetrokken.

## Bewijs

- Volledige lokale Playwright-run: `238/238` groen.
- Volledige GUI-smoke: groen.
- `npm run check`: groen.
- `npm run build`: groen.
- `npm run docs:sync` en `npm run docs:bundle`: groen.
- `npm run test:db:crud`: groen.
- `npm run security:deps`: 0 kwetsbaarheden.
- PHP-lint en shell-syntaxcontrole: groen.

De twee tussentijdse rode tests waren testproblemen en zijn gericht hersteld:

- `MOB-H-003` wacht nu expliciet op de echte `action=submit`-response in WebKit.
- `DASH-N-009` mockt de nieuwe klanturenstaat-readback, zodat echte suitedata de geïsoleerde
  tellertest niet beïnvloeden.

## Belangrijkste bestanden

- `path-urenregistratie/server/api/customer-timesheets.php`
- `path-urenregistratie/server/mail/dispatch.php`
- `path-urenregistratie/server/health.php`
- `path-urenregistratie/assets/app.js`
- `.github/workflows/release-pipeline.yml`
- `path-urenregistratie/scripts/deploy-test-remote.sh`
- `path-urenregistratie/scripts/deployment-contract-check.mjs`
- `path-urenregistratie/tests/playwright/customer-timesheet-api.spec.ts`
- `path-urenregistratie/tests/playwright/dashboard.spec.ts`
- `path-urenregistratie/tests/playwright/mobile-ui.spec.ts`

## Directe volgende stap

1. Volg releasepipeline `32544919862` voor exact SHA `543044d1` tot een terminale status.
2. Ga alleen bij groen verder via de bestaande automatische TEST- en PROD-gates; start geen tweede
   run. Bij rood eerst de exacte job- en steplog lezen.
3. Controleer na een succesvolle deployment dat versie `0.9.101` publiek op TEST en PROD staat en
   dat de health- en read-only live-smokes slagen.
4. Daarna blijft de menselijke mailacceptatie open: controleer op TEST via Instellingen →
   mailacceptatieconsole de vijf routes, inclusief inhoud en bijlagen:

   - Broker: factuur plus klanturenstaat.
   - Boekhouder: alleen factuur.
   - Salaris/EasySalary: geen bijlage.
   - Wachtwoordherstel.
   - Uitnodiging nieuw account.

Echte TEST-mail mag uitsluitend naar Giovanno met Kenrich als vaste CC. PROD SMTP-real-delivery
blijft uitgeschakeld; dat is een bewuste veiligheidsinstelling en geen openstaande releasefout.

## Veiligheidsgrenzen

- Geen wachtwoorden, tokens of databasegeheimen in documentatie of logs opnemen.
- De PROD-deploy van `c703ee3` is met expliciete toestemming voltooid. De gebruiker gaf ook expliciet
  toestemming om een volgende groene release via de bestaande pipeline naar PROD door te zetten.
- PROD-mail en verbreding van de TEST-allowlist blijven buiten scope.
- Nieuwe documentatie-only commits bij voorkeur met `[skip ci]`; normale main-pushes starten een
  volledige releasepipeline.
- Verwijder of reset geen andere lokale wijzigingen als die later naast dit bestand verschijnen.
