<#Requires -Version 7
  OpenCode Chat 一鍵啟動腳本

  1) 背景啟動 `opencode serve`
  2) 從 index.html 的 CONFIG 讀取專案目錄並預熱(pre-warm)
  3) 啟動靜態伺服器並開啟瀏覽器
#>
param(
  [string]$ServePort = "4096",
  [int]$HttpPort = 8000,
  [string]$Dir = $PSScriptRoot
)

$ErrorActionPreference = "Stop"
$BaseUrl = "http://127.0.0.1:$ServePort"

foreach ($cmd in @("opencode", "python", "curl")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Error "找不到執行檔: $cmd (請確認已安裝且在 PATH 中)"
  }
}

$htmlPath = Join-Path $Dir "index.html"
if (-not (Test-Path -LiteralPath $htmlPath)) {
  Write-Error "找不到 $htmlPath"
}

$html = Get-Content -LiteralPath $htmlPath -Raw
$dirs = [regex]::Matches($html, 'directory: "(.*?)"') |
  ForEach-Object { $_.Groups[1].Value.Trim() } |
  Where-Object { $_ -and $_ -notmatch "PATH_TO" } |
  ForEach-Object { $_.Replace("\\", "\") }

Write-Host "==> 專案目錄:" -ForegroundColor Cyan
$dirs | ForEach-Object { Write-Host "    $_" }
if ($dirs.Count -eq 0) {
  Write-Warning "未從 index.html 讀到有效專案路徑(可能仍是佔位),將跳過預熱。"
}

Write-Host "==> 啟動 opencode serve (port $ServePort) ..." -ForegroundColor Cyan
# opencode 是 npm shim(opencode.ps1/.cmd),Start-Process 對裸指令名無法解析,
# 需經 cmd.exe 包一層啟動(實測確認 serve 可連線)。
$serve = Start-Process -FilePath $env:ComSpec -ArgumentList @("/c", "opencode", "serve", "--port", $ServePort) -WindowStyle Hidden -PassThru

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/doc" -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch {
    # 尚未就緒,繼續輪詢
  }
}
if (-not $ready) {
  Write-Warning "serve 未在預期時間內就緒,仍繼續執行預警與靜態伺服器..."
} else {
  Write-Host "== serve 已就緒" -ForegroundColor Green
}

foreach ($d in $dirs) {
  $enc = [uri]::EscapeDataString($d)
  Write-Host "== 預熱: $d" -ForegroundColor Cyan
  & "curl.exe" --silent --max-time 2 "$BaseUrl/event?directory=$enc" | Out-Null
}

Write-Host "== 啟動靜態伺服器 (http://127.0.0.1:$HttpPort) ..." -ForegroundColor Cyan
# 綁定 127.0.0.1(IPv4)並用 127.0.0.1 開啟頁面:python http.server 預設不聽 IPv6,
# 瀏覽器若解析 localhost -> ::1 會連不上而看到"無法連上網站",導致頁面完全打不開。
$http = Start-Process -FilePath "python" -ArgumentList @("-m", "http.server", "$HttpPort", "--bind", "127.0.0.1") -WorkingDirectory $Dir -PassThru

$httpReady = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$HttpPort/index.html" -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $httpReady = $true; break }
  } catch {
    # 尚未就緒,繼續輪詢
  }
}
if (-not $httpReady) {
  Write-Host ""
  Write-Host "!! 靜態伺服器未在預期時間內就緒。可能原因:port $HttpPort 被佔用,或 python 啟動失敗。" -ForegroundColor Red
  Write-Host "   請先執行下方指令釋放 port 後再重試:" -ForegroundColor Yellow
  Write-Host "     Get-NetTCPConnection -LocalPort $HttpPort | Select OwningProcess" -ForegroundColor DarkGray
  Write-Host "     Stop-Process -Id <OwningProcess> -Force" -ForegroundColor DarkGray
  Write-Host "   或改以 http://127.0.0.1:$HttpPort/index.html 手動開啟。" -ForegroundColor DarkGray
} else {
  Write-Host "== 靜態伺服器已就緒" -ForegroundColor Green
}

Start-Process "http://127.0.0.1:$HttpPort/index.html"

Write-Host ""
$listenPid = (Get-NetTCPConnection -LocalPort $ServePort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
Write-Host "服務已啟動。停止方式(任一):" -ForegroundColor Yellow
Write-Host "  Stop-Process -Id $listenPid -Force      # 停止 opencode serve" -ForegroundColor DarkGray
Write-Host "  Stop-Process -Id $($http.Id) -Force     # 停止 http.server" -ForegroundColor DarkGray
Write-Host "  或 Ctrl+C 關閉本視窗後,執行 Get-NetTCPConnection -LocalPort $ServePort 查看剩餘 pid 再停。" -ForegroundColor DarkGray