$reaRuntime = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$reaEntry = Join-Path $PSScriptRoot '../.cache/rea/node_modules/rea-agents/scripts/rea.mjs'
& $reaRuntime $reaEntry @args
exit $LASTEXITCODE
