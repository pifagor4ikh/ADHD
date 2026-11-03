param([switch]$UpdateLock)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectRoot = Split-Path $PSScriptRoot
Set-Location $projectRoot
if ((node --version) -ne "v$((Get-Content .node-version).Trim())") {
    throw 'Install the Node version from .node-version first.'
}
if ((node -p "process.platform + '-' + process.arch") -ne 'win32-x64') {
    throw 'This bootstrap currently supports Windows x64 only.'
}
$temporaryRoot = Join-Path $projectRoot '.TMP'
New-Item -ItemType Directory -Force "$temporaryRoot/tooling", "$temporaryRoot/deps", "$temporaryRoot/tmp" | Out-Null
$env:TEMP = "$temporaryRoot/tmp"
$env:TMP = $env:TEMP
$env:npm_config_cache = "$temporaryRoot/npm-cache"
$env:ELECTRON_CACHE = "$temporaryRoot/electron-cache"
$env:electron_config_cache = $env:ELECTRON_CACHE
$env:npm_config_audit = 'false'
$env:npm_config_fund = 'false'
$env:npm_config_update_notifier = 'false'
$archive = "$temporaryRoot/tooling/npm-11.6.2.tgz"
if (-not (Test-Path $archive)) {
    Invoke-WebRequest 'https://registry.npmjs.org/npm/-/npm-11.6.2.tgz' -OutFile $archive -TimeoutSec 120
}
$digest = [Convert]::ToBase64String([Security.Cryptography.SHA512]::Create().ComputeHash([IO.File]::ReadAllBytes($archive)))
if ($digest -ne '7iKzNfy8lWYs3zq4oFPa8EXZz5xt9gQNKJZau3B1ErLBb6bF7sBJ00x09485DOvRT2l5Gerbl3VlZNT57MxJVA==') {
    throw 'npm archive integrity check failed.'
}
tar -xzf $archive -C "$temporaryRoot/tooling"
if ($LASTEXITCODE -ne 0) { throw 'npm extraction failed.' }
Copy-Item package.json "$temporaryRoot/deps/package.json"
if (Test-Path package-lock.json) { Copy-Item package-lock.json "$temporaryRoot/deps/package-lock.json" }
$npmCli = "$temporaryRoot/tooling/package/bin/npm-cli.js"
if ($UpdateLock) {
    node $npmCli install --package-lock-only --ignore-scripts --prefix "$temporaryRoot/deps"
    if ($LASTEXITCODE -ne 0) { throw 'Lockfile generation failed.' }
    Copy-Item "$temporaryRoot/deps/package-lock.json" package-lock.json
} else {
    node $npmCli ci --prefix "$temporaryRoot/deps"
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    # Use PowerShell's Windows networking and the checksum from the locked Electron package.
    $electronRoot = "$temporaryRoot/deps/node_modules/electron"
    $version = (Get-Content "$electronRoot/package.json" -Raw | ConvertFrom-Json).version
    $filename = "electron-v$version-win32-x64.zip"
    New-Item -ItemType Directory -Force $env:ELECTRON_CACHE, "$electronRoot/dist" | Out-Null
    $binaryArchive = Join-Path $env:ELECTRON_CACHE $filename
    if (-not (Test-Path $binaryArchive)) {
        Invoke-WebRequest "https://github.com/electron/electron/releases/download/v$version/$filename" -OutFile $binaryArchive -TimeoutSec 300
    }
    $expected = (Get-Content "$electronRoot/checksums.json" -Raw | ConvertFrom-Json).$filename
    if (-not $expected -or (Get-FileHash $binaryArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) {
        throw 'Electron archive integrity check failed; review/remove the cached archive before retrying.'
    }
    tar -xf $binaryArchive -C "$electronRoot/dist"
    if ($LASTEXITCODE -ne 0) { throw 'Electron extraction failed.' }
    [IO.File]::WriteAllText("$electronRoot/path.txt", 'electron.exe')
}
