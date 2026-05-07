[CmdletBinding()]
param(
    [string]$Root = "",
    [string]$Repo = "Xyloth/Generation-Engine",
    [switch]$Draft
)

$ErrorActionPreference = "Stop"

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    $previousPreference = $ErrorActionPreference
    try {
        # Windows PowerShell 5.1 turns native stderr into ErrorRecords when
        # ErrorActionPreference is Stop. Git and gh both write harmless status
        # lines to stderr, so native commands are judged by exit code only.
        $ErrorActionPreference = "Continue"
        & $Command
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($exitCode -ne 0) {
        throw "$FailureMessage (exit code $exitCode)"
    }
}

function Test-NativeSuccess {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        & $Command
        return ($LASTEXITCODE -eq 0)
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

if (-not $Root) {
    $Root = Join-Path $PSScriptRoot ".."
}

$RootPath = (Resolve-Path $Root).Path
Set-Location $RootPath

if (-not (Test-Path "VERSION")) {
    throw "VERSION file not found in $RootPath."
}

$Version = (Get-Content "VERSION" -Raw).Trim()
if (-not $Version) {
    throw "VERSION is empty."
}

Get-Command gh -ErrorAction Stop | Out-Null
Get-Command git -ErrorAction Stop | Out-Null

Invoke-Native { gh --version *> $null } "GitHub CLI is not installed or is not on PATH."
Invoke-Native { gh auth status *> $null } "GitHub CLI is not logged in. Run: gh auth login"

$HasOrigin = Test-NativeSuccess { git remote get-url origin *> $null }
if (-not $HasOrigin) {
    Invoke-Native { git remote add origin "https://github.com/$Repo.git" } "Failed to add origin remote."
}

$Dirty = & git status --porcelain
if ($Dirty) {
    throw "Working tree has uncommitted changes. Commit before publishing a release."
}

Invoke-Native { git push -u origin main } "git push failed. Make sure https://github.com/$Repo exists and you have push access."

Invoke-Native { powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "package-release.ps1") -Root $RootPath } "Release package build failed."

$ZipPath = Join-Path $RootPath "dist\Generation_Engine-v$Version.zip"
if (-not (Test-Path $ZipPath)) {
    throw "Expected release zip not found: $ZipPath"
}

$Tag = "v$Version"
$ReleaseExists = Test-NativeSuccess { gh release view $Tag --repo $Repo *> $null }

if ($ReleaseExists) {
    Invoke-Native { gh release upload $Tag $ZipPath --repo $Repo --clobber } "GitHub release asset upload failed."
} else {
    $GhArgs = @(
        "release",
        "create",
        $Tag,
        $ZipPath,
        "--repo",
        $Repo,
        "--title",
        "Generation Engine $Tag",
        "--notes",
        "Beta release for Generation Engine. The in-app updater downloads this zip and preserves local books and configuration."
    )
    if ($Draft) {
        $GhArgs += "--draft"
    }
    Invoke-Native { gh @GhArgs } "GitHub release publish failed."
}

Write-Host "Published Generation Engine $Tag to https://github.com/$Repo/releases/tag/$Tag"
