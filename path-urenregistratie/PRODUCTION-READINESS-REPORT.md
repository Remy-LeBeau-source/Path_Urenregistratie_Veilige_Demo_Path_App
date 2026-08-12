# Productiereadiness — read-only audit 2026-08-13

Deze audit bevat geen secrets en heeft niets gedeployed, gemigreerd of verzonden.

## Bewezen

- Bewezen basisrelease: commit `23b14fa26e0ab840a189e8ab4d7a890a5c65cec9` op `main` met
  Release Pipeline `31649794848` volledig groen (Validate, Test, Live Docs en Prod-regressie).
- Actuele readinesswijziging lokaal: build, volledige smoke, operationele preflights, DB CRUD-smoke
  en alle 161/161 browseruitvoeringen groen, inclusief `SAFE-N-007` voor de configurator.
- DNS: `uren.pathconsultancy.nl` wijst naar TransIP (`85.10.159.174` en
  `2a01:7c8:f0:10f1::ffca:353`).
- HTTPS retourneert HTTP 200; TransIP toont Let's Encrypt als ingeschakeld.
- SSH-keytoegang werkt voor `pathconsultancynl@pathco.ssh.transip.me`.
- PHP 8.4.24 en `pdo_mysql` zijn beschikbaar.
- Documentroot: `/data/sites/web/pathconsultancynl/subsites/uren.pathconsultancy.nl`.
- Private mappen bestaan onder `/data/sites/web/pathconsultancynl/private/path-urenregistratie`.
- GitHub Pages/Living Docs is gepubliceerd.

## Nog niet productieklaar

- De publieke root bevat nog een TransIP-`index.php` dat de gereserveerde placeholder toont.
- De geüploade applicatie is ouder dan de actuele release.
- `server/config.local.php` ontbreekt; `/server/health.php` toont daardoor nog technische diagnostiek.
- De databaseverbinding is nog niet met het geroteerde productiewachtwoord gevalideerd.
- `main` heeft geen branch protection; de `prod` environment heeft geen approvalregel.
- CSP/HSTS en overige productieheaders zijn publiek nog niet zichtbaar omdat de app nog niet actief is.
- Back-up/restore, cron, productieaccounts, fysieke devices en menselijke acceptatie blijven open.
- `mail.enabled` blijft uit; er is geen echte SMTP-verbinding of mailverzending uitgevoerd.

## Eerstvolgende gate

1. Upload de actuele commit als niet-actieve, gehashte stagingbundel.
2. Draai op SSH `server/scripts/configure-production.php` interactief; voer het DB-wachtwoord
   uitsluitend in de verborgen prompt in.
3. Draai statische en live read-only productiepreflight.
4. Maak een verse back-up en plan daarna pas de gecontroleerde cutover.

Een live cutover, migratie, productieaccount-write, echte mail of HSTS-activatie vereist steeds een
afzonderlijke expliciete toestemming.
