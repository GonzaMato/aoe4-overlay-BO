$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$packageInfo = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json
$tauriInfo = Get-Content -LiteralPath 'src-tauri/tauri.conf.json' -Raw | ConvertFrom-Json
$releaseVersion = $packageInfo.version
if ($releaseVersion -ne $tauriInfo.version) { throw 'Las versiones no coinciden.' }
$installerPath = Join-Path $projectRoot "src-tauri/target/release/bundle/nsis/AoE4 Overlay_${releaseVersion}_x64-setup.exe"
if (-not (Test-Path -LiteralPath $installerPath)) { throw 'Generá primero el instalador con npm run installer.' }
$releaseDir = Join-Path $projectRoot "release/$releaseVersion"
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
Copy-Item -LiteralPath $installerPath -Destination $releaseDir
foreach ($releaseFile in @('LICENSE','static/builds/starter-pack.json','docs/quick-start.md','docs/compatibility.md','docs/build-pack-sources.md',"docs/releases/$releaseVersion.md")) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $releaseFile) -Destination $releaseDir
}

# An explicit source allowlist includes current work, not caches, user stores or secrets.
$sourceRoots = @('src','static','tests','scripts','.github','src-tauri/src','src-tauri/assets','src-tauri/icons','src-tauri/capabilities')
$sourceFiles = @('package.json','package-lock.json','svelte.config.js','vite.config.js','tsconfig.json','README.md','LICENSE','.gitignore','src-tauri/Cargo.toml','src-tauri/Cargo.lock','src-tauri/tauri.conf.json','src-tauri/build.rs','src-tauri/.gitignore','docs/quick-start.md','docs/compatibility.md','docs/build-pack-sources.md',"docs/releases/$releaseVersion.md")
$filesToArchive = @()
foreach ($folder in $sourceRoots) { if (Test-Path -LiteralPath $folder) { $filesToArchive += Get-ChildItem -LiteralPath $folder -File -Recurse } }
foreach ($file in $sourceFiles) { if (Test-Path -LiteralPath $file) { $filesToArchive += Get-Item -LiteralPath $file } }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $releaseDir "aoe4-overlay-$releaseVersion-source.zip"
$stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in ($filesToArchive | Sort-Object FullName -Unique)) {
        $relative = $file.FullName.Substring($projectRoot.Length + 1).Replace('\','/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,"aoe4-overlay-$releaseVersion/$relative",[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose(); $stream.Dispose() }
$hashLines = Get-ChildItem -LiteralPath $releaseDir -File | Where-Object Name -ne 'SHA256SUMS.txt' | Sort-Object Name | ForEach-Object {
    $hashStream = [System.IO.File]::OpenRead($_.FullName)
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    try { $digest = [BitConverter]::ToString($hasher.ComputeHash($hashStream)).Replace('-','').ToLowerInvariant() }
    finally { $hashStream.Dispose(); $hasher.Dispose() }
    "$digest  $($_.Name)"
}
[System.IO.File]::WriteAllLines((Join-Path $releaseDir 'SHA256SUMS.txt'),[string[]]$hashLines)
Write-Output "Paquete listo: $releaseDir"
