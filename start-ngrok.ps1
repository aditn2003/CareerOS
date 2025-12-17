# Quick ngrok starter script
# Usage: .\start-ngrok.ps1

# Try latest version first (3.34.1)
$latestNgrok = "C:\Users\Zaid Hasan\Downloads\ngrok-latest-20251214022334\ngrok.exe"
$oldNgrok = "C:\Users\Zaid Hasan\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"

if (Test-Path $latestNgrok) {
    Write-Host "🚀 Starting ngrok (latest version) on port 4000...`n" -ForegroundColor Green
    Write-Host "Make sure your backend is running first!`n" -ForegroundColor Yellow
    & $latestNgrok http 4000
} elseif (Test-Path $oldNgrok) {
    Write-Host "⚠️  Using older ngrok version. Consider updating." -ForegroundColor Yellow
    Write-Host "🚀 Starting ngrok on port 4000...`n" -ForegroundColor Green
    Write-Host "Make sure your backend is running first!`n" -ForegroundColor Yellow
    & $oldNgrok http 4000
} else {
    Write-Host "❌ ngrok.exe not found" -ForegroundColor Red
    Write-Host "`nPlease download ngrok from: https://ngrok.com/download" -ForegroundColor Yellow
}

