param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pidFile = Join-Path $projectRoot "tmp\backend.pid"

$stopped = $false

function Get-BackendProcessInfo {
    param([int]$ProcessId)
    Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue |
        Select-Object ProcessId, Name, CommandLine
}

function Test-BackendProcess {
    param($ProcessInfo)

    if (-not $ProcessInfo) {
        return $false
    }

    $commandLine = [string]$ProcessInfo.CommandLine
    return $commandLine -match "waitress" -and $commandLine -match "config\.wsgi:application"
}

if (Test-Path $pidFile) {
    $backendPid = Get-Content $pidFile | Select-Object -First 1
    if ($backendPid) {
        try {
            $processInfo = Get-BackendProcessInfo -ProcessId ([int]$backendPid)
            if (Test-BackendProcess $processInfo) {
                Stop-Process -Id ([int]$backendPid) -Force -ErrorAction Stop
                $stopped = $true
            }
        } catch {}
    }
    Remove-Item -LiteralPath $pidFile -ErrorAction SilentlyContinue
}

$listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    $listening | ForEach-Object {
        try {
            $processInfo = Get-BackendProcessInfo -ProcessId $_.OwningProcess
            if (Test-BackendProcess $processInfo) {
                Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop
                $stopped = $true
            }
        } catch {}
    }
}

if ($stopped) {
    Write-Host "Backend to'xtatildi."
} else {
    Write-Host "Ishlayotgan backend topilmadi."
}
