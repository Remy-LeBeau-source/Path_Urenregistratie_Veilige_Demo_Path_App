# Installatie productie — TransIP

De volledige beheer-, cron-, backup-, go-live- en rollbackprocedure staat in
`OPERATIONS-RUNBOOK.md`. Deze korte handleiding is alleen de installatiesamenvatting.

## Vereisten

- PHP 8.4 met `pdo_mysql`, `openssl`, `fileinfo` en `gd`.
- MySQL-database en aparte applicatiegebruiker met minimale rechten.
- Geldig SSL-certificaat voor `https://uren.pathconsultancy.nl`.
- Een private sibling-map buiten de documentroot voor PDF's, logs en back-ups.
- SSH/CLI-toegang. `server/install.php` en `server/migrate.php` zijn via HTTP geblokkeerd.

## Installatie

1. Deploy de releasebestanden naar de bevestigde documentroot.
2. Maak buiten de documentroot `path-private/{invoices,customer-timesheets,backups,logs}` met
   beperkte rechten (`0750`, bestanden waar mogelijk `0640`).
3. Maak de productieconfig uitsluitend interactief op de server; typ het databasewachtwoord daar
   verborgen in en plaats het nooit in chat, Git of command-line-argumenten:

```bash
php server/scripts/configure-production.php --execute --confirm=CONFIGURE_PRODUCTION \
  --host=pathco-urenuru.db.transip.me --database=pathco_Urenuru --user=pathco_WroKoUru \
  --private-root=/data/sites/web/pathconsultancynl/private/path-urenregistratie
```

   De configurator controleert eerst read-only de DB-verbinding en installeert daarna
   `server/config.local.php` atomisch met rechten `0600` en `mail.enabled=false`.
4. Controleer in de aangemaakte config zonder het wachtwoord te tonen:
   - `environment=production`;
   - `allow_demo_migrations=false`;
   - exacte origin/CORS `https://uren.pathconsultancy.nl`;
   - CSP actief voorbereid;
   - HSTS nog `false`;
   - errorlog buiten de webroot en `display_errors=false`;
   - SMTP Relay voorbereid zonder credentials en `mail.enabled=false`.
5. Voer via CLI uit:

```bash
cd <APP>/path-urenregistratie
php server/scripts/production-preflight.php --config=server/config.local.php
php server/install.php
php server/migrate.php
php server/scripts/production-preflight.php --config=server/config.local.php --live
```

6. Controleer `https://uren.pathconsultancy.nl/server/health.php`. In productie retourneert dit alleen
   een globale `ok`-status en geen host-/databasenaam.
7. Provision de eerste beheerder via `server/scripts/provision-account.php`; geef nooit een wachtwoord
   als command-line argument. Laat de gebruiker het wachtwoord direct via het profielmenu wijzigen.
8. Draai `npm run check` in de releasecheckout en voer Bundel 3 uit met echte mail nog uitgeschakeld.

## Niet doen

- Geen installatie/migratie via browser of curl.
- Geen demo-seed of `.invalid`-accounts in productie.
- Geen secrets in Git, shell-history, screenshots of logs.
- Geen restore over productie zonder expliciete toestemming en een verse back-up.
- Geen `mail.enabled=true`, echte SMTP-proef, HSTS of go-live zonder de afzonderlijke acceptatiegate.
