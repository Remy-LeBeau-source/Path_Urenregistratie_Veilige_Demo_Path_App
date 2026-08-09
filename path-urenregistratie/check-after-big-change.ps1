# Controle-script na grote wijzigingen
# Draait lokale technische checks, maar commit/pusht/reset niets.

$ErrorActionPreference = "Continue"
if ($PSVersionTable.PSVersion.Major -ge 7) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ProjectDir = $PSScriptRoot
$Port = 8000
$BaseUrl = "http://localhost:$Port"
$PhpPathFile = Join-Path $ProjectDir "server\.php-path"
$BackupsDir = Join-Path $ProjectDir "backups"

$global:HasFailure = $false

function Step($text) {
    Write-Host ""
    Write-Host "==> $text" -ForegroundColor Cyan
}

function Ok($text) {
    Write-Host "OK  $text" -ForegroundColor Green
}

function Warn($text) {
    Write-Host "LET OP  $text" -ForegroundColor Yellow
}

function Fail($text) {
    $global:HasFailure = $true
    Write-Host "FOUT $text" -ForegroundColor Red
}

function Find-PhpExe {
    $cmd = Get-Command php -ErrorAction SilentlyContinue
    if ($cmd -and (Test-Path $cmd.Source)) {
        return $cmd.Source
    }

    if (Test-Path $PhpPathFile) {
        $saved = (Get-Content $PhpPathFile -Raw).Trim()
        if ($saved -and (Test-Path $saved)) {
            return $saved
        }
    }

    $searchRoots = @(
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages",
        "$env:ProgramFiles",
        "$env:ProgramFiles(x86)",
        "C:\php",
        "C:\tools"
    )

    foreach ($root in $searchRoots) {
        if (Test-Path $root) {
            $found = Get-ChildItem -Path $root -Recurse -Filter php.exe -ErrorAction SilentlyContinue |
                Select-Object -First 1

            if ($found) {
                $found.FullName | Set-Content $PhpPathFile -Encoding ASCII
                return $found.FullName
            }
        }
    }

    return $null
}

function Invoke-JsonEndpoint($path) {
    $url = "$BaseUrl$path"

    try {
        $requestParams = @{
            Uri = $url
            UseBasicParsing = $true
            TimeoutSec = 15
        }
        if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey('SkipHttpErrorCheck')) {
            $requestParams.SkipHttpErrorCheck = $true
        }

        $response = Invoke-WebRequest @requestParams
        $status = [int]$response.StatusCode
        if ($status -ge 200 -and $status -lt 300) {
            Write-Host "HTTP $status $url" -ForegroundColor Green
            return @{ ok = $true; status = $status; body = $response.Content }
        }

        Warn "Endpoint gaf geen 2xx-status: $url"
        Write-Host $response.Content -ForegroundColor Yellow
        return @{ ok = $false; status = $status; body = $response.Content }
    } catch {
        Warn "Endpoint gaf geen 2xx-status: $url"
        $body = $null
        $status = 0

        if ($_.Exception.Response) {
            try {
                $response = $_.Exception.Response
                $statusCode = $response.StatusCode
                if ($statusCode) {
                    $status = [int]$statusCode
                }
                $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
                $body = $reader.ReadToEnd()
                Write-Host $body -ForegroundColor Yellow
            } catch {
                Write-Host $_.Exception.Message -ForegroundColor Yellow
            }
        } else {
            Write-Host $_.Exception.Message -ForegroundColor Yellow
        }

        return @{ ok = $false; status = $status; body = $body }
    }
}

function Test-ProtectedReadApiAnonymous($result, $endpoint) {
    if ($result.status -ne 401 -or [string]::IsNullOrWhiteSpace($result.body)) {
        return $false
    }

    try {
        $json = $result.body | ConvertFrom-Json
        if ($json.error -eq 'not-authenticated') {
            Ok "Protected endpoint blokkeert anonieme toegang zoals verwacht: $endpoint"
            return $true
        }
    } catch {
        return $false
    }

    return $false
}

function Get-DbConfigFromPhp($phpExe, $configPath) {
    if (!(Test-Path $configPath)) {
        return $null
    }

    $escapedPath = ($configPath -replace '\\', '\\\\')
    $code = "`$c = include '$escapedPath';"
    $code += "if (!is_array(`$c)) { fwrite(STDERR, 'invalid-config'); exit(2);}"
    $code += "if (isset(`$c['database']) && is_array(`$c['database'])) { `$d = `$c['database']; } else { `$d = ['host' => (`$c['host'] ?? ''), 'port' => (`$c['port'] ?? 3306), 'name' => (`$c['database'] ?? (`$c['name'] ?? '')), 'user' => (`$c['username'] ?? (`$c['user'] ?? '')), 'password' => (`$c['password'] ?? ''), 'charset' => (`$c['charset'] ?? 'utf8mb4')]; }"
    $code += "echo json_encode(['host' => (`$d['host'] ?? ''), 'port' => (int)(`$d['port'] ?? 3306), 'name' => (`$d['name'] ?? ''), 'user' => (`$d['user'] ?? ''), 'password' => (`$d['password'] ?? ''), 'charset' => (`$d['charset'] ?? 'utf8mb4')]);"

    $raw = & $phpExe -n -r $code 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    try {
        return $raw | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Backup-DatabaseWithPhp($phpExe, $configPath, $backupPath) {
    $escapedConfig = ($configPath -replace '\\', '/')
    $escapedBackup = ($backupPath -replace '\\', '/')
    $tempPhp = Join-Path $env:TEMP ("path-db-backup-" + [guid]::NewGuid().ToString("N") + ".php")
    $phpScript = @"
<?php
`$cfg = include '$escapedConfig';
if (!is_array(`$cfg)) { fwrite(STDERR, 'invalid-config'); exit(2); }

if (isset(`$cfg['database']) && is_array(`$cfg['database'])) {
    `$db = `$cfg['database'];
} else {
    `$db = [
        'host' => (`$cfg['host'] ?? ''),
        'port' => (`$cfg['port'] ?? 3306),
        'name' => (`$cfg['database'] ?? (`$cfg['name'] ?? '')),
        'user' => (`$cfg['username'] ?? (`$cfg['user'] ?? '')),
        'password' => (`$cfg['password'] ?? ''),
        'charset' => (`$cfg['charset'] ?? 'utf8mb4')
    ];
}

`$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', `$db['host'], (int)(`$db['port'] ?? 3306), `$db['name'], (`$db['charset'] ?? 'utf8mb4'));
`$pdo = new PDO(`$dsn, (`$db['user'] ?? ''), (`$db['password'] ?? ''), [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);

`$out = "-- PHP fallback backup generated on " . date('c') . PHP_EOL;
`$out .= "SET FOREIGN_KEY_CHECKS=0;" . PHP_EOL . PHP_EOL;

`$tables = `$pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM);
foreach (`$tables as `$tableRow) {
    `$table = `$tableRow[0];
    `$tableEsc = str_replace('`', '``', `$table);
    `$createRow = `$pdo->query("SHOW CREATE TABLE `" . `$tableEsc . "`")->fetch(PDO::FETCH_ASSOC);
    if (!`$createRow) { continue; }

    `$createSql = null;
    if (isset(`$createRow['Create Table'])) {
        `$createSql = `$createRow['Create Table'];
    } else {
        `$vals = array_values(`$createRow);
        if (isset(`$vals[1])) {
            `$createSql = `$vals[1];
        }
    }
    if (!`$createSql) { continue; }

    `$out .= "DROP TABLE IF EXISTS `" . `$tableEsc . "`;" . PHP_EOL;
    `$out .= `$createSql . ';' . PHP_EOL . PHP_EOL;

    `$rows = `$pdo->query("SELECT * FROM `" . `$tableEsc . "`")->fetchAll(PDO::FETCH_ASSOC);
    if (!`$rows) {
        continue;
    }

    `$columns = array_keys(`$rows[0]);
    `$quotedColumns = [];
    foreach (`$columns as `$c) {
        `$quotedColumns[] = '`' . str_replace('`', '``', `$c) . '`';
    }
    `$columnSql = implode(',', `$quotedColumns);

    foreach (`$rows as `$row) {
        `$values = [];
        foreach (`$columns as `$col) {
            `$val = `$row[`$col];
            if (`$val === null) {
                `$values[] = 'NULL';
            } else {
                `$values[] = `$pdo->quote((string)`$val);
            }
        }
        `$out .= "INSERT INTO `" . `$tableEsc . "` (" . `$columnSql . ") VALUES (" . implode(',', `$values) . ");" . PHP_EOL;
    }
    `$out .= PHP_EOL;
}

`$out .= "SET FOREIGN_KEY_CHECKS=1;" . PHP_EOL;
file_put_contents('$escapedBackup', `$out);
echo 'ok';
"@

    Set-Content -LiteralPath $tempPhp -Value $phpScript -Encoding ASCII
    $result = & $phpExe $tempPhp 2>&1
    $exitCode = $LASTEXITCODE
    Remove-Item -LiteralPath $tempPhp -ErrorAction SilentlyContinue

    if ($exitCode -ne 0) {
        Write-Host ($result | Out-String) -ForegroundColor Yellow
    }

    return ($exitCode -eq 0 -and (Test-Path $backupPath))
}

Write-Host "Path controle na grote wijziging" -ForegroundColor Green

Step "Projectmap controleren"
if (!(Test-Path -LiteralPath $ProjectDir)) {
    Fail "Projectmap niet gevonden: $ProjectDir"
    exit 1
}
Set-Location -LiteralPath $ProjectDir
Ok "Projectmap: $ProjectDir"

Step "PHP zoeken en pdo_mysql controleren"
$PhpExe = Find-PhpExe
if (!$PhpExe) {
    Fail "php.exe niet gevonden"
    Write-Host "Installeer PHP 8.4 met: winget install --id PHP.PHP.8.4 --exact"
    exit 1
}
Ok "PHP gevonden: $PhpExe"
& $PhpExe -v | Select-Object -First 1
$modules = & $PhpExe -m
if ($modules -contains "pdo_mysql") {
    Ok "pdo_mysql is actief"
} else {
    Fail "pdo_mysql is niet actief"
}

Step "PHP syntax checks (server/**/*.php)"
$phpFiles = Get-ChildItem -Path (Join-Path $ProjectDir "server") -Recurse -Filter *.php |
    Sort-Object FullName
if (!$phpFiles -or $phpFiles.Count -eq 0) {
    Fail "Geen PHP-bestanden gevonden in server/"
} else {
    foreach ($file in $phpFiles) {
        & $PhpExe -l $file.FullName *> $null
        if ($LASTEXITCODE -eq 0) {
            Ok "$($file.FullName.Substring($ProjectDir.Length + 1)) syntax OK"
        } else {
            Fail "$($file.FullName.Substring($ProjectDir.Length + 1)) syntax fout"
            & $PhpExe -l $file.FullName
        }
    }
}

Step "MySQL config en backup controleren"
$configPath = Join-Path $ProjectDir "server\config.local.php"
if (Test-Path $configPath) {
    Ok "server/config.local.php bestaat"
} else {
    Fail "server/config.local.php ontbreekt"
}

$dbConfig = Get-DbConfigFromPhp -phpExe $PhpExe -configPath $configPath
if ($null -eq $dbConfig -or [string]::IsNullOrWhiteSpace($dbConfig.host) -or [string]::IsNullOrWhiteSpace($dbConfig.name)) {
    Fail "Kon databaseconfig niet veilig lezen uit server/config.local.php"
} else {
    Ok "Databaseconfig gevonden voor host '$($dbConfig.host)' en db '$($dbConfig.name)'"

    $mysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue
    if ($mysqlCmd) {
        $env:MYSQL_PWD = [string]$dbConfig.password
        & $mysqlCmd.Source "--host=$($dbConfig.host)" "--port=$($dbConfig.port)" "--user=$($dbConfig.user)" "--database=$($dbConfig.name)" "--execute=SELECT 1 AS ok;" | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Ok "MySQL connectiecheck via mysql client is geslaagd"
        } else {
            Fail "MySQL connectiecheck via mysql client faalde"
        }
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    } else {
        Warn "mysql client niet gevonden; connectiecheck gebeurt via health endpoint"
    }

    if (!(Test-Path $BackupsDir)) {
        New-Item -ItemType Directory -Path $BackupsDir | Out-Null
    }

    $mysqldumpCmd = Get-Command mysqldump -ErrorAction SilentlyContinue
    if ($mysqldumpCmd) {
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $backupPath = Join-Path $BackupsDir ("db-backup-" + $dbConfig.name + "-" + $timestamp + ".sql")
        $env:MYSQL_PWD = [string]$dbConfig.password
        & $mysqldumpCmd.Source "--host=$($dbConfig.host)" "--port=$($dbConfig.port)" "--user=$($dbConfig.user)" "--single-transaction" "--routines" "--events" "--databases" "$($dbConfig.name)" "--result-file=$backupPath"
        if ($LASTEXITCODE -eq 0 -and (Test-Path $backupPath)) {
            Ok "Database backup gemaakt: $backupPath"
        } else {
            Fail "Database backup maken mislukt"
        }
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    } else {
        Warn "mysqldump niet gevonden; fallback backup via PHP wordt geprobeerd"
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $backupPath = Join-Path $BackupsDir ("db-backup-" + $dbConfig.name + "-" + $timestamp + "-php-fallback.sql")
        if (Backup-DatabaseWithPhp -phpExe $PhpExe -configPath $configPath -backupPath $backupPath) {
            Ok "Database backup gemaakt via PHP fallback: $backupPath"
        } else {
            Fail "Database backup via PHP fallback mislukt"
        }
    }
}

Step "Node dependencies en build"
$nodeModules = Join-Path $ProjectDir "node_modules"
if (Test-Path $nodeModules) {
    Ok "node_modules bestaat al; npm install overgeslagen"
} else {
    Warn "node_modules ontbreekt; npm install wordt uitgevoerd"
    npm install
    if ($LASTEXITCODE -eq 0) {
        Ok "npm install geslaagd"
    } else {
        Fail "npm install mislukt"
    }
}

npm run build
if ($LASTEXITCODE -eq 0) {
    Ok "npm run build geslaagd"
} else {
    Fail "npm run build mislukt"
}

Step "Ongewenste dist/assets/*.css deletions herstellen"
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    git restore -- dist/assets/*.css 2>$null
    if ($LASTEXITCODE -eq 0) {
        Ok "dist/assets/*.css restore uitgevoerd"
    } else {
        Warn "git restore op dist/assets/*.css gaf geen match of waarschuwing"
    }
} else {
    Warn "Git niet gevonden; css restore overgeslagen"
}

Step "PHP-server op poort $Port controleren"
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    Ok "Er draait al een server op poort $Port"
} else {
    Warn "Poort $Port is vrij; PHP-server wordt gestart"
    $serverCommand = "Set-Location -LiteralPath '$ProjectDir'; & '$PhpExe' -S localhost:$Port -t '$ProjectDir'"
    Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $serverCommand -WindowStyle Minimized | Out-Null
    Start-Sleep -Seconds 2
}

Step "Endpoints testen (install/migrate/health + read-only API)"
$endpoints = @(
    "/server/install.php",
    "/server/migrate.php",
    "/server/health.php",
    "/server/api/bootstrap.php",
    "/server/api/dashboard.php",
    "/server/api/invoices.php",
    "/server/api/invoices.php?period=2026-07",
    "/server/api.php?action=state"
)

$protectedReadApi = @(
    "/server/api/bootstrap.php",
    "/server/api/dashboard.php",
    "/server/api/invoices.php",
    "/server/api/invoices.php?period=2026-07"
)

foreach ($endpoint in $endpoints) {
    $result = Invoke-JsonEndpoint $endpoint
    if ($result.ok) {
        try {
            $json = $result.body | ConvertFrom-Json
            if ($endpoint -eq "/server/api.php?action=state") {
                if ($json.state -or $json.error) {
                    Ok "State endpoint antwoord ontvangen"
                } else {
                    Warn "State endpoint gaf onverwacht antwoord"
                }
            } elseif ($json.ok -eq $true -or $endpoint -eq "/server/health.php") {
                Ok "Endpoint inhoud lijkt geldig: $endpoint"
            } else {
                Warn "Endpoint antwoord zonder ok=true: $endpoint"
            }
        } catch {
            Warn "Endpoint antwoord is geen JSON: $endpoint"
        }
    } elseif ($protectedReadApi -contains $endpoint) {
        if (!(Test-ProtectedReadApiAnonymous $result $endpoint)) {
            Fail "Protected endpoint gaf geen nette 401 JSON: $endpoint"
        }
    }
}

Step "Git safety check + git status"
if ($gitCmd) {
    $trackedConfig = git ls-files -- server/config.local.php
    if ($trackedConfig) {
        Fail "server/config.local.php staat in Git en dat mag niet"
    } else {
        Ok "server/config.local.php staat niet in Git"
    }

    $trackedPhpPath = git ls-files -- server/.php-path
    if ($trackedPhpPath) {
        Fail "server/.php-path staat in Git en dat mag niet"
    } else {
        Ok "server/.php-path staat niet in Git"
    }

    Write-Host ""
    Write-Host "Git status --short:"
    git status --short
} else {
    Warn "Git niet gevonden; safety check overgeslagen"
}

Write-Host ""
if ($global:HasFailure) {
    Write-Host "RESULTAAT: er zijn fouten. NIET committen/pushen voordat dit groen is." -ForegroundColor Red
    exit 1
} else {
    Write-Host "RESULTAAT: alle controles geslaagd." -ForegroundColor Green
    exit 0
}
