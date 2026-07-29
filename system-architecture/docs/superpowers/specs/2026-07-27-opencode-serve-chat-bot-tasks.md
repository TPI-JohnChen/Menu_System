# 實作計畫：OpenCode Serve Chat Bot

## 設計文件參考
`docs/superpowers/specs/2026-07-27-opencode-serve-chat-bot-design.md`

## 分階段策略
垂直切片：每個 Phase 從前端到後端一次完成一個完整功能。

---

## Phase 1 — Agent Server 管理 + Proxy 路由

### Task 1: AI Proxy 新增 opencode 路由 ✅
- **範疇**: 在 ai-proxy/server.js 新增 `/api/opencode/` 路由組
- **修改檔案**:
  - `ai-proxy/server.js` — 新增路由處理
  - `ai-proxy/servers.json` — 新增持久化檔案（初始 `[]`）
- **實作內容**:
  - `GET/POST /api/opencode/servers` — server 設定 CRUD
  - `DELETE /api/opencode/servers/:serverId` — 刪除 server
  - `app.all('/api/opencode/:serverId/*')` — 通用轉發路由
  - 記憶體 Map + servers.json 讀寫
  - Base64 編碼/解碼 password
  - SSE 串流 pipe 支援
- **驗收標準**:
  - `curl POST /api/opencode/servers` 可新增 server
  - `curl /api/opencode/:serverId/global/health` 可轉發到 opencode serve
  - 重啟 Proxy 後設定仍在
- **依賴關係**: 無

### Task 2: opencode-manager 共用函式庫 ✅
- **範疇**: 建立前端與 opencode serve 互動的共用層
- **新增檔案**:
  - `web-menu/lib/opencode-manager.js`
- **實作內容**:
  - localStorage CRUD（key: `opencode_servers`）
  - `checkHealth(serverId)` — 透過 Proxy 健康檢查
  - `fetchProjects(serverId)` — 取得 project 列表
  - `apiCall(serverId, method, path, body?)` — 通用 API 請求
  - `serverCallbacks` — 同步佇列（Proxy 離線時自動重試）
  - `syncToProxy(server)` — 同步設定到 Proxy
  - `syncPendingToProxy()` — 啟動時自動補送未同步資料
  - `getServers() / getServerById(id) / saveServer(server) / deleteServer(id)`
- **驗收標準**:
  - 可儲存/讀取 server 設定
  - Proxy 離線時標記 pending，連上後自動同步
- **依賴關係**: 無（可獨立測試）

### Task 3: Agent Server 管理頁面 ✅
- **範疇**: 管理多個 opencode serve 連線的卡片 UI
- **新增檔案**:
  - `web-menu/pages/agent-server-management.html`
- **實作內容**:
  - 卡片式 UI（收合/展開，比照 provider-management）
  - 欄位：名稱、Host、Port、Username、Password
  - 按鈕：測試連線、儲存、刪除
  - 測試連線 → 更新狀態指示燈 🟢/🔴
  - 儲存成功且連線 OK → 自動抓 project 列表 → 更新 Menu
  - 驗證 host:port 不重複
  - 多語系（zh-TW / en）
  - 同步失敗時標記 pending，下次自動補送
- **驗收標準**:
  - 可新增/編輯/刪除 server
  - 測試連線正確顯示狀態
  - 儲存後 project 列表顯示在卡片中
- **依賴關係**: Task 1, Task 2

---

## Phase 2 — 動態 Menu

### Task 4: config/menu.js 新增 Agent App 父層 ✅
- **範疇**: 更新靜態 Menu 設定
- **修改檔案**:
  - `web-menu/config/menu.js`
- **實作內容**:
  - 新增父層 `{ id: 'agent-app', label, icon: '🤖', children: [...] }`
  - 固定子項目：Agent Server 管理
  - 預留動態項目插入位置
- **驗收標準**: Menu 顯示「Agent App」→「Agent Server 管理」
- **依賴關係**: 無

### Task 5: MenuManager 動態項目支援 ✅
- **範疇**: 修改 MenuManager 支援執行期動態插入/移除項目
- **修改檔案**:
  - `web-menu/components/menu.js`
- **實作內容**:
  - 新增 `addDynamicItems(parentId, items)` 方法
  - 新增 `removeDynamicItems(parentId)` 方法
  - 修改 `render()`：合併靜態 config + 動態項目
  - 動態項目格式：`{ id, label, path, icon, serverId }`
  - 動態項目的 path 格式：`pages/chat-bot.html?serverId=xxx&project=yyy`
  - 動態項目支援語言切換（使用 I18n.t）
  - 注意：render 時清除舊動態項目再重新插入（避免重複）
- **驗收標準**:
  - 呼叫 `addDynamicItems` 後 Menu 即時更新
  - 呼叫 `removeDynamicItems` 後 Menu 恢復
- **依賴關係**: Task 4

### Task 6: Menu 動態整合 ✅
- **範疇**: opencode-manager 與 MenuManager 的整合
- **修改檔案**:
  - `web-menu/lib/opencode-manager.js` — 新增 refreshMenu
  - `web-menu/index.html` — 載入 opencode-manager.js
- **實作內容**:
  - `opencode-manager.refreshMenu()`:
    1. 讀取所有 server 的 project 快取
    2. 為每個 project 建立 Menu item 物件
    3. 呼叫 `MenuManager.addDynamicItems('agent-app', items)`
  - `opencode-manager.deleteServer(id)` 內部呼叫 `refreshMenu()`
  - index.html 加入 `<script src="lib/opencode-manager.js">`
  - 頁面載入時執行 `opencodeManager.init()` → 重建 Menu
- **驗收標準**:
  - 新增 server 連線成功後 Menu 即時出現 project 項目
  - 刪除 server 後 Menu project 項目消失
  - 頁面 refresh 後 Menu 重建
- **依賴關係**: Task 2, Task 5

---

## Phase 3 — Chat Bot 頁面

### Task 7: Chat Bot 頁面骨架 ✅
- **範疇**: Chat Bot 頁面基礎 layout + session 樹
- **新增檔案**:
  - `web-menu/pages/chat-bot.html`
- **實作內容**:
  - 左右分割 layout（>768px 左右，≤768px 上下）
  - URL params 解析：`serverId`, `worktree`（原 `project` 已移除）
  - Header：顯示 directory 名稱 + 供應商 dropdown
  - Session 樹（左側）：
    - 從 `GET /session` 取得所有 session
    - session 過濾方式：`s.directory.startsWith(worktree)`（client‑side）
    - 點選 session → 載入歷史訊息 `GET /session/:id/message`
    - [+ New] 按鈕 → `POST /session`，建立後寫入 localStorage 映射
    - [↻] 重新整理按鈕
  - 對話區（右側）：
    - 顯示所選 session 的訊息列表
    - 訊息顯示：user（右對齊）/ assistant（左對齊）
  - 訊息輸入框（底部）+ 發送按鈕
  - 多語系（zh-TW / en）
- **驗收標準**:
  - 可瀏覽 session 樹
  - 點選 session 顯示歷史訊息
  - 可建立新 session 並正確歸屬目錄
- **依賴關係**: Task 1, Task 2, Task 6

### Task 8: Session CRUD + 訊息發送 ✅
- **範疇**: 完整的 session 操作與對話功能
- **修改檔案**:
  - `web-menu/pages/chat-bot.html` — 新增操作邏輯
- **實作內容**:
  - Session 重新命名：點選 session → inline edit 或 dialog → `PATCH /session/:id`
  - Session 刪除：確認 dialog → `DELETE /session/:id` → 更新樹
  - 發送訊息：
    - `POST /session/:id/message` 發送 `{ parts: [{ type: 'text', text: '...' }] }`
    - 顯示 loading 狀態
    - 顯示 AI 回覆
  - 中斷回覆：`POST /session/:id/abort`
  - 錯誤處理：網路錯誤 / 401 / 502 顯示 toast
- **驗收標準**:
  - 可重新命名 session
  - 可刪除 session（含確認對話）
  - 發送訊息後顯示 AI 回覆
  - 可中斷進行中的回覆
- **依賴關係**: Task 7

---

## Phase 4 — 供應商/模型切換 + 專案管理

### Task 9: 供應商及模型選擇器 ✅
- **範疇**: Chat Bot 頁面可選擇 AI provider/model
- **修改檔案**:
  - `web-menu/pages/chat-bot.html` — 新增選擇器
- **實作內容**:
  - 從 `GET /api/opencode/:serverId/config/providers` 取得 providers + default model
  - Header 右側顯示 dropdown 選擇器
  - 格式：`Provider / Model`（如 `anthropic / claude-sonnet-4-5`）
  - 發送訊息時帶入所選 model
- **驗收標準**: 可切換供應商/模型，發送時正確帶入
- **依賴關係**: Task 7

### Task 10: 專案目錄切換 ✅
- **範疇**: Chat Bot 頁面可切換目前目錄
- **修改檔案**:
  - `web-menu/pages/chat-bot.html`
- **實作內容**:
  - Header 右側 [⚙] 按鈕 → 列出所有目錄 (`GET /project` 顯示 git projects)
  - 選擇目錄後 reload chat-bot 頁面（`&worktree=` 參數）
- **驗收標準**: 可切換目錄，session 列表隨之更新
- **依賴關係**: Task 7

---

## Phase 5 — Session 專案過濾修正 + Menu 來源變更 ✅

### 背景發現
`opencode serve` 的 REST API 存在限制：`POST /session` **忽略** `projectID`、`directory`、`path` 參數，所有 API 建立的 session 的 `projectID` 固定為 `"global"`。Web UI 建的 session 雖有正確 `projectID`，但無法透過 REST API 重現。

### Task 11: Session 過濾策略修正（3 次迭代）✅
- **範疇**: 修正 chat-bot 的 session 載入邏輯
- **修改檔案**:
  - `web-menu/pages/chat-bot.html`
- **迭代記錄**:
  - **v1（失敗）**: `GET /session?projectID=<SHA>` — API 忽略參數，永遠回傳全部 sessions
  - **v2（取消）**: localStorage 記錄 `sessionID→projectID` 映射 — 但現有 session 無映射資料，且無法解決 Web UI session 的顯示問題
  - **v3（採用）**: `GET /session` 取得全部 → client‑side 用 `s.directory.startsWith(worktree)` 前綴比對 + localStorage 映射補強
- **實作內容**:
  - 移除 `projectId` / `isSha` 變數，改用 `worktree`（檔案系統路徑）
  - URL 參數從 `&project=` 改為 `&worktree=`
  - `loadSessions()`：直接比對 `s.directory` 前綴
  - `createSession()`：成功後寫入 localStorage 映射
  - `deleteSession()`：清除對應 mapping
  - `sendMessage()`：移除無效的 `body.projectID`
  - `loadMessages()`：移除無效的 `&projectID=` query param
- **驗收標準**:
  - 點選 Menu 目錄 → 只顯示該 worktree 下的 sessions
  - 新建 session → 重新整理後仍在
  - 切換目錄 → 另一組 sessions
- **依賴關係**: Task 7

### Task 12: Menu 來源從 git projects 改為 session directories ✅
- **範疇**: 動態 Menu 的資料來源變更
- **修改檔案**:
  - `web-menu/lib/opencode-manager.js` — 新增 `fetchSessionDirectories()`、`refreshMenu()` 改為 async
  - `web-menu/pages/agent-server-management.html` — 測試連線改抓 directories
- **實作內容**:
  - 新增 `fetchSessionDirectories(serverId)` → `GET /session` → 取出唯一 `directory` 並排序
  - `refreshMenu()`：改為 async，遍歷 servers 呼叫 `fetchSessionDirectories()`
  - `init()`：改為 async，啟動時自動 `await refreshMenu()`
  - agent-server-management：測試連線後抓取 directories 取代 projects 顯示
  - Menu 項目 URL 從 `&project=` 改為 `&worktree=`
- **驗收標準**:
  - Menu 顯示 session directory 列表（不再顯示 git repo 列表）
  - 點選項目導向正確的 worktree URL
  - 變更生效不需重新連線測試
- **依賴關係**: Task 2, Task 5, Task 6

### Task 13: 桌面版 app API 研究 ✅
- **範疇**: 調查能否繞過 `opencode serve` 改用桌面版 app API
- **研究結果**:
  - 桌面版 app (PID 22336) **沒有 HTTP 端點**，不監聽任何 TCP port
  - `opencode session list` 透過內部 IPC / 直接讀取資料庫通訊
  - `opencode serve` (PID 26968) 是唯一的 HTTP API 入口
  - 兩個行程的 session 資料庫各自獨立
- **結論**: Web Menu 無法接桌面版 app，只能使用 `opencode serve` + `directory` 前綴比對

---

## Phase 6 — SSE 訊息串流 + Proxy 靜態檔案服務

### 背景
Phase 3 MVP 採用一次性回應（無串流）。後續需求：聊天回覆應逐字顯示以提升 UX。

### Task 14: SSE 串流顯示 ✅
- **範疇**: Chat Bot 頁面透過 `GET /event` SSE 即時顯示 AI 回覆
- **修改檔案**:
  - `web-menu/pages/chat-bot.html` — 新增 EventSource 串流邏輯
  - `ai-proxy/server.js` — 新增 `express.static()` 服務靜態檔案
  - `start-services.bat` — 改為開啟 `http://localhost:3001/` 而非 `file:///`
- **實作內容**:
  - `sendMessage()` 在 POST 前開啟 `EventSource('.../event')`
  - 監聽 `message.part.delta`（`field=text`）即時更新 bubble
  - POST 完成後關閉 EventSource，更新 model/time metadata
  - SSE 失敗自動降級為一次性回應（fallback）
  - Proxy 新增 `express.static()` 提供同源靜態檔案服務
  - `start-services.bat` 改為 `start "" "http://localhost:3001/..."`
- **注意事項**:
  - `EventSource` 在 `file://` 下被瀏覽器封鎖，頁面需從 `http://localhost:3001` 載入
  - 2026-07-27 起 proxy 同時 serve 靜態檔案，解決同源問題
- **驗收標準**:
  - 發送訊息後 assistant bubble 逐字出現（非一次性跳出）
  - SSE 斷線時自動降級正常顯示完整回覆
  - `http://localhost:3001/index.html` 可正常載入所有頁面
- **依賴關係**: Task 7, Task 8

---

## 待解決問題 (Open Questions)
- 無（所有決策已於 Grill phase 鎖定）

## 備註
- Grill phase 決策記錄：
  - 禁止 host:port 重複的 server
  - servers.json 中 password 以 Base64 編碼儲存
  - 前端 localStorage 與 Proxy servers.json 雙寫，離線時自動重試同步
  - 垂直切片開發：Server Management → Dynamic Menu → Chat Bot → Provider Switch
  - 所有 4 個功能都要完成，但分 Phase 逐步交付
- 2026-07-27 Phase 6 追加 SSE 串流 + proxy 靜態檔案
