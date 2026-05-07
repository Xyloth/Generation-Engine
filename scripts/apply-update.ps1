param(
  [Parameter(Mandatory = $true)][string]$Root,
  [Parameter(Mandatory = $true)][string]$ZipPath,
  [Parameter(Mandatory = $true)][string]$ServerUrl
)

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath($Root)
$ZipPath = [System.IO.Path]::GetFullPath($ZipPath)
$Stage = Join-Path $Root "tmp\update-stage"
$Extracted = Join-Path $Stage "extracted"

function Stop-GenerationEngine {
  try {
    Invoke-RestMethod -Uri "$ServerUrl/api/shutdown" -Method Post -TimeoutSec 3 | Out-Null
  } catch {
  }
  Start-Sleep -Seconds 2
  $escapedRoot = [regex]::Escape($Root.TrimEnd('\'))
  $processes = Get-CimInstance Win32_Process |
    Where-Object {
      ($_.Name -in @("electron.exe", "python.exe", "pythonw.exe")) -and
      ($_.CommandLine -match $escapedRoot)
    }
  foreach ($process in $processes) {
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    } catch {
    }
  }
}

function Resolve-PayloadRoot {
  param([string]$ExtractedPath)
  if (Test-Path -LiteralPath (Join-Path $ExtractedPath "server.py")) {
    return $ExtractedPath
  }
  $children = Get-ChildItem -LiteralPath $ExtractedPath -Directory
  foreach ($child in $children) {
    if (Test-Path -LiteralPath (Join-Path $child.FullName "server.py")) {
      return $child.FullName
    }
  }
  throw "Update zip does not contain a Generation Engine payload."
}

New-Item -ItemType Directory -Force -Path $Stage | Out-Null
if (Test-Path -LiteralPath $Extracted) {
  Remove-Item -LiteralPath $Extracted -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $Extracted | Out-Null
Expand-Archive -LiteralPath $ZipPath -DestinationPath $Extracted -Force
$PayloadRoot = Resolve-PayloadRoot -ExtractedPath $Extracted

Stop-GenerationEngine

$preserve = @(
  "books",
  "config.local.json",
  "ANTHROPIC_API_KEY.txt",
  ".server_state.json",
  "desktop-shell.log",
  "tmp"
)

foreach ($item in Get-ChildItem -LiteralPath $PayloadRoot -Force) {
  if ($preserve -contains $item.Name) {
    continue
  }
  $destination = Join-Path $Root $item.Name
  if ($item.PSIsContainer) {
    New-Item -ItemType Directory -Force -Path $destination | Out-Null
    Get-ChildItem -LiteralPath $item.FullName -Force | ForEach-Object {
      Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force
    }
  } else {
    Copy-Item -LiteralPath $item.FullName -Destination $destination -Force
  }
}

try {
  & (Join-Path $Root "scripts\install.ps1") -Root $Root | Out-Null
} catch {
}

Start-Process -FilePath (Join-Path $Root "start.bat") -WorkingDirectory $Root | Out-Null
