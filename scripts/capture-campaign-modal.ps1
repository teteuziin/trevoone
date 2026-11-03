$browser = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$artifactDir = "C:\Users\User\.gemini\antigravity\brain\bda29c4f-b0d7-4433-9298-37b93b4df5ec"
$out375 = Join-Path $artifactDir "bottom-sheet-375px.png"
$out390 = Join-Path $artifactDir "bottom-sheet-390px.png"
$outExp = Join-Path $artifactDir "bottom-sheet-expanded-375px.png"
$outErr = Join-Path $artifactDir "custom-validation-error-375px.png"

$tempPath = [System.IO.Path]::GetTempPath()
$htmlNormal = Join-Path $tempPath "modal-preview-normal.html"
$htmlExp = Join-Path $tempPath "modal-preview-expanded.html"
$htmlErr = Join-Path $tempPath "modal-preview-error.html"

Write-Host "Generating HTML previews..."
node scripts/dump-preview-html.mjs

$fileNormalUrl = "file:///" + ($htmlNormal -replace '\\', '/')
$fileExpUrl = "file:///" + ($htmlExp -replace '\\', '/')
$fileErrUrl = "file:///" + ($htmlErr -replace '\\', '/')

Write-Host "Capturing 375x667 (Normal: Closed Advanced + Populated Select)..."
Start-Process -FilePath $browser -ArgumentList "--headless=old", "--disable-gpu", "--no-first-run", "--window-size=375,667", "--screenshot=$out375", $fileNormalUrl -Wait

Write-Host "Capturing 390x844 (Normal: Closed Advanced + Populated Select)..."
Start-Process -FilePath $browser -ArgumentList "--headless=old", "--disable-gpu", "--no-first-run", "--window-size=390,844", "--screenshot=$out390", $fileNormalUrl -Wait

Write-Host "Capturing 375x667 (Expanded: User Clicked Advanced Options)..."
Start-Process -FilePath $browser -ArgumentList "--headless=old", "--disable-gpu", "--no-first-run", "--window-size=375,667", "--screenshot=$outExp", $fileExpUrl -Wait

Write-Host "Capturing Custom Validation Error 375x667..."
Start-Process -FilePath $browser -ArgumentList "--headless=old", "--disable-gpu", "--no-first-run", "--window-size=375,667", "--screenshot=$outErr", $fileErrUrl -Wait

Write-Host "Checking generated screenshots:"
Get-Item $out375, $out390, $outExp, $outErr | Select-Object Name, Length, LastWriteTime
