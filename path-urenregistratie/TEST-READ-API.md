# Test Read-Only API Endpoints

Deze stap test alleen veilige GET endpoints op echte tabellen.

## Vereisten

- Dev server draait op `http://localhost:8000`
- `server/config.local.php` is aanwezig (niet committen)

## Testcommando's

```bash
curl http://localhost:8000/server/api/bootstrap.php
curl http://localhost:8000/server/api/dashboard.php
curl http://localhost:8000/server/api/invoices.php
curl http://localhost:8000/server/api/invoices.php?period=2026-07
```

## Verwacht

- Alle endpoints geven JSON terug met `ok: true`
- Geen write/update/delete acties
- Geen wachtwoordvelden in responses
