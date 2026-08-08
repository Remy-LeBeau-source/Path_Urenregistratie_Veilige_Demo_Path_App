Path controle na grote wijziging

Gebruik:
1) Open een terminal in de projectmap.
2) Start:
   .\check-after-big-change.cmd

Dit script doet automatisch:
- PHP + pdo_mysql controleren
- PHP syntax checks op server/**/*.php
- MySQL connectiecheck en database backup naar /backups
- npm install alleen als node_modules ontbreekt
- npm run build
- ongewenste dist/assets/*.css deletions herstellen
- PHP-server starten als poort 8000 nog niet draait
- install.php, migrate.php, health.php en read-only API endpoints testen
- controleren dat server/config.local.php en server/.php-path niet in Git staan
- git status --short tonen

Dit script doet NIET automatisch:
- committen
- pushen
- database resetten
- echte e-mail versturen

Opmerking:
- Voor backup is mysqldump nodig in PATH.
- Het script gebruikt $PSScriptRoot, zodat het vanuit de projectmap betrouwbaar werkt.
