param(
  [string]$Root
)

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath($Root)
$StatePath = Join-Path $Root ".server_state.json"

function Stop-ServerCandidates {
  $candidates = Get-CimInstance Win32_Process -Filter "name = 'python.exe' or name = 'pythonw.exe'" |
    Where-Object { $_.CommandLine -match '(^|\s|")server\.py($|\s|")' }
  foreach ($candidate in $candidates) {
    Stop-Process -Id $candidate.ProcessId -Force -ErrorAction SilentlyContinue
  }
  return [bool]$candidates
}

function Stop-ShellCandidates {
  $escapedRoot = [regex]::Escape($Root.TrimEnd('\'))
  $candidates = Get-CimInstance Win32_Process -Filter "name = 'electron.exe'" |
    Where-Object { $_.CommandLine -match $escapedRoot -and $_.CommandLine -match 'desktop' }
  foreach ($candidate in $candidates) {
    Stop-Process -Id $candidate.ProcessId -Force -ErrorAction SilentlyContinue
  }
  return [bool]$candidates
}

if (-not (Test-Path -LiteralPath $StatePath)) {
  $stoppedShell = Stop-ShellCandidates
  if (Stop-ServerCandidates) {
    Write-Host "Generation Engine stopped."
  } elseif ($stoppedShell) {
    Write-Host "Generation Engine stopped."
  } else {
    Write-Host "Generation Engine is not running."
  }
  exit 0
}

$state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
$url = $state.url
$pidValue = [int]$state.pid

try {
  Invoke-RestMethod -Uri "$url/api/shutdown" -Method Post -TimeoutSec 3 | Out-Null
} catch {
  # Fall back to process stop below.
}

$deadline = (Get-Date).AddSeconds(8)
while ((Get-Date) -lt $deadline) {
  $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
  if (-not $process) {
    if (Test-Path -LiteralPath $StatePath) {
      Remove-Item -LiteralPath $StatePath -Force
    }
    Write-Host "Generation Engine stopped."
    exit 0
  }
  Start-Sleep -Milliseconds 300
}

$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
if ($process) {
  Stop-Process -Id $pidValue -Force
}
Stop-ServerCandidates | Out-Null
Stop-ShellCandidates | Out-Null
if (Test-Path -LiteralPath $StatePath) {
  Remove-Item -LiteralPath $StatePath -Force
}
Write-Host "Generation Engine stopped."
