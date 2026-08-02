# OpenCode Chat — 需求功能文件 (require.md)

> 來源:`index.html`(純 HTML 聊天介面,SSE POC)+ `start.ps1`(一鍵啟動)。
> 單檔 `index.html`,無 build、無套件;所有行為由頁面內的 JS 直接與 `opencode serve` 的 V1 HTTP/SSE API 互動。

## 1. 系統目標

以純 HTML 提供一個可同時對**多個專案目錄**對話的聊天介面,直接連線本機 `opencode serve`,透過 SSE 即時串流顯示 AI 回覆。開機即「預熱」:頁面載入時自動為每個專案建立/沿用 session 並連上 SSE。

## 2. 環境假設與硬體依賴

- 需有 `opencode serve` 正在執行,預設 `http://127.0.0.1:4096`(可於 `CONFIG.baseUrl` 修改)。
- 頁面**不能**用 `file://` 直接開(CORS 會擋),需透過靜態伺服器服務。
- 走 opencode 的 **V1 root 路由**(`/session/...`、`/permission/...`、`/config/...`、`/event`),非 v2 `/api/...`。

## 3. 設定區(使用者唯一需編輯處)

位於 index.html 頂部 `CONFIG` 物件:

| 欄位 | 預設 | 說明 |
|------|------|------|
| `baseUrl` | `http://127.0.0.1:4096` | opencode serve 位址 |
| `projects` | 專案 A-Fast_Agent、專案 B-寫三總_NGS_報價 | `{ label, directory }` 陣列,一個分頁對應一個工作目錄 |
| `autoAllowOnce` | `true` | 工具權限請求自動回覆 `once` 放行;`false` 則需手動放行 |

## 4. 功能需求

### FR-1 專案分頁與切換
- 每個 `projects` 項目建立一個分頁(`buildTab`),顯示 label 與 directory。
- 點分頁即切換 active 專案(`switchProject`),切換**不受執行中限制**,任何時刻都可切。
- 切換後:頂部 `#nowdir` 顯示該目錄、`#messages` 切換為該專案訊息、狀態列反映該專案 busy/待命。

### FR-2 頁面載入即預熱(init)
- 載入時對每個專案:`ensureSession`(沿用該目錄最近一次 session,否則新建)+ `connect`(建立 `/event?directory=...` 的 SSE 連線)。
- 任一專案連線失敗會記錄於 log,不影響其它專案。

### FR-3 送出對話
- 輸入框支援 Enter 送出、Shift+Enter 換行;「傳送」按鈕亦可。
- 送出流程:`ensureSession` → `activateBusy` → `POST /session/{id}/message?directory=...`,body 為 `{ parts:[{type:"text",text}], ...}`;若已指定模型則附上 `model:{providerID, modelID}`。
- 送出後輸入框清空、`busy=true`、狀態列「執行中…」、傳送鈕停用。
- 以 `/message` 的回傳先 seed 訊息,後續 SSE 事件 idempotent 合併。

### FR-4 即時串流顯示
- SSE 事件類型:`message.updated`、`message.part.updated`、`message.part.delta`、`message.part.removed`、`permission.asked`、`session.idle`、`session.status`。
- `message.part.delta` 的文字增量逐字累加渲染(串流打字效果)。
- **sessionID 過濾**:事件 `sessionID` 與目前 session 不符者一律丟棄,避免舊 session 串流混入。

### FR-5 訊息與 Markdown 渲染
- 角色顯示:「你」/「Assistant」;訊息分 user / assistant 氣泡。
- part 類型渲染:
  - `text` → markdown(段落、標題 h1–h6、無序/有序清單、程式碼區塊(```lang)、表格、引述、分隔線、行內 code/粗體/斜體/http 連結)。
  - `reasoning` → 灰字折疊樣式。
  - `tool` → `[工具] …` 並顯示完成狀態;completed 時附上最多 2000 字輸出。
  - `file` → `[檔案] 檔名` 可開新分頁連結。
  - `agent`、`subtask`、`patch` → 對應標示。
- 每則 assistant 訊息附 meta:`模型 <modelID> · TTFT <ms> · 完成 <s>`(由 `completeTurn` 結算)。

### FR-6 回合狀態(busy / idle)
- `busy=true` 於送出當下;收到 `session.idle` 或 `session.status`(type=idle)時 `completeTurn` 解除並結算 TTFT/總時長。
- 中斷成功、或送出失敗也會解除 busy。

### FR-7 中斷按鈕
- 按鈕**永遠可點**(不設 disabled)。
- busy 時:送出 `POST /session/{id}/abort?directory=...`,成功後 `completeTurn` + 記錄 log。
- idle 時:不寫 log、不發請求,按鈕短暫閃示「無任務可中斷」(1.3 秒後還原);無 session 時閃示「無 session」。

### FR-8 新對話
- 「新對話」按鈕:`POST /session?directory=...` 建立新 session,重設該專案的訊息、計時、模型指定、已放行權限清單。
- busy 時不允許,提示先中斷。

### FR-9 模型指定
- 「模型」下拉由 `GET /config/providers?directory=...` 填入,選項值為 `providerID/modelID`(以**第一個** `/` 分割,支援含斜線的 modelID),顯示為「provider · 模型名」。
- 選取後於該專案指定 `active.model`;送出時帶入 body。清單載入失敗會**重試 5 次(1.5 秒間隔)**。
- **下拉隨 active 專案同步**:每次 `switchProject`(/加入新專案)會依該專案 `directory` 重新載入清單並清除舊選項,同時把該專案自身指定的 `active.model` 回填到下拉值;未指定的專案回到「預設模型」。以序號守護(`modelLoadSeq`)避免非同步舊回應覆蓋新選取。
- **失敗不棄守**:新清單只在 `/config/providers` 回傳成功後才套用(重建 options 並清掉舊項);若該專案目錄的 providers 讀取失敗(或啟動初期)，**保留先前已有清單**、不退空、不影響送出對話。

### FR-10 權限自動放行
- `autoAllowOnce=true`:工具觸發權限請求時自動回覆 `once`。
- 雙路徑:SSE `permission.asked` 快速路徑 + 每 1 秒輪詢 `GET /permission?directory=...` 兜底(實測 SSE 不會送 `permission.asked`,故輪詢為主要路徑)。
- 以 `st.replied` Set 去重,同一個 request 只回覆一次。
- 回覆 API:`POST /permission/{requestID}/reply?directory=...`,body `{reply:"once"}`。

### FR-11 日誌面板(底部分隔列)
- 記錄連線、權限、中斷、開新對話、錯誤等。
- **防爆版**:相同文字 2.5 秒內只記一次(去重);最多保留 60 條(超過丟最舊);面板高度上限 110px、可捲動,不遮蔽聊天區。
- 權限相關訊息以黃色(`#log .perm`)標示。

### FR-12 可用性與韌性
- `loadModels` 失敗自動重試 5 次。
- SSE 斷線由原生 EventSource 自動重連,狀態列顯示「SSE 連線中斷,自動重連…」。

### FR-13 動態加入專案(系統啟動後)
- 不須改 `CONFIG`,執行中可直接新增專案目錄:
  - header「＋ 專案」按鈕展開內嵌表單(目錄路徑、分頁名稱可留空)。
  - Enter 或「加入」即可送出;路徑空白則提示、重複目錄拒絕(不重複建)。
  - 加入後立即建立新分頁、`ensureSession`(沿用/新建)並連上該目錄的 SSE,並切換為 active;分頁名預設取目錄的 basename。
  - 新專案以 `localStorage`(`opencodeChat_customProjects`)持久化;頁面重載後自動重現(不搶佔 active 專案)。
  - 「取消」/再次點「＋ 專案」可收起表單。

### FR-14 移除動態專案(系統啟動後)
- 僅**動態加入**的專案可移除;`CONFIG.projects` 內建分頁**不提供** ×(移除會遭拒並於 log 提示)。
- 動態分頁 label 旁顯示「×」(`.tab-x`);點擊時以 `stopPropagation` 避免觸發分頁切換。
- 移除流程(`removeProject`):關閉該專案 SSE → 自 states/分頁 DOM 移除 → 自 `customProjects` 移除並重寫 `localStorage` → 重排剩餘分頁索引。
- 若移除的分頁即為 active,切換到剩餘最新分頁(`switchProject(min(idx, len-1))`)。
- 無此目錄專案時移除為無操作;剩下全是內建專案時「＋ 專案」已無任何可移除項目。

## 5. 非功能需求
- 單檔、無外部相依、無 build。
- 相容一般瀏覽器(Edge/Chrome);以 `zh-Hant` 為主語系。
- 主要透過 `start.ps1` 啟動(自動綁 IPv4、避開 `localhost`→`::1` 連不上問題)。
