# 實作計畫：AI Agent 供應商設定功能

**日期**：2026-07-14
**設計參考**：`docs/superpowers/specs/2026-07-14-ai-provider-settings-design.md`

---

## Tasks

### Task 1：更新 config/menu.js — 新增「供應商設定」Menu

- **範圍**：在 `config/menu.js` 的 `MENU_CONFIG` 陣列中新增一個一級選單項目
- **檔案**：`config/menu.js`
- **內容**：
  ```js
  {
    id: 'ai-agent',
    label: { 'zh-TW': '供應商設定', 'en': 'Provider Settings' },
    icon: '🤖',
    children: [
      { id: 'provider-management', label: { 'zh-TW': '供應商管理', 'en': 'Provider Management' }, path: 'pages/provider-management.html' },
      { id: 'model-browser', label: { 'zh-TW': '模型瀏覽器', 'en': 'Model Browser' }, path: 'pages/model-browser.html' }
    ]
  }
  ```
- **驗收標準**：Menu 顯示「供應商設定」一級選單，展開後有兩個子選項
- **依賴**：無
- **估時**：15 分鐘

---

### Task 2：建立 config/provider-types.js — 供應商類型定義表

- **範圍**：建立供應商類型定義表，驅動 UI 動態渲染
- **檔案**：`config/provider-types.js`（新檔案）
- **內容**：
  - `PROVIDER_TYPES` 物件，包含 6 個供應商類型定義
  - 每個類型包含：label（多語系）、icon、defaults（預設 baseUrl）、fields（動態表單欄位定義）
  - 供應商類型：openai, google, ollama, lmstudio, openai-compatible, anthropic
- **驗收標準**：所有供應商類型有完整的 label、icon、defaults、fields 定義
- **依賴**：無
- **估時**：30 分鐘

---

### Task 3：建立 lib/provider-manager.js — 供應商管理共用邏輯

- **範圍**：建立供應商管理的核心邏輯層
- **檔案**：`lib/provider-manager.js`（新檔案）
- **功能**：
  - `ProviderManager` class 或物件
  - localStorage CRUD：
    - `getProviders()` — 取得所有供應商
    - `saveProvider(provider)` — 新增或更新供應商
    - `deleteProvider(id)` — 刪除供應商
    - `updateProvider(id, data)` — 更新供應商資料
  - UUID 產生：`generateId()`
  - 驗證：`validateProvider(provider)` — 檢查必填欄位
  - API 呼叫介面：
    - `fetchModels(provider)` — 查詢模型列表
    - `testConnection(provider)` — 測試連線
    - `chatCompletion(provider, messages, options)` — 聊天補全
  - Proxy 連線狀態：`checkProxyStatus()`
- **API Contract**：
  - `GET /api/providers/:type/models?baseUrl=xxx&apiKey=xxx`
  - `POST /api/providers/:type/test` body: `{ baseUrl, apiKey }`
  - `POST /api/providers/:type/chat` body: `{ baseUrl, apiKey, model, messages, temperature, max_tokens }`
- **驗收標準**：所有 CRUD 和 API 呼叫功能可正常運作
- **依賴**：Task 2
- **估時**：2 小時

---

### Task 4：建立 pages/provider-management.html — 供應商管理頁面

- **範圍**：建立供應商管理頁面（卡片式 UI + Debug panel）
- **檔案**：`pages/provider-management.html`（新檔案）
- **功能**：
  - 引入 iframe-client.js（主題同步）
  - 引入 config/provider-types.js 和 lib/provider-manager.js
  - 供應商卡片列表（預設收合，顯示圖示 + 名稱 + 狀態）
  - 新增供應商 Dialog（選擇類型 → 動態表單 → 儲存）
  - 展開卡片顯示設定欄位 + 操作按鈕（測試連線 / 儲存 / 刪除）
  - Debug panel（預設隱藏，`?setting_debug=true` 顯示）：
    - JSON editor 直接編輯 localStorage 原始資料
    - 操作：儲存到 localStorage / 匯出 / 匯入
  - Proxy 狀態指示器（頁面頂部）
  - 多語系（zh-TW / en）
  - 主題支援（light / dark）
- **驗收標準**：
  - 可新增 / 編輯 / 刪除供應商
  - 卡片收合 / 展開正常運作
  - Debug panel 透過 URL 參數控制顯示
  - 多語系切換正常
  - 主題切換正常
- **依賴**：Task 2, Task 3
- **估時**：4 小時

---

### Task 5：建立 pages/model-browser.html — 模型瀏覽器頁面

- **範圍**：建立模型瀏覽器頁面（響應式佈局 + 聊天測試）
- **檔案**：`pages/model-browser.html`（新檔案）
- **功能**：
  - 引入 iframe-client.js（主題同步）
  - 引入 config/provider-types.js 和 lib/provider-manager.js
  - 供應商選擇下拉選單 + 查詢按鈕
  - 模型列表區（顯示 API 回傳的模型 ID）
  - 模型屬性面板（響應式佈局）：
    - 寬螢幕（>768px）：左右分割
    - 窄螢幕（≤768px）：上下分割
  - 屬性面板標題列：圖示 + 模型 ID + 副標題（供應商名稱 · 擁有者）
  - 「使用此模型」按鈕 → 展開聊天測試區塊
  - 聊天測試區塊：
    - 對話泡泡區
    - 輸入框 + 送出按鈕
    - 收合 / 展開功能
  - 多語系（zh-TW / en）
  - 主題支援（light / dark）
- **驗收標準**：
  - 選擇供應商後可查詢模型列表
  - 點選模型顯示完整屬性
  - 聊天測試可正常收發訊息
  - 響應式佈局在不同螢幕尺寸下正常顯示
  - 多語系切換正常
  - 主題切換正常
- **依賴**：Task 2, Task 3
- **估時**：5 小時

---

### Task 6：建立 docs/provider-settings-usage.md — Debug Panel 使用說明

- **範圍**：建立 Debug Panel 的使用說明文件
- **檔案**：`docs/provider-settings-usage.md`（新檔案）
- **內容**：
  - 如何啟用 Debug Panel（URL 參數 `?setting_debug=true`）
  - JSON editor 的操作說明
  - 匯出 / 匯入功能說明
  - 注意事項（API Key 安全性、資料格式等）
- **驗收標準**：文件內容完整、清楚
- **依賴**：Task 4
- **估時**：30 分鐘

---

### Task 7：AI Proxy 服務（獨立 repo）

- **範圍**：建立獨立的 AI Proxy 後端服務
- **檔案**：獨立 repo（不在 web-menu 專案內）
- **技術棧**：Node.js + Express.js（或 Fastify）
- **Port**：3001
- **功能**：
  - `GET /api/providers/:type/models` — 查詢模型列表
  - `POST /api/providers/:type/test` — 測試連線
  - `POST /api/providers/:type/chat` — 聊天補全
  - 供應商格式轉換：OpenAI, Google, Ollama, LM Studio, Anthropic, OpenAI Compatible
- **MVP 支援範圍**：
  - 模型查詢：先做 OpenAI + Ollama
  - 聊天補全：全部供應商都做
  - 測試連線：全部供應商都做
- **驗收標準**：
  - 所有端點可正常回應
  - 各供應商格式轉換正確
  - 錯誤處理完善
- **依賴**：Task 3（API contract 定義）
- **估時**：8 小時

---

## 任務總覽

| Task | 說明 | 狀態 | 估時 | 依賴 |
|------|------|------|------|------|
| 1 | 更新 config/menu.js | ✅ 已完成 | 15 分鐘 | 無 |
| 2 | 建立 config/provider-types.js | ✅ 已完成 | 30 分鐘 | 無 |
| 3 | 建立 lib/provider-manager.js | ✅ 已完成 | 2 小時 | Task 2 |
| 4 | 建立 pages/provider-management.html | ✅ 已完成 | 4 小時 | Task 2, 3 |
| 5 | 建立 pages/model-browser.html | ✅ 已完成 | 5 小時 | Task 2, 3 |
| 6 | 建立 docs/provider-settings-usage.md | ✅ 已完成 | 30 分鐘 | Task 4 |
| 7 | AI Proxy 服務（獨立 repo） | ✅ 已完成 | 8 小時 | Task 3 |

**總估時**：約 20 小時（實際已完成）

---

## 待辦事項（Future TODO）

| 項目 | 說明 | 優先級 |
|------|------|--------|
| 模型查詢：Anthropic 支援 | Anthropic 無 models 端點，需另尋方案 | 低 |
| tokenRefreshed 通訊 | iframe postMessage 擴充 | 低 |
| 通知列表彈窗 | v3 功能 | 低 |

---

## Open Questions

- 無（所有設計決策已鎖定）

---

## Notes

1. **API Key 安全性**：明文存 localStorage，本機開發環境可接受
2. **同類型多供應商**：允許（如兩個 OpenAI 帳號），每個有唯一 ID
3. **模型屬性**：只顯示 API 回傳的欄位，不硬編碼補充
4. **Debug panel**：預設隱藏，`?setting_debug=true` 啟用，文件說明在 `docs/provider-settings-usage.md`
5. **proxy 服務**：獨立 repo，已實作完整 6 種供應商支援
6. **聊天測試**：在模型瀏覽器頁面內展開，使用 proxy 的 chat 端點
7. **模型查詢**：已實作 OpenAI, Ollama, Google, LM Studio, OpenAI Compatible（Anthropic 不支援）
8. **未知供應商類型**：回傳驗證錯誤，不進行 fallback
