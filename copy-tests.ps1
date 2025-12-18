# Copy all test files from frontend to fttesting maintaining directory structure
$sourceDir = "frontend"
$destDir = "fttesting"

# Find all test files
$testFiles = Get-ChildItem -Path $sourceDir -Recurse -File | Where-Object {
    $_.Name -match '\.(test|spec)\.(js|jsx)$' -or
    $_.FullName -match '\\__tests__\\'
}

Write-Host "Found $($testFiles.Count) test files to copy..."

foreach ($file in $testFiles) {
    # Get relative path from source directory
    $relativePath = $file.FullName.Substring((Resolve-Path $sourceDir).Path.Length + 1)
    
    # Build destination path
    $destPath = Join-Path $destDir $relativePath
    $destParent = Split-Path $destPath -Parent
    
    # Create destination directory if it doesn't exist
    if (-not (Test-Path $destParent)) {
        New-Item -ItemType Directory -Path $destParent -Force | Out-Null
    }
    
    # Copy the file
    Copy-Item $file.FullName -Destination $destPath -Force
    Write-Host "Copied: $relativePath"
}

Write-Host "`nDone! Test files copied to $destDir"
