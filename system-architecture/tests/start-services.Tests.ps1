param(
    [switch]$Live
)

$ErrorActionPreference = 'Stop'

$script:Live = $Live -or ($env:SMOKE_LIVE -eq '1')

$script:ScriptDir = $PSScriptRoot
$script:ArchRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$script:BatPath = Join-Path $script:ArchRoot 'start-services.bat'
$script:RepoRoot = (Resolve-Path -LiteralPath (Join-Path $script:ArchRoot '..')).Path
$script:ProxyDir = Join-Path $script:RepoRoot 'ai-proxy'
$script:HealthUrl = 'http://localhost:3001/api/health'

Describe 'start-services.bat 位置與路徑' {

    It '存在於 system-architecture 根目錄' {
        Test-Path -LiteralPath $script:BatPath | Should Be $true
    }

    It '倉庫根目錄已無 start-services.bat（已移動）' {
        Test-Path -LiteralPath (Join-Path $script:RepoRoot 'start-services.bat') | Should Be $false
    }

    It 'ai-proxy 目錄存在' {
        Test-Path -LiteralPath $script:ProxyDir | Should Be $true
    }

    It 'ai-proxy 含 package.json 與 node_modules' {
        Test-Path -LiteralPath (Join-Path $script:ProxyDir 'package.json') | Should Be $true
        Test-Path -LiteralPath (Join-Path $script:ProxyDir 'node_modules') | Should Be $true
    }
}

Describe 'start-services.bat 內容完整性' {

    $batContent = Get-Content -LiteralPath $script:BatPath -Raw
    $batLines = Get-Content -LiteralPath $script:BatPath

    It '使用 %~dp0 相對路徑推算' {
        $batContent -match '%~dp0' | Should Be $true
    }

    It '不含殘留硬編絕對路徑 C:\D\ai_cli\Menu_System\ai-proxy' {
        $batContent -notmatch 'C:\\D\\ai_cli\\Menu_System\\ai-proxy' | Should Be $true
    }

    It '含 npm start、健康檢查與入口 URL' {
        $batContent -match 'npm start' | Should Be $true
        $batContent -match '/api/health' | Should Be $true
        $batContent -match 'localhost:3001' | Should Be $true
    }

    It '包含 5 個必要 label' {
        @('menu', 'start', 'stop', 'status', 'end') | ForEach-Object {
            $label = $_
            ($batLines | Where-Object { $_ -match "^:$label$" }) | Should Not BeNullOrEmpty
        }
    }

    It '所有 goto 目標皆有對應 label' {
        $labels = @($batLines | ForEach-Object { if ($_ -match '^:(\w+)') { $matches[1] } })
        $gotos = @($batLines | ForEach-Object { if ($_ -match '\bgoto\s+(\w+)') { $matches[1] } })
        foreach ($g in $gotos) {
            $labels -contains $g | Should Be $true
        }
    }
}

if ($script:Live) {
    Describe 'Live 冒煙：啟動 ai-proxy 並健康檢查' {

        $proc = $null
        $healthy = $false

        try {
            $proc = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $script:ProxyDir -PassThru -WindowStyle Hidden
            for ($i = 0; $i -lt 30; $i++) {
                Start-Sleep -Milliseconds 500
                $code = & curl.exe -s -o NUL -w "%{http_code}" $script:HealthUrl
                if ($code -eq '200') { $healthy = $true; break }
            }

            It 'GET /api/health 回傳 200（與 start-services.bat 同以 curl 驗證）' {
                $healthy | Should Be $true
            }
        } finally {
            if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
        }
    }
}
