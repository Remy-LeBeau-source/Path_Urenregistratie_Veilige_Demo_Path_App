# Operations-runbook — Path Uren & Facturatie

Dit runbook beschrijft de voorbereide productieflow voor `https://uren.pathconsultancy.nl`.
Commando's met `--execute` wijzigen productie en mogen pas door een bevoegde beheerder worden
uitgevoerd. Echte mail blijft uit zolang `mail.enabled` op `false` staat.

## 1. Vaste veiligheidsgrenzen

- Zet geen wachtwoorden, tokens of `server/config.local.php` in Git, chat, screenshots of logs.
- Gebruik PHP 8.4 met `pdo_mysql`, `openssl`, `fileinfo` en `gd`.
- Laat `allow_demo_migrations` in productie altijd `false`.
- Laat `security.hsts_enabled` op `false` tot HTTPS extern is bewezen.
- Laat `mail.enabled` op `false` tot Bundel 3 is geaccepteerd en echte verzending expliciet is goedgekeurd.
- Bewaar PDF's, logs en back-ups in een sibling-map zoals `path-private`, nooit onder de documentroot.
- Voer `install.php` en `migrate.php` alleen via CLI uit; `server/.htaccess` blokkeert HTTP-toegang.

## 2. Mappen en rechten

Voorbeeldindeling, waarbij `<APP>` de checkout/documentroot is en `<PRIVATE>` erbuiten ligt:

```text
<APP>/path-urenregistratie/              publieke applicatie
<PRIVATE>/path-private/invoices/         definitieve factuur-PDF's
<PRIVATE>/path-private/customer-timesheets/ goedgekeurde klanturenstaten
<PRIVATE>/path-private/backups/          databaseback-ups + SHA-256
<PRIVATE>/path-private/logs/             PHP- en cronlogs
```

Maak de private mappen met rechten `0750`; bestanden krijgen waar mogelijk `0640`. De PHP/cron-user
moet kunnen schrijven, de webserver mag directory listings nooit publiceren.

## 3. Configuratie en installatie

1. Gebruik op de productieserver de interactieve configurator. Het databasewachtwoord wordt verborgen
   gelezen, eerst met een read-only `SELECT 1` gevalideerd en nooit als argument of uitvoer verwerkt:

```bash
php server/scripts/configure-production.php --execute --confirm=CONFIGURE_PRODUCTION \
  --host=pathco-urenuru.db.transip.me --database=pathco_Urenuru --user=pathco_WroKoUru \
  --private-root=/data/sites/web/pathconsultancynl/private/path-urenregistratie
```

2. Controleer dat `server/config.local.php` met rechten `0600` is geplaatst. Gebruik `--replace` alleen
   na een beschermde back-up wanneer een bestaande productieconfig bewust wordt vervangen.
3. Behoud exact:
   - origin/base URL: `https://uren.pathconsultancy.nl`;
   - CORS: alleen `https://uren.pathconsultancy.nl`;
   - `environment = production`;
   - `allow_demo_migrations = false`;
   - `display_errors = false`;
   - `hsts_enabled = false`;
   - SMTP Relay host `smtp-relay.gmail.com`, poort `587`, `starttls`, geen gebruikersnaam/wachtwoord;
   - afzender `backoffice@pathconsultancy.nl`;
   - `mail.enabled = false`.
4. Voer vanaf `<APP>/path-urenregistratie` uit:

```bash
php server/scripts/production-preflight.php --config=server/config.local.php
php server/install.php
php server/migrate.php
php server/scripts/production-preflight.php --config=server/config.local.php --live
```

De live-preflight leest alleen. Hij moet onder meer bevestigen dat alle private opslagbuckets bestaan en
schrijfbaar zijn, dat er geen actieve `.invalid`-accounts zijn en dat de facturerende identiteit
`Path Consultancy — handelsnaam van QSI Consultancy B.V.` is.

## 4. Productieaccounts

Maak de eerste beheerder en overige accounts uitsluitend in een interactieve Linux/Unix-terminal.
Het wachtwoord wordt verborgen ingevoerd en wordt nooit als argument of logregel verwerkt:

```bash
php server/scripts/provision-account.php --config=server/config.local.php --execute \
  --email=<zakelijk-adres> --name="<volledige naam>" --role=administrator --company-id=1
```

Gebruik `--role=employee` voor medewerkers. Geef het initiële wachtwoord via een afgesproken beveiligd
kanaal door. De gebruiker wijzigt het daarna direct via **Profielmenu → Wachtwoord wijzigen**. Het
endpoint controleert het huidige wachtwoord, vereist minimaal 12 tekens en schrijft een audit-event.
De productie-resetroute toont nooit een raw token; geautomatiseerde resetmail is nog niet geactiveerd.

## 5. Offline mailacceptatie en queue

Deze preflight maakt drie MIME-berichten met duidelijk nep-PDF's. Hij gebruikt geen netwerk en schrijft
niet naar de database:

```bash
php server/scripts/mail-preflight.php --config=server/config.local.php
php server/scripts/mail-dispatch.php --config=server/config.local.php
```

Verwacht:

- broker `rana.ramjanam@pathconsultancy.nl`: factuur + goedgekeurde klanturenstaat (2 PDF's);
- boekhouder `giovanno.maatsen@pathconsultancy.nl`: factuur (1 PDF);
- salarisadministratie `gambitizanagi@gmail.com`: alleen Stasjo, juli 2026 en 144 uur (0 bijlagen);
- From `backoffice@pathconsultancy.nl`;
- `smtp_delivery_enabled: false` en `network_connections: 0`.

Pas na schriftelijke toestemming mag `mail.enabled=true` worden gezet en mag een cron met `--send`
worden geïnstalleerd. Voorbeeld (pas paden aan en voorkom overlappende runs met `flock`):

```cron
*/5 * * * * flock -n <PRIVATE>/path-private/mail.lock /usr/bin/php <APP>/path-urenregistratie/server/scripts/mail-dispatch.php --config=<APP>/path-urenregistratie/server/config.local.php --send >> <PRIVATE>/path-private/logs/mail-cron.log 2>&1
```

Een levering wordt vóór SMTP atomisch als `processing` geclaimd. Een achtergebleven `processing`-regel
mag niet blind opnieuw worden aangeboden: vergelijk eerst de Google relaylogs om dubbele factuurmail
na een crash te voorkomen.

## 6. Back-up, herstel en logrotatie

Niet-mutatieve checks:

```bash
php server/scripts/database-backup.php --config=server/config.local.php
php server/scripts/database-restore.php --config=server/config.local.php --file=<PRIVATE>/path-private/backups/<bestand>.sql
php server/scripts/rotate-logs.php --config=server/config.local.php
```

Een echte back-up (leest de database, schrijft alleen buiten de webroot):

```bash
php server/scripts/database-backup.php --config=server/config.local.php --execute
```

Voorbeeld dagelijkse planning:

```cron
15 2 * * * /usr/bin/php <APP>/path-urenregistratie/server/scripts/database-backup.php --config=<APP>/path-urenregistratie/server/config.local.php --execute >> <PRIVATE>/path-private/logs/backup-cron.log 2>&1
30 2 * * * /usr/bin/php <APP>/path-urenregistratie/server/scripts/rotate-logs.php --config=<APP>/path-urenregistratie/server/config.local.php --execute >> <PRIVATE>/path-private/logs/rotation-cron.log 2>&1
```

Herstel is destructief en vereist zowel `--execute` als de exacte bevestiging. Oefen eerst op een
lege, afzonderlijke acceptatiedatabase:

```bash
php server/scripts/database-restore.php --config=<acceptatie-config> --file=<backup.sql> --execute --confirm=RESTORE_<acceptatie_db_naam>
```

Controleer daarna SHA-256, tabellen, rijtellingen, logins en een volledige maandflow. Herstel nooit
rechtstreeks over productie zonder expliciete toestemming en een verse pre-restore-back-up.

## 7. Go-livevolgorde

1. Nieuwe release-SHA en volledig groene GitHub-pipeline vastleggen.
   `Promote Prod` is hierbij een regressie-/approvalgate en wijzigt de TransIP-documentroot niet
   automatisch. Controleer dat de pipeline-`headSha` exact gelijk is aan de stagingrelease.
2. Verse database- én private-bestandenback-up maken.
3. Vraag afzonderlijk en expliciet akkoord voor `GO_LIVE_<korte_sha>`.
4. Activeer uitsluitend die checksum-gecontroleerde stagingrelease in
   `/data/sites/web/pathconsultancynl/subsites/uren.pathconsultancy.nl`; behoud
   `server/config.local.php` en alle private opslag buiten de documentroot. Bewaar de vorige
   documentroot als direct terugzetbare rollbackrelease.
5. Controleer direct dat `https://uren.pathconsultancy.nl/index.html#` HTTP 200 geeft en niet meer
   de TransIP-placeholder toont. Het fragment `#` is client-side; servervalidatie gebeurt op
   `/index.html` en de browserflow valideert vervolgens de hash-routing.
6. Migraties via CLI uitvoeren wanneer de live preflight aangeeft dat dit nodig is; demo-seeds
   blijven uitgeschakeld.
7. Statische en live productiepreflight opnieuw groen maken.
8. HTTPS, headers, health zonder technische datalekken, login, rollen en privacy handmatig
   controleren; HSTS blijft nog uit.
9. Bundel 3 met Stasjo/juli 2026/144 uur volledig in dry-run doorlopen.
10. Factuurgegevens en beide PDF's visueel laten accepteren.
11. Fysieke iPhone, Android en tablet testen.
12. Alleen na ondertekende acceptatie mail activeren en één gecontroleerde echte proef verzenden.
13. Pas na succesvolle HTTPS-observatieperiode HSTS afzonderlijk activeren.

## 8. Rollback

1. Stop mailqueue- en muterende cronjobs.
2. Zet `mail.enabled=false`.
3. Leg incidenttijd, actieve release-SHA en fout vast zonder persoonsgegevens/secrets te loggen.
4. Maak een pre-rollback-back-up van database en `path-private`.
5. Herdeploy de laatst bewezen releasebestanden; draai geen neerwaartse SQL op productie.
6. Als schema/dataherstel echt nodig is: herstel eerst naar acceptatie, valideer, en voer productieherstel
   alleen uit na expliciete destructieve toestemming.
7. Voer health, productiepreflight, login/rollen/privacy en kernsmoke uit.
8. Herstart cronjobs pas wanneer de queue handmatig is gereconcilieerd.

## 9. Bundel 2 — alle externe acties in één lijst

- TransIP: exact documentroot-/checkout-/private-pad, PHP 8.4-extensies, SSL, uitgaand publiek IP,
  MySQL-database/user met minimale rechten, SFTP/SSH en cron/flock bevestigen.
- Google Admin: IP-relay voor het TransIP-IP, alleen domeinafzenders, SMTP-auth uit, TLS verplicht;
  daarna SPF, DKIM en DMARC controleren.
- GitHub: branch protection, verplichte groene checks, productie-environment approval en ontvangers.
- Bedrijf/administratie: KvK, btw, IBAN, adres, betalingstermijn en prefix van QSI Consultancy B.V., handelend onder de naam Path Consultancy,
  definitief visueel controleren; Circle8 e-mail/portaalroute en credit-/correctiebeleid bevestigen.
- Accounts: zakelijke adressen van Gio, Joyce en alle medewerkers, tweede productiebeheerder, veilige
  uitgifteprocedure, 2FA-keuze en deactiverings-/bewaarbeleid bevestigen.
- Operations: back-upretentie en externe opslag, monitoring/alerts, virusscanstrategie, incident-eigenaar
  en privacy-/bewaartermijnen vastleggen.
- Acceptatie: beschikbare iPhone/Android/tablet, namen van Gio/Joyce/medewerker die aftekenen, gepland
  onderhoudsvenster en expliciete afzonderlijke toestemmingen voor eerste mail en go-live.

## 10. Bundel 3 — productieacceptatievoorstel

- Start met verse back-up en `mail.enabled=false`.
- Gebruik Stasjo van Bakel, juli 2026, exact 144 goedgekeurde uren.
- Doorloop medewerker → indienen → correctie → herindienen → goedkeuren.
- Upload/controleer officiële klanturenstaat; maak en lock factuur vanuit Path Consultancy als handelsnaam van QSI Consultancy B.V.
- Controleer bedragen, btw, nummer, briefpapier, bestandsnamen en private downloads.
- Controleer offline/preflight exact de drie ontvangers en 2/1/0 bijlagen.
- Voer privacy-, sessie-, mobiel- en rollback-oefening uit.
- Laat acceptanten tekenen. Vraag daarna apart toestemming voor één echte SMTP-proef; go-live blijft een
  tweede, afzonderlijke beslissing.
