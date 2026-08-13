# Productiereadiness — read-only audit 2026-08-13

Deze audit bevat geen secrets. Er is uitsluitend naar een niet-actieve private stagingmap
geüpload; niets is live geactiveerd, gemigreerd of verzonden.

## Bewezen

- Bewezen releasebaseline voor deze statusupdate: commit
  `9fad9592e3d31a9f9b48085931c196b11e9e1247` op `main` met
  Release Pipeline `31654859682` volledig groen (Validate, Test, Live Docs en Prod-regressie).
- Build, volledige smoke, operationele preflights, DB CRUD-smoke en alle 161/161
  browseruitvoeringen zijn groen, inclusief `SAFE-N-007` voor de configurator.
- Alle gebruikte GitHub Actions draaien op actuele Node-24-majors; de pipeline heeft geen
  Node-20-runtimeannotaties meer.
- DNS: `uren.pathconsultancy.nl` wijst naar TransIP (`85.10.159.174` en
  `2a01:7c8:f0:10f1::ffca:353`).
- HTTPS retourneert HTTP 200; TransIP toont Let's Encrypt als ingeschakeld.
- SSH-keytoegang werkt voor `pathconsultancynl@pathco.ssh.transip.me`.
- PHP 8.4.24 en `pdo_mysql` zijn beschikbaar.
- Documentroot: `/data/sites/web/pathconsultancynl/subsites/uren.pathconsultancy.nl`.
- Private mappen bestaan onder `/data/sites/web/pathconsultancynl/private/path-urenregistratie`.
- De private root en de vier opslagbuckets zijn schrijfbaar en staan op mode `700`.
- PHP-uploadlimieten (`2M` bestand, `8M` POST) sluiten aan op de applicatiegrens van 2 MB;
  cron is beschikbaar maar nog niet ingericht.
- TransIP bereikt `smtp-relay.gmail.com:587`; STARTTLS gebruikt TLS 1.3 en de
  certificaatverificatie is groen. Er is geen `MAIL FROM`, `RCPT TO`, `DATA` of bericht verstuurd.
- De stagingprocedure is met release `9fad9592e3d3` bewezen in een niet-actieve private map.
  De remote SHA-256 van die baseline is
  `813040f36879edaa00602f177cba9e55fdbfae63a74131bf54201db4f446e05a`.
- GitHub Pages/Living Docs is gepubliceerd.

## Nog niet productieklaar

- De publieke root bevat nog een TransIP-`index.php` dat de gereserveerde placeholder toont.
- De actuele applicatie staat alleen in private staging; de publieke documentroot is nog niet omgeschakeld.
- `server/config.local.php` ontbreekt; `/server/health.php` toont daardoor nog technische diagnostiek.
- De databaseverbinding is nog niet met het geroteerde productiewachtwoord gevalideerd.
- `main` heeft geen branch protection; de `prod` environment heeft geen approvalregel.
- CSP/HSTS en overige productieheaders zijn publiek nog niet zichtbaar omdat de app nog niet actief is.
- Back-up/restore, croninstallatie, productieaccounts, fysieke devices en menselijke acceptatie blijven open.
- `mail.enabled` blijft uit; alleen DNS/TCP/STARTTLS/certificaat zijn getest en er is geen
  SMTP-transactie of mailverzending uitgevoerd.

## Eerstvolgende gate

1. Draai in de actuele private stagingrelease op SSH `server/scripts/configure-production.php`
   interactief; voer het DB-wachtwoord
   uitsluitend in de verborgen prompt in.
2. Draai statische en live read-only productiepreflight.
3. Maak een verse back-up en plan daarna pas de gecontroleerde cutover.
4. Controleer dat de volledig groene pipeline-`headSha` exact gelijk is aan de stagingrelease;
   `Promote Prod` is regressiebewijs en activeert TransIP niet automatisch.
5. Vraag expliciete `GO_LIVE_<korte_sha>`-toestemming, activeer daarna pas de documentroot en
   valideer `https://uren.pathconsultancy.nl/index.html#` plus health, headers, login en rollback.

Een live cutover, migratie, productieaccount-write, echte mail of HSTS-activatie vereist steeds een
afzonderlijke expliciete toestemming.
