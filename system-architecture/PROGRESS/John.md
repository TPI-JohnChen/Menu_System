# Progress — John

## 2026-07-27（OpenCode Serve Chat Bot — Phase 1 + 2）

### 完成項目
- 遵循完整 `/full-plan` 四階段流程（Phase 0→0.5→1→2→3）
- 產出需求文件、設計文件、實作計畫
- 實作 Phase 1（Agent Server 管理 + Proxy 路由）+ Phase 2（動態 Menu）

### Phase 1 實作（Agent Server 管理 + Proxy 路由）
- **Task 1**: `ai-proxy/server.js` — 新增 opencode 通用轉發路由 `/api/opencode/:serverId/*`
  - Server 設定 CRUD（GET/POST/DELETE /api/opencode/servers）
  - 記憶體 Map + servers.json 持久化
  - Base64 編碼 password
  - SSE 串流 pipe 支援
  - 禁止 host:port 重複
- **Task 2**: `web-menu/lib/opencode-manager.js` — 前端共用層
  - localStorage CRUD（key: opencode_servers）
  - checkHealth / fetchProjects / apiCall 通用方法
  - Proxy 離線時自動重試同步佇列
- **Task 3**: `web-menu/pages/agent-server-management.html` — 卡片式 UI
  - 新增/編輯/刪除 Agent Server
  - 測試連線 + 狀態指示燈 🟢/🔴
  - 連線成功自動抓 project 列表 + 更新 Menu

### Phase 2 實作（動態 Menu）
- **Task 4**: `web-menu/config/menu.js` — 新增「Agent App」父層（dynamic: true）
- **Task 5**: `web-menu/components/menu.js` — 新增 `addDynamicItems` / `removeDynamicItems` / `getEffectiveConfig` 方法
- **Task 6**: `web-menu/index.html` + `app.js` — 載入 opencode-manager.js，init 時重建 Menu

### 核心設計決策
- 透過 AI Proxy 中轉所有 opencode 請求（不直接連）
- Server 設定存兩邊：前端 localStorage + Proxy servers.json
- password 以 Base64 編碼持久化
- Menu 項目動態產生（新增 server → 抓 projects → 插入 Menu）
- Proxy 離線時前端自動重試同步

### Phase 3 實作（Chat Bot 頁面）
- **Task 7+8**: `web-menu/pages/chat-bot.html` — 完整聊天頁面
  - 左右分割 layout（session 樹 + 對話區）
  - URL params 解析：serverId, project
  - Session 樹：載入列表、點選切換、活動狀態高亮
  - Session CRUD：建立（＋）、重新命名（✏）、刪除（✕）
  - 訊息發送：Enter / 按鈕發送，顯示 user/assistant 氣泡
  - 供應商選擇器（從 /config/providers 動態載入）
  - 專案切換 dialog（📂）
  - 多語系（zh-TW / en）

### Phase 4 實作（供應商/模型切換 + 專案管理）
- **Task 9**: Header 右側 dropdown 選擇器，從 `/config/providers` 動態載入，顯示 `Provider / Model` 格式
- **Task 10**: 📂 按鈕 → dialog 列出所有 project → 點選後 reload chat-bot 頁面帶新 project 參數

---

## 2026-07-27（Session 過濾修正 + Menu 來源變更）

### 重大發現：`opencode serve` API 限制
- `POST /session` **忽略** `projectID`、`directory`、`path` — 所有 API 建立的 session 的 `projectID` 固定為 `"global"`
- `GET /session?projectID=xxx` 無法過濾
- `GET /session?directory=xxx` 可過濾但僅限 Web UI 建立的 session
- 桌面版 app（PID 22336）**無 HTTP 端點**，無法直接連
- `opencode serve`（PID 26968）是唯一 HTTP API 入口
- 兩個行程的 session 資料庫各自獨立

### Phase 5 — Session 過濾策略修正（Task 11，3 次迭代）

| 迭代 | 策略 | 結果 |
|------|------|------|
| v1 | `GET /session?projectID=<SHA>` | ❌ API 忽略參數 |
| v2 | localStorage 映射 `sessionID→projectID` | ❌ 既有 session 無資料 |
| v3 | `s.directory.startsWith(worktree)` + localStorage 補強 | ✅ 採用 |

**實作項目**：
- `chat-bot.html`：移除 `projectId` / `isSha`，改用 `worktree` 路徑
- URL 參數從 `&project=` 改為 `&worktree=`
- `loadSessions()`：client‑side 用 `directory` 前綴比對
- `createSession()` / `deleteSession()`：localStorage 映射管理
- `sendMessage()` / `loadMessages()`：移除無效的 `projectID` 參數

### Phase 5 — Menu 來源變更（Task 12）
- `opencode-manager.js`：新增 `fetchSessionDirectories()`
- `refreshMenu()`：改為 async，從 `GET /session` 的 `directory` 去重取得 Menu 項目
- Menu URL：`pages/chat-bot.html?serverId=xxx&worktree=yyy`
- `agent-server-management.html`：測試連線改抓 directories（取代 projects）
- `init()` 改為 async，啟動時自動 refresh menu

### Phase 6 — SSE 訊息串流（Task 14）

**問題**：Chat Bot 回覆全部一次跳出，無逐字效果
**根因**：`EventSource` 在 `file://` 下被瀏覽器封鎖

**解決方案**：
- **Proxy 新增靜態檔案服務**：`app.use(express.static(...))` → 頁面從 `http://localhost:3001/` 同源載入
- **chat-bot.html**：`sendMessage()` 在 POST 前開 `EventSource('.../event')`，監聽 `message.part.delta` 即時更新 bubble
- **start-services.bat**：改為開啟 `http://localhost:3001/...` 取代 `file:///`

**驗證**：
- Node.js 實測 `GET /event` 透過 proxy 正常收到 delta events（兩台 server 4096、9097 皆測過）
- 瀏覽器實測：發送訊息後 assistant bubble 逐字出現 ✅

### 桌面版 app API 研究（Task 13）
- 桌面版 app 不監聽任何 TCP port，無法直接使用
- `opencode session list` 在目錄下執行只顯示該目錄 session → CLI 行為
- 結論：Web Menu 繼續用 `opencode serve` + `directory` 前綴比對

### 檔案異動摘要
| 檔案 | 操作 | 說明 |
|------|------|------|
| `web-menu/lib/opencode-manager.js` | 修改 | 新增 `fetchSessionDirectories()`，`refreshMenu()`/`init()` 改 async |
| `web-menu/pages/chat-bot.html` | 修改 | URL 參數 `worktree`，session 過濾改 `directory` 前綴比對 |
| `web-menu/pages/agent-server-management.html` | 修改 | Projects → Directories |
| `system-architecture/PROGRESS/John.md` | 修改 | 本記錄 |
| `system-architecture/docs/superpowers/specs/2026-07-27-opencode-serve-chat-bot-design.md` | 修改 | 新增 API 限制、更新架構 |
| `system-architecture/docs/superpowers/specs/2026-07-27-opencode-serve-chat-bot-tasks.md` | 修改 | 新增 Phase 5 |

---

## 2026-07-29（Menu 功能設計規劃）

### 完成項目
- 遵循完整 `/full-plan` 四階段流程（Phase 0→0.5→1→2→3→Build）
- 產出 Menu 功能設計完整文件：`PROGRESS/Menu.md`
- 產出設計文件：`docs/superpowers/specs/2026-07-29-menu-design.md`
- 產出實作計畫：`docs/superpowers/specs/2026-07-29-menu-tasks.md`

### 設計摘要
- **Menu 結構**：9 個一級選單（快速對話 / App / Skill / 定時任務 / Agent / Provider 直連 / 儀表板 / 權限管理 / 稽核日誌 / 系統設定）
- **RBAC 模型**：4 固定角色 + 自訂角色混合模型，扁平部門，部門管理員可自治與指派代理人
- **開發順序**：4 個 Phase（核心骨架 → 治理與協作 → 自動化與監控 → 進階）
- **績效監控**：TTFT/TOPS 比對 OrientAI 與 Opencode 端效能損耗
- **SOP 工作流**：四步驟方法論（格式標準化 → 任務拆解 → 雙向迭代 → 整合執行）
- **稽核日誌**：設定變更軌跡 + Chat Bot 訊息往返日誌

### 決策記錄
- 部門採扁平不採樹狀（5人工作室不須 over-engineering）
- 角色採固定 4 個 + 自訂混合（保有簡單又具彈性）
- 代理人為部門管理員屬性而非獨立角色
- 對話拆分快速對話（個人預設）與 Agent 對話（完整 Chat Bot）
- App 支援 CRUD 動態新增（預載 RAG 查詢 / 文件上傳 / Agent 對話）
- Marketplace 全刪（屬於 OrientAI_Manager 範圍）
- MCP 管理不出現在 Menu 中（Opencode 內部事項）

### 產出檔案
| 檔案 | 說明 |
|------|------|
| `PROGRESS/Menu.md` | Menu 功能設計完整文件（含 Menu 結構 / RBAC / SOP 工作流） |
| `docs/superpowers/specs/2026-07-29-menu-design.md` | 設計文件（鎖定後的規格） |
| `docs/superpowers/specs/2026-07-29-menu-tasks.md` | 實作計畫（4 Phase 共 15 Tasks） |
| `PROGRESS/John.md` | 本進度記錄 |

---

## 2026-08-02（start-services.bat 搬移 + 測試）

### 完成項目
- 遵循 `/full-plan` 流程（Phase 0→0.5→1→2→3→Build）
- 產出設計與實作計畫，並完成實作

### 實作項目
- **Task 1**：`start-services.bat` 從倉庫根目錄搬移至 `system-architecture\start-services.bat`
  - 路徑改為 `%~dp0..` 相對推算（repo root 由腳本位置推出），移除硬編絕對路徑
  - 保留 menu / start / stop / status / exit 互動邏輯，額外加上 node_modules 存在性檢查
- **Task 2**：新增 `tests\start-services.Tests.ps1`（Pester）
  - 結構/靜態測試 9 項：位置、路徑有效、`%~dp0` 使用、無殘留絕對路徑、5 label、goto 平衡
  - `-Live`（或 `$env:SMOKE_LIVE=1`）冒煙測試：啟動 ai-proxy 並以 curl 驗證 `/api/health` = 200，事後清理
- **Task 3**：更新 `docs\quick-start.md`（新位置 + 相對路徑範例）、`docs\requirements-analysis.md`（新增 FR-18、BR-54~56、changelog 2.1）
- **Task 4**：自我測試
  - 靜態測試 9/9 通過
  - Live 冒煙 10/10 通過
  - 真實端對端：管線選單「1」執行 .bat → 成功啟動 node proxy → health 200 → 清理後 port 3001 歸還

### 除錯紀錄
- Pester 3.4 不支援 `Invoke-Pester -Parameters` → 改用 `$env:SMOKE_LIVE=1` 切換 live 模式
- `Invoke-WebRequest` 對監聽於 IPv6 `::` 的 proxy 連線失敗 → 與 .bat 一致改用 `curl.exe` 做健康檢查
- label 檢查中 `$_` 變數衝突 → 改用暫存變數 `$label`

### 產出檔案
| 檔案 | 說明 |
|------|------|
| `system-architecture\start-services.bat` | 搬移 + 相對路徑化 |
| `system-architecture\tests\start-services.Tests.ps1` | 新增 Pester 測試 |
| `docs\quick-start.md` | 更新位置說明 |
| `docs\requirements-analysis.md` | 新增 FR-18 / BR-54~56 |
| `docs\superpowers\specs\2026-08-02-start-services-move-design.md` | 設計文件 |
| `docs\superpowers\specs\2026-08-02-start-services-move-tasks.md` | 實作計畫 |

---

## 2026-08-02（OpenCode Serve 操作整合 — 平行一級選單）

### 完成項目
- 遵循 `/full-plan` 四階段流程（Phase 0→0.5→1→2→3→Build）
- 整合 `OpenCode_Serve_Proj`（單檔 index.html POC）關鍵技術進 Menu System

### 實作項目
- **Task 1+2**: `ai-proxy/server.js` — 通用轉發路由修正
  - B1: `targetUrl` 補上 query string（`?directory=` 穿透，約 line 113-115）
  - B2: SSE 分支移除固定 120s timeout，改 AbortController + `res.on('close')` 終止上游（line 139-151）
- **Task 3**: `ai-proxy/tests/opencode-proxy.test.js` — Node 整合測試（新增，8/8 PASS）
  - B1 query string 轉發、B1+ POST body+query 轉發、B2 SSE >120s 不被掐斷、client 斷線上游釋放
- **Task 4**: `web-menu/lib/opencode-manager.js` — namespace factory 化
  - `create(namespace, options)` 產生獨立實例；`OpenCodeManager`（v3）向後相容
  - `OpenCodeServeManager = create('opencode_serve_servers', { parentId: 'opencode-serve', menuMode: 'projects' })`
  - 新增專案 CRUD；refreshMenu 依 menuMode 產生「server 名 · 專案 label」項目
- **Task 5**: `web-menu/config/menu.js` — 新增「🔌 OpenCode Serve」一級選單（dynamic）
- **Task 6**: `web-menu/app.js` — `OpenCodeServeManager.init()`
- **Task 7**: `web-menu/pages/opencode-serve-management.html` — 卡片式管理頁（server CRUD + 專案管理）
- **Task 8**: `web-menu/pages/opencode-serve-chat.html` — 單一專案聊天頁（改編 POC：SSE 串流/模型/權限自動放行/中斷/新對話/防爆 log）

### 設計決策（Grill 後鎖定）
- 連線一律經 ai-proxy 中轉（V1 root 路由 `/session`、`/permission`、`/config/providers`、`/event` + `?directory=`）
- 新增平行一級選單，保留既有 v3 Agent App
- 專案手動定義（label + directory），所有 server 專案扁平展開為二級 Menu
- 聊天頁標題 = `label || basename(worktree)`，不做 API 顯示名查詢
- 跨 namespace 重複 host:port 接受 proxy 409 限制

### 驗證
- `node tests/opencode-proxy.test.js` → **8 passed, 0 failed**
- `node --check` 全部 .js 通過（opencode-manager / app / menu / server / test）
- 兩個新 HTML 頁面 inline script 語法驗證通過
- v3 向後相容：agent-server-management.html / chat-bot.html 使用的 `getServers` / `getServerById` / `checkHealth` / `saveServer` / `fetchSessionDirectories` / `refreshMenu` / `deleteServer` / `apiCall` 在 factory 版全部保留

### 端對端驗證（headless Chrome + CDP + mock opencode serve）
- 管理頁載入：Proxy 連線 🟢 + 空狀態正確，無 console 例外
- 聊天頁載入：標題「label · server」、SSE 已連線、模型清單（providerID/modelID）載入成功
- 發送訊息 → busy「執行中…」→ 中斷「已送出中斷」→「待命」
- 新對話「已建立新 session」→「待命」
- Menu 動態項目：新增 server+專案 →「server · 專案」出現；刪除 server → 項目移除

### 實作中發現並修正的 Bug
- **menu.js 用 `const MenuManager`（global lexical binding，不掛 window）**，但 opencode-manager.js 檢查 `global.MenuManager`（= `window.MenuManager`，永遠 undefined）→ 主頁 `init()` 時動態 Menu 項目不呈現（Task 6 驗收失敗）
  - 修正：新增 `menuManager()` helper，主頁情境用裸識別字 `MenuManager`，iframe 情境回傳 null 走 postMessage（line 371-377 改）
  - v3 之所以看似正常：管理頁在 iframe 內走 postMessage 分支；主頁 app.js init 走的是 warn 分支
- **聊天頁 meta 顯示 bug**：原以 `t('btnNew') === 'New Conversation'` 判斷語系，英文模式吃掉 total 時間 → 改為獨立 `doneLabel` key

---

## 2026-08-02（Bug 修復：跨 namespace 重複 host:port 連線失敗）

### RCA
- 現象：OpenCode Serve 管理輸入 `127.0.0.1:4096` 連線失敗，但舊 Agent Server 管理同組位址成功
- 根因：兩頁連線邏輯相同（`checkHealth(id)` → `/api/opencode/:serverId/global/health`），但 ai-proxy 的 `serverMap` 為**全域共用**註冊表，`POST /api/opencode/servers` 以 host:port 唯一性檢查（舊程式 server.js:71-76），遇到重複回 409 且**不註冊**新 id
  - 舊頁：`srv-ms3c6viw-udzj`（127.0.0.1:4096）早已註冊 → proxy 200 ✅
  - 新頁：OpenCode Serve 管理產生新 id，`syncToProxy()` 被 409 拒絕 → 新 id 僅存在前端 localStorage → proxy 查無此 id → 404 → 連線測試失敗
- 即「跨 namespace 共用 proxy 全域註冊表」與「重複 host:port 禁止」衝突，設計決策原本接受 409 限制

### 修正
- `ai-proxy/server.js`：**移除 POST 的 host:port 重複 409 檢查**（BR-64），允許相同 host:port 重複註冊，各 namespace 各自獨立 server id
- 前端不需修改（兩頁的重複檢查都是針對各自 namespace 的 localStorage）
- 整合測試新增 **C1**（重複 host:port 可註冊 + 各自轉發正常）

### 驗證
- `node tests/opencode-proxy.test.js` → **10 passed, 0 failed**（原 8 項 + C1 2 項）
- 端對端實證：註冊第二個 `127.0.0.1:4096` 成功（新 id），health 走 proxy 200，舊 id 仍可用
- 文件同步：requirements-analysis.md（BR-64、FR-19 ✅、changelog 2.3）、tasks 檔（Grill 決策更新）

### 產出檔案
| 檔案 | 說明 |
|------|------|
| `ai-proxy/server.js` | 移除 host:port 重複 409 檢查 |
| `ai-proxy/tests/opencode-proxy.test.js` | 新增 C1 測試（現 10 項） |
| `docs/requirements-analysis.md` | BR-64、FR-19 ✅、changelog 2.3 |
| `docs/superpowers/specs/2026-08-02-opencode-serve-menu-tasks.md` | Grill 決策更新 |

### 產出檔案
| 檔案 | 說明 |
|------|------|
| `docs/requirements-analysis.md` | 新增 FR-19 / BR-57~63、FR-14~17 標 ✅、changelog 2.2 |
| `docs/superpowers/specs/2026-08-02-opencode-serve-menu-design.md` | 設計文件 |
| `docs/superpowers/specs/2026-08-02-opencode-serve-menu-tasks.md` | 實作計畫（9 Tasks + Grill 決策） |
| `ai-proxy/server.js` | B1/B2 修正 |
| `ai-proxy/tests/opencode-proxy.test.js` | 整合測試（8 項） |
| `web-menu/lib/opencode-manager.js` | factory 化 |
| `web-menu/config/menu.js` | 新一級選單 |
| `web-menu/app.js` | 初始化 |
| `web-menu/pages/opencode-serve-management.html` | 管理頁 |
| `web-menu/pages/opencode-serve-chat.html` | 聊天頁 |
