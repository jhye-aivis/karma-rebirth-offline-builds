# KARMA REBIRTH Wave16: Windows-local offline HTTP server (PowerShell 5.1+).
# Listen on 127.0.0.1 only. Never allows paths outside this extracted ZIP.
param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$port = 8877
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
try {
    $listener.Start()
    $url = "http://127.0.0.1:$port/three-d/index.html"
    Write-Host "KARMA REBIRTH / Windows offline build: $url"
    Write-Host "Only this computer can connect. Press Ctrl+C to stop."
    if (-not $NoBrowser) { Start-Process $url }
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 8000
            $client.SendTimeout = 8000
            $stream = $client.GetStream()
            $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
            $request = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($request)) { continue }
            while ($true) {
                $h = $reader.ReadLine()
                if ($null -eq $h -or $h.Length -eq 0) { break }
            }
            $fields = $request.Split(' ')
            $method = $fields[0]
            $requestPath = if ($fields.Length -gt 1) { $fields[1].Split('?')[0] } else { '/' }
            $path = [Uri]::UnescapeDataString($requestPath).Replace('/', [IO.Path]::DirectorySeparatorChar).TrimStart([char]'\', [char]'/')
            if ([string]::IsNullOrWhiteSpace($path)) { $path = 'three-d\index.html' }
            $full = [IO.Path]::GetFullPath((Join-Path $root $path))
            $safe = $full.StartsWith(($root.TrimEnd('\') + '\'), [StringComparison]::OrdinalIgnoreCase)
            $found = $safe -and (Test-Path -LiteralPath $full -PathType Leaf)
            $status = if ($method -notin @('GET','HEAD')) { 405 } elseif (-not $found) { 404 } else { 200 }
            $mime = switch ([IO.Path]::GetExtension($full).ToLowerInvariant()) {
                '.html' { 'text/html; charset=utf-8' }
                '.js'   { 'text/javascript; charset=utf-8' }
                '.css'  { 'text/css; charset=utf-8' }
                '.png'  { 'image/png' }
                '.jpg'  { 'image/jpeg' }
                '.glb'  { 'model/gltf-binary' }
                '.gltf' { 'model/gltf+json' }
                '.json' { 'application/json' }
                '.txt'  { 'text/plain; charset=utf-8' }
                default { 'application/octet-stream' }
            }
            $content = if ($status -eq 200) { [IO.File]::ReadAllBytes($full) } else { [Text.Encoding]::UTF8.GetBytes("HTTP $status") }
            $reason = switch ($status) { 200 {'OK'} 404 {'Not Found'} default {'Method Not Allowed'} }
            $header = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status $reason`r`nContent-Type: $mime`r`nContent-Length: $($content.Length)`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n")
            $stream.Write($header,0,$header.Length)
            if ($method -ne 'HEAD') { $stream.Write($content,0,$content.Length) }
        } catch {
            Write-Host "Request failed: $($_.Exception.Message)"
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
