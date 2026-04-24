# Personal Planner — Ollama Model Setup
# Called by installer after Ollama is installed.
# Usage: setup_models.ps1 -ModelList "llama3.2,mistral,phi3"

param(
    [string]$ModelList = ""
)

# Fall back to env var when launched via Invoke-Expression (execution policy bypass)
if (-not $ModelList) { $ModelList = $env:PP_MODELS }
if (-not $ModelList) { $ModelList = "llama3.2" }

$Host.UI.RawUI.WindowTitle = "Personal Planner — AI Model Setup"

function Write-Header {
    Write-Host ""
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host "   Personal Planner — AI Model Downloader  " -ForegroundColor Cyan
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Wait-Ollama {
    Write-Host "  Waiting for Ollama to start..." -ForegroundColor Yellow
    $timeout = 40
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 2
        $elapsed += 2
        try {
            Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -UseBasicParsing | Out-Null
            Write-Host "  [OK] Ollama is ready." -ForegroundColor Green
            return $true
        } catch {}
        Write-Host "  Still waiting... ($elapsed s)" -ForegroundColor DarkGray
    }
    return $false
}

Write-Header

# ── Check ollama in PATH ──────────────────────────────────────────
$ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollamaCmd) {
    # Try common install location
    $commonPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    if (Test-Path $commonPath) {
        $env:PATH += ";$env:LOCALAPPDATA\Programs\Ollama"
        $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
    }
}
if (-not $ollamaCmd) {
    Write-Host "  [ERROR] Ollama executable not found." -ForegroundColor Red
    Write-Host "  Ollama may need a full system restart to appear in PATH." -ForegroundColor Yellow
    Write-Host "  After restarting, open a terminal and run:" -ForegroundColor Yellow
    Write-Host ""
    foreach ($m in ($ModelList -split ',')) {
        $m = $m.Trim()
        if ($m) { Write-Host "    ollama pull $m" -ForegroundColor White }
    }
    Write-Host ""
    Write-Host "  Press any key to close..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# ── Start Ollama serve if not already running ─────────────────────
$running = $false
try {
    Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 -UseBasicParsing | Out-Null
    $running = $true
    Write-Host "  [OK] Ollama is already running." -ForegroundColor Green
} catch {
    Write-Host "  Starting Ollama service..." -ForegroundColor Yellow
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    $running = Wait-Ollama
}

if (-not $running) {
    Write-Host ""
    Write-Host "  [ERROR] Could not start Ollama. Download models manually later:" -ForegroundColor Red
    foreach ($m in ($ModelList -split ',')) {
        $m = $m.Trim()
        if ($m) { Write-Host "    ollama pull $m" -ForegroundColor White }
    }
    Write-Host ""
    Write-Host "  Press any key to close..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# ── Pull each model ───────────────────────────────────────────────
$models = $ModelList -split ',' | Where-Object { $_.Trim() -ne '' }
$total  = $models.Count
$done   = 0

Write-Host ""
Write-Host "  Downloading $total AI model(s). This may take 10-30 minutes" -ForegroundColor Cyan
Write-Host "  depending on your internet speed. Please keep this window open." -ForegroundColor Cyan
Write-Host ""

foreach ($model in $models) {
    $model = $model.Trim()
    $done++
    Write-Host "  [$done/$total] Pulling: $model" -ForegroundColor Yellow

    $sizes = @{
        'llama3.2' = '~2.0 GB'
        'mistral'  = '~4.1 GB'
        'phi3'     = '~2.3 GB'
        'phi3.5'   = '~2.2 GB'
    }
    $sz = if ($sizes.ContainsKey($model)) { $sizes[$model] } else { 'varies' }
    Write-Host "       Size: $sz  (progress shown below)" -ForegroundColor DarkGray
    Write-Host ""

    & ollama pull $model

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "  [OK] $model downloaded successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  [WARN] Could not download $model (exit $LASTEXITCODE)." -ForegroundColor Yellow
        Write-Host "         Retry later with:  ollama pull $model" -ForegroundColor DarkGray
    }
    Write-Host ""
}

Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host "   All done! AI features are ready to use.  " -ForegroundColor Green
Write-Host "   Open Personal Planner and go to the AI   " -ForegroundColor Green
Write-Host "   tab to start chatting with your models.  " -ForegroundColor Green
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press any key to close this window..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
