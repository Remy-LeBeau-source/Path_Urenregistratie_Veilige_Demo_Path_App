# Handoff aan Claude — 2 september 2026

## Gebruikersafspraak

- Werk rechtstreeks vanuit `main`.
- Deploy uitsluitend naar TEST.
- De gebruiker test TEST zelf.
- PROD wordt uitsluitend door de gebruiker vrijgegeven/doorgezet.
- Laat de twee bestaande, ongerelateerde untracked bestanden ongemoeid:
  - `debug.log`
  - `server/scripts/migrate-test-masterdata-to-production.php`

## Huidige release

- Versie: `0.9.159`
- Hoofdcommit op `main` en `origin/main`: `52aca5342b01bf74ea80401e416ef5615277788e`
- TEST bevat deze versie al door een eerdere directe TransIP-hotfixdeploy.
- PROD is in deze sessie niet aangeraakt.

Commits die naar `main` zijn gepusht:

- `c47b2f3` — septemberworkflows, actuele maand bij login en externe urenbevestiging
- `68da611` — ontbrekende september-serverfactuur automatisch vanuit goedgekeurde urenstaat aanmaken
- `2ce2e58` — TEST-deployscript normaliseert CRLF/LF
- `52aca53` — bewaakt script met september-acceptatiecases voor TEST

## Functioneel op TEST

- Iedere login opent standaard de actuele maand (`september 2026`).
- Een handmatig gekozen maand blijft binnen dezelfde sessie behouden; opnieuw inloggen zet terug naar de actuele maand.
- Backoffice kan een ontbrekende klanturenstaat als `Extern bevestigd` registreren met verplichte reden en een tweede waarschuwing.
- De actie heet nu duidelijk `Externe bevestiging intrekken` en heeft waarschuwingsopmaak.
- Bij een goedgekeurde urenstaat zonder bestaande factuurrij maakt de factuurcontrole eerst de serverfactuur aan. Dit verhelpt de melding `Serverfactuur nog niet beschikbaar`.

TEST-septembercases die eerder veilig zijn ingevoerd (geen e-maildeliveries aangemaakt):

- Marc de Roon — `draft`, 8 uur, klanturenstaat ontbreekt.
- Brian Hek — `submitted`, 16 uur, externe bevestiging via klantportaal.
- Stasjo van Bakel — `approved`, 20 uur, externe bevestiging via e-mail, bewust nog geen factuurrij; hotfixcase voor automatische factuuraanmaak.
- Shawn-Douglas Nahar — `approved`, 20 uur, klanturenstaat rechtstreeks gemaild, conceptfactuur `110`.

Het herhaalbare script staat in `server/scripts/seed-test-september-acceptance.php`. Het weigert bestaande septemberdata te overschrijven en vereist de expliciete execute/confirm-flags.

## Pipeline die zojuist faalde

- GitHub Actions-run: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/33636314833
- Commit: `52aca53`
- Validate shards 2, 3 en 4: groen.
- Validate shard 1: rood.
- Omdat Validate rood werd zijn Promote Test, Deploy Test, Live Docs en alle PROD-jobs overgeslagen. Deze run heeft dus niets gedeployd.

Werkelijke blijvende fout:

- Case: `[ADM-WR-N-004]`
- Bestand: `tests/playwright/admin-writes.spec.ts`, rond regel 446.
- Laatste stap verwacht dat na `Adres aanpassen` en daarna annuleren het bestaande medewerkersaccount de class `account-conflict-focus` krijgt.
- De class ontbrak, zowel in de eerste poging als retry.

Losse CI-flake:

- `[DASH-H-003]` liep eenmaal tegen de timeout aan maar was bij retry groen. Dit was niet de uiteindelijke blokkeerder.

## Gevonden oorzaak

Commit `c47b2f3` introduceerde `modalCloseAction`. De conflictpopup bewaart daarin `focusExistingAccount`. Wanneer de gebruiker echter op `Adres aanpassen` klikt, opent `reopenForm()` een nieuw modal en overschrijft `modalCloseAction` met `null`. Bij annuleren kan de bestaande accountkaart daarom niet meer worden uitgelicht.

## Lokale, nog niet geverifieerde wijziging

`assets/app.js` is lokaal gewijzigd maar bewust **niet gecommit**. De wijziging:

- maakt `closeModal(runCloseAction = false)` expliciet;
- voert de callback alleen uit bij annuleren/sluiten;
- bewaart `focusExistingAccount` opnieuw nadat `reopenForm()` het formulier heeft geopend;
- voorkomt dat succesvol opslaan per ongeluk het oude conflicterende account uitlicht.

Bekijk eerst:

```powershell
git diff -- path-urenregistratie/assets/app.js
```

De syntaxcheck van `assets/app.js` was groen. De gerichte Playwright-run was gestart maar op verzoek van de gebruiker afgebroken voor er een resultaat was. Beschouw de wijziging daarom nog niet als bewezen.

## Veilige vervolgstappen

1. Controleer de lokale diff inhoudelijk.
2. Draai vanuit `path-urenregistratie`:

   ```powershell
   node --check assets/app.js
   node scripts/run-playwright-e2e.mjs --grep=ADM-WR-N-004
   ```

3. Draai bij groen minimaal ook de relevante modal/externe-bevestigingscases en `npm run check`.
4. Commit uitsluitend `assets/app.js` (plus documentatie/testwijzigingen als die werkelijk nodig blijken). Neem de twee ongerelateerde untracked bestanden niet mee.
5. Push `main`. De push start een nieuwe Release Pipeline.
6. Volg de nieuwe run door Validate, Promote Test, Deploy Test en de publieke TEST-logincontrole.
7. Keur geen PROD-environment goed en voer geen PROD-deploy uit.

## Eerdere verificatie vóór deze pipeline

- `npm run docs:sync`: groen, 349 uitvoerbare cases.
- `npm run build`: groen.
- `npm run check`: groen.
- Factuurcases `INV-H-020` en `INV-H-021`: groen.
- Publieke TEST-API-login en de vier septembercases zijn read-only gecontroleerd.

Algemene overdracht van de release: `HANDOFF-TEST-0.9.159.md`.
