# Testscript voor lokale Path PHP/MySQL API
# Draait syntax checks, config checks, health/install/api tests.
# Commit niets automatisch.

$ErrorActionPreference = "Stop"

$ProjectDir = $PSScriptRoot
$Port = 8000
$BaseUrl = "http://localhost:$Port"
$PhpPathFile = Join-Path $ProjectDir "server\.php-path"

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
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        Write-Host "HTTP $($response.StatusCode) $url" -ForegroundColor Green
        return $response.Content
    } catch {
        Fail "Endpoint gaf fout: $url"

        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $body = $reader.ReadToEnd()
                Write-Host $body -ForegroundColor Yellow
            } catch {
                Write-Host $_.Exception.Message -ForegroundColor Yellow
            }
        } else {
            Write-Host $_.Exception.Message -ForegroundColor Yellow
        }

        return $null
    }
}

Write-Host "Path API testscript" -ForegroundColor Green

Step "Projectmap controleren"
if (!(Test-Path -LiteralPath $ProjectDir)) {
    Fail "Projectmap niet gevonden: $ProjectDir"
    exit 1
}
Set-Location -LiteralPath $ProjectDir
Ok "Projectmap: $ProjectDir"

Step "PHP zoeken"
$PhpExe = Find-PhpExe
if (!$PhpExe) {
    Fail "php.exe niet gevonden"
    Write-Host "Installeer PHP 8.4 met: winget install --id PHP.PHP.8.4 --exact"
    exit 1
}
Ok "PHP gevonden: $PhpExe"

Step "PHP versie"
& $PhpExe -v | Select-Object -First 1

Step "pdo_mysql controleren"
$modules = & $PhpExe -m
if ($modules -contains "pdo_mysql") {
    Ok "pdo_mysql is actief"
} else {
    Fail "pdo_mysql is niet actief"
}

Step "PHP syntax checks"
$phpFiles = @(
    "server/api.php",
    "server/health.php",
    "server/install.php"
)

foreach ($file in $phpFiles) {
    if (Test-Path $file) {
        $lint = & $PhpExe -n -l $file 2>&1
        if ($LASTEXITCODE -eq 0) {
            Ok "$file syntax OK"
        } else {
            Fail "$file syntax fout"
            Write-Host $lint -ForegroundColor Red
        }
    } else {
        Fail "$file ontbreekt"
    }
}

Step "Lokale config controleren"
$configPath = Join-Path $ProjectDir "server\config.local.php"
if (Test-Path $configPath) {
    Ok "server/config.local.php bestaat lokaal"
} else {
    Fail "server/config.local.php ontbreekt"
}

Step "Git safety check"
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    $trackedConfig = git ls-files server/config.local.php
    if ($trackedConfig) {
        Fail "server/config.local.php staat in Git. Dit mag niet."
    } else {
        Ok "server/config.local.php staat niet in Git"
    }

    Write-Host ""
    Write-Host "Git status:"
    git status --short
} else {
    Warn "Git niet gevonden; Git-check overgeslagen"
}

Step "PHP-server op poort $Port controleren"
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if ($listener) {
    Ok "Er draait al iets op poort $Port"
} else {
    Warn "Poort $Port draait nog niet. Ik start PHP-server."
    $serverCommand = "& '$PhpExe' -S localhost:$Port -t '$ProjectDir'"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $serverCommand
    Start-Sleep -Seconds 3
}

Step "health.php testen"
$healthBody = Invoke-JsonEndpoint "/server/health.php"
if ($healthBody) {
    Write-Host $healthBody
}

Step "install.php testen"
$installBody = Invoke-JsonEndpoint "/server/install.php"
if ($installBody) {
    Write-Host $installBody
}

Step "api.php?action=state testen"
$stateBody = Invoke-JsonEndpoint "/server/api.php?action=state"
if ($stateBody) {
    try {
        $stateJson = $stateBody | ConvertFrom-Json
        if ($stateJson.state) {
            Ok "State gevonden"
            Write-Host "schemaVersion: $($stateJson.state.schemaVersion)"
            Write-Host "employees: $($stateJson.state.employees.Count)"
        } elseif ($stateJson.error) {
            Warn "API gaf error: $($stateJson.error)"
        } else {
            Warn "API response bevat geen state en geen duidelijke error"
        }
    } catch {
        Warn "Kon state response niet als JSON lezen"
    }
}

Write-Host ""
if ($global:HasFailure) {
    Write-Host "RESULTAAT: er zijn fouten. Nog NIET committen." -ForegroundColor Red
} else {
    Write-Host "RESULTAAT: checks zijn OK. Je kunt daarna committen." -ForegroundColor Green
}

Write-Host ""
Write-Host "Klaar. Druk op Enter om te sluiten."
Read-Host
