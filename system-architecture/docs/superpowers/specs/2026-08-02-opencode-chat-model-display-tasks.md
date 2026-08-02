# 實作計畫：OpenCode Serve 聊天頁 — 模型資訊可視化改善

## 設計文件參考
`docs/superpowers/specs/2026-08-02-opencode-chat-model-display-design.md`

## 任務清單

### Task 1: 預設模型揭露（loadModels + applyDefaultModelLabel）
- **範疇**: 修改 `loadModels()` 在同一個 retry loop 內 `Promise.all` 抓取 `/config` + `/config/providers`；解析 defaultKey（`config.model` 優先 → `providers.default` 首個備援）；新增 `currentDefaultLabel` 狀態與 `applyDefaultModelLabel()` 函式；更新第一個 option 文字為「預設模型 · Provider名 · 模型名」。
- **修改檔案**: `web-menu/pages/opencode-serve-chat.html`
- **驗收標準**: 以 mock 回應驗證：(a) `config.model="opencode/deepseek-v4-flash-free"` 存在於 options → 第一個 option 標註「預設模型 · DeepSeek · deepseek-v4-flash-free」；(b) `config.model` 缺省但有 `default` → 用首個 provider key；(c) 都無 → 維持「預設模型」4 字。
- **依賴關係**: 無

### Task 2: assistant who 行顯示模型
- **範疇**: 修改 `renderMessage()` 的 who 行邏輯：assistant 且有 `info.modelID` → `t('whoAssistant') + ' · ' + info.modelID`；無則 fallback `info.title || t('whoAssistant')`。
- **修改檔案**: `web-menu/pages/opencode-serve-chat.html`
- **驗收標準**: mock 一個含 `modelID` 的 assistant 訊息 → who 行顯示「Assistant · deepseek-v4-flash-free」；不帶 `modelID` 的訊息 → 維持「Assistant」。
- **依賴關係**: 無

### Task 3: meta 行調整 + 移除 dead code
- **範疇**: `renderMessage()` meta 渲染改為 TTFT/完成有值才 push；移除 `st.modelRef` 相關全部程式碼（state、send、switchSession、newSession、handleEvent、completeTurn）；`completeTurn()` meta 改只放 `{ ttft, total }`；`renderStaticText()` 第一個 option 改呼叫 `applyDefaultModelLabel()`。
- **修改檔案**: `web-menu/pages/opencode-serve-chat.html`
- **驗收標準**: (a) mock 有 `meta.ttft`/`meta.total` 的訊息 → meta 行顯示「TTFT X · 完成 Y」；(b) 只有 model 無時間 → 無 meta 行；(c) `st.modelRef` 全域無殘留。
- **依賴關係**: Task 1、Task 2

### Task 4: 自我測試（靜態 + mock）
- **範疇**: 擷取 inline script 做 `node --check` 語法驗證；撰寫/執行 mock 測試驗證 3 個函式的輸入輸出（loadModels 標註解析、renderMessage who 行、meta 條件渲染）。
- **修改檔案**: 無（測試腳本放暫存目錄）
- **驗收標準**: `node --check` 通過；mock 測試全 PASS（涵蓋 Task 1~3 的驗收標準案例）。
- **依賴關係**: Task 1、2、3

## 待解決問題 (Open Questions)
- 無（Grill 已收斂）

## 備註
- Grill 決策：
  - 預設模型來源 = `config.model` 為主、`/config/providers.default` 備援；接受 model.json（priority 2）近似，因第一次進入時 model.json recent 通常為空。
  - 切語系標註不遺失：抽出 `applyDefaultModelLabel()`，`renderStaticText()` 與 `loadModels()` 都呼叫。
  - 驗證採靜態 + mock（serve 未運行）。
- 不變更 ai-proxy / POC / v3 chat-bot / 管理頁。
- 不做「預設模型」主動切換（維持 `value=""` 送預設行為）。
