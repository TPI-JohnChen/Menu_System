# 實作計畫：OpenCode Serve 操作整合（平行一級選單）

## 設計文件參考
`docs/superpowers/specs/2026-08-02-opencode-serve-menu-design.md`

## 任務清單

### Task 1: ai-proxy — query string 轉發修正（B1）
- **範疇**: 修正通用轉發路由 `app.all('/api/opencode/:serverId/*')` 遺漏 query string，使 V1 root 路由的 `?directory=` 可穿透
- **修改檔案**: `ai-proxy/server.js`（`targetUrl` 組裝處，約 line 113）
- **做法**: `const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''`，`targetUrl = http://host:port/${targetPath}${qs}`
- **驗收標準**: `GET /api/opencode/{id}/session?directory=...` 時 mock 上游收到 `?directory=...`
- **依賴關係**: 無

### Task 2: ai-proxy — SSE 長連線修正（B2）
- **範疇**: SSE 分支移除固定 120s `AbortSignal.timeout`，改以 client disconnect 終止上游
- **修改檔案**: `ai-proxy/server.js`（SSE 分支，約 line 136-142）
- **做法**: SSE 分支使用 `AbortController`，`res.on('close', () => controller.abort())`，不設固定 timeout；非 SSE 維持 timeout
- **驗收標準**: SSE 連線存活超過 120s 仍不被掐斷；client 斷線後上游 fetch 被 abort
- **依賴關係**: 無

### Task 3: ai-proxy — Node 整合測試（B1/B2）
- **範疇**: 新增整合測試驗證 Task 1/2 修正
- **修改檔案**: `ai-proxy/tests/opencode-proxy.test.js`（新增）
- **做法**: mock 上游（`http.createServer` echo query + 長 SSE）+ 子程序啟動 `server.js`，驗證：
  1. query string 轉發正確（B1）
  2. SSE 連線 >125s 仍存活、client 斷線後上游中止（B2）
- **驗收標準**: `node tests/opencode-proxy.test.js` 全 PASS
- **依賴關係**: Task 1, Task 2

### Task 4: web-menu — opencode-manager.js 改為 namespace factory
- **範疇**: 將 `OpenCodeManager` 改為 factory 產生多實例，新增專案 CRUD，refreshMenu 支援指定 parentId + server 名前綴
- **修改檔案**: `web-menu/lib/opencode-manager.js`
- **做法**:
  - `OpenCodeManager.create(namespace, { parentId })` 回傳獨立實例（storage key / pending key / parentId 隔離）
  - 既有 `OpenCodeManager` 保留為預設實例（namespace `opencode_servers`、parentId `agent-app`），向後相容
  - 新增 `getProjects(serverId)` / `saveProject(server, project)` / `deleteProject(serverId, projectId)`
  - `refreshMenu()`：遍歷實例內 servers + projects，label = `server名 · 專案label`，掛到實例的 parentId
  - 全域新增 `OpenCodeServeManager = OpenCodeManager.create('opencode_serve_servers', { parentId: 'opencode-serve' })`
- **驗收標準**: v3 頁面（agent-server-management / chat-bot）行為不變；新實例獨立儲存、獨立 Menu
- **依賴關係**: 無

### Task 5: web-menu — 新增「OpenCode Serve」一級選單
- **範疇**: Menu 設定新增一級選單
- **修改檔案**: `web-menu/config/menu.js`
- **做法**: 新增 `{ id: 'opencode-serve', label: { 'zh-TW': 'OpenCode Serve', 'en': 'OpenCode Serve' }, icon: '🔌', dynamic: true, children: [{ id: 'opencode-serve-management', label: { 'zh-TW': 'OpenCode Serve 管理', 'en': 'OpenCode Serve Management' }, path: 'pages/opencode-serve-management.html' }] }`
- **驗收標準**: 選單出現「OpenCode Serve」一級項目 + 管理子項目
- **依賴關係**: 無

### Task 6: web-menu — app.js 初始化新 manager
- **範疇**: 啟動時刷新新選單的動態項目
- **修改檔案**: `web-menu/app.js`
- **做法**: 在 IIFE 中呼叫 `OpenCodeServeManager.init()`
- **驗收標準**: 頁面載入後「OpenCode Serve」選單依定義的 servers/projects 呈現動態項目
- **依賴關係**: Task 4, Task 5

### Task 7: web-menu — 管理頁 opencode-serve-management.html
- **範疇**: 新增 server + 專案管理頁
- **修改檔案**: `web-menu/pages/opencode-serve-management.html`（新增）
- **做法**: 沿用 `agent-server-management.html` 卡片式樣式：
  - Server CRUD（名稱/位址/帳號密碼/測試連線/狀態燈）
  - 每 server 專案管理（label + directory 新增/刪除，同 server 禁重複 directory）
  - 使用 `OpenCodeServeManager`；變更後 `refreshMenu()`
  - 載入 `../lib/i18n.js` + `../lib/iframe-client.js` + `../lib/opencode-manager.js`
- **驗收標準**: 可新增 server → 新增專案 → Menu 出現「server · 專案」項目；刪除 server → Menu 項目移除
- **依賴關係**: Task 4, Task 5

### Task 8: web-menu — 聊天頁 opencode-serve-chat.html
- **範疇**: 新增單一專案聊天頁（改編 `OpenCode_Serve_Proj/index.html`）
- **修改檔案**: `web-menu/pages/opencode-serve-chat.html`（新增）
- **做法**:
  - URL 參數: `serverId`、`worktree`、`label`（`server` 可選顯示）
  - `base = 'http://localhost:3001/api/opencode/' + serverId`，V1 root 路由 + `?directory=<worktree>`
  - 保留 POC 功能: `ensureSession` / SSE 串流（sessionID 過濾）/ Markdown 渲染 / busy-idle + meta / 中斷（永遠可點）/ 新對話（busy 阻擋）/ 模型選擇（重試 5x + 序號守護）/ 權限自動放行（SSE + 1s 輪詢 + 去重）/ 防爆 log
  - 移除分頁列與動態增刪專案 UI（單一專案）
  - 標題 = `label || basename(worktree)`；目錄有效性由 `ensureSession` 的 `GET /session` 驗證
  - 整合 `../lib/i18n.js`（zh-TW/en）+ `../lib/iframe-client.js`（主題）；CSS variables 沿用 POC
- **驗收標準**: 點擊 Menu 專案項目開啟單一專案聊天頁；發送訊息 SSE 逐字串流；模型/權限/中斷/新對話正常
- **依賴關係**: Task 1, Task 2（proxy 修正，V1 路由才可用）, Task 4（apiCall）

### Task 9: 自我測試 + 文件更新
- **範疇**: 端對端驗證與進度文件更新
- **修改檔案**: `PROGRESS/John.md`、`PROGRESS/ROADMAP.md`
- **做法**:
  - 跑 `node tests/opencode-proxy.test.js` 全 PASS
  - 依 `OpenCode_Serve_Proj/test.md` TC 精神做瀏覽器驗證（連線/串流/模型/權限/中斷/新對話/log；Menu 新增/刪除項目）
  - 更新 John.md（本任務紀錄）、ROADMAP.md（v3.1 狀態，徵得同意後更新）
- **驗收標準**: 測試全 PASS；手動流程無 console 例外；文件更新完成
- **依賴關係**: Task 1~8

## 待解決問題 (Open Questions)
- 無（Grill 已完成）

## 備註
- **Grill 決策影響實作**：
  - 測試採 Node 整合測試（非 Pester）
  - 聊天頁顯示名 = `label || basename(worktree)`，不做 API 顯示名查詢（對齊 POC）
  - server 名僅由 URL/管理頁帶入（serve API 無 server 名稱概念）
  - **（2026-08-02 變更）** 跨 namespace 相同 host:port：proxy 改為允許重複註冊（BR-64），各 namespace 獨立 server id；原先「接受 proxy 409 限制」已取消
  - 聊天頁僅依賴無狀態 `apiCall`，不跨 namespace 查 server
- **不修改**：既有 v3 Agent App 選單與 chat-bot.html、`OpenCode_Serve_Proj/start.ps1`、`start-services.bat`
