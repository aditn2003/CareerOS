# Quick health check test script
# Usage: .\test-health.ps1 [ngrok-url]

param(
    [string]$NgrokUrl = ""
)

if ($NgrokUrl -eq "") {
    Write-Host "`n❌ Please provide your ngrok URL!`n" -ForegroundColor Red
    Write-Host "Usage: .\test-health.ps1 https://your-url.ngrok.io`n" -ForegroundColor Yellow
    Write-Host "Or run ngrok first and copy the URL from the 'Forwarding' line.`n" -ForegroundColor Gray
    exit 1
}

$healthUrl = "$NgrokUrl/api/monitoring/health"

Write-Host "`n🔍 Testing health endpoint...`n" -ForegroundColor Cyan
Write-Host "URL: $healthUrl`n" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing
    $health = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Health Check Successful!`n" -ForegroundColor Green
    Write-Host "Status: $($health.status)" -ForegroundColor $(if ($health.status -eq 'healthy') { 'Green' } else { 'Yellow' })
    Write-Host "Database: $($health.checks.database.status)" -ForegroundColor $(if ($health.checks.database.status -eq 'healthy') { 'Green' } else { 'Red' })
    Write-Host "Memory: $($health.checks.memory.heapUsed) / $($health.checks.memory.heapTotal)" -ForegroundColor Cyan
    Write-Host "Uptime: $($health.uptime) seconds`n" -ForegroundColor Cyan
    
    if ($health.status -eq 'healthy') {
        Write-Host "✅ Your server is healthy and ready for UptimeRobot!`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Server is degraded but responding. Check the details above.`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Health check failed!`n" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)`n" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Backend is running (npm start)" -ForegroundColor White
    Write-Host "  2. ngrok is running (ngrok http 4000)" -ForegroundColor White
    Write-Host "  3. The URL is correct`n" -ForegroundColor White
}

