# 設計文件：OpenCode Serve 聊天頁 — 模型資訊可視化改善

**日期**：2026-08-02
**版本**：1.0
**狀態**：已鎖定（經 Phase 2 腦力激盪 + Phase 3 Grill）

## 1. 背景與目標

`web-menu/pages/opencode-serve-chat.html`（「OpenCode Serve 對話」頁）目前有兩個人性化缺口：

1. **問題 1（預設模型未揭露）**：初次進入時，模型下拉清單只顯示「預設模型」，使用者不知道等一下實際會送給哪一個模型。期望能像 opencode TUI 一樣，在送出前就能知道預設模型。
2. **問題 2（歷史訊息看不到模型）**：切換 session 載入歷史訊息時，assistant 訊息只顯示「Assistant」，不知道是哪一個模型回應的。

本設計在不改動後端（ai-proxy）與其他頁面的前提下，僅改動聊天頁前端，補足模型資訊。

## 2. RCA（根因分析）

| 問題 | 根因 |
|------|------|
| 問題 1 | `loadModels()` 只讀取 `GET /config/providers` 回應的 `providers` 欄位並建立 `<option>`，從未更新第一個「預設模型」option（`value=""`）的文字。而實際全域預設模型來自 `GET /config` 的 `model`（格式 `provider/model`，如 `opencode/deepseek-v4-flash-free`）——這正是 opencode 內部 `Provider.defaultModel()` 優先使用的來源，也是 TUI 顯示的模型。 |
| 問題 2 | `loadHistoryInto()` 載入歷史時只呼叫 `upsertMessage(m.info)`，從未設定 `entry.meta`。`renderMessage()` 的 who 行取 `info.title || t('whoAssistant')`，但 `AssistantMessage` 型別**沒有 `title` 欄位**，因此永遠 fallback 到「Assistant」。而 `AssistantMessage` 其實帶有 `modelID` + `providerID`，只是從未被使用。 |

## 3. 方案設計

### 3.1 問題 1：模型下拉揭露實際預設模型

`loadModels()` 在同一個 retry loop（5 次 × 1.5s、序號守護）內以 `Promise.all` 同時抓取：

- `GET /config` → `{ model?: "provider/model", small_model?: string, ... }`
- `GET /config/providers` → `{ providers: [...], default: { [providerID]: modelID } }`（既有）

解析實際預設模型的優先順序：

1. `config.model`（格式 `provider/model`）若與 options 清單中任一 `key` 相符 → 使用之。
2. 否則取 `/config/providers` 回應的 `default` 欄位第一個 provider 的 `providerID/modelID`，若與 options 相符 → 使用之。
3. 否則不標註（維持「預設模型」4 字）。

接著更新第一個 option 的文字為：`t('modelDefault') + ' · ' + <匹配 option 的 label>`（label 沿用下拉既有的 `prov.name · m.name` 格式），例如「預設模型 · DeepSeek · deepseek-v4-flash-free」。

**重點**：第一個 option 的 `value` 維持 `""`（代表送預設），僅改**顯示文字**——行為不變，送出不帶 `model`，由 opencode serve 決定預設模型。

```js
// loadModels() 內（示意）
const [cfg, data] = await Promise.all([api('/config'), api('/config/providers')])
// ...建 options...
let defaultKey = ''
if (cfg && typeof cfg.model === 'string' && cfg.model.includes('/')) defaultKey = cfg.model
if (!defaultKey && data && data.default) {
  const pids = Object.keys(data.default)
  if (pids.length) defaultKey = pids[0] + '/' + data.default[pids[0]]
}
const match = defaultKey ? options.find(o => o.key === defaultKey) : null
if (match) modelSel.options[0].textContent = t('modelDefault') + ' · ' + match.label
```

### 3.2 問題 2：assistant 訊息 who 行顯示模型

`renderMessage()` 的 who 行改為：assistant 訊息若有 `info.modelID`，顯示 `t('whoAssistant') + ' · ' + info.modelID`（如「Assistant · deepseek-v4-flash-free」）；沒有則維持 `info.title || t('whoAssistant')`。

```js
// renderMessage() 內（示意）
var whoText
if (entry.info && entry.info.role === 'user') whoText = t('whoUser')
else if (entry.info && entry.info.modelID) whoText = t('whoAssistant') + ' · ' + entry.info.modelID
else whoText = (entry.info && entry.info.title) || t('whoAssistant')
who.textContent = whoText
```

**套用範圍**：全部 assistant 訊息（含即時串流回合與歷史訊息）。

- 即時串流：`message.updated` 帶完整 `info`（含 `modelID`）→ who 行顯示模型；delta 建立的暫存訊息（`{id, role:'assistant'}` 無 modelID）則暫時顯示「Assistant」，收到 `message.updated` 後自動補上。
- 歷史訊息：`loadHistoryInto()` 載入的 `m.info` 即為 `AssistantMessage`，含 `modelID` → 直接顯示。

### 3.2.1 切語系標註重疊（Grill 補強）

`loadModels()` 只在 `init()` 執行一次，但 `MenuAPI.onLanguageChange` → `renderStaticText()` 會把第一個 option 重置回純「預設模型」（line 1096-1097）。為避免切語系後標註遺失，將標註邏輯抽出：

```js
var currentDefaultLabel = null   // 記憶已解析的標註 label
function applyDefaultModelLabel() {
  if (modelSel.options[0]) {
    modelSel.options[0].textContent = currentDefaultLabel
      ? t('modelDefault') + ' · ' + currentDefaultLabel
      : t('modelDefault')
  }
}
```

- `loadModels()` 解析出 defaultKey 後，將匹配 option 的 label 存 `currentDefaultLabel` 並呼叫 `applyDefaultModelLabel()`。
- `renderStaticText()` 的 `first.textContent = t('modelDefault')` 改為呼叫 `applyDefaultModelLabel()`（若已解析過標註則重新套用，否則維持純「預設模型」）。

### 3.3 meta 行調整（去重 + 條件渲染）

因 who 行已顯示模型，meta 行移除模型字串（避免重複的「已指定模型 X」），TTFT / 完成改為**有值才顯示**，避免歷史訊息出現「TTFT — · 完成 —」：

```js
// renderMessage() 的 meta 渲染（示意）
if (entry.meta) {
  var bits = []
  if (entry.meta.ttft != null) bits.push('TTFT ' + fmtMs(entry.meta.ttft))
  if (entry.meta.total != null) bits.push(t('doneLabel') + ' ' + fmtMs(entry.meta.total))
  if (bits.length) meta.textContent = bits.join(' · ')
}
```

### 3.4 移除 dead code：`st.modelRef`

who 行直接讀 `entry.info.modelID`，`st.modelRef`（僅在 `completeTurn()` 寫入 meta.model）不再需要。連帶清理：

- `st` 物件移除 `modelRef: null`
- `send()` / `switchSession()` / `newSession()` 中的 `st.modelRef = null`
- `handleEvent()` 中 `if (props.info.modelID) st.modelRef = props.info.modelID`
- `completeTurn()` 中 `meta.model = st.modelRef` 移除（meta 改只放 `{ ttft, total }`）

### 3.5 i18n

- 既有 `modelDefault`（預設模型 / Default model）沿用，僅拼接 `' · ' + label`。
- 既有 `modelSet` / `modelDefaultSet` 仍用於 log（`addLog` 顯示「已指定模型」），**保留不刪**。
- `whoAssistant`（Assistant）沿用，拼接 `' · ' + info.modelID`。
- 無需新增 i18n key。

## 4. 資料流

```
開啟聊天頁 → init()
  ├─ loadModels() [Promise.all]
  │    ├─ GET {base}/config?directory=               → config.model (provider/model)   [新增]
  │    └─ GET {base}/config/providers?directory=     → providers + default             [既有]
  │    └─ 解析 defaultKey → 標註第一個 option 文字
  │
  ├─ loadSessionList() → 選 session / 新建
  └─ connect() → SSE /event

切換 session → switchSession() → loadHistoryInto()
  └─ GET {base}/session/{id}/message?directory= → 每筆 info(含 modelID) 
       → upsertMessage → renderMessage() who 行顯示「Assistant · <modelID>」
```

## 5. 錯誤處理與韌性

| 情境 | 處理 |
|------|------|
| `GET /config` 失敗 | 與 `/config/providers` 共用 retry loop；仍失敗時 `config = null`，只標註 `default` 備援或維持「預設模型」4 字，不影響送出 |
| `config.model` 對不到任何 option | 嘗試 `default` 備援；再失敗不標註（維持原狀） |
| 歷史訊息缺 `modelID`（舊版/特殊訊息） | who 行 fallback `title || 'Assistant'` |
| 即時串流暫存訊息無 `modelID` | who 行暫顯「Assistant」，`message.updated` 到來後補上 |
| 切換語系 | `applyDefaultModelLabel()` 重新套用標註，不因 `renderStaticText()` 重置而遺失 |

## 6. 測試策略

| 層級 | 方式 |
|------|------|
| 語法檢查 | 擷取 `opencode-serve-chat.html` inline script → `node --check` 驗證語法 |
| 靜態驗證 | 以 mock `/config` / `/config/providers` 回應跑函式邏輯（模擬解析 defaultKey） |
| 前端整合（需 serve） | 啟動 `opencode serve` + `start-services.bat`，於瀏覽器驗證：<br>1. 下拉第一項顯示「預設模型 · <provider名> · <模型名>」<br>2. 送出訊息 → assistant who 行顯示「Assistant · <modelID>」<br>3. 切換 session → 歷史 assistant 訊息 who 行顯示模型，meta 行無「TTFT —」<br>4. 新對話 / 中斷 / 模型切換 log 正常 |

## 7. 範圍外（Out of Scope）

- 不修改 ai-proxy（`/config` 已能透傳，無後端變更）。
- 不修改 POC `OpenCode_Serve_Proj/index.html`。
- 不修改 v3 `chat-bot.html` 或管理頁。
- 不做「預設模型」主動切換（維持 `value=""` 送預設的行為）。

## 8. 鎖定決策記錄（Phase 2 結論）

| 決策 | 結論 |
|------|------|
| 預設模型標註格式 | 「預設模型 · Provider名 · 模型名」（沿用下拉 label 格式） |
| 預設模型解析來源 | `config.model`（provider/model）優先，`/config/providers.default` 備援 |
| model.json 近似 | 接受：第一次進入時 model.json recent 通常為空，直接落入 providers.default |
| 模型顯示位置 | assistant who 行（「Assistant · 模型ID」） |
| 套用範圍 | 全部 assistant 訊息（含即時與歷史） |
| meta 行 | 移除模型字串；TTFT/完成有值才顯示 |
| dead code | 移除 `st.modelRef` |
| 切語系 | 抽出 `applyDefaultModelLabel()` 重複套用（Grill 補強） |
| i18n | 無新 key，沿用 `modelDefault` / `whoAssistant` |
| 驗證方式 | 靜態語法檢查 + mock `/config`、`/config/providers` 回應跑解析邏輯 |
