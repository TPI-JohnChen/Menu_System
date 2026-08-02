# 設計文件：OpenCode Serve 聊天頁 Bug 修正

**日期**：2026-08-02
**狀態**：設計鎖定
**受影響服務**：web-menu（`index.html`、`pages/opencode-serve-chat.html`）

---

## 1. 背景與動機

使用者回報 `opencode-serve-chat.html` 兩個 bug：

### Bug 1：傳送按鈕 mouse click 無效，但 Enter 可送出
- **已重現**（Playwright + 真實 opencode serve + iframe 情境）：
  - 直接開頁（無 iframe）→ mouse click 正常
  - 經 web-menu iframe 進入 → mouse click 失敗，console 錯誤：
    ```
    Blocked form submission to '' because the form's frame is sandboxed and the 'allow-forms' permission is not set.
    ```
- **RCA**：`index.html:21` 的 content iframe `sandbox="allow-scripts allow-same-origin"` 缺少 `allow-forms`。聊天頁 `<form id="composer">` + `type="submit"` 按鈕，mouse click 觸發**原生 form submission**，被 sandbox 阻擋。Enter 走 `inputEl.keydown` handler 直接呼叫 `send()`（不依賴 form submission），故正常。

### Bug 2：每次進入專案像新 session，無法回到原 session
- **RCA 根因 1**：`ensureSession()` 用 `s.directory === st.directory` 精確比對，但 serve 回傳 directory 為 Windows 反斜線（`C:\D\...`），worktree 從 URL 帶入可能為正斜線 → 比對失敗 → 每次 POST 建新 session（實測該目錄累積 50 個 session）。
- **RCA 根因 2**：即使復用同一 session，`init()` 從不載入該 session 歷史訊息（`st.messages` 為空 Map，SSE 只推新事件）→ 畫面空白 → 使用者誤以為是新 session。
- **RCA 補充**：實測確認 opencode serve `GET /session?directory=<正或反斜線>` 過濾皆可靠（回傳均為該目錄 session），因此可直接信任 serve 過濾。

---

## 2. 設計決策（Grill 後鎖定）

| # | 決策 | 選擇 |
|---|------|------|
| D1 | Bug 1 修法 | `index.html` iframe sandbox 加入 `allow-forms`（最小侵入，所有 form 均可用） |
| D2 | Bug 2 目錄比對 | 依賴 serve 過濾 `GET /session?directory=xxx`，前端不再做精確比對 |
| D3 | Session 切換 UI | 浮動切換面板（chatGPT 風格：點擊切換、目前項高亮、標題+時間） |
| D4 | 面板預設狀態 | 預設收起，點擊按鈕展開；但進入專案時**有 session 則自動展開**（D5） |
| D5 | 進入專案初始行為 | 載入該目錄 session 清單；**有 session → 自動展開面板但只展開、不自動選取**；無任何 session → 自動建立一個並標記為目前 |
| D6 | 切換 session 時 busy 處理 | 自動中斷目前 turn + 載入目標 session 訊息 |
| D7 | 新對話自動命名 | 依賴 serve 自動生成 title；前端在「發完訊息後」刷新 session 清單以更新 title |
| D8 | 面板即時反映 | 目前 session 的標題/時間在 SSE 事件後即時更新 |
| D9 | 修正範圍 | 最小範圍：僅 `index.html`（sandbox）與 `opencode-serve-chat.html` |
| D10 | 過濾範圍 | 面板僅顯示目前 worktree 目錄下的 session |
| D11 | 切換時 SSE | 切換 session 時關閉目前 SSE → 載入目標訊息 → 重連新 SSE（訊息載入後才重連） |
| D12 | 雙 session 路徑 | `switchSession()` 設 `st.sessionID`；`send()` 僅在 `st.sessionID` 為 null 時才建立新 session。面板選取過（sessionID 有值）→ send 絕不新建 |
| D13 | 切換時 busy 清理 | `switchSession()`：若有 busy → POST abort → 等候（或強制）呼叫 `completeTurn()` 清理 busy 與 sendBtn，再關閉 SSE → 載入訊息 → 重連 SSE |
| D14 | 未選取時 sendBtn | 進入專案未選取 session 時 sendBtn 保持可用（disabled=false），send 依 D12 處理 |
| D15 | 新對話後面板 | 點「新對話」建立後：st.sessionID=新ID、清空訊息、關閉面板 |
| D16 | 面板即時更新 | 面板開啟時，收到 SSE 事件（message/session）即時重渲染清單，title/時間保持最新 |
| D17 | session 已刪除 | 載入訊息失敗（404/空）→ log、st.sessionID 重設 null、面板移除該項，使用者可重選或新建 |
| D18 | 重複點同一項 | 點目前 session 同項 → 忽略，不重載 |
| D19 | 清單量效能 | 顯示前 20 筆（updated 降冪），面板提供「顯示全部」展開其餘 |
| D20 | 歷史訊息載入 | 切換 session 時僅載入最近 20 筆（`slice(-20)`）；訊息區底部「載入更早」按鈕每次 +20 重新載入。避免大量歷史（實測 380+ 則含巨型 diff patch）`renderAll` 主執行緒阻塞導致瀏覽器 hang（E2E 發現） |

---

## 3. 架構與元件

### 3.1 資料流（修正後）

```
[進入專案] Menu 點擊 → opencode-serve-chat.html?serverId&worktree&label&server
   │
   ├─ GET /session?directory=<worktree>          → 載入該專案 session 清單（面板）
   │     ├─ 有 session → 自動展開面板（只展開、不選取）
   │     └─ 無 session  → POST /session → 建立並標記為目前
   │
   ├─ connect() → SSE /event?directory=<worktree>
   │
   ├─ 使用者點擊面板某 session → abort 目前 SSE（若 busy 先 abort turn）
   │     → 載入 GET /session/:id/message → 填入 st.messages
   │     → 重連 SSE（D11）→ renderAll()
   │
   └─ 發送訊息 → POST /session/:id/message → SSE 串流 → 完成後 refreshSessionList()
```

### 3.2 元件拆解（opencode-serve-chat.html 內）

1. **Session 清單狀態**：新增 `st.sessionList = []`、`st.sessionPanelOpen = false`、`st.loadingSession = false`
2. **`loadSessionList()`**：`GET /session?directory=<worktree>` → 依 `time.updated` 降冪排序 → 存 `st.sessionList` → 渲染面板
3. **`refreshSessionList()`**：發訊息完成後或 SSE `session.idle` 時呼叫，更新 title/時間（D7/D8）
4. **`switchSession(id)`**：若 `st.busy` 先 `POST /abort`（D6）→ 設 `st.sessionID = id` → `GET /session/:id/message` → 填 `st.messages` → `renderAll()` → 關閉面板
5. **`newSession()`**：改為建立後刷新清單並讓面板維持目前項高亮
6. **浮動面板 DOM**：Header 新增「📂」按鈕 + 對話區右側浮動面板（`position: fixed`），列 session（title + 相對時間），點擊切換

### 3.3 UI 佈局（浮動面板）

- 觸發入口：Header 模型選擇器旁新增「📂 Session」按鈕
- 面板：`position: fixed; right: 12px; top: 56px;` 半透明浮層，最大高度 60vh，可捲動
- 每列：title（截斷）＋ 更新時間（`fmtRelative`）；目前項高亮（`--color-menu-active`）
- 空狀態：「此專案尚無 session」＋ 提示點「新對話」

---

## 4. 錯誤處理

| 情境 | 處理 |
|------|------|
| `GET /session` 失敗 | 面板顯示錯誤 + log `loadSessionsFail`，不阻擋聊天 |
| `GET /session/:id/message` 失敗 | log `loadMessagesFail`，維持目前畫面 |
| 切換時 abort 失敗 | 仍嘗試載入目標 session（log `abortFail`，不致命） |
| 無 session 且自動建立失敗 | 顯示 `newSessionFail`，面板維持空 |
| SSE 連線中斷 | 維持既有重連邏輯，不影響 session 切換 |

---

## 5. 測試

### 5.1 手動/Playwright E2E（真實 opencode serve）

1. **Bug 1 回歸**：經 iframe 進入聊天頁，mouse click 傳送成功（sandbox 修復後）
2. **Bug 1 對照**：直接開頁仍正常（回歸無破）
3. **Bug 2 回歸**：同一專案目錄有 session 時，進入頁面面板列出該目錄 session（非全部），點選載入歷史訊息
4. **切換**：A session 談完 → 切 B → 再切回 A，訊息正確載入
5. **busy 切換**：A 執行中切 B → 自動 abort + B 載入
6. **自動建立**：新目錄無 session → 進入後自動建立一個
7. **自動命名**：新 session 發第一則訊息 → 完成後面板 title 更新（serve 自動生成）
8. **面板即時性**：目前 session 收到新訊息 → title/時間即時反映

### 5.2 靜態檢查
- `node --check` 通過（HTML inline script 抽驗）
- sandbox 屬性含 `allow-forms`

---

## 6. 風險與取捨

| 風險 | 評估 | 因應 |
|------|------|------|
| 加入 `allow-forms` 對 sandbox 隔離性的影響 | 低（僅允許表單提交，頁面皆內部頁面） | 僅此 iframe，外部頁面不經此 |
| 依賴 serve 過濾的正斜線/反斜線 | 已實測可靠 | 傳原始 worktree，serve 自行正規化 |
| 面板浮層與 log 面板疊層 | 低 | z-index 高於 log，點擊面板外關閉 |
| session 清單量大（50+） | 中 | 面板可捲動 + 依 updated 排序，未來可加分頁 |

---

## 7. 不做的項目（Out of scope）
- chat-bot.html 等其他頁面的雷同修正（D9 最小範圍）
- session 重新命名、刪除按鈕（現行單一專案頁不提供）
- 面板分頁/無限捲動
- title 前端 patch（依賴 serve 自動命名）
