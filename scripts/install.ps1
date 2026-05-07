param(
  [string]$Root
)

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath($Root)
$BooksPath = Join-Path $Root "books"
$RuntimePython = Join-Path $Root "runtime\python.exe"
$Electron = Join-Path $Root "desktop\node_modules\electron\dist\electron.exe"
$DesktopApp = Join-Path $Root "desktop"
$IconPath = Join-Path $Root "assets\generation-engine.ico"

New-Item -ItemType Directory -Force -Path $BooksPath | Out-Null

if (-not (Test-Path -LiteralPath $RuntimePython)) {
  throw "Portable Python is missing at $RuntimePython"
}
if (-not (Test-Path -LiteralPath $Electron)) {
  throw "Electron runtime is missing at $Electron. This folder needs desktop\node_modules before it is copied to another machine."
}
if (-not (Test-Path -LiteralPath $IconPath)) {
  throw "Shortcut icon is missing at $IconPath"
}

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Generation Engine.lnk"
$shell = New-Object -ComObject WScript.Shell

$legacyShortcutNames = @(
  "Generation Engine UI.lnk",
  "Regeneration Engine.lnk"
)
$desktopLocations = @(
  [Environment]::GetFolderPath("Desktop"),
  [Environment]::GetFolderPath("DesktopDirectory"),
  "C:\Users\Public\Desktop"
) | Select-Object -Unique
foreach ($location in $desktopLocations) {
  if (-not (Test-Path -LiteralPath $location)) {
    continue
  }
  foreach ($legacyName in $legacyShortcutNames) {
    $legacyPath = Join-Path $location $legacyName
    if (Test-Path -LiteralPath $legacyPath) {
      Remove-Item -LiteralPath $legacyPath -Force
    }
  }
}

$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $Electron
$shortcut.Arguments = "`"$DesktopApp`""
$shortcut.WorkingDirectory = $Root
$shortcut.IconLocation = $IconPath
$shortcut.Description = "Launch Generation Engine native desktop app"
$shortcut.WindowStyle = 1
$shortcut.Save()

Write-Host "Installed native desktop shortcut:"
Write-Host $shortcutPath
