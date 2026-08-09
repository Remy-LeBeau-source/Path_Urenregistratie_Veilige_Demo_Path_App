# Start script voor lokale Path Uren & Facturatie demo
# Werkt ook als php.exe niet in PATH staat.
# Start de lokale app op http://localhost:8000/

param(
    [ValidateSet("desktop", "mobile")]
    [string]$Mode = "desktop"
)

$ErrorActionPreference = "Stop"

# In PowerShell 7+, do not convert native stderr text into PowerShell errors.
if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ProjectDir = $PSScriptRoot
$Port = 8000
$Url = "http://localhost:$Port/"
$PhpPathFile = Join-Path $ProjectDir "server\.php-path"
$ServerLogDir = Join-Path $ProjectDir "server\logs"
$ServerLogFile = Join-Path $ServerLogDir "php-server.log"

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

function Open-AppBrowser($url, $mode) {
    if ($mode -ne "mobile") {
        Start-Process $url
        return
    }

    $browser = @(
        "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe"
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

    if (!$browser) {
        Warn "Geen Edge of Chrome gevonden; de standaardbrowser wordt geopend."
        Start-Process $url
        return
    }

    Start-Process -FilePath $browser -ArgumentList @("--new-window", "--window-size=430,932", $url)
    Ok "Mobiele preview geopend op 430 x 932 pixels"
}

function Get-PortListeners($port) {
    return Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
}

function Get-ListenerProcesses($listeners) {
    $ids = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
    $processes = @()
    foreach ($id in $ids) {
        if ($id -and $id -gt 0) {
            $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
            if ($proc) {
                $processes += $proc
            }
        }
    }
    return $processes
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
$listeners = Get-PortListeners -port $Port

if ($listeners) {
    $listenerProcesses = Get-ListenerProcesses -listeners $listeners
    if ($listenerProcesses.Count -eq 0) {
        Warn "Poort $Port is bezet, maar procesinformatie kon niet worden gelezen."
        Warn "Stop het proces op poort $Port en start dit script opnieuw voor live logs."
        Open-AppBrowser -url $Url -mode $Mode
        exit 1
    }

    $names = ($listenerProcesses | ForEach-Object { "{0} (PID {1})" -f $_.ProcessName, $_.Id }) -join ", "
    Warn "Poort $Port is al in gebruik door: $names"

    $nonPhp = @($listenerProcesses | Where-Object { $_.ProcessName -notin @('php', 'php-cgi') })
    if ($nonPhp.Count -gt 0) {
        Warn "Ik laat dit proces staan en start geen tweede server."
        Warn "Wil je live serverlogs zien? Stop eerst dit proces en start daarna opnieuw."
        Open-AppBrowser -url $Url -mode $Mode
        exit 1
    }

    Warn "Bestaande PHP-server wordt gestopt zodat deze terminal opnieuw live logs kan tonen."
    foreach ($proc in $listenerProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            Ok "Proces gestopt: $($proc.ProcessName) (PID $($proc.Id))"
        } catch {
            Warn "Kon proces niet stoppen: $($proc.ProcessName) (PID $($proc.Id))."
            Warn "Fout: $($_.Exception.Message)"
            Open-AppBrowser -url $Url -mode $Mode
            exit 1
        }
    }

    $stopped = Wait-Process -Id ($listenerProcesses | Select-Object -ExpandProperty Id) -Timeout 5 -ErrorAction SilentlyContinue
    $remaining = Get-PortListeners -port $Port
    if ($remaining) {
        Warn "Poort $Port blijft bezet na stopactie. Start handmatig opnieuw."
        Open-AppBrowser -url $Url -mode $Mode
        exit 1
    }
    Ok "Poort $Port is vrijgemaakt"
}

Step "Browser openen"
Open-AppBrowser -url $Url -mode $Mode

Step "PHP-server starten"
Write-Host ""
Write-Host "Server draait nu op:" -ForegroundColor Green
Write-Host $Url -ForegroundColor Green
Write-Host ""
Write-Host "Laat dit venster open zolang je lokaal werkt." -ForegroundColor Yellow
Write-Host "Sluiten/stoppen kan met Ctrl+C." -ForegroundColor Yellow
Write-Host "Live logbestand: $ServerLogFile" -ForegroundColor Yellow
Write-Host ""

if (!(Test-Path -LiteralPath $ServerLogDir)) {
    New-Item -ItemType Directory -Path $ServerLogDir -Force | Out-Null
}

"" | Out-File -FilePath $ServerLogFile -Encoding ASCII -Append
"========== SESSION START $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') on $Url ==========" | Out-File -FilePath $ServerLogFile -Encoding ASCII -Append

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"

try {
    # Run via cmd so stderr is merged into stdout as plain text instead of PowerShell error records.
    $phpServerCmd = '"' + $PhpExe + '" -S "localhost:' + $Port + '" -t "' + $ProjectDir + '" 2>&1'
    cmd.exe /d /c $phpServerCmd | Tee-Object -FilePath $ServerLogFile -Append
} finally {
    $ErrorActionPreference = $previousErrorActionPreference
}
