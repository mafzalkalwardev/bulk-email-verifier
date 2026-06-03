# Start Reacher (Docker) + Node app
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Starting Reacher (Docker) on port 8081..."
docker compose up -d 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker not available or pull failed — will use truemail-go only."
}

Write-Host "Starting Node app on port 5000..."
$env:VERIFIER_ENGINE = "auto"
npm start
