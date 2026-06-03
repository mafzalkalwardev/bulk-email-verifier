# Run once after PC restart + Docker Desktop is running
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot\..

Write-Host "`n=== Email Verifier — post-reboot setup ===`n" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker not in PATH yet. Open Docker Desktop, wait until running, then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting Reacher container..."
docker compose up -d
Start-Sleep -Seconds 3
docker ps --filter name=email-verifier-reacher

Write-Host "`nStarting Node app (Ctrl+C to stop)...`n" -ForegroundColor Cyan
npm start
