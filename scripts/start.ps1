param(
  [string]$Root
)

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath($Root)
$Electron = Join-Path $Root "desktop\node_modules\electron\dist\electron.exe"
$DesktopApp = Join-Path $Root "desktop"
$BooksPath = Join-Path $Root "books"
$Pythonw = Join-Path $Root "runtime\pythonw.exe"

New-Item -ItemType Directory -Force -Path $BooksPath | Out-Null

if (-not (Test-Path -LiteralPath $Pythonw)) {
  throw "Portable Python is missing at $Pythonw"
}
if (-not (Test-Path -LiteralPath $Electron)) {
  throw "Electron runtime is missing at $Electron. Re-run setup on the development machine so desktop\node_modules is present."
}

Start-Process -FilePath $Electron -ArgumentList @($DesktopApp) -WorkingDirectory $Root | Out-Null
