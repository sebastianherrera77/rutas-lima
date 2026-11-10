$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:PYTHONPATH = Join-Path $PSScriptRoot '.deps'
$runtime = Get-ChildItem -LiteralPath 'C:\Program Files\WindowsApps' -Directory -Filter 'OpenAI.CodexPrimaryRuntime*' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName 'dependencies\python\python.exe' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $runtime) {
    $bundled = 'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1105-1297-0_26.1105.1297.0_x64__3k8sg7r9htsxt\dependencies\python\python.exe'
    if (Test-Path -LiteralPath $bundled) { $runtime = $bundled } else { $runtime = (Get-Command python -ErrorAction Stop).Source }
}
& $runtime preparar_red.py
