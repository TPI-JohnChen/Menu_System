# 設計文件：AI Agent 供應商設定功能

**日期**：2026-07-14
**作者**：John
**狀態**：已核准，準備實作

---

## 1. 概述

在 Web Menu System v1.0 的基礎上，新增「供應商設定」功能，作為 AI Agent APP 的管理介面。使用者可設定和管理多個 AI 供應商（OpenAI、Google、Ollama、LM Studio、OpenAI 相容 API、Anthropic），並可即時查詢各供應商提供的模型及其完整屬性，支援聊天測試。

### 為什麼需要這個功能？
- AI Agent APP 需要設定不同的 AI 供應商
- 使用者需要統一管理多個供應商的 API Key 和設定
- 需要瀏覽和比較不同供應商提供的模型
- 需要在設定後直接測試模型效果

---

## 2. 系統架構

### 系統圖

```
┌─────────────────────────────────────────────────────────────┐
│  web-menu/（純靜態前端）                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  config/menu.js → 新增「供應商設定」Menu 項目            │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  pages/provider-management.html                       │  │
│  │  ├── 供應商卡片（新增/編輯/刪除）                       │  │
│  │  └── JSON debug panel（?setting_debug=true 啟用）       │  │
│  ├── pages/model-browser.html                            │  │
│  │  ├── 選擇供應商 → 呼叫 API 列出模型                    │  │
│  │  ├── 點選模型 → 顯示完整屬性面板                       │  │
│  │  └── 「使用此模型」→ 展開聊天測試區塊                   │  │
│  └── lib/provider-manager.js（共用邏輯）                  │  │
│     ├── localStorage CRUD                                 │  │
│     └── Provider API 呼叫介面                              │  │
│  └── config/provider-types.js（供應商類型定義表）           │  │
└─────────────────────────────────────────────────────────────┘
                        │ HTTP（JSON）
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  ai-proxy/（獨立後端服務，另開 repo）                        │
│  GET  /api/providers/:type/models → 列出模型                │
│  POST /api/providers/:type/test   → 測試連線                │
│  POST /api/providers/:type/chat   → 聊天補全                │
│  職責：轉發請求到各供應商 API，處理 CORS                      │
└─────────────────────────────────────────────────────────────┘
```

### 資料流向（供應商管理）

```
供應商管理頁面 → provider-manager.js → localStorage（讀寫）
                                    ↓
使用者點「測試連線」→ provider-manager.js → ai-proxy → 供應商 API
```

### 資料流向（模型瀏覽器）

```
模型瀏覽器頁面 → 從 localStorage 讀取已設定供應商清單
               → 使用者選擇供應商
               → provider-manager.js → ai-proxy → 供應商 API
               → 顯示模型列表
               → 點選模型 → 展開屬性面板
               → 點「使用此模型」→ 展開聊天測試區塊
               → 輸入訊息 → ai-proxy → 供應商 API → 顯示回應
```

---

## 3. 供應商資料模型

### localStorage 結構

```js
// localStorage key: 'ai_providers'
{
  "providers": [
    {
      "id": "openai-01",           // 唯一 ID（自動產生）
      "name": "My OpenAI",         // 使用者自訂名稱
      "type": "openai",            // 供應商類型
      "enabled": true,             // 啟用狀態
      "settings": {
        "apiKey": "sk-...",        // API Key
        "baseUrl": "https://api.openai.com/v1",  // 預設值因供應商而異
        "organization": "org-xxx"  // 供應商特有欄位
      },
      "lastConnected": "2026-07-14T10:00:00Z",  // 最後成功連線時間
      "status": "connected"        // connected | error | unknown
    }
  ]
}
```

### 供應商類型枚舉

```js
type: 'openai' | 'google' | 'ollama' | 'lmstudio' | 'openai-compatible' | 'anthropic'
```

---

## 4. 供應商類型定義表

```js
const PROVIDER_TYPES = {
  openai: {
    label: { 'zh-TW': 'OpenAI', 'en': 'OpenAI' },
    icon: '🤖',
    defaults: { baseUrl: 'https://api.openai.com/v1' },
    fields: [
      { key: 'apiKey', label: { 'zh-TW': 'API Key', 'en': 'API Key' }, type: 'password', required: true },
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true },
      { key: 'organization', label: { 'zh-TW': 'Organization ID', 'en': 'Organization ID' }, type: 'text', required: false }
    ]
  },
  google: {
    label: { 'zh-TW': 'Google（Gemini）', 'en': 'Google (Gemini)' },
    icon: '🔷',
    defaults: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
    fields: [
      { key: 'apiKey', label: { 'zh-TW': 'API Key', 'en': 'API Key' }, type: 'password', required: true },
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true },
      { key: 'project', label: { 'zh-TW': 'Project ID', 'en': 'Project ID' }, type: 'text', required: false }
    ]
  },
  ollama: {
    label: { 'zh-TW': 'Ollama', 'en': 'Ollama' },
    icon: '🦙',
    defaults: { baseUrl: 'http://localhost:11434' },
    fields: [
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true }
    ]
  },
  lmstudio: {
    label: { 'zh-TW': 'LM Studio', 'en': 'LM Studio' },
    icon: '🏠',
    defaults: { baseUrl: 'http://localhost:1234' },
    fields: [
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true }
    ]
  },
  'openai-compatible': {
    label: { 'zh-TW': 'OpenAI 相容 API', 'en': 'OpenAI Compatible API' },
    icon: '🔌',
    defaults: {},
    fields: [
      { key: 'customName', label: { 'zh-TW': '自訂名稱', 'en': 'Custom Name' }, type: 'text', required: true },
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true },
      { key: 'apiKey', label: { 'zh-TW': 'API Key', 'en': 'API Key' }, type: 'password', required: false }
    ]
  },
  anthropic: {
    label: { 'zh-TW': 'Anthropic（Claude）', 'en': 'Anthropic (Claude)' },
    icon: '🧠',
    defaults: { baseUrl: 'https://api.anthropic.com' },
    fields: [
      { key: 'apiKey', label: { 'zh-TW': 'API Key', 'en': 'API Key' }, type: 'password', required: true },
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true }
    ]
  }
}
```

---

## 5. 供應商管理頁面

### 頁面佈局

```
┌─────────────────────────────────────────────────────────┐
│  供應商管理                                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  [+ 新增供應商]                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  ▶ 🤖 OpenAI         🟢 已連線  [展開]           │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  ▶ 🦙 Ollama         ⚪ 未連線  [展開]           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ─── Debug Panel（?setting_debug=true 啟用）───          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  JSON Editor                                    │    │
│  │  { "providers": [...] }                         │    │
│  │  [儲存到 localStorage]  [匯出]  [匯入]          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 卡片展開狀態

```
收合狀態：
┌─────────────────────────────────────────┐
│  ▶ 🤖 OpenAI         🟢 已連線  [展開]   │
└─────────────────────────────────────────┘

展開狀態：
┌─────────────────────────────────────────┐
│  ▼ 🤖 OpenAI         🟢 已連線  [收合]   │
│  ┌───────────────────────────────────┐  │
│  │  API Key:  [sk-...abc          ]  │  │
│  │  Base URL: [https://api.openai.com/v1] │  │
│  │  Org ID:   [org-xxx          ]   │  │
│  └───────────────────────────────────┘  │
│  [測試連線]  [儲存]  [刪除]              │
└─────────────────────────────────────────┘
```

### 新增供應商流程

```
點擊 [+ 新增供應商] → 彈出 Dialog
    ↓
選擇供應商類型（下拉選）
    ↓
自動帶入預設 baseUrl
    ↓
依所選 type 動態顯示對應的設定欄位
    ↓
填寫完成 → [儲存] → 寫入 localStorage → 重新渲染卡片
```

### Debug Panel

- 預設隱藏
- 透過 `?setting_debug=true` URL 參數啟用
- JSON editor 直接編輯 localStorage 原始資料
- 操作：儲存到 localStorage / 匯出 / 匯入
- 詳細使用說明見 `docs/provider-settings-usage.md`

---

## 6. 模型瀏覽器頁面

### 響應式佈局

```
Desktop（>768px）：
┌─────────────────────────────────────────────────────────┐
│  模型瀏覽器                                               │
│  選擇供應商：[OpenAI ▾]  [查詢模型]                       │
│                                                          │
│  ┌──────────────────┬────────────────────────────────┐  │
│  │  模型列表         │  ┌─ 模型屬性 ──────────────────┐│  │
│  │                  │  │ 🤖 gpt-4o                   ││  │
│  │  ● gpt-4o        │  │ OpenAI · openai             ││  │
│  │  ○ gpt-4o-mini   │  ─────────────────────────────  ││  │
│  │  ○ gpt-4-turbo   │  │ Context Window │ 128,000    ││  │
│  │  ○ gpt-3.5-turbo │  │ Max Output     │ 16,384     ││  │
│  │                  │  │ Temperature    │ 0 ~ 2      ││  │
│  │                  │  │ Top P          │ 0 ~ 1      ││  │
│  │                  │  ─────────────────────────────  ││  │
│  │                  │  │ [使用此模型]                  ││  │
│  │                  │  └────────────────────────────┘  ││  │
│  │                  │                                  ││  │
│  │                  │  ┌─ 聊天測試 ──────────────────┐ ││  │
│  │                  │  │ 🤖 gpt-4o  聊天測試  [收合]  │ ││  │
│  │                  │  │ ┌─────────────────────────┐ │ ││  │
│  │                  │  │ │  User: Hello            │ │ ││  │
│  │                  │  │ │  AI: Hi there!          │ │ ││  │
│  │                  │  │ └─────────────────────────┘ │ ││  │
│  │                  │  │ [輸入訊息...        ] [送出] │ ││  │
│  │                  │  └────────────────────────────┘  ││  │
│  └──────────────────┴────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

Narrow（≤768px）：
┌────────────────────────────────────┐
│  模型瀏覽器                         │
│  選擇供應商：[OpenAI ▾] [查詢模型]   │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  模型列表                    │  │
│  │  [●gpt-4o] [○mini] [○turbo] │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 🤖 gpt-4o                    │  │
│  │ OpenAI · openai              │  │
│  ──────────────────────────────  │
│  │ Context Window │ 128,000     │  │
│  │ Max Output     │ 16,384      │  │
│  │ Temperature    │ 0 ~ 2       │  │
│  │ Top P          │ 0 ~ 1       │  │
│  ──────────────────────────────  │
│  │ [使用此模型]                  │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 🤖 gpt-4o  聊天測試  [收合]  │  │
│  │ ┌──────────────────────────┐ │  │
│  │ │  User: Hello             │ │  │
│  │ │  AI: Hi there!           │ │  │
│  │ └──────────────────────────┘ │  │
│  │ [輸入訊息...         ] [送出]│  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### 互動流程

1. 使用者從下拉選單選擇一個已設定的供應商
2. 點擊 [查詢模型] → provider-manager.js → ai-proxy → 供應商 API (GET /models)
3. 模型列表區顯示回傳的模型 ID 列表
4. 使用者點選某個模型 → 屬性面板顯示完整屬性
5. 屬性面板標題列：圖示 + 模型 ID + 副標題（供應商名稱 · 擁有者）
6. 點擊 [使用此模型] → 展開聊天測試區塊
7. 聊天測試：輸入訊息 → 送出 → 顯示回應

---

## 7. AI Proxy API Contract

### Base URL

```
http://localhost:3001
```

### 端點一覽

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/health` | Proxy 健康檢查 |
| `GET` | `/api/providers/:type/models` | 查詢指定供應商的可用模型列表 |
| `POST` | `/api/providers/:type/test` | 測試供應商連線 |
| `POST` | `/api/providers/:type/chat` | 聊天補全 |

### 端點詳細

#### 健康檢查

```
GET /api/health

Response 200: { "status": "ok", "service": "ai-proxy", "timestamp": "2026-07-14T10:00:00Z" }
```

#### 查詢模型列表

```
GET /api/providers/:type/models?baseUrl=xxx&apiKey=xxx

Response 200:
{
  "models": [
    { "id": "gpt-4o", "owned_by": "openai", "created": 1715366400 },
    { "id": "gpt-4o-mini", "owned_by": "openai", "created": 1715366400 }
  ]
}

Response 400: { "error": "Invalid provider type" }
Response 502: { "error": "Upstream API error", "details": "..." }
```

#### 測試連線

```
POST /api/providers/:type/test
Body: { "baseUrl": "xxx", "apiKey": "xxx" }

Response 200: { "status": "connected", "message": "OK" }
Response 401: { "status": "error", "message": "Invalid API key" }
Response 502: { "status": "error", "message": "Connection refused" }
```

#### 聊天補全

```
POST /api/providers/:type/chat
Body: {
  "baseUrl": "xxx",
  "apiKey": "xxx",
  "model": "gpt-4o",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}

Response 200: {
  "choices": [
    { "message": { "role": "assistant", "content": "Hi there!" } }
  ],
  "usage": { "prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15 }
}

Response 400: { "error": "Invalid request body" }
Response 502: { "error": "Upstream API error", "details": "..." }
```

### MVP 支援範圍

| 功能 | OpenAI | Ollama | Google | LM Studio | Anthropic | OpenAI Compatible |
|------|--------|--------|--------|-----------|-----------|-------------------|
| 模型查詢 | ✅ | ✅ | ✅ | ✅ | ❌ 不支援 | ✅ |
| 聊天補全 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 測試連線 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> 註：Anthropic 無 `/models` 端點，因此不支援模型查詢。測試連線使用 `/v1/messages` 端點，400 錯誤視為連線正常。

---

## 8. 檔案結構變更

### 新增檔案

| 檔案 | 說明 |
|------|------|
| `config/provider-types.js` | 供應商類型定義表（PROVIDER_TYPES） |
| `lib/provider-manager.js` | localStorage CRUD + API 呼叫介面 |
| `pages/provider-management.html` | 供應商管理頁面 |
| `pages/model-browser.html` | 模型瀏覽器頁面 |
| `docs/provider-settings-usage.md` | Debug Panel 使用說明 |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `config/menu.js` | 新增「供應商設定」一級選單 |

### 完整目錄結構

```
web-menu/
├── index.html
├── style.css
├── app.js
├── components/
│   ├── header.js
│   ├── menu.js
│   ├── content.js
│   └── footer.js
├── lib/
│   ├── iframe-client.js
│   ├── messenger.js
│   ├── theme.js
│   ├── i18n.js
│   └── provider-manager.js     ← 新增
├── config/
│   ├── menu.js                 ← 修改
│   ├── header.js
│   ├── footer.js
│   └── provider-types.js       ← 新增
└── pages/
    ├── overview.html
    ├── analytics.html
    ├── profile.html
    ├── system-config.html
    ├── provider-management.html ← 新增
    └── model-browser.html       ← 新增
```

---

## 9. 錯誤處理

| 情境 | 行為 |
|------|------|
| API Key 無效 / 過期 | 卡片狀態顯示「🔴 連線失敗」，展開後顯示錯誤訊息 |
| 供應商 API 不可達 | 卡片狀態顯示「🟡 連線中...」→ 超時後改為「🔴 連線失敗」 |
| localStorage 已滿 | 儲存時捕獲 QuotaExceededError，顯示警告訊息 |
| 查詢模型列表失敗 | 模型列表區顯示錯誤訊息 + 重試按鈕 |
| 查詢模型列表為空 | 顯示「此供應商無可用模型」提示 |
| Debug panel JSON 格式錯誤 | 儲存按鈕 disabled，顯示 JSON 解析錯誤 |
| 新增供應商但未填必填欄位 | 表單驗證失敗，欄位顯示紅框 + 錯誤提示 |
| 供應商類型無對應定義 | 回傳驗證錯誤，不進行 fallback |
| Proxy 未運行 | 頁面頂部顯示🔴狀態指示器，呼叫失敗時顯示錯誤訊息 |

---

## 10. 設計決策摘要

| 決策 | 選擇 | 理由 |
|------|------|------|
| 供應商類型 | 6 種（openai, google, ollama, lmstudio, openai-compatible, anthropic） | 覆蓋常見 AI 供應商 |
| 同類型多供應商 | 允許 | 使用者可能有多個帳號 |
| UI 風格 | 卡片式（預設收合） | 直觀好管理，收合時不佔空間 |
| 資料儲存 | localStorage（明文） | 本機開發環境，無後端需求 |
| 模型屬性顯示 | 只顯示 API 回傳的欄位 | 避免資料不同步問題 |
| 聊天測試 | 頁面內展開聊天區塊 | 無需跳轉頁面，體驗流暢 |
| CORS 處理 | 獨立 AI Proxy 服務 | 需要轉發請求到各供應商 API |
| Debug Panel | 預設隱藏，URL 參數啟用 | 開發調試用，不影響一般使用者 |
| 多語系 | 完整支援 zh-TW / en | 遵循現有 i18n 機制 |
| 主題 | 遵循現有 light/dark | 透過 iframe-client.js 自動同步 |
| MVP 模型查詢 | OpenAI, Ollama, Google, LM Studio, OpenAI Compatible | Anthropic 無 models 端點，不支援 |
| 聊天補全 | 全部供應商都做 | 功能完整性 |
| 未知供應商類型 | 回傳驗證錯誤 | 拒絕 + 錯誤提示，避免靜默替換導致的安全隱患 |

---

## 11. 待辦事項（Future TODO）

| 項目 | 說明 | 優先級 |
|------|------|--------|
| 模型查詢：Anthropic 支援 | Anthropic 無 models 端點，需另尋方案 | 低 |
| tokenRefreshed 通訊 | iframe postMessage 擴充 | 低 |
| 通知列表彈窗 | v3 功能 | 低 |

---

## 12. 實作備註

### 模型回應格式差異

不同供應商回傳的模型物件格式可能不同：

| 供應商 | 回傳格式 |
|--------|----------|
| OpenAI / OpenAI Compatible | `{ id, owned_by, created, ... }` |
| Ollama | `{ id, name, size, modified_at }` |
| Google | `{ id, name, description }` |
| LM Studio | OpenAI 相容格式 |

前端模型屬性面板會直接顯示 API 回傳的所有欄位，不硬編碼補充。

### Google 聊天補全特殊處理

Google Gemini API 不支援 `system` role 的訊息。聊天補全時，系統會自動過濾掉 `role: 'system'` 的訊息，只傳遞 `user` 和 `assistant` 的訊息。

### Anthropic 測試連線特殊邏輯

Anthropic 沒有 `/models` 端點，測試連線使用 `/v1/messages` 端點：
- 401 → API Key 無效
- 400 + `invalid_request_error` → 視為連線正常（模型參數無效但連線成功）
- 其他錯誤 → 連線失敗
