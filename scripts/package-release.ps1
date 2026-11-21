$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$packageInfo = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json
$tauriInfo = Get-Content -LiteralPath 'src-tauri/tauri.conf.json' -Raw | ConvertFrom-Json
$releaseVersion = $packageInfo.version
if ($releaseVersion -ne $tauriInfo.version) { throw 'Las versiones no coinciden.' }
$installerPath = Join-Path $projectRoot "src-tauri/target/release/bundle/nsis/AoE4 Overlay_${releaseVersion}_x64-setup.exe"
if (-not (Test-Path -LiteralPath $installerPath)) { throw 'Generá primero el instalador con npm run installer.' }
if (-not (Test-Path -LiteralPath "docs/releases/$releaseVersion.md")) { throw "Faltan las notas docs/releases/$releaseVersion.md." }

# A release ships only what players download: the installer and its hash.
# LICENSE and THIRD-PARTY-NOTICES.txt are bundled inside the installer, and the
# "Source code" archives GitHub attaches to every tag are the corresponding source.
$releaseDir = Join-Path $projectRoot "release/$releaseVersion"
if (Test-Path -LiteralPath $releaseDir) { Remove-Item -LiteralPath $releaseDir -Recurse -Force }
New-Item -ItemType Directory -Path $releaseDir | Out-Null
# GitHub replaces spaces in asset names, so ship a name that SHA256SUMS.txt can match.
Copy-Item -LiteralPath $installerPath -Destination (Join-Path $releaseDir "AoE4-Overlay-$releaseVersion-setup.exe")

$hashLines = Get-ChildItem -LiteralPath $releaseDir -File | Sort-Object Name | ForEach-Object {
    $hashStream = [System.IO.File]::OpenRead($_.FullName)
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    try { $digest = [BitConverter]::ToString($hasher.ComputeHash($hashStream)).Replace('-','').ToLowerInvariant() }
    finally { $hashStream.Dispose(); $hasher.Dispose() }
    "$digest  $($_.Name)"
}
# LF endings so `sha256sum -c` works as well as PowerShell's Get-FileHash.
[System.IO.File]::WriteAllText((Join-Path $releaseDir 'SHA256SUMS.txt'),(($hashLines -join "`n") + "`n"))
Write-Output "Paquete listo: $releaseDir"
