param(
    [string]$HostAddress = "127.0.0.1",
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pythonExe = "C:\Users\guldona\AppData\Local\Programs\Python\Python313\python.exe"
$logDir = Join-Path $projectRoot "tmp"
$stdoutLog = Join-Path $logDir "backend-stdout.log"
$stderrLog = Join-Path $logDir "backend-stderr.log"
$pidFile = Join-Path $logDir "backend.pid"
$healthUrl = "http://$HostAddress`:$Port/api/health/"

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

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

if (-not (Test-Path $pythonExe)) {
    throw "Python topilmadi: $pythonExe"
}

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    $backendListener = $existing | Select-Object -First 1
    $processInfo = Get-BackendProcessInfo -ProcessId $backendListener.OwningProcess
    if (Test-BackendProcess $processInfo) {
        Write-Host "Backend allaqachon ishlayapti: http://$HostAddress`:$Port"
        Write-Host "PID: $($backendListener.OwningProcess)"
        exit 0
    }
    throw "Port $Port boshqa jarayon tomonidan band: PID $($backendListener.OwningProcess)."
}

if (Test-Path $stdoutLog) {
    Clear-Content -LiteralPath $stdoutLog -ErrorAction SilentlyContinue
}
if (Test-Path $stderrLog) {
    Clear-Content -LiteralPath $stderrLog -ErrorAction SilentlyContinue
}

$escapedProjectRoot = $projectRoot.Replace("'", "''")
$escapedPythonExe = $pythonExe.Replace("'", "''")
$escapedStdoutLog = $stdoutLog.Replace("'", "''")
$escapedStderrLog = $stderrLog.Replace("'", "''")

$launchCommand = @"
Set-Location -LiteralPath '$escapedProjectRoot'
& '$escapedPythonExe' -m waitress --host=$HostAddress --port=$Port --threads=12 config.wsgi:application 1>> '$escapedStdoutLog' 2>> '$escapedStderrLog'
"@

Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-WindowStyle", "Hidden", "-Command", $launchCommand) `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden | Out-Null

$backendPid = $null

for ($attempt = 0; $attempt -lt 15; $attempt++) {
    Start-Sleep -Seconds 1

    try {
        $response = Invoke-WebRequest -UseBasicParsing $healthUrl -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
                Select-Object -First 1
            if ($listener) {
                $backendPid = $listener.OwningProcess
                Set-Content -Path $pidFile -Value $backendPid
            }
            Write-Host "Backend ishga tushdi: http://$HostAddress`:$Port"
            if ($backendPid) {
                Write-Host "PID: $backendPid"
            }
            exit 0
        }
    } catch {}
}

$stderr = if (Test-Path $stderrLog) { Get-Content $stderrLog -Tail 40 | Out-String } else { "" }
throw "Backend ishga tushmadi yoki health-check javob bermadi ($healthUrl). $stderr"
