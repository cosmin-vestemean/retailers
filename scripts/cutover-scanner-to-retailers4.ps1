param(
  [switch]$Execute
)

$ErrorActionPreference = 'Stop'

function Invoke-Heroku {
  if ($Execute) {
    Write-Host "> heroku $($args -join ' ')"
    & heroku @args
  } else {
    Write-Host "[dry-run] heroku $($args -join ' ')"
  }
}

Write-Host 'Cutover scanner: retailers1 -> retailers4'
if (-not $Execute) {
  Write-Host 'Dry run only. Re-run with -Execute to apply changes.'
}

Invoke-Heroku config:set ENABLE_SFTP_SCANNER=false -a retailers1
Invoke-Heroku restart -a retailers1

Invoke-Heroku config:set ENABLE_SFTP_SCANNER=true EDI_SCANNER=new DO_RETRY_INTERVAL_MS=300000 -a retailers4
Invoke-Heroku restart -a retailers4

Invoke-Heroku config -a retailers1
Invoke-Heroku config -a retailers4

Write-Host ''
Write-Host 'After execution, verify logs:'
Write-Host '  heroku logs --tail -a retailers1'
Write-Host '  heroku logs --tail -a retailers4'