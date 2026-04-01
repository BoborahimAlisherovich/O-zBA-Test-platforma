param(
    [string]$TaskName = "ARTEDU Backend",
    [string]$HostAddress = "127.0.0.1",
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "start_backend.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`" -HostAddress $HostAddress -Port $Port"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Force | Out-Null

    Write-Host "Startup task yaratildi: $TaskName ($currentUser)"
} catch {
    $startupDir = [Environment]::GetFolderPath("Startup")
    if (-not $startupDir) {
        throw
    }

    $launcherPath = Join-Path $startupDir "ARTEDU Backend Startup.cmd"
    $launcherContent = "@echo off`r`npowershell -ExecutionPolicy Bypass -File `"$scriptPath`" -HostAddress $HostAddress -Port $Port`r`n"
    Set-Content -LiteralPath $launcherPath -Value $launcherContent -Encoding ASCII

    Write-Warning "Scheduled Task yaratib bo'lmadi: $($_.Exception.Message)"
    Write-Host "Startup launcher yaratildi: $launcherPath"
}
