# TEST-ROLES

## Voorwaarden

- Start de lokale server op `http://localhost:8000/`.
- Zorg dat `server/config.local.php` lokaal bestaat.
- Voer eerst `http://localhost:8000/server/migrate.php` uit zodat de tijdelijke demo-hashes aanwezig zijn.
- Tijdelijke demo-accounts voor deze role-tests:
  - Admin: `admin@example.invalid` / `DemoTempAdmin!2026`
  - Employee: `stasjo@example.invalid` / `DemoTempEmployee!2026`

## 1) Admin login

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = 'admin@example.invalid'; password = 'DemoTempAdmin!2026' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8000/server/auth/login.php' -Method Post -ContentType 'application/json' -Body $body -WebSession $session
```

Verwacht: `ok: true`, `user.role: administrator`.

## 2) Admin kan alle read-only endpoints lezen

```powershell
Invoke-RestMethod -Uri 'http://localhost:8000/server/api/bootstrap.php' -Method Get -WebSession $session
Invoke-RestMethod -Uri 'http://localhost:8000/server/api/dashboard.php' -Method Get -WebSession $session
Invoke-RestMethod -Uri 'http://localhost:8000/server/api/invoices.php' -Method Get -WebSession $session
```

Verwacht: alle responses geven `ok: true` en bevatten volledige admin-data voor het eigen bedrijf.

## 3) Employee login

```powershell
$employeeSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$employeeBody = @{ email = 'stasjo@example.invalid'; password = 'DemoTempEmployee!2026' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8000/server/auth/login.php' -Method Post -ContentType 'application/json' -Body $employeeBody -WebSession $employeeSession
```

Verwacht: `ok: true`, `user.role: employee`.

## 4) Employee ziet alleen eigen data

```powershell
$bootstrap = Invoke-RestMethod -Uri 'http://localhost:8000/server/api/bootstrap.php' -Method Get -WebSession $employeeSession
$dashboard = Invoke-RestMethod -Uri 'http://localhost:8000/server/api/dashboard.php' -Method Get -WebSession $employeeSession
$invoices = Invoke-RestMethod -Uri 'http://localhost:8000/server/api/invoices.php' -Method Get -WebSession $employeeSession
```

Verwacht:

- `$bootstrap.users.Count` is `1` en de enige user is `stasjo@example.invalid`.
- `$bootstrap.employees.Count` is `1` en de enige employee is `Stasjo van Bakel`.
- `$bootstrap.assignments` bevat alleen assignments van die employee.
- `$bootstrap.mail_recipients.Count` is `0`.
- `$dashboard.ok` is `true` en de maand/workload-cijfers zijn beperkt tot de employee-eigen status.
- `$invoices.items` bevat alleen facturen van `Stasjo van Bakel`.

## 5) Logout

```powershell
Invoke-RestMethod -Uri 'http://localhost:8000/server/auth/logout.php' -Method Post -WebSession $employeeSession
```

Verwacht: `ok: true`.

## 6) Unauthorized zonder sessie geeft nette fout

```powershell
Invoke-RestMethod -Uri 'http://localhost:8000/server/api/bootstrap.php' -Method Get
Invoke-RestMethod -Uri 'http://localhost:8000/server/api/dashboard.php' -Method Get
Invoke-RestMethod -Uri 'http://localhost:8000/server/api/invoices.php' -Method Get
```

Verwacht: HTTP `401` met JSON zoals `ok: false`, `error: not-authenticated`, zonder PHP warnings in de response.
