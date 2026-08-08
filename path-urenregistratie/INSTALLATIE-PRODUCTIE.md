# Installatie (productie) — korte handleiding voor TransIP

Doel: veilige, eenmalige productie-installatie voor de minimale backend (PHP 8.4 + MySQL).

Belangrijk
- Gebruik PHP 8.4 op de hostingomgeving.
- Maak `server/config.local.php` handmatig op de server; plaats NOOIT wachtwoorden in Git.

Stappen (door hostingbeheerder of dev):

1) Zorg dat PHP 8.4 actief is en dat `pdo_mysql` is ingeschakeld.
   - In TransIP: **Geavanceerd → PHP-instellingen** → kies PHP 8.4.
   - Controleer met `php -v` en `php -m | grep -i pdo`.

2) Maak `server/config.local.php` in de `server/` map (voorbeeld hieronder). Dit bestand moet niet in Git.

Voorbeeld (`server/config.local.php`):
```
<?php
return [
  'host' => '127.0.0.1',
  'database' => 'your_database_name',
  'username' => 'your_db_user',
  'password' => 'your_db_password',
  'port' => 3306,
  'charset' => 'utf8mb4',
];
```

3) Test health endpoint
   - Open in browser of via curl:
     `https://your-site/server/health.php`
   - Zorg dat de JSON teruggeeft dat `pdo_mysql`, `config.local.php` en `database_connection` ok zijn.

4) Run de installer éénmalig
   - Open in browser of via curl:
     `https://your-site/server/install.php`
   - Dit zorgt dat de `app_state` tabel bestaat.
   - De installer toont geen wachtwoord of gevoelige data.

5) Open de app
   - Navigeer naar `https://your-site/` en controleer functionaliteit.

6) Extra productietips
   - Zorg voor een geldig SSL-certificaat (TransIP levert meestal automatisch LetsEncrypt).
   - Beheer back-ups en controleer of de database wordt meegenomen.
   - Verander het DB-wachtwoord en update `server/config.local.php` wanneer nodig.

Commands (lokale controle / debugging):
```
php -l server/api.php
php -l server/health.php
php -l server/install.php
git status --short
git ls-files --others --exclude-standard | grep server/config.local.php || true
```

Veiligheid
- Plaats nooit `server/config.local.php` in Git.
- De endpoints hierboven tonen geen wachtwoorden.
