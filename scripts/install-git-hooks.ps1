$ErrorActionPreference = 'Stop'

Write-Host "Configuring local git hooks path..."
git config core.hooksPath .githooks

Write-Host "Done. Pre-commit secret scanning is now enabled via .githooks/pre-commit"
Write-Host "If gitleaks is not installed, install it from: https://github.com/gitleaks/gitleaks"
