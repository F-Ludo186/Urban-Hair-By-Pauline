$root     = Split-Path -Parent $PSScriptRoot
$backend  = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$envFile  = Join-Path $PSScriptRoot "dev.env.ps1"

if (-not (Test-Path $envFile)) {
  Write-Host "Fichier manquant : scripts/dev.env.ps1 (voir dev.env.example.ps1)"
  exit 1
}

# Terminal 1 : variables d'environnement puis Spring Boot
$cmd1 = ". '$envFile'; mvn.cmd spring-boot:run"
$p1 = Start-Process powershell -WorkingDirectory $backend -PassThru `
  -ArgumentList "-NoExit","-Command",$cmd1

# Terminal 2 : Angular
$p2 = Start-Process powershell -WorkingDirectory $frontend -PassThru `
  -ArgumentList "-NoExit","-Command","npm.cmd start"

"$($p1.Id),$($p2.Id)" | Set-Content (Join-Path $root ".dev-pids")

# Attente que les serveurs répondent (ports à adapter)
foreach ($port in 8080, 4200) {
  $ok = $false
  for ($i = 0; $i -lt 90 -and -not $ok; $i++) {
    $ok = (Test-NetConnection localhost -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
    if (-not $ok) { Start-Sleep -Seconds 2 }
  }
  if ($ok) { Write-Host "Port $port prêt" } else { Write-Host "Port $port inaccessible"; exit 1 }
}