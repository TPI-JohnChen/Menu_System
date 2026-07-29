# 快速啟動指南

**建立日期**：2026-07-14

---

## 概述

本指南說明如何啟動 Web Menu System 的供應商設定功能。

---

## 前置需求

1. **Node.js**：v18 或更高版本
2. **Ollama**（可選）：如需測試 Ollama 供應商，需先安裝並啟動 Ollama

---

## 啟動步驟

### Step 1：啟動 AI Proxy 後端服務

```bash
# 進入 ai-proxy 目錄
cd C:\D\ai_cli\Menu_System\ai-proxy

# 安裝依賴（只需第一次）
npm install

# 啟動服務
npm start
```

服務會在 `http://localhost:3001` 啟動。

確認服務運行：
- 在瀏覽器中開啟 http://localhost:3001/api/health
- 應該看到：`{ "status": "ok", "service": "ai-proxy", ... }`

### Step 2：開啟前端頁面

在瀏覽器中開啟以下頁面：

**供應商管理**：
```
http://localhost:3001/pages/provider-management.html
```

**模型瀏覽器**：
```
http://localhost:3001/pages/model-browser.html
```

**Debug Panel 模式**（可選）：
```
http://localhost:3001/index.html?setting_debug=true
```

> 注意：`?setting_debug=true` 要加在 `index.html` 後面，query parameter 會自動轉發到 iframe 頁面。
> 
> ⚠ 2026-07-27 起建議從 `http://localhost:3001/` 開啟頁面（AI Proxy 同時 serve 靜態檔案），取代原本的 `file:///` 路徑。SSE 串流等功能需要同源才能運作。

---

## 使用流程

### 1. 新增供應商

1. 開啟「供應商管理」頁面
2. 點擊 [+ 新增供應商]
3. 選擇供應商類型（如 Ollama）
4. 輸入供應商名稱
5. 點擊 [確認新增]
6. 展開卡片，填入設定（如 Base URL）
7. 點擊 [儲存]
8. 點擊 [測試連線] 確認設定正確

### 2. 瀏覽模型

1. 開啟「模型瀏覽器」頁面
2. 從下拉選單選擇已設定的供應商
3. 點擊 [查詢模型]
4. 從列表中選擇一個模型
5. 右側會顯示模型的完整屬性

### 3. 測試聊天

1. 在模型瀏覽器中選擇一個模型
2. 點擊 [使用此模型]
3. 在聊天測試區塊中輸入訊息
4. 點擊 [送出] 或按 Enter

---

## 常見問題

### Q: 為什麼模型查詢失敗？

A: 請確認：
1. AI Proxy 服務已啟動（`npm start`）
2. 供應商設定正確（Base URL、API Key）
3. 供應商服務正在運行（如 Ollama）

### Q: 為什麼看到「Proxy 未連線」？

A: 請確認 AI Proxy 服務已啟動。在終端機中執行：
```bash
cd C:\D\ai_cli\Menu_System\ai-proxy
npm start
```

### Q: 如何停止 AI Proxy 服務？

A: 在運行 `npm start` 的終端機中按 `Ctrl + C`。

### Q: Debug Panel 怎麼用？

A: 在主頁面 URL 後面加上 `?setting_debug=true`：
```
index.html?setting_debug=true
```

> 注意：不要直接開啟 `pages/provider-management.html?setting_debug=true`，這樣無法正常運作。必須透過 `index.html` 啟動，query parameter 會自動轉發到 iframe。

詳細說明請參閱 `docs/provider-settings-usage.md`。

---

## 完整啟動腳本（可選）

如果你经常需要啟動服務，可以建立一個批次檔案：

### start-services.bat（Windows）

將此檔案放在 `C:\D\ai_cli\Menu_System\` 目錄下，雙擊即可啟動所有服務。

```batch
@echo off
@echo 啟動 AI Proxy...
start "AI Proxy" cmd /c "cd /d C:\D\ai_cli\Menu_System\ai-proxy && npm start"
timeout /t 2 /nobreak > nul
@echo 開啟前端頁面...
start "" "http://localhost:3001/pages/provider-management.html"
@echo 完成！
```

> ⚠ 2026-07-27 起改為開啟 `http://localhost:3001/...`（取代 `file:///`），以支援 SSE 串流等功能。
> 如需啟用 Debug Panel，手動將瀏覽器網址改為 `http://localhost:3001/index.html?setting_debug=true`。

---

## 檔案位置

```
C:\D\ai_cli\Menu_System\
├── ai-proxy\                 # 後端服務
│   ├── server.js            # 主程式
│   ├── package.json         # 依賴設定
│   └── node_modules\        # 依賴套件
│
├── web-menu\                 # 前端頁面
│   ├── pages\
│   │   ├── provider-management.html  # 供應商管理
│   │   └── model-browser.html        # 模型瀏覽器
│   ├── config\
│   │   ├── provider-types.js         # 供應商類型定義
│   │   └── menu.js                   # Menu 設定
│   └── lib\
│       └── provider-manager.js       # 共用邏輯
│
└── system-architecture\      # 規劃文件
    └── docs\
        ├── quick-start.md            # 本文件
        ├── provider-settings-usage.md # Debug Panel 說明
        └── requirements-analysis.md   # 需求文件
```
