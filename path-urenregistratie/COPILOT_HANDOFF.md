# Copilot handoff — lokale mailpreview en regressieherstel

Bijgewerkt: 15 augustus 2026

## Start hier

- Werkmap: `path-urenregistratie`
- Branch: `agent/local-mail-preview`
- Gooi de dirty worktree **niet** weg en voer geen reset/checkout uit.
- Er staan geen secrets in deze overdracht.
- Laat PROD en de beveiligde TEST-allowlist ongemoeid.

## Huidige lokale wijzigingen

- `assets/app.js`
  - veilige localhost-mailpreview met aan/uitbediening via instellingen én statusbadge;
  - localhost maakt alleen queue-/previewregistraties en verstuurt nooit SMTP;
  - acceptatieconsole toont onderwerp, tekst en PDF-links;
  - lokaal herstel voor de actie "alles als gelezen".
- `assets/styles.css`
  - toetsenbord- en focusstijl voor de interactieve mailstatusbadge.
- `server/api/mail-acceptance.php`
- `server/mail/acceptance.php`
  - localhost-previewcontract, onderwerp/tekst/bijlagen en fail-closed transport.
- `server/scripts/mail-acceptance-policy-check.php`
  - beleidscontrole dat localhost nooit extern verzendt en PROD/TEST veilig blijven.
- `tests/playwright/email-queue.spec.ts`
  - nieuwe regressie `EQ-H-025` voor lokale preview, badgebediening, inhoud, PDF's en geen SMTP.

## Bewezen status

- 2026-08-15 20:56 · Copilot: `EQ-H-025` gebruikte ten onrechte de volledige lokale auth- en
  bootstrapketen voor een afgebakend frontendcontract. Daardoor liep de case tegen 120 seconden en
  was het brokerscenario nog niet gerenderd. `tests/playwright/email-queue.spec.ts` gebruikt nu een
  smalle deterministische auth/bootstrapfixture, behoudt alle inhouds-, PDF-, badge- en geen-SMTP-
  assertions en heeft weer een timeout van 60 seconden. Gerichte herhaling: 1/1 groen in 5,2 s.
- 2026-08-15 20:58 · Copilot: hetzelfde niet-geïsoleerde frontendpatroon verbruikte de volledige
  30 seconden van `NOT-H-009` vóór de notificatieklik. De case heeft nu een smalle auth/bootstrap-
  fixture; de verouderde GET-response en alle teller-/leegstatusasserties zijn ongewijzigd.
  Gerichte herhaling: 1/1 groen in 3,8 s.
- 2026-08-15 21:01 · Copilot: releasekandidaat is v0.9.69; FO, TO, masterchecklist en afgeleide
  Living Docs zijn bijgewerkt naar 210 Playwright-cases + 1 DB-case = 211 unieke cases.
  `npm run check` is volledig groen. Er is nog niets gecommit/gepusht en geen pipeline gestart;
  eerst volgen lokaal de volledige GUI-smoke en volledige Playwright-regressie.
- 2026-08-15 21:08 · Copilot: eerste GUI-smoke stopte bij `EQ-H-023`, omdat de loopbackpreview
  een gemockte autoritatieve TEST-serverstatus overschreef. `localMailPreviewAvailable()` staat
  preview nu alleen toe wanneer de queueomgeving leeg of `local` is; TEST/PROD winnen altijd.
  De TEST- en PROD-UI-cases gebruiken dezelfde smalle auth/bootstrapfixture. Gericht bewijs:
  `EQ-H-023`, `EQ-H-025` en `EQ-N-024` samen 3/3 groen in 6,4 s. Volgende stap: GUI-smoke herhalen.
- 2026-08-15 21:09 · Copilot: de volledige `npm run test:gui-smoke` is groen op v0.9.69,
  inclusief desktop-, mobiele-, notificatie- en mailomgevingcases. Nog geen commit/push/pipeline;
  volgende stap is de volledige lokale Playwright-regressie.
- 2026-08-15 21:16 · Copilot: volledige regressie rondde 215 uitvoeringen af met 2 failures.
  `INV-N-005` was direct daarna groen; `EQ-N-015` verwachtte nog de oude uitgeschakelde localhost-
  console. De case bewaakt nu het bedoelde contract `enabled=true`, `preview_only=true`, alle vijf
  scenario's gereed, maar POST zonder exacte bevestiging blijft 409. Gericht: 1/1 groen in 886 ms.
  Volgende stap: docs synchroniseren en de volledige regressie opnieuw draaien.
- 2026-08-15 21:23 · Copilot: volgende volledige run leverde 215 resultaten met alleen
  `INV-H-003` rood door een vastlopende `page.evaluate()` tijdens app-bootstrap. De pure API-case
  gebruikt nu bestaande `AuthApi`/`InvoiceApi` request-contexten; alle bedragasserties zijn gelijk
  gebleven. Gericht: 1/1 groen in 897 ms. Volgende stap: volledige regressie opnieuw.
- 2026-08-15 21:48 · Copilot: losse `npx playwright`-runs bleken de reeds draaiende stale lokale
  PHP-server te gebruiken en maakten `INV-H-001` schijnbaar rood. Via de officiële runner met verse
  testdatabase en beheerde server is de ongewijzigde UI-case 1/1 groen in 4,5 s. Een tijdelijke
  readinessprobe is volledig teruggedraaid. Omdat de monolithische run in deze terminal na circa
  2,5 minuut extern wordt gesloten, wordt dezelfde volledige suite nu via twee beheerde shards bewezen.
- 2026-08-15 22:02 · Copilot: de volledige lokale Playwright-matrix is via vier beheerde shards
  volledig groen: 64/64 + 47/47 + 53/53 + 51/51 = 215/215 uitvoeringen. Iedere shard gebruikte
  de geïsoleerde `path_urenregistratie_test`-database en een runner-managed PHP-server. Er is nog
  niets gecommit/gepusht; volgende stap is `npm run ci:local` en het opbouwen van rapportbewijs.
- 2026-08-15 22:03 · Copilot: lokale v0.9.69-eindgate volledig groen. `npm run ci:local` bewees
  releasebuild, `npm run check`, DB-H-001 en 0 dependencykwetsbaarheden. De vier groene shards zijn
  met expliciete Allure-preserve-opt-in samengevoegd tot 215 passed / 0 non-passed; Allure en Living
  Docs zijn opnieuw gebouwd. `git diff --check` en editorfouten zijn schoon. Volgende stap: commit,
  push en vervolgens de TEST-/PROD-releasepipeline volgen; menselijke TEST-mailacceptatie blijft open.
- 2026-08-15 22:35 · Copilot: op verzoek toont LOCAL nu overal (Instellingen, acceptatiescenario's,
  bevestiging, factuur-/brokercontrole, verzendadministratie) expliciet de vaste gesimuleerde
  TEST-ontvanger `giovanno.maatsen@pathconsultancy.nl` naast iedere bedoelde productieroute, met
  "geen verzending". Bedoelde routes zelf blijven ongewijzigd; alleen presentatie via de nieuwe
  `mailAcceptanceDeliverySummary()`-helper. Incident: één gecombineerde patch op `index.html` matchte
  per ongeluk een stale oude editor-snapshot en zou secties (mailacceptatieconsole, verzendadministratie)
  hebben verwijderd; ontdekt via `git diff`/`git cat-file -p HEAD`, direct `git checkout -- index.html`
  en de versiebump daarna los opnieuw met exacte huidige tekst toegepast — geverifieerd met een schone
  diff die alleen 0.9.69→0.9.70 toont. Les vastgelegd in `/memories/repo/build-notes-path-urenregistratie-index-html.md`.
  Releasekandidaat is nu v0.9.70. Gericht bewijs: `EQ-H-025` en `E2E-H-005` groen, volledige smoke groen.
  Volgende stap: docs:sync en de volledige lokale gate (smoke, matrix, ci:local, rapportage) herhalen.
- `node --check assets/app.js`: groen.
- PHP-lints en `php server/scripts/mail-acceptance-policy-check.php`: eerder groen op deze worktree.
- Laatste bekende groene main-release vóór deze lokale wijzigingen: SHA `5b4c4fc2e3fa59df11fb83d4b210ea20a32e0e50`.
- De lokale statusbadge toont zichtbaar `LOKALE MAILPREVIEW UIT`.

## Nog open / eerst oplossen

1. `EQ-H-025` is gericht hersteld en groen; voer nu de resterende lint-, policy-, smoke- en
  regressiegates uit.
2. De regressie voor "alles als gelezen" bestaat al als `NOT-H-009` in `notifications.spec.ts` en `notifications.feature`; controleer hem mee, maak geen duplicaat.
3. Controleer dat de badge op localhost en TEST bedienbaar is, maar op PROD alleen status toont.
4. Besluit vaste ontvangers niet per ongeluk te verwijderen: Boekhouding en Salarisadministratie zijn kernroutes die aangepast/gedeactiveerd kunnen worden; alleen zelf toegevoegde routes zijn definitief verwijderbaar.

## Verificatie vóór commit/push

Voer minimaal uit:

```text
node --check assets/app.js
php -l server/api/mail-acceptance.php
php -l server/mail/acceptance.php
php -l server/scripts/mail-acceptance-policy-check.php
php server/scripts/mail-acceptance-policy-check.php
npx playwright test tests/playwright/email-queue.spec.ts --project=desktop-chromium --grep "EQ-H-025" --reporter=line
npm run check
```

Daarna de relevante GUI-smoke/regressie en pas bij volledig groen: dist/living docs synchroniseren, bewuste versieverhoging, commit, push en pipeline volgen. Niet releasen op basis van alleen lint.

## Documentatie die bij afronding moet worden bijgewerkt

- `FUNCTIONEEL-ONTWERP.md`: localhost preview versus TEST SMTP versus PROD, statusbadgebediening en vaste/koppelbare ontvangers.
- `TECHNISCH-ONTWERP.md`: fail-closed omgevingscontract, localStorage-previewstatus, API/queuegrenzen en regressie-eisen.
- `MASTERCHECKLIST.md`: alleen bewezen groene onderdelen afvinken; resterende SMTP/ketentaken open laten.
- Deze handoff vervangen door de definitieve uitkomst en exacte commit-/run-URL.

## Vaste veiligheidsregels

- LOCALHOST: inhoud/PDF/queue controleren, nooit externe SMTP.
- TEST: echte SMTP uitsluitend via de TransIP-relay en exact de ingestelde sink/allowlist.
- PROD: echte productieroutes, geen TEST-omleiding en geen demo-reset.
- Geen wachtwoorden, tokens of databasegeheimen in Git, logs of documentatie.
