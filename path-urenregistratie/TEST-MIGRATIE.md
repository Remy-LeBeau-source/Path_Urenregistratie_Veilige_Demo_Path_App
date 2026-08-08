# Test migratie (lokaal)

Voer deze stappen uit vanuit de projectroot (`...\path-urenregistratie`).

1) Start de server (of laat hem draaien):
```powershell
.\start-path-app.cmd
```

2) Controleer PHP syntax van migrate script:
```powershell
php -l server/migrate.php
```

3) Run migratie (curl):
```powershell
curl.exe -i "http://localhost:8000/server/migrate.php"
```

Je krijgt JSON terug met `executed` (nieuwe migrations) en `skipped`.

4) Controleer health endpoint:
```powershell
curl.exe -i "http://localhost:8000/server/health.php"
```

5) MySQL checks (optioneel, lokaal):
```sql
-- login to MySQL then:
SHOW TABLES LIKE 'schema_migrations';
SHOW TABLES LIKE 'app_state';
SHOW TABLES LIKE 'companies';
SELECT COUNT(*) FROM employees;
```

6) Als alles ok is, commit je wijzigingen en deploy naar staging/production.
