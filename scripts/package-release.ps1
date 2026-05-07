param(
  [string]$Root,
  [string]$Version
)

$ErrorActionPreference = "Stop"
if (-not $Root) {
  $Root = Split-Path -Parent $PSScriptRoot
}
$Root = [System.IO.Path]::GetFullPath($Root)
if (-not $Version) {
  $Version = (Get-Content -LiteralPath (Join-Path $Root "VERSION") -Raw).Trim()
}
if (-not $Version) {
  throw "VERSION is empty."
}

$Dist = Join-Path $Root "dist"
$Stage = Join-Path $Root "tmp\release-stage"
$Payload = Join-Path $Stage "Generation_Engine"
$Zip = Join-Path $Dist "Generation_Engine-v$Version.zip"

if (Test-Path -LiteralPath $Stage) {
  Remove-Item -LiteralPath $Stage -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $Payload, $Dist | Out-Null

$include = @(
  "assets",
  "desktop",
  "runtime",
  "scripts",
  "web",
  "server.py",
  "README.md",
  "VERSION",
  "config.example.json",
  "install.bat",
  "start.bat",
  "stop.bat"
)

foreach ($name in $include) {
  $source = Join-Path $Root $name
  if (-not (Test-Path -LiteralPath $source)) {
    throw "Missing release input: $source"
  }
  $destination = Join-Path $Payload $name
  Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
}

if (Test-Path -LiteralPath $Zip) {
  Remove-Item -LiteralPath $Zip -Force
}
Compress-Archive -LiteralPath $Payload -DestinationPath $Zip -Force

Write-Host "Release package:"
Write-Host $Zip
