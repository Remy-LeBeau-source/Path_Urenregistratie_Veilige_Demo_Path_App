# Test demo seed

1) Start or ensure the dev server is running (from project root):
```powershell
.\start-path-app.cmd
```

2) (Optional) PHP syntax check for migrate script:
```powershell
php -l server/migrate.php
```

3) Trigger migrations (including demo seed):
```powershell
curl.exe -i "http://localhost:8000/server/migrate.php"
```

4) Verify health and demo counts:
```powershell
curl.exe -i "http://localhost:8000/server/health.php"
```

5) Inspect `demo_counts` in the JSON output. Expected: counts > 0 for
`companies`,`users`,`employees`,`periods`,`timesheets`,`invoices`.

6) Optional MySQL verification (connect with your normal MySQL client):
```sql
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM periods;
SELECT COUNT(*) FROM timesheets;
SELECT COUNT(*) FROM invoices;
```
