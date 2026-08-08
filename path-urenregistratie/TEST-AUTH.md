# Test Auth (login/me/logout)

## Belangrijke veiligheid

- Zet NOOIT plaintext wachtwoorden in Git.
- Zet NOOIT echte of productie-wachtwoorden in Git.
- Gebruik alleen tijdelijke demo-credentials lokaal.
- `server/config.local.php` blijft lokaal en mag niet in Git.

## 1) Migratie draaien

```powershell
curl.exe -sS "http://localhost:8000/server/migrate.php"
```

Verwacht: `003_auth_schema.sql` wordt uitgevoerd (of later als `skipped` getoond).

## 2) Lokaal tijdelijke demo-hash zetten (alleen test)

Gebruik een tijdelijke demo-string en maak een hash met PHP:

```powershell
$phpExe = (Get-Content "server/.php-path" -Raw).Trim()
& $phpExe -r "echo password_hash('KiesZelfEenTijdelijkeDemoPass!123', PASSWORD_DEFAULT), PHP_EOL;"
```

Gebruik die hash daarna in MySQL voor een demo-user, bijvoorbeeld:

```sql
UPDATE users
SET password_hash = '<GEGENEREERDE_HASH>'
WHERE email = 'admin@example.invalid';
```

## 3) Login testen (POST)

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = 'admin@example.invalid'; password = 'KiesZelfEenTijdelijkeDemoPass!123' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8000/server/auth/login.php' -Method Post -ContentType 'application/json' -Body $body -WebSession $session
```

Verwacht: `ok: true` met gebruiker zonder gevoelige velden.

## 4) Me testen (GET)

```powershell
Invoke-RestMethod -Uri 'http://localhost:8000/server/auth/me.php' -Method Get -WebSession $session
```

Verwacht: `ok: true`, `authenticated: true`.

## 5) Logout testen (POST)

```powershell
Invoke-RestMethod -Uri 'http://localhost:8000/server/auth/logout.php' -Method Post -WebSession $session
```

Verwacht: `ok: true`.

## 6) Me na logout testen (GET)

```powershell
Invoke-RestMethod -Uri 'http://localhost:8000/server/auth/me.php' -Method Get -WebSession $session
```

Verwacht: `401` met `not-authenticated`.
