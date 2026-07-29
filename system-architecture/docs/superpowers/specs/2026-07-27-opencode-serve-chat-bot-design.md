# 設計文件：OpenCode Serve Chat Bot

**日期**：2026-07-27
**版本**：1.0
**參考**：`docs/requirements-analysis.md` FR-14 ~ FR-17

---

## 1. 系統架構

```
┌───────────────────────────────────────────────────┐
│  Web Menu (iframe)                                 │
│  ┌────────────────┐  ┌──────────────────────────┐  │
│  │ Agent Server   │  │ Chat Bot                 │  │
│  │ Management     │  │ ├─ Session Tree (內頁左) │  │
│  │ (卡片式 UI)    │  │ └─ Conversation (內頁右) │  │
│  └────────────────┘  └──────────────────────────┘  │
│          │                      │                   │
│          ▼                      ▼                   │
│  ┌────────────────────────────────────────────┐    │
│  │         opencode-manager.js (lib)          │    │
│  │  localStorage CRUD (server 設定)            │    │
│  │  /api/opencode/:serverId/* 請求工廠         │    │
│  │  Server 生命週期管理 (健康檢查 + directory 快取) │    │
│  └──────────────┬─────────────────────────────┘    │
└─────────────────┼──────────────────────────────────┘
                  │ HTTP fetch → localhost:3001
┌─────────────────▼──────────────────────────────────┐
│  AI Proxy (Express, port 3001)                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ /api/opencode/:serverId/*                    │  │
│  │  - 查詢 server 設定 (來自記憶體)              │  │
│  │  - 附加 Basic Auth header                    │  │
│  │  - 轉發所有 HTTP method / body / headers     │  │
│  │  - SSE 串流支援                              │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ /api/providers/:type/* (既有路由, 不變動)    │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────┬──────────────────────────────────┘
                  │ HTTP
┌─────────────────▼──────────────────────────────────┐
│  opencode serve (default port 4096)                 │
│  GET  /project, /session, /session/:id/message      │
│  POST /session, /session/:id/message                │
│  PATCH/DELETE /session/:id                          │
│  GET  /event (SSE), /config/providers, /agent       │
└────────────────────────────────────────────────────┘
```

### Menu 結構（更新後）

```
靜態 MENU_CONFIG (config/menu.js):
- Dashboard(demo)
- Settings(demo)
- External Tools(demo)
- 供應商設定
- Agent App (新)
  ├─ Agent Server 管理 (固定, pages/agent-server-management.html)
  └─ [動態 project 項目, 來自已連線的 Agent Server]

動態項目 (由 opencode-manager 在執行期注入):
- Agent App
  ├─ Agent Server 管理
  ├─ Menu_System      → chat-bot.html?serverId=xxx&worktree=C:\D\ai_cli\Menu_System
  └─ Plan_SKILL       → chat-bot.html?serverId=yyy&worktree=C:\D\ai_cli\Plan_SKILL

資料來源：`fetchSessionDirectories()` → `GET /session` 回傳所有 sessions → 取出唯一 `directory` 欄位
```

## 2. 元件設計

### 2A. `lib/opencode-manager.js` — 共用函式庫

**儲存**：`localStorage` key `opencode_servers`

```json
{
  "servers": [
    {
      "id": "srv-a1b2",
      "name": "Dev Server",
      "host": "localhost",
      "port": 4096,
      "username": "opencode",
      "password": "my-password",
      "status": "connected",
      "projects": [
        { "name": "my-project", "path": "/path/to/my-project" },
        { "name": "another", "path": "/path/to/another" }
      ],
      "lastConnected": "2026-07-27T10:00:00Z",
      "lastError": null
    }
  ]
}
```

**公開方法**：
| 方法 | 說明 | 對應 Proxy 路由 |
|------|------|----------------|
| `getServers()` | 取得所有 server 設定 | - |
| `getServerById(id)` | 依 ID 查詢 | - |
| `saveServer(server)` | 新增/更新 server | - |
| `deleteServer(id)` | 刪除 server | - |
| `checkHealth(id)` | 健康檢查 → 更新 status | `GET /api/opencode/:id/health` |
| `fetchProjects(id)` | (legacy) 抓 git project 列表 | `GET /api/opencode/:id/project` |
| `fetchSessionDirectories(id)` | 取 sessions 的唯一 directory 列表 | `GET /api/opencode/:id/session` |
| `refreshAllServers()` | 批量檢查所有 server + 更新 Menu | - |
| `apiCall(id, method, path, body?)` | 通用 API 請求 | `[method] /api/opencode/:id/:path` |

### 2B. `pages/agent-server-management.html` — Server 管理頁面

沿用 `provider-management.html` 的卡片式 UI 模式：

**卡片收合狀態**：
```
┌─────────────────────────────────────────────┐
│ 🤖 Dev Server                  🟢 已連線  ▼ │
│    localhost:4096                            │
└─────────────────────────────────────────────┘
```

**卡片展開狀態**：
```
┌─────────────────────────────────────────────┐
│ 🤖 Dev Server                  🟢 已連線  ▲ │
├─────────────────────────────────────────────┤
│ 名稱: [Dev Server]                           │
│ Host: [localhost]                            │
│ Port: [4096]                                 │
│ Username: [opencode]                         │
│ Password: [********]                         │
│                                              │
│ [測試連線] [儲存] [刪除]                      │
│                                              │
│ Directories (9):                             │
│ 📁 Menu_System                               │
│ 📁 Plan_SKILL                                │
│ 📁 OrientAI_產品_ppt                         │
│ ...                                          │
└─────────────────────────────────────────────┘
```

**按鈕行為**：
- **測試連線** → `checkHealth()` → 更新狀態綠燈/紅燈
- **儲存** → `saveServer()` → 若狀態為 connected → `fetchSessionDirectories()` → `refreshMenu()`
- **刪除** → `deleteServer()` → `refreshMenu()`

### 2C. 動態 Menu 機制（修改 `components/menu.js`）

**新增方法**：

```javascript
MenuManager.addDynamicItems(parentId, items)
// items: [{ id, label, path, icon, serverId }]
// 掛載在 MENU_CONFIG 的特定 parentId 下
```

**render 流程修改**：
```
render():
  1. 複製 window.MENU_CONFIG (deep clone)
  2. 從 opencode-manager 取得動態項目
  3. 找到 parentId 'agent-app' 的 children
  4. 保留固定項目 (Agent Server 管理)
  5. 插入動態 directory 項目 (來 fetchSessionDirectories)
  6. 渲染最終的 menu tree
```

**觸發時機**：
1. 新增/編輯 Agent Server 且連線成功後 → `refreshMenu()`
2. 刪除 Agent Server 後 → `refreshMenu()`
3. `index.html` DOMContentLoaded 後 → `app.js` 呼叫 `OpenCodeManager.init()` → `refreshMenu()`

**資料來源變更**（v1→v2）：
- v1：從 `server.projects`（git repos, `GET /project`）取得 Menu 項目
- v2：從 `fetchSessionDirectories()`（`GET /session` 的 `directory` 去重）取得 Menu 項目

### 2D. `pages/chat-bot.html` — Chat Bot 頁面

**Layout**（左右分割）：

```
┌────────────────────────────────────────────────────┐
│  [Menu_System]     [Provider: claude-sonnet ▼] [⚙]│
├──────────────────────┬─────────────────────────────┤
│  Sessions             │  Conversation               │
│  [+ New] [↻]         │                             │
│                       │  ┌──────────────────────┐  │
│  ├ 💬 需求分析        │  │ User: ...            │  │
│  ├ 💬 初步討論       │  ├──────────────────────┤  │
│  ├ 💬 修復           │  │ Assistant: ...       │  │
│  └ 💬 優化           │  └──────────────────────┘  │
│                       │                             │
│                       │  [輸入訊息............][▶] │
└──────────────────────┴─────────────────────────────┘
```

**Session 載入邏輯（重要設計變更）**：

因 `opencode serve` 的 REST API 限制：
- `POST /session` **忽略** `projectID`、`directory`、`path` 參數 → 所有 API 建立的 session 的 `projectID` 固定為 `"global"`
- `GET /session?projectID=xxx` 也無法正確過濾（serve 端所有 session 的 `projectID` 都是 `"global"`）
- `GET /session?directory=xxx` 可過濾，但僅對 Web UI 建立的 session 有效

因此實作 **client‑side 過濾**：
1. `GET /session` 取得所有 sessions
2. 用 `directory` 前綴比對 worktree 路徑：`s.directory.startsWith(worktree)`
3. localStorage 輔助映射（`sessionID → worktree`）用於 API 建立的 session

**Session 樹**：
- 扁平列表（無 folder 分層），每個 session 以 💬 圖示顯示
- 點選 → 載入該 session 的歷史訊息
- [+ New] → `POST /session` 建立新 session，寫入 localStorage 映射
- [↻] → 重新整理 session 列表
- 右鍵 → 重新命名 / 刪除

**供應商/模型選擇器**：
- 從 `GET /config/providers` 取得可用的 providers + default model
- Dropdown 顯示 provider/model 組合
- 可在發送訊息時覆蓋（`body.model = { modelID, providerID }`）

**專案切換**：
- Header 右側的 [⚙] 開啟切換 dialog
- `GET /project` 列出所有 git project → 點選後以 `worktree` 為參數 reload
- 切換後 reload chat-bot page：`chat-bot.html?serverId=xxx&worktree=yyy`

**訊息串流（SSE）**：
- 前端在發送 `POST /session/:id/message` 前，先用 **`EventSource`** 開啟 `GET /event` 連線
- 監聽 `message.part.delta`（`field=text`）事件，即時附加到 assistant bubble
- `POST` 完成後關閉 `EventSource`，從回應中取出 model label + 回應時間更新 metadata
- 若 SSE 連線失敗（`sseReceivedData=false`），自動降級為傳統完整回應顯示
- **前提**：頁面需從同源 Web Server 載入（`EventSource` 在 `file://` 下被封鎖）
- 2026-07-27 起 proxy 同時 serve 靜態檔案，`http://localhost:3001/` 同源載入即可

```
發送流程：
  1. new EventSource('http://localhost:3001/api/opencode/:serverId/event')
  2. POST /session/:id/message（與 SSE 並行）
  3. EventSource.onmessage 收到 message.part.delta → 逐字更新 bubble
  4. POST 完成 → EventSource.close()
  5. 從 POST response 更新 model/time metadata
  6. 若 SSE 無資料 → 直接用 POST response 完整顯示（fallback）
```

### 2E. AI Proxy opencode 路由（修改 `ai-proxy/server.js`）

```javascript
// 通用轉發路由
app.all('/api/opencode/:serverId/*', async (req, res) => {
  const serverId = req.params.serverId
  const targetPath = req.params[0] || ''

  // 從記憶體取得 server 設定
  const server = getServerConfig(serverId)
  if (!server) {
    return res.status(404).json({ error: 'Agent Server 未找到' })
  }

  const targetUrl = `http://${server.host}:${server.port}/${targetPath}`
  const headers = { ...req.headers }
  delete headers.host

  // 附加 Basic Auth
  if (server.username && server.password) {
    const encoded = Buffer.from(`${server.username}:${server.password}`).toString('base64')
    headers['Authorization'] = `Basic ${encoded}`
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    })

    // SSE 串流支援
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream')
      response.body.pipe(res)
      return
    }

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    res.status(502).json({ error: '無法連線到 Agent Server', details: error.message })
  }
})
```

**Server 設定來源 — 方案 B2（設計決策）**：

AI Proxy 使用記憶體 (`Map`) + `servers.json` 檔案持久化儲存 server 連線設定。
```
ai-proxy/
├── server.js
├── servers.json      ← 持久化檔案，Proxy 重啟時自動讀取
└── package.json
```

**密碼處理**：password 欄位以 Base64 編碼存入 `servers.json`（防肩窺，非真正加密）。

**流程**：
1. Agent Server 管理頁面儲存 server 時 → `POST /api/opencode/servers` → Proxy 存入 Map + 寫入 `servers.json`
2. 前端發送請求只帶 `serverId` → Proxy 從 Map 查詢 host/port/auth → 自動附加 Basic Auth → 轉發到 opencode serve
3. Proxy 重啟時 → 讀取 `servers.json` → 重建 Map

**API 端點**：
- `GET  /api/opencode/servers` — 列出所有 server 設定（前端初始化時同步）
- `POST /api/opencode/servers` — 新增/更新 server 設定
- `DELETE /api/opencode/servers/:serverId` — 刪除 server 設定

## 3. 資料流

### 流程：新增 Agent Server

```
使用者填寫名稱/host/port/認證 → 點擊「測試連線」
  → opencode-manager.checkHealth(id)
  → GET /api/opencode/:id/health
  → AI Proxy → GET http://host:port/global/health
  → 回傳健康狀態 → 前端更新卡片狀態 → 🟢

使用者點擊「儲存」
  → opencode-manager.saveServer(data)
  → localStorage 寫入
  → 若狀態為 connected →
      fetchSessionDirectories(id) → GET /api/opencode/:id/session
      → 前端取出唯一 directory 欄位 → 存入 server.directories
      → refreshMenu() → Menu 動態新增 directory 項目
```

### 流程：載入 Sessions（`directory` 過濾）

```
chat-bot.html?serverId=xxx&worktree=C:\D\ai_cli\Menu_System

  → loadSessions()
  → GET /api/opencode/:serverId/session (取得所有 sessions)
  → client‑side 過濾:
      ① s.directory.startsWith(worktree)  — 比對目錄前綴
      ② localStorage 映射中有此 session ID — 先前 API 建立的新 session
  → 渲染 session 樹
```

### 流程：發送訊息（SSE 串流）

```
使用者輸入訊息 → 選擇 session → 點擊發送
  ╔══ SSE 背景連線 ════════════════════════════════╗
  ║ 1. new EventSource(/api/opencode/:serverId/event)║
  ║ 2. onmessage 持續監聽 message.part.delta       ║
  ║    → 比對 properties.sessionID === currentId   ║
  ║    → 收到 delta → 即時更新 assistant bubble    ║
  ║ 3. POST 完成後 EventSource.close()             ║
  ╚══════════════════════════════════════════════════╝
  
  → opencode-manager.apiCall(serverId, 'POST', `session/${sessionId}/message`, { parts: [...] })
  → POST /api/opencode/:serverId/session/:id/message
  → AI Proxy → POST http://host:port/session/:id/message (with Basic Auth)
  → opencode 回覆 → AI Proxy 回傳 → 前端更新 metadata (model, time)
```

若 SSE 連線失敗或無資料（`sseReceivedData === false`），前端自動降級為傳統流程：等待 POST 完整回應後一次顯示。

### 流程：瀏覽器開啟頁面（`file://` → `http://`）

```
2026-07-27 變更：
  之前: file:///C:/.../web-menu/index.html（EventSource 被封鎖）
  之後: http://localhost:3001/index.html（Proxy 以 express.static 服務）
  
  → AI Proxy 在 API 路由後新增：
      app.use(express.static(path.join(__dirname, '..', 'web-menu')))
  → 所有靜態資源（.html, .js, .css）由 Proxy 統一提供
  → 頁面與 API 同源（localhost:3001），EventSource / fetch 皆不受 CORS 限制
  
  啟動方式：
  start-services.bat → 自動開啟 http://localhost:3001/pages/provider-management.html
  或手動開啟 http://localhost:3001/index.html
```

## 4. 錯誤處理

| 情境 | 前端呈現 | Proxy 行為 |
|------|---------|-----------|
| Agent Server 離線 | 卡片🔴, Menu 項目灰顯, Chat Bot 顯示錯誤 | 回傳 502 |
| Auth 無效 (401) | 顯示「認證失敗」 | 轉發 401 |
| opencode 版本不相容 | 卡片資訊顯示版本異常 | 檢查 `/global/health` version |
| 連線逾時 (5s) | 「無法連線：連線逾時」 | `AbortSignal.timeout(5000)` |
| SSE 斷線 | 自動重連 (exponential backoff) | 保持連線 |
| 網路錯誤 | Toast 提示「網路異常，請檢查連線」 | - |
| localStorage 滿 | 錯誤提示「儲存空間已滿」 | - |

## 5. 檔案異動清單

| 檔案 | 操作 | 說明 |
|------|------|------|
| `web-menu/config/menu.js` | 修改 | 新增「Agent App」父層選單 |
| `web-menu/lib/opencode-manager.js` | 新增/修改 | opencode serve 連線管理共用庫；後續新增 `fetchSessionDirectories()`、`refreshMenu()` 改為 async |
| `web-menu/pages/agent-server-management.html` | 新增/修改 | Server 管理頁面；測試連線改為抓取 `directories`（取代 `projects`） |
| `web-menu/pages/chat-bot.html` | 新增/修改 | Chat Bot 聊天頁面；session 篩選改為 `directory` 前綴比對，移除 `projectID`/`isSha` 邏輯 |
| `web-menu/components/menu.js` | 修改 | 新增動態 Menu 項目支援 |
| `ai-proxy/server.js` | 修改 | 新增 `/api/opencode/:serverId/*` 路由 + `express.static()` 靜態檔案服務 |
| `start-services.bat` | 修改 | 改為開啟 `http://localhost:3001/...`（取代 `file:///`） |

## 6. API 限制與發現

### 6A. `opencode serve` REST API 限制

| API | 問題 | 狀態 |
|-----|------|------|
| `POST /session` | 忽略 `projectID`、`directory`、`path` — 所有 session 的 `projectID` 固定為 `"global"` | **無法繞過** |
| `GET /session?projectID=xxx` | 無法正確過濾（serve 端無視此參數） | **無法使用** |
| `GET /session?directory=xxx` | 可正確回傳該目錄的 session，但僅適用 Web UI 建立的 | ✅ 可用 |
| `GET /session` | 回傳所有 session，含 `directory` 欄位 | ✅ 用於前綴比對 |
| `POST /session` with `model` | 拒絕 `model` 欄位 — `400 BadRequest` | ❌ 只能透過 `POST /session/:id/message` 的 `body.model` 設定 |
| `GET /event` (SSE) | 推播 `message.part.delta` 事件，含逐字增量文字 | ✅ 用於即時串流顯示 |

### 6B. 桌面版 app 與 `opencode serve` 的差異

| 項目 | 桌面版 app (`opencode` CLI) | `opencode serve` |
|------|---------------------------|-----------------|
| 有無 HTTP API | ❌ 無（僅 CLI / IPC） | ✅ 有 REST API |
| `session.projectId` | 駝峰（`projectId`），值為真實 SHA | 帕斯卡（`projectID`），值永遠 `"global"` |
| 儲存 | `~/.local/share/opencode/...` 資料庫 | 獨立資料庫（依啟動 CWD） |
| 專案過濾 | 依 CLI 啟動時的 CWD | 無（所有 session 混在一起，靠 `directory` 區分） |

**結論**：Web Menu 無法直接連桌面版 app，只能透過 `opencode serve` 的 REST API 操作。session 過濾須採 `directory` 前綴比對。

## 7. 未納入 MVP 項目（已實作項目）

- ~~訊息串流顯示~~ ✅ **2026-07-27 Phase 6 實作**：透過 `GET /event` SSE + `EventSource` 逐字顯示
- Session 拖拉排序
- 多使用者協作
- 歷史訊息全文搜尋
- 離線 queue（localStorage 暫存待發送訊息）
