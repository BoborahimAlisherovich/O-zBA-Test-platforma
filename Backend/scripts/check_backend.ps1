param(
    [string]$Url = "http://127.0.0.1:8000/api/health/"
)

$ErrorActionPreference = "Stop"

try {
    $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 8
    Write-Host "OK $($response.StatusCode) - $Url"
    if ($response.Content) {
        Write-Host $response.Content
    }
} catch {
    Write-Host "XATOLIK - $Url"
    Write-Host $_.Exception.Message
    exit 1
}
