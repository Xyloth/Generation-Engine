[CmdletBinding()]
param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$Repo = "Xyloth/Generation-Engine",
    [switch]$Draft
)

$ErrorActionPreference = "Stop"

$RootPath = (Resolve-Path $Root).Path
Set-Location $RootPath

if (-not (Test-Path "VERSION")) {
    throw "VERSION file not found in $RootPath."
}

$Version = (Get-Content "VERSION" -Raw).Trim()
if (-not $Version) {
    throw "VERSION is empty."
}

& gh --version *> $null
if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI is not installed or is not on PATH."
}

& gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI is not logged in. Run: gh auth login"
}

$RemoteUrl = & git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0 -or -not $RemoteUrl) {
    & git remote add origin "https://github.com/$Repo.git"
}

$Dirty = & git status --porcelain
if ($Dirty) {
    throw "Working tree has uncommitted changes. Commit before publishing a release."
}

& git push -u origin main
if ($LASTEXITCODE -ne 0) {
    throw "git push failed. Make sure https://github.com/$Repo exists and you have push access."
}

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "package-release.ps1") -Root $RootPath
if ($LASTEXITCODE -ne 0) {
    throw "Release package build failed."
}

$ZipPath = Join-Path $RootPath "dist\Generation_Engine-v$Version.zip"
if (-not (Test-Path $ZipPath)) {
    throw "Expected release zip not found: $ZipPath"
}

$Tag = "v$Version"
& gh release view $Tag --repo $Repo *> $null
$ReleaseExists = $LASTEXITCODE -eq 0

if ($ReleaseExists) {
    & gh release upload $Tag $ZipPath --repo $Repo --clobber
} else {
    $Args = @(
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
        $Args += "--draft"
    }
    & gh @Args
}

if ($LASTEXITCODE -ne 0) {
    throw "GitHub release publish failed."
}

Write-Host "Published Generation Engine $Tag to https://github.com/$Repo/releases/tag/$Tag"
