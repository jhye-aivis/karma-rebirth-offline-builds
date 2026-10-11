# Wave19: run an A/B Chrome benchmark on the user's OWN Windows device.
# Only official v0.17.0 release bytes are downloaded. No hidden uploads or drivers.
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($PSScriptRoot)
$dir=Join-Path $root 'benchmarks'
$target=Join-Path $dir 'wave17'
$zip=Join-Path $dir 'Wave17_verified_official.zip'
$original='https://github.com/jhye-aivis/karma-rebirth-offline-builds/releases/download/v0.17.0/KARMA_REBIRTH_v0.17.0_Windows_Offline.zip'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
if (!(Test-Path (Join-Path $target 'three-d\index.html'))) {
 Write-Host 'Getting OFFICIAL Wave17 release ZIP for local, same-PC comparison...'
 if (!(Test-Path $zip)) {
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -UseBasicParsing -Uri $original -OutFile $zip
 }
 $size=(Get-Item $zip).Length
 if ($size -ne 48460996) { throw ('Wave17 official package byte count unexpected: '+$size+'. Refusing comparison.') }
 New-Item -ItemType Directory -Force -Path $target | Out-Null
 Expand-Archive -LiteralPath $zip -DestinationPath $target -Force
 if (!(Test-Path (Join-Path $target 'three-d\index.html'))) { throw 'Wave17 package missing game HTML' }
}
$server=$null
try {
 $script=Join-Path $root 'serve_windows.ps1'
 $args='-NoProfile -ExecutionPolicy Bypass -File "'+$script+'" -NoBrowser'
 $server=Start-Process -FilePath "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $args -PassThru
 $ready=$false
 for ($i=0;$i -lt 35;$i++){
  Start-Sleep -Milliseconds 250
  try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8877/COMPARE_WINDOWS.html' -TimeoutSec 3
        if($r.StatusCode -eq 200){$ready=$true;break}
  }catch {}
 }
 if (!$ready) {throw 'The loopback game server did not become ready (port 8877).'}
 $url='http://127.0.0.1:8877/COMPARE_WINDOWS.html'
 Write-Host ('Browser GPU / FPS benchmark: '+$url)
 Write-Host 'Use visible Chrome or Edge window. The results stay LOCAL; click JSON Download to export.'
 Start-Process $url
 Read-Host 'When the benchmark is finished and JSON downloaded, press Enter to close the local server'
}finally{if($server -and !$server.HasExited){Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue}}
