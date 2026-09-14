param(
    [string]$RunId = "34844009341",
    [string]$HandoffFile = "path-urenregistratie/HANDOFF-CLAUDE-COPILOT-ACTUEEL.md"
)

function ExitWithError($msg, $code=2) {
    Write-Error $msg
    exit $code
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    ExitWithError "The 'gh' CLI is not installed or not in PATH."
}

try {
    $raw = gh run view $RunId --json status,conclusion,url 2>&1 | Out-String
} catch {
    ExitWithError ("Failed to run 'gh run view' for " + $RunId + ": " + ($_ | Out-String))
}

try {
    $data = $raw | ConvertFrom-Json
} catch {
    ExitWithError "Failed to parse JSON from 'gh run view':`n$raw"
}

$now = (Get-Date).ToString("s")
$conclusion = $data.conclusion
$url = $data.url

if ($conclusion -eq 'success') {
    $line = "$now - run $RunId - SUCCESS - $url"
    Add-Content -Path $HandoffFile -Value $line
    Write-Output "Recorded SUCCESS in $HandoffFile"
    exit 0
} else {
    $outDir = "gh-run-$RunId-logs"
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

    Write-Output "Downloading logs for run $RunId to $outDir (only for inspection)..."
    $dl = gh run download $RunId --dir $outDir 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { Write-Output "gh run download returned non-zero; check manually. Output:`n$dl" }

    try {
        $jobsRaw = gh run view $RunId --json jobs 2>&1 | Out-String
        $jobs = $jobsRaw | ConvertFrom-Json
        $failed = @()
        foreach ($n in $jobs.jobs.nodes) {
            if ($n.conclusion -ne 'success') { $failed += $n.name }
        }
        if ($failed.Count -gt 0) {
            Write-Output "Failed jobs: $($failed -join ', ')"
            Write-Output "Inspect matching log files under $outDir (search filenames for the job names)."
        } else {
            Write-Output "No failed-job metadata found; inspect full logs in $outDir."
        }
    } catch {
        Write-Output ("Could not retrieve jobs JSON; inspect full logs in " + $outDir + ". Error: " + ($_ | Out-String))
    }

    $note = "$now - run $RunId - NOT SUCCESS ($conclusion) - logs downloaded to $outDir - $url"
    Add-Content -Path $HandoffFile -Value $note

    exit 1
}
