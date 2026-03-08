$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -Path $repoRoot

if (-not (Test-Path -Path 'logs')) {
    New-Item -ItemType Directory -Path 'logs' | Out-Null
}

$nodePath = (Get-Command node).Source
& $nodePath 'scripts/watcher.js' >> 'logs/watcher.log' 2>> 'logs/watcher-error.log'
