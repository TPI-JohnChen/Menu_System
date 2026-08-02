# 任務拆解：OpenCode Serve 聊天頁 Bug 修正

**日期**：2026-08-02
**設計參考**：`2026-08-02-opencode-serve-chat-bugfix-design.md`
**受影響檔案**：`web-menu/index.html`、`web-menu/pages/opencode-serve-chat.html`
**範圍**：僅此二檔，其餘頁面/服務不動

---

## 目標

1. **Bug 1**：修復 iframe 內傳送鈕 mouse click 無效（sandbox 缺 `allow-forms`）
2. **Bug 2**：進入專案能回到原 session（浮動面板列出該目錄 session，可切換並載入歷史）

---

## 實作任務

### T1. `index.html` sandbox 修復
- [ ] `index.html:21` iframe `sandbox` 加入 `allow-forms`
- 結果：`sandbox="allow-scripts allow-same-origin allow-forms"`

### T2. `opencode-serve-chat.html` — i18n 與樣式
- [ ] `T` 物件（zh-TW + en）新增鍵：
  - `btnSession`（面板開關按鈕標籤）
  - `sessionList`（面板標題，如「Session 清單」）
  - `noSessions`（空清單提示）
  - `noSessionSelected`（未選取提示）
  - `loadSessionsFail`、`loadMessagesFail`（錯誤 log）
  - `sessionLoading`（載入中）
  - `showAll`（顯示全部）
  - `newSessionHint`（空清單時「開新對話」提示）
  - `titleFor`（title 佔位，如「未命名對話」）
- [ ] `<style>` 新增面板樣式：浮動容器（`position: fixed`）、目前項高亮、時間小字、捲動、z-index 高於 log

### T3. `opencode-serve-chat.html` — Session 清單狀態
- [ ] `st` 新增欄位：
  - `sessionList: []`（該目錄 session，updated 降冪）
  - `sessionPanelOpen: false`
  - `loadingSession: false`
  - `showAllSessions: false`
- [ ] 新增 `fmtRelative(ts)`（依 updated 產出相對時間「剛剛 / N 分前 / N 小時前 / 日期」）

### T4. `opencode-serve-chat.html` — 清單載入
- [ ] `loadSessionList()`：`GET /session?directory=<worktree>` → 依 `time.updated` 降冪排序 → 存 `st.sessionList` → `renderSessionPanel()`
- [ ] `refreshSessionList()`：載入後呼叫（供發完訊息、SSE 事件後更新）
- [ ] 錯誤處理：`GET /session` 失敗 → `addLog(t('loadSessionsFail'))`，不阻擋聊天

### T5. `opencode-serve-chat.html` — 浮動面板 UI
- [ ] Header 新增 `<button id="session-btn">`（開啟面板）
- [ ] 面板 DOM：`<div id="session-panel">`，內含標題、清單、空狀態、錯誤
- [ ] 面板列渲染：每列 = title（截斷）+ `fmtRelative(updated)`；目前 session 高亮 class
- [ ] 清單只顯示前 20 筆（`showAllSessions` 為 true 時顯示全部）→「顯示全部」按鈕
- [ ] 點擊列 → `switchSession(id)`；點擊目前項 → 忽略（D18）
- [ ] 點面板外區域 → 關閉面板
- [ ] 空清單 → 顯示「無 session」提示 + 引導「新對話」

### T6. `opencode-serve-chat.html` — 切換 session
- [ ] `switchSession(id)`：
  1. 若 `id === st.sessionID` → 直接 return（D18）
  2. 若 `st.busy` → `POST /session/:id/abort` → 強制 `completeTurn()` 清理 busy/sendBtn（D13）
  3. 關閉目前 SSE：`st.es && st.es.close()`
  4. `st.sessionID = id`、清空 `st.messages`、`loadingSession = true`
  5. `GET /session/:id/message?directory=` → 填入 `st.messages`（upsertMessage/upsertPart）
  6. 404/空 → 重設 `st.sessionID = null`、移除面板該項、log（D17）
  7. `connect()` 重連 SSE（D11）
  8. `loadingSession = false`、`renderAll()`、關閉面板
- [ ] 載入歷史的 message 陣列每項 `{info, parts}` → `upsertMessage(info)` + `upsertPart(part)`

### T7. `opencode-serve-chat.html` — send 路徑（D12）
- [ ] `ensureSession()` 改為：`st.sessionID` 有值 → 直接 return；null → `POST /session` 建立（不再自動「挑最近」）
- [ ] `send()` 保持呼叫 `ensureSession()`（sessionID 為 null 時建立新 session 並發送）
- [ ] `ensureSession()` 不再需要 `list.filter(directory)` 精確比對（D2）

### T8. `opencode-serve-chat.html` — 新對話（D15）
- [ ] `newSession()`：busy 時沿用現有 guard；建立後 `st.sessionID = created.id`、清空訊息、關閉面板、刷新清單

### T9. `opencode-serve-chat.html` — 進入專案初始化（D4/D5）
- [ ] `init()` 改為：
  1. `renderStaticText()` + 基本 guard 不變
  2. `loadSessionList()`
  3. 清單非空 → `st.sessionPanelOpen = true`（自動展開，但**不選取**）+ `renderSessionPanel()`
  4. 清單空 → `POST /session` 建立一個並標記 `st.sessionID`（沿用現有 `ensureSession` 建立分支）
  5. `connect()` 照常
  6. `renderAll()`、`loadModels()`、`autoAllowPending` 定時器照舊

### T10. `opencode-serve-chat.html` — 面板即時更新（D16）
- [ ] `handleEvent`：收到 `message.updated`/`session.idle` 時呼叫 `refreshSessionList()`（若面板開啟則即時重渲染）
- [ ] `completeTurn()` 結束時刷新（title/時間反映）

### T11. `opencode-serve-chat.html` — 歷史訊息截斷（D20）
- [ ] `st` 新增 `historyTotal`、`historyLimit: 20`
- [ ] `loadHistoryInto()`：`GET /session/:id/message` 取最近 `historyLimit` 筆填入 `st.messages`；記錄 `historyTotal`
- [ ] `reloadHistory()`：`historyLimit += 20` 後重新載入
- [ ] `renderAll()`：當 `historyLimit < historyTotal` 顯示「載入更早 (N)」按鈕
- [ ] `switchSession()` 改用 `loadHistoryInto()`
- [ ] i18n 新增 `loadEarlier`（zh-TW/en）

---

## 驗證任務

### V1. 靜態檢查
- [ ] `node --check` 抽取 inline script 驗證語法（若可）
- [ ] 確認 `index.html` sandbox 含 `allow-forms`
- [ ] 確認 i18n zh-TW/en 鍵數一致

### V2. Playwright E2E（真實 opencode serve 127.0.0.1:4096）
- [x] **Bug 1**：經 iframe 進入，mouse click 傳送成功（輸入框清空、訊息送出、streaming 回應）
- [x] **Bug 1 對照**：直接開頁 mouse click 正常
- [x] **Bug 2**：有 session 目錄 → 進入自動展開面板、列出該目錄 session（前 20 筆 + 顯示全部 50）
- [x] 切換 session → 歷史訊息載入（最近 20 筆）、畫面正確、面板自動關閉
- [x] **大量歷史 session（386 則）不 hang**（T11 截斷生效）
- [x] 「載入更早」→ +20 重新載入（40 筆、按鈕仍在）
- [x] 點目前 session 忽略（D18）
- [x] 新對話 → 新建 session、清空、關閉面板（D15）
- [x] 無 session 目錄 → 自動建立（D5，測試後已刪除該 session）
- [x] 重新進入專案 → 面板自動展開、不自動選取（D4/D5）
- [x] 全程 console 無 JS error
- [ ] ~~busy 中切換~~（E2E 時 model 執行過長；改由程式碼審查確認 D13 路徑）

### V3. 手動 UI 確認
- [ ] 面板開/關、點外關閉、目前項高亮、空清單提示
- [ ] 前 20 筆限制 + 「顯示全部」展開
- [ ] 直接開頁（無 iframe）回歸無破

---

## 完成定義（Definition of Done）
- [ ] Bug 1 在 iframe 情境 mouse click 可傳送
- [ ] Bug 2 可從面板切換回原 session 且載入歷史
- [ ] 全部 V1–V3 通過
- [ ] `requirements-analysis.md` 若有涉及功能則補記（如有必要）
- [ ] 未動到範圍外檔案

---

## 注意事項
- serve 目前跑在 **127.0.0.1:4096**，測試用 `serverId` 對應 `srv-msbq6xtx-3wdn`（localhost:4096）
- 傳 `directory=` 用正斜線即可，serve 會自行正規化（D2 已實測）
- `st.es.close()` 後務必重連，避免事件遺漏（D11）
- 面板 z-index 須高於 `#log`，避免疊層
