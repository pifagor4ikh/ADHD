param([switch]$Smoke)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'plugins/codex'
$target = Join-Path $root '.TMP/codex-plugin'
New-Item -ItemType Directory -Force $target | Out-Null
foreach ($file in @('plugin.json', 'mcp.json', 'package.json', 'package-lock.json', 'server.mjs', 'widget.html', 'widget.js')) {
    Copy-Item -LiteralPath (Join-Path $source $file) -Destination $target
}
npm.cmd ci --prefix $target --cache (Join-Path $root '.TMP/npm-cache') --ignore-scripts
if ($LASTEXITCODE) { exit $LASTEXITCODE }

if ($Smoke) {
    Copy-Item -LiteralPath (Join-Path $root 'tests/codex-mcp-smoke.mjs') -Destination $target
    node (Join-Path $target 'codex-mcp-smoke.mjs')
    if ($LASTEXITCODE) { exit $LASTEXITCODE }
}
