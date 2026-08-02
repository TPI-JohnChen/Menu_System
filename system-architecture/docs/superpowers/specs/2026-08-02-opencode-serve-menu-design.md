# 設計文件：OpenCode Serve 操作整合（平行一級選單）

**日期**：2026-08-02
**版本**：1.0
**狀態**：已鎖定（經 Phase 2 腦力激盪 + Phase 3 Grill）

## 1. 背景與目標

`OpenCode_Serve_Proj` 是一份獨立實作的小型 POC（單檔 `index.html` + `start.ps1`），已驗證可透過
**V1 root 路由**（`/session`、`/permission`、`/config/providers`、`/event`）操作 `opencode serve`，
具備多專案分頁、SSE 逐字串流、權限自動放行、模型選擇器、動態增刪專案、防爆 log 等能力。

本需求將此關鍵技術**整合進 Menu System**，新增平行一級選單「OpenCode Serve」，支援連線與操作**多個**
opencode serve 實例，並保留既有 v3「Agent App」選單不變。

## 2. Menu 結構

```
🔌 OpenCode Serve (id: opencode-serve, dynamic: true)
  ├── OpenCode Serve 管理                    → pages/opencode-serve-management.html      [靜態]
  ├── <server名> · <專案label>               → pages/opencode-serve-chat.html?serverId=&worktree=&label=  [動態]
  ├── <server名> · <專案label>               [動態]
  └── ...   （所有 server 的專案扁平展開為二級項目）
```

- 一級選單採 `dynamic: true`，動態項目由 manager 注入（沿用 `MenuManager.addDynamicItems` / `removeDynamicItems`）。
- 二級項目標籤 = `server 名 · 專案 label`，避免多 server 專案同名混淆。
- 點擊專案開啟**單一專案**聊天頁（無分頁列）；專案間切換完全靠 Menu。

## 3. 元件設計

### 3.1 Manager — `web-menu/lib/opencode-manager.js`（namespace factory 化）

現有 `OpenCodeManager` 改為 factory，產生多個獨立實例：

```js
// 既有 v3（向後相容，namespace 預設 'opencode_servers'）
const managerV3 = OpenCodeManager.create('opencode_servers', { parentId: 'agent-app' })

// 新 OpenCode Serve（namespace 獨立）
const managerSrv = OpenCodeManager.create('opencode_serve_servers', { parentId: 'opencode-serve' })
```

每個實例隔離以下狀態：
- `localStorage` key：servers 清單、pending sync 佇列、各 server 的專案清單。
- `MenuManager` parentId（動態項目掛載位置）。

實例共用（同一份程式碼，不重複）：
- `checkHealth` / `fetchDirectories` / `apiCall`：走 proxy `/api/opencode/:serverId/*`。
- proxy server CRUD 同步（`/api/opencode/servers`）：server id 各自獨立產生，彼此不衝突。

**新增專案 CRUD**（POC 的「CONFIG.projects + 動態新增」對應）：
- 每個 server 持有專案陣列 `[{ id, label, directory }]`。
- `getProjects(serverId)` / `saveProject(server, project)` / `deleteProject(server, projectId)`。
- 專案變更或 server 連線成功後呼叫 `refreshMenu()`。

**refreshMenu 行為**：
- 遍歷 namespace 內所有 server 及其專案。
- 產生動態項目 `{ id, label: 'server名 · 專案label', path: 'pages/opencode-serve-chat.html?...' }`。
- 呼叫 `MenuManager.addDynamicItems(parentId, items)`。

### 3.2 管理頁 — `web-menu/pages/opencode-serve-management.html`

沿用既有 `agent-server-management.html` 的卡片式樣式與操作模式：

| 區塊 | 內容 |
|------|------|
| Server 卡片 | 名稱、位址（host:port）、帳號/密碼（可選）、狀態燈 🟢/🔴、展開顯示設定欄位 + 操作按鈕（測試連線/儲存/刪除） |
| 專案管理 | 每 server 下方列出已定義專案（label + directory），可新增/刪除；禁止同一 server 重複 directory |
| 連線動作 | 測試連線 → `checkHealth`；成功後可選列出 server 已知目錄供參考（不自動填入，對照 POC 手動定義精神） |
| Menu 更新 | 任何 server/專案變更後呼叫 `refreshMenu()` |

- 使用獨立 manager 實例（namespace `opencode_serve_servers`）。
- 多語系：沿用 `i18n.js` + `iframe-client.js` pattern。

### 3.3 聊天頁 — `web-menu/pages/opencode-serve-chat.html`

改編 `OpenCode_Serve_Proj/index.html`（保留 POC 已驗證的關鍵技術），改為單一專案、經 proxy 連線：

**URL 參數**（仿 chat-bot.html）：
- `serverId`：manager 的 server id。
- `worktree`：專案目錄（directory）。
- `label`：專案顯示名（可選，用於標題）。

**連線方式**：
- `base = 'http://localhost:3001/api/opencode/' + serverId`
- V1 root 路由 + `?directory=<worktree>`：
  - `GET {base}/session?directory=`（沿用最近 session，否則 `POST {base}/session?directory=` 新建）
  - `POST {base}/session/{id}/message?directory=`
  - `POST {base}/session/{id}/abort?directory=`
  - `GET {base}/config/providers?directory=`
  - `GET {base}/permission?directory=`（輪詢兜底）
  - `GET {base}/event?directory=`（SSE，EventSource）

**保留功能**（對照 POC FR-1~FR-12）：
- `ensureSession`：沿用該 directory 最近一次 session，否則新建。
- SSE 串流：`message.updated` / `message.part.updated` / `message.part.delta` / `message.part.removed` / `session.idle` / `session.status`；sessionID 過濾避免舊 session 混入。
- 訊息與 Markdown 渲染：text / reasoning / tool / file / agent / subtask / patch part。
- 回合狀態：busy/idle，`completeTurn` 結算 meta（模型 · TTFT · 完成）。
- 中斷按鈕（永遠可點，idle 時閃示不洗 log）。
- 新對話（busy 時阻擋）。
- 模型選擇器（`/config/providers`，重試 5 次 × 1.5s，序號守護防舊回應覆蓋）。
- 權限自動放行：`autoAllowOnce` 預設 true；SSE `permission.asked` + 1s 輪詢 `GET /permission` 兜底；`st.replied` 去重。
- 防爆 log 面板：2.5s 去重、上限 60 條、高度 110px 可捲動。

**移除**（因單一專案）：
- 分頁列（tabs）、動態「＋ 專案」加入/移除 UI（改由管理頁 + Menu 統一管理）。

**整合 pattern**：
- `<script src="../lib/i18n.js">`、`../lib/iframe-client.js`、`../lib/opencode-manager.js`。
- 讀取 `localStorage.lang` 套用 i18n（zh-TW/en）；iframe 主題同步由 iframe-client 處理。
- 黑暗風格沿用 POC CSS variables，並讓主題可被 iframe-client 覆寫。

### 3.4 AI Proxy — `ai-proxy/server.js` 修正

| 編號 | 位置 | 現況 | 修正 |
|------|------|------|------|
| B1 | 通用轉發 `targetUrl` | `http://host:port/${targetPath}`，query string 被丟棄 | 附加 `req.originalUrl` 的 `?...` 部分 |
| B2 | 轉發 fetch 的 `AbortSignal.timeout(120000)` | SSE 連線每 120s 被掐斷 | SSE 分支改用 AbortController，綁定 `req.on('close')` 終止；非 SSE 維持 timeout |

修正後 B1 讓 V1 root 路由的 `?directory=` 可穿透；B2 讓 `EventSource` 長連線不被固定 timeout 中斷。

## 4. 資料流

```
Menu 點擊專案
  → ContentManager.loadPage('pages/opencode-serve-chat.html?serverId=&worktree=&label=')
  → iframe 內頁面 fetch / EventSource:
      http://localhost:3001/api/opencode/{serverId}/{session|permission|config/providers|event}?directory=...
  → ai-proxy: 查 serverMap 得 host:port + Basic Auth → 轉發
      http://{host}:{port}/{path}?directory=...（保留 query）
  → opencode serve
```

## 5. 錯誤處理與韌性

| 情境 | 處理 |
|------|------|
| server 離線 | 管理頁狀態燈 🔴；聊天頁連線失敗顯示錯誤；EventSource 原生自動重連 |
| `GET /session` 沿用失敗 | 改為 `POST /session` 新建；新建失敗寫入 log |
| `/config/providers` 讀取失敗 | 重試 5 次 × 1.5s；仍失敗保留既有清單不退空、不影響送出 |
| 權限請求 | SSE 快速路徑 + 1s 輪詢兜底；同 request 只回覆一次 |
| SSE 中斷 | 原生 EventSource 自動重連；狀態列顯示重連中 |
| proxy 離線 | manager 將 server/專案變更加入 pending sync 佇列，init 時重試 |
| 刪除 server | 移除 proxy 設定 + localStorage + 一併清除其動態 Menu 項目（BR-62） |

## 6. 測試策略

| 層級 | 方式 |
|------|------|
| ai-proxy 單元 | `tests/opencode-proxy.Tests.ps1`（Pester）：mock 後端驗證 query string 轉發、SSE 不被 120s 掐斷 |
| 前端整合 | 依 `OpenCode_Serve_Proj/test.md` 的 TC 精神做手動/瀏覽器驗證（連線、串流、模型、權限、中斷、新對話、log） |
| Menu | 手動驗證：新增 server + 專案 → Menu 出現「server · 專案」項目 → 點擊開啟聊天頁；刪除 server → Menu 項目移除 |

## 7. 範圍外（Out of Scope）

- 不修改既有 v3「Agent App」選單與 chat-bot.html。
- 不把 `OpenCode_Serve_Proj/start.ps1` 併入 Menu（serve 由使用者自行啟動，Menu 僅連線操作）。
- 不新增 3 階層 Menu（系統僅支援 2 階層，故採扁平展開）。
- 聊天頁不做多分頁列（單一專案，切換靠 Menu）。

## 8. 鎖定決策記錄（Phase 1→2→3 結論）

| 決策 | 結論 |
|------|------|
| 連線路徑 | 經 ai-proxy 中轉（符合 BR-50/51 與架構規則），修正 query + SSE 問題 |
| Menu 形態 | 新增平行一級選單「OpenCode Serve」，保留既有 Agent App |
| Server 管理 | 獨立管理頁 + 獨立 localStorage namespace，共用 proxy endpoint |
| 專案來源 | 對照 POC：使用者在管理頁手動定義專案（label + directory） |
| 專案項目 | 所有 server 專案扁平展開為二級項目，標籤「server 名 · 專案 label」 |
| 點擊行為 | 開啟單一專案聊天頁（無分頁列） |
| Manager | `opencode-manager.js` 改為 namespace factory，向後相容 v3 |
