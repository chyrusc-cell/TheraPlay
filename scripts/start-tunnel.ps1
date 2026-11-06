<#
 TheraPlay: share the app through two temporary Cloudflare Quick Tunnels (OPTIONAL helper).

 What it does (see TUNNEL.md):
   1. checks that cloudflared and php are installed (installs nothing),
   2. starts a tunnel to the Laravel API (http://127.0.0.1:8000) and one to the
      frontend (http://127.0.0.1:5173) and reads their https://*.trycloudflare.com URLs,
   3. opens two PowerShell windows: the Laravel API and the frontend, each started with
      the tunnel URLs as PROCESS environment variables only
        backend : APP_URL, FRONTEND_URL, CORS_ALLOWED_ORIGINS, APP_DEBUG=false
        frontend: VITE_API_URL
   4. prints the frontend URL to share.

 It never writes backend\.env or any file in the project, never runs migrations or
 seeders, and never touches the database. XAMPP MySQL must already be running.

 Usage (from the repo root, in PowerShell):
   .\scripts\start-tunnel.ps1             # frontend dev server (hot reload)
   .\scripts\start-tunnel.ps1 -Preview    # production build + preview server (recommended for sharing)
   .\scripts\start-tunnel.ps1 -TunnelsOnly  # only the two tunnels; start the servers yourself
#>
param(
    [switch]$Preview,
    [switch]$TunnelsOnly
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host 'cloudflared is not installed. Install it once, then open a NEW terminal:' -ForegroundColor Yellow
    Write-Host '    winget install --id Cloudflare.cloudflared'
    exit 1
}

if (-not $TunnelsOnly -and -not (Get-Command php -ErrorAction SilentlyContinue)) {
    Write-Host 'php was not found in this terminal (Herd/XAMPP PHP must be on PATH).' -ForegroundColor Yellow
    exit 1
}

function Start-QuickTunnel([string]$Name, [string]$Target) {
    $log = Join-Path $env:TEMP "theraplay-tunnel-$Name.log"
    Remove-Item $log, "$log.out" -ErrorAction SilentlyContinue

    $process = Start-Process cloudflared `
        -ArgumentList @('tunnel', '--no-autoupdate', '--url', $Target) `
        -RedirectStandardError $log -RedirectStandardOutput "$log.out" `
        -WindowStyle Hidden -PassThru

    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $log) {
            $match = [regex]::Match((Get-Content $log -Raw), 'https://[a-z0-9-]+\.trycloudflare\.com')
            if ($match.Success) {
                return @{ Url = $match.Value; Process = $process }
            }
        }
        if ($process.HasExited) { break }
    }

    Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
    throw "Could not get a tunnel URL for $Name. See $log"
}

Write-Host 'Starting tunnels...'
$api = Start-QuickTunnel 'api' 'http://127.0.0.1:8000'
$web = Start-QuickTunnel 'web' 'http://127.0.0.1:5173'

Write-Host ''
Write-Host "API tunnel      : $($api.Url)"
Write-Host "Frontend tunnel : $($web.Url)"

if (-not $TunnelsOnly) {
    $apiEnv = "`$env:APP_URL='$($api.Url)'; `$env:FRONTEND_URL='$($web.Url)'; " +
        "`$env:CORS_ALLOWED_ORIGINS='$($web.Url),http://localhost:5173,http://127.0.0.1:5173'; " +
        "`$env:APP_DEBUG='false'"

    # php -S with Laravel's own router script (what "artisan serve" runs). Environment
    # variables set here win over backend\.env, which is never modified.
    # It must run from backend\public (as artisan serve does).
    $serve = "php -S 127.0.0.1:8000 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "$apiEnv; Set-Location '$root\backend\public'; $serve"

    if ($Preview) {
        $webCmd = "`$env:VITE_API_URL='$($api.Url)/api'; Set-Location '$root'; npm run build; npx vite preview --host 127.0.0.1 --port 5173 --strictPort"
    } else {
        $webCmd = "`$env:VITE_API_URL='$($api.Url)/api'; Set-Location '$root'; npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"
    }
    Start-Process powershell -ArgumentList '-NoExit', '-Command', $webCmd
}

Write-Host ''
Write-Host "Share this link with your groupmates: $($web.Url)" -ForegroundColor Green
Write-Host 'Press Enter here to stop BOTH tunnels (close the two server windows yourself).'
[void](Read-Host)

Stop-Process -Id $api.Process.Id, $web.Process.Id -ErrorAction SilentlyContinue
Write-Host 'Tunnels stopped.'
