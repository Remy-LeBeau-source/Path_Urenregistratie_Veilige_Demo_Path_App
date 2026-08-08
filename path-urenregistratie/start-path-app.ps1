# Start script voor lokale Path Uren & Facturatie demo
# Werkt ook als php.exe niet in PATH staat.
# Start de lokale app op http://localhost:8000/

$ErrorActionPreference = "Stop"

$ProjectDir = $PSScriptRoot
$Port = 8000
$Url = "http://localhost:$Port/"
$PhpPathFile = Join-Path $ProjectDir "server\.php-path"

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

Write-Host "Path Uren & Facturatie - lokale start" -ForegroundColor Green

Step "Projectmap controleren"
if (!(Test-Path -LiteralPath $ProjectDir)) {
    Write-Host "Projectmap niet gevonden:" -ForegroundColor Red
    Write-Host $ProjectDir -ForegroundColor Red
    pause
    exit 1
}

Set-Location -LiteralPath $ProjectDir
Ok "Projectmap gevonden: $ProjectDir"

Step "PHP zoeken"
$PhpExe = Find-PhpExe

if (!$PhpExe) {
    Write-Host "php.exe niet gevonden." -ForegroundColor Red
    Write-Host "Installeer PHP 8.4 met:"
    Write-Host "winget install --id PHP.PHP.8.4 --exact"
    pause
    exit 1
}

Ok "PHP gevonden: $PhpExe"

Step "PHP-versie controleren"
& $PhpExe -v | Select-Object -First 1

Step "pdo_mysql controleren"
$modules = & $PhpExe -m
if ($modules -notcontains "pdo_mysql") {
    Write-Host "pdo_mysql staat nog niet aan in php.ini." -ForegroundColor Red
    Write-Host "Activeer in php.ini: extension=pdo_mysql"
    pause
    exit 1
}
Ok "pdo_mysql is actief"

Step "MySQL-service controleren"
$mysqlService = Get-Service -Name "MySQL" -ErrorAction SilentlyContinue

if ($null -eq $mysqlService) {
    Warn "Geen Windows-service met naam MySQL gevonden. Als MySQL al draait, kun je doorgaan."
} elseif ($mysqlService.Status -ne "Running") {
    Warn "MySQL staat op $($mysqlService.Status). Ik probeer MySQL te starten..."
    try {
        Start-Service -Name "MySQL"
        Start-Sleep -Seconds 3
        $mysqlService.Refresh()

        if ($mysqlService.Status -eq "Running") {
            Ok "MySQL gestart"
        } else {
            Warn "MySQL kon niet automatisch starten. Start handmatig met: net start MySQL"
        }
    } catch {
        Warn "MySQL starten lukte niet. Open PowerShell als administrator en draai: net start MySQL"
    }
} else {
    Ok "MySQL draait"
}

Step "Lokale databaseconfig controleren"
$configPath = Join-Path $ProjectDir "server\config.local.php"

if (!(Test-Path -LiteralPath $configPath)) {
    Warn "server/config.local.php ontbreekt. Ik maak hem lokaal aan."
    $dbPassword = Read-Host "Vul je lokale MySQL wachtwoord in"

    $configContent = @"
<?php

return [
    'host' => '127.0.0.1',
    'database' => 'path_urenregistratie',
    'username' => 'root',
    'password' => '$dbPassword',
];
"@

    Set-Content -LiteralPath $configPath -Value $configContent -Encoding ASCII
    Ok "server/config.local.php aangemaakt"
    Warn "Dit bestand blijft lokaal en hoort NIET in Git."
} else {
    Ok "server/config.local.php bestaat"
}

Step "Poort $Port controleren"
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if ($listener) {
    Ok "Er draait al iets op poort $Port. Ik open de app."
    Start-Process $Url
    pause
    exit 0
}

Step "Browser openen"
Start-Process $Url

Step "PHP-server starten"
Write-Host ""
Write-Host "Server draait nu op:" -ForegroundColor Green
Write-Host $Url -ForegroundColor Green
Write-Host ""
Write-Host "Laat dit venster open zolang je lokaal werkt." -ForegroundColor Yellow
Write-Host "Sluiten/stoppen kan met Ctrl+C." -ForegroundColor Yellow
Write-Host ""

& $PhpExe -S "localhost:$Port" -t "$ProjectDir"
