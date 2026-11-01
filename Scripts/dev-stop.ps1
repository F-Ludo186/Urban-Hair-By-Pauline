$file = Join-Path (Split-Path -Parent $PSScriptRoot) ".dev-pids"
if (Test-Path $file) {
  (Get-Content $file) -split "," | ForEach-Object { taskkill /PID $_ /T /F | Out-Null }
  Remove-Item $file
}