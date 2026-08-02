# OpenCode Chat — 啟動方法 (quick_start.md)

單檔聊天介面,連線本機 `opencode serve`。本檔說明如何啟動、設定與排障。

## 1. 前置需求

| 項目 | 需求 | 說明 |
|------|------|------|
| opencode CLI | 已安裝且於 PATH | 啟動 serve 用;npm shim(`opencode.ps1/.cmd`)亦可 |
| Python 3 | 於 PATH | 跑靜態伺服器用(`start.ps1` 預設使用) |
| 瀏覽器 | Edge / Chrome | 開啟頁面用 |

## 2. 一鍵啟動(建議)

在 `JohnProj` 目錄執行:

    powershell -ExecutionPolicy Bypass -File .\start.ps1

腳本會依序:
1. 背景啟動 `opencode serve --port 4096`,並輪詢 `/doc` 直到就緒。
2. 從 `index.html` 的 `CONFIG.projects` 讀取專案目錄,對 `/event` 做預熱。
3. 啟動靜態伺服器 `python -m http.server 8000 --bind 127.0.0.1`(綁 IPv4),並確認 8000 就緒。
4. 自動開啟瀏覽器 `http://127.0.0.1:8000/index.html`。

若 8000 起不來,腳本會印出原因與釋放 port 的指令(見第 6 節排障)。

## 3. 手動啟動(不靠腳本)

依序在「JohnProj」所在目錄啟動:

1. 啟動 serve(背景):

       opencode serve --port 4096

2. 啟動靜態伺服器(綁 IPv4,避開 localhost→::1 連不上):

       python -m http.server 8000 --bind 127.0.0.1

3. 瀏覽器開啟:

       http://127.0.0.1:8000/index.html

> 注意:不要用 `file://` 直接開 index.html(CORS 會被擋)。也不要開 `localhost` 版網址;若 `localhost` 被解析成 `::1`,而伺服器只聽 IPv4,會整個打不開。

## 4. 設定(依需求修改)

開啟 `index.html`,編輯頂部 `CONFIG`:

    const CONFIG = {
      baseUrl: "http://127.0.0.1:4096",           // opencode serve 位址
      projects: [
        { label: "專案 A-Fast_Agent", directory: "C:\\D\\ai_cli\\Fast_Agent" },
        { label: "專案 B-寫三總_NGS_報價", directory: "C:\\D\\ai_cli\\三總_NGS_報價" },
      ],
      autoAllowOnce: true,                          // 權限請求自動放行 once
    }

- 新增專案:在 `projects` 加一筆 `{ label, directory }`(directory 要用 `\\` 跳脫反斜線)。
- 改 serve 埠號:同步改 `baseUrl` 與啟動指令。
- 停用權限自動放行:改 `autoAllowOnce: false`。

## 5. 啟動後確認

- 分頁數 = `projects` 筆數;頂部狀態列顯示「已連線(預熱)」。
- log 面板出現各專案「SSE 已連線」。
- 「模型」下拉已列出 provider 與模型(約 90 項)。
- 輸入文字按 Enter 送出,assistant 回覆逐字串流出現。

### 動態加入專案(不用改 CONFIG)

執行中想對新的工作目錄對話,不必編輯 `index.html`:
1. 點 header 的「＋ 專案」。
2. 輸入專案目錄路徑(分頁名稱可留空,預設取目錄名),按「加入」或 Enter。
3. 新分頁隨即建立並連上 SSE,並切為目前工作專案;加入結果會存入瀏覽器的 `localStorage`,下次開啟頁面自動重現。

> 重複加入同一目錄會被拒絕;要移除已加入的專案,清除該站的 localStorage 鍵 `opencodeChat_customProjects` 後重載,或改回以 CONFIG 管理。

## 6. 排障

| 現象 | 原因 / 處理 |
|------|------------|
| 頁面整個打不開(chrome 錯誤頁) | 靜態伺服器沒起來或 port 被佔。執行下方指令查 pid 並停掉,再重跑 start.ps1:<br>`Get-NetTCPConnection -LocalPort 8000 \| Select OwningProcess`<br>`Stop-Process -Id <pid> -Force` |
| 連線失敗/SSE 沒連上 | serve 沒起或埠號不符:確認 `opencode serve --port 4096` 在跑,`baseUrl` 一致 |
| 模型清單空 | serve 剛啟動時可能來不及:頁面會自動重試 5 次;仍空就重載頁面 |
| 選了 LM Studio 模型卻卡住 | `lmstudio`(localhost:1234)未啟動。改用可連線的 provider(例如 `opencode/deepseek-v4-flash-free`) |
| 工具需要權限但被卡住 | 正常應自動放行;若 `autoAllowOnce=false` 需手動處理,或改回 `true` |
| 停止服務 | `Start-Process` 啟動的進程:用各 listener pid 停掉(見上述 Get-NetTCPConnection),或直接關掉執行腳本的視窗後再查剩餘 pid |

## 7. 檔案一覽

| 檔案 | 用途 |
|------|------|
| `index.html` | 聊天介面(唯一的前端交付物) |
| `start.ps1` | 一鍵啟動腳本(serve + 靜態伺服器 + 開瀏覽器) |
| `require.md` | 需求功能文件 |
| `test.md` | 功能測試案例 |
