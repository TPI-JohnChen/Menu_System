# 需求分析文件：Web Menu System

**建立日期**：2026-07-14
**最後更新**：2026-07-14
**版本**：1.0

---

## 概述

本文件記錄 Web Menu System 的功能需求（FR）和業務規則（BR），作為開發和驗收的基準。

---

## 功能需求

### FR-01：Menu 二階層 + 三態收合

- **描述**：左側 Menu 支援二階層結構（一級選單 + 子選項），並可透過 Header 左側 ☰ 按鈕進行三態循環切換（展開 → 僅第一層 → 完全收合）
- **觸發條件**：使用者點擊 Header 左側 ☰ 按鈕
- **輸入**：無
- **輸出**：Menu 狀態切換（展開/僅第一層/完全收合）
- **業務規則**：
  - BR-01：完全收合時 Menu 寬度為 0px
  - BR-02：僅第一層時顯示圖示，子選項透過 flyout 顯示
  - BR-03：收合狀態儲存於 localStorage
- **狀態**：✅ 已完成（v1.0）

### FR-02：Header 功能

- **描述**：Header 包含 Menu 切換、搜尋、登入者資訊、通知徽章、主題切換、語言切換
- **觸發條件**：頁面載入
- **輸入**：設定檔 `config/header.js`
- **輸出**：Header DOM 渲染
- **業務規則**：
  - BR-04：搜尋功能過濾 Menu 項目
  - BR-05：通知徽章顯示未讀數量
- **狀態**：✅ 已完成（v1.0）

### FR-03：Footer 功能

- **描述**：Footer 顯示版本號、版權宣告、系統狀態
- **觸發條件**：頁面載入
- **輸入**：設定檔 `config/footer.js`
- **輸出**：Footer DOM 渲染
- **狀態**：✅ 已完成（v1.0）

### FR-04：Content iframe 載入

- **描述**：Content Area 使用 iframe 載入內部頁面（pages/*.html）和外部系統（https://）
- **觸發條件**：使用者點擊 Menu 項目
- **輸入**：Menu 項目的 path 和 external 屬性
- **輸出**：iframe 載入對應頁面
- **業務規則**：
  - BR-06：全部頁面統一使用 iframe 載入（file:// 相容 + 隔離性）
  - BR-07：外部頁面（external: true）不載入 iframe-client.js
- **狀態**：✅ 已完成（v1.0）

### FR-05：iframe 雙向通訊

- **描述**：主框架與 iframe 之間透過 postMessage 進行雙向通訊
- **觸發條件**：iframe 內頁面呼叫 MenuAPI 或主框架發送事件
- **訊息類型**：
  - iframe → 主框架：navigate, updateBadge, setTitle
  - 主框架 → iframe：themeChanged, tokenRefreshed, menuCollapsed
- **狀態**：✅ 已完成（v1.0），tokenRefreshed 延後

### FR-06：設定檔驅動

- **描述**：Menu、Header、Footer 的內容由設定檔（config/*.js）驅動
- **觸發條件**：頁面載入
- **輸入**：config/menu.js, config/header.js, config/footer.js
- **輸出**：對應元件 DOM 渲染
- **業務規則**：
  - BR-08：設定檔使用 .js 格式（避開 file:// 下 fetch 的 CORS 限制）
- **狀態**：✅ 已完成（v1.0）

### FR-07：主題切換

- **描述**：支援淺色/深色主題切換，使用 CSS custom properties
- **觸發條件**：使用者點擊 Header 主題切換按鈕
- **輸入**：使用者選擇的主題
- **輸出**：`<html>` 元素的 CSS class 切換，發送 themeChanged 訊息給所有 iframe
- **業務規則**：
  - BR-09：主題狀態儲存於 localStorage
  - BR-10：內部頁面自動同步主題（透過 iframe-client.js）
  - BR-11：外部頁面不受主題切換影響
- **狀態**：✅ 已完成（v1.0）

### FR-08：語言切換

- **描述**：支援 zh-TW / en 語言切換，Menu/Header/Footer 即時更新
- **觸發條件**：使用者點擊 Header 語言切換按鈕
- **輸入**：使用者選擇的語言
- **輸出**：所有元件文字即時更新
- **業務規則**：
  - BR-12：語言狀態儲存於 localStorage
  - BR-13：設定檔使用多語系格式 `{ 'zh-TW': '...', 'en': '...' }`
- **狀態**：✅ 已完成（v1.0）

### FR-09：瀏覽器上一頁/下一頁

- **描述**：支援 pushState + popstate 實現瀏覽器導航
- **觸發條件**：使用者點擊瀏覽器上一頁/下一頁按鈕
- **輸出**：iframe 載入對應頁面
- **狀態**：✅ 已完成（v1.0）

### FR-10：全域搜尋

- **描述**：Header 搜尋框可過濾 Menu 項目
- **觸發條件**：使用者輸入搜尋關鍵字
- **輸出**：Menu 列表過濾顯示匹配的項目
- **狀態**：✅ 已完成（v1.0）

### FR-11：供應商設定 — 供應商管理

- **描述**：左側 Menu 新增「供應商設定」一級選單，包含「供應商管理」子選項。頁面提供卡片式 UI 管理多個 AI 供應商設定（OpenAI、Google、Ollama、LM Studio、OpenAI 相容 API、Anthropic）
- **觸發條件**：使用者點擊 Menu「供應商管理」
- **輸入**：供應商設定（API Key、Base URL 等）
- **輸出**：設定儲存於 localStorage，卡片式 UI 顯示所有供應商
- **業務規則**：
  - BR-14：每個供應商有唯一 ID，名稱可自訂
  - BR-15：同類型允許多個供應商（如兩個 OpenAI 帳號）
  - BR-16：卡片預設收合，只顯示圖示 + 名稱 + 狀態
  - BR-17：展開卡片顯示設定欄位 + 操作按鈕（測試連線/儲存/刪除）
  - BR-18：新增供應商時先選類型，再帶入對應表單
  - BR-19：Debug panel 預設隱藏，透過 `index.html?setting_debug=true` URL 參數啟用（query parameter 自動轉發到 iframe）
  - BR-20：API Key 明文存 localStorage（本機開發環境可接受）
  - BR-21：Proxy 未運行時顯示狀態指示器 + 錯誤訊息
- **狀態**：✅ 已完成（v2.0）

### FR-12：供應商設定 — 模型瀏覽器

- **描述**：「模型瀏覽器」子選項提供即時查詢供應商模型列表和完整屬性顯示，並支援聊天測試
- **觸發條件**：使用者點擊 Menu「模型瀏覽器」
- **輸入**：選擇的供應商
- **輸出**：模型列表 + 屬性面板 + 聊天測試
- **業務規則**：
  - BR-22：模型查詢透過 AI Proxy 即時呼叫供應商 API
  - BR-23：模型屬性只顯示 API 回傳的欄位
  - BR-24：響應式佈局（>768px 左右分割，≤768px 上下分割）
  - BR-25：屬性面板標題列顯示圖示 + 模型 ID + 副標題
  - BR-26：「使用此模型」按鈕展開頁面內聊天測試區塊
  - BR-27：聊天測試使用 proxy 的 chat 端點
  - BR-28：MVP 模型查詢先做 OpenAI + Ollama，其他列待辦
- **狀態**：✅ 已完成（v2.0）

### FR-13：AI Proxy 服務

- **描述**：獨立後端服務，轉發前端請求到各供應商 API，處理 CORS
- **API Contract**：
  - `GET /api/providers/:type/models` — 查詢模型列表
  - `POST /api/providers/:type/test` — 測試連線
  - `POST /api/providers/:type/chat` — 聊天補全
- **業務規則**：
  - BR-29：Proxy 預設 port 3001
  - BR-30：聊天補全全部供應商都做
  - BR-31：模型查詢 MVP 先做 OpenAI + Ollama
- **狀態**：✅ 已完成（v2.0）

### FR-14：Agent Server 管理

- **描述**：左側 Menu 新增「Agent App」父層，包含「Agent Server 管理」子頁面。管理多個 opencode serve 連線（新增/編輯/刪除/測試連線），每個連線包含位址（host:port）、認證資訊、狀態
- **觸發條件**：使用者點擊 Menu「Agent Server 管理」
- **輸入**：opencode serve 位址、連線名稱、認證帳號密碼（可選）
- **輸出**：設定儲存於 localStorage，卡片式 UI 顯示所有 Agent Server
- **業務規則**：
  - BR-32：每個 Agent Server 有唯一 ID，名稱可自訂
  - BR-33：支援 HTTP Basic Auth（透過 AI Proxy 中轉）
  - BR-34：卡片顯示名稱、位址、連線狀態（綠燈/紅燈）
  - BR-35：展開卡片顯示設定欄位 + 操作按鈕（測試連線/儲存/刪除）
  - BR-36：測試連線透過 AI Proxy 呼叫 `/api/opencode/:serverId/health`
  - BR-37：連線成功後自動抓取 project 列表
- **狀態**：✅ 已完成（v3.0，2026-07-27）

### FR-15：動態 App Menu

- **描述**：從已連線的 Agent Server 自動取得 opencode project 列表，動態產生「Agent App」父層下的 Menu 項目。每個 project 對應一個 App 選項
- **觸發條件**：Agent Server 連線成功 or 頁面重新整理
- **輸入**：Agent Server 的 project 列表
- **輸出**：Menu 動態新增/更新 App 選項
- **業務規則**：
  - BR-38：App 項目以 project 名稱為標籤，圖示統一使用預設值
  - BR-39：點擊 App 項目載入 Chat Bot 頁面，帶入 serverId + projectPath 參數
  - BR-40：若 Agent Server 離線，對應的 App 項目顯示離線狀態
  - BR-41：刪除 Agent Server 時一併移除對應的 App Menu 項目
- **狀態**：✅ 已完成（v3.0，2026-07-27）

### FR-16：Chat Bot 頁面

- **描述**：App（project）的聊天介面，提供 session CRUD、訊息發送/顯示、供應商/模型選擇、專案目錄切換
- **觸發條件**：使用者點擊 Menu 中的 App 項目
- **輸入**：serverId, projectPath（從 Menu 項目傳入）
- **輸出**：Chat Bot 頁面渲染
- **業務規則**：
  - BR-42：頁面左側顯示 session 列表（樹狀結構，由 `GET /session` + `GET /session/:id/children` 組成）
  - BR-43：可建立新 session、為 session 重新命名、刪除 session
  - BR-44：點選 session 載入歷史訊息 `GET /session/:id/message`
  - BR-45：訊息輸入框支援發送文字訊息 `POST /session/:id/message`
  - BR-46：頁面頂部顯示當前 project 名稱，支援切換專案目錄（透過 `GET /project` 重新選擇）
  - BR-47：頁面提供供應商及模型選擇器（資料來自 `GET /config/providers`）
  - BR-48：訊息回覆支援串流顯示（透過 `GET /event` SSE 或輪詢）
  - BR-49：支援中斷正在進行的 AI 回覆 `POST /session/:id/abort`
- **狀態**：✅ 已完成（v3.0，2026-07-27）

### FR-17：AI Proxy opencode 路由

- **描述**：在 AI Proxy 中新增 opencode serve 代理路由，前端所有 opencode 請求經由 AI Proxy 中轉
- **觸發條件**：前端發出 `/api/opencode/:serverId/*` 請求
- **API Contract**：
  - `GET /api/opencode/:serverId/health` — 健康檢查（對應 opencode `/global/health`）
  - `GET /api/opencode/:serverId/project` — 列出專案（對應 opencode `/project`）
  - `GET /api/opencode/:serverId/session` — 列出 session（對應 opencode `/session`）
  - `POST /api/opencode/:serverId/session` — 建立 session
  - `PATCH /api/opencode/:serverId/session/:id` — 更新 session
  - `DELETE /api/opencode/:serverId/session/:id` — 刪除 session
  - `GET /api/opencode/:serverId/session/:id/message` — 列出訊息
  - `POST /api/opencode/:serverId/session/:id/message` — 發送訊息
  - `POST /api/opencode/:serverId/session/:id/abort` — 中斷 session
  - `GET /api/opencode/:serverId/event` — 事件串流（SSE）
  - `GET /api/opencode/:serverId/config/providers` — 取得供應商設定
  - `GET /api/opencode/:serverId/agent` — 列出可用 agent
- **業務規則**：
  - BR-50：AI Proxy 儲存 Agent Server 連線設定（位址、認證），請求時自動附加
  - BR-51：認證資訊不傳給前端，僅在 AI Proxy 內部使用
  - BR-52：每個 serverId 對應一組 server 連線設定
  - BR-53：Proxy 轉發時保留原始 HTTP method、headers 與 body
- **狀態**：✅ 已完成（v3.0，2026-07-27）

### FR-18：Services 啟動批次腳本

- **描述**：提供一鍵啟動/停止/狀態檢查 ecosystem（ai-proxy + 前端頁面）的互動式批次腳本，位於 `system-architecture\start-services.bat`
- **觸發條件**：使用者雙擊執行批次檔
- **輸入**：menu 選擇（Start / Stop / Status / Exit）
- **輸出**：啟動 ai-proxy（`npm start`）並開啟 `http://localhost:3001/` 前端；或停止/檢查 node 進程
- **業務規則**：
  - BR-54：腳本內服務路徑以 `%~dp0..` 相對推算，不得硬編絕對路徑
  - BR-55：腳本須通過結構/靜態測試（`tests\start-services.Tests.ps1`），並可選 `-Live` 冒煙驗證真正啟動
  - BR-56：健康檢查透過 `http://localhost:3001/api/health`
- **狀態**：✅ 已完成（2026-08-02）

### FR-19：OpenCode Serve 操作整合（平行一級選單）

- **描述**：新增「OpenCode Serve」一級選單，用於連線與操作多個 opencode serve 實例。選單包含「OpenCode Serve 管理」子頁與動態產生的專案項目（所有 server 的專案扁平展開為二級項目，標籤為「server 名 · 專案名」）。整合 `OpenCode_Serve_Proj` 的關鍵技術：V1 root 路由（`/session`、`/permission`、`/config/providers`、`/event`）、SSE 逐字串流、權限自動放行、模型選擇器、單一專案聊天頁
- **觸發條件**：使用者點擊 Menu「OpenCode Serve」
- **輸入**：opencode serve 位址（host:port）、認證（可選）、專案目錄（label + directory）
- **輸出**：管理頁 + 動態專案 Menu + 單一專案聊天頁
- **業務規則**：
  - BR-57：每個 server 有獨立 id 與專案清單，存於 localStorage（namespace：`opencode_serve_servers`）
  - BR-58：所有 V1 root 路由請求經 ai-proxy `/api/opencode/:serverId/*` 中轉，proxy 轉發時保留 query string（`?directory=`）
  - BR-59：SSE 長連線不得因固定 timeout 被掐斷；連線終止以 `req.on('close')` 為準
  - BR-60：Menu 專案項目為「server 名 · 專案 label」，點擊開啟 `opencode-serve-chat.html?serverId=&worktree=&label=`
  - BR-61：聊天頁為單一專案（無分頁列），功能含 session 沿用/新建、SSE 串流、模型選擇、權限自動放行、中斷、新對話、防爆 log 面板
  - BR-62：刪除 server 時一併移除其專案 Menu 項目
  - BR-63：聊天頁支援 i18n（zh-TW/en）與 iframe 主題同步
  - BR-64：proxy 允許相同 host:port 重複註冊（跨 namespace 各自獨立 server id），不因 host:port 衝突而拒絕
  - BR-65：聊天頁初次載入/切換專案時，以 `GET /config` 的 `model`（格式 provider/model）解析實際預設模型，並在模型下拉的「預設模型」選項標註實際模型（如「預設模型 · DeepSeek · deepseek-v4-flash-free」）；若 `config.model` 未設定，以 `/config/providers` 回應的 `default` 欄位（`{ [providerID]: modelID }`）第一個 provider 為備援
  - BR-66：載入歷史訊息時，assistant 訊息需顯示其使用的模型（取自 `info.providerID/modelID`），於 who 行或 meta 行標示；TTFT/完成時間僅在當下串流回合顯示，歷史訊息不得顯示無意義的「TTFT —」
- **狀態**：✅ 已完成（2026-08-02，v3.1，BR-65/BR-66 為 v3.2 計畫新增）

---

## 業務規則摘要

| BR-ID | 規則 | 關聯 FR |
|-------|------|---------|
| BR-01 | 完全收合時 Menu 寬度為 0px | FR-01 |
| BR-02 | 僅第一層時顯示圖示，子選項透過 flyout 顯示 | FR-01 |
| BR-03 | 收合狀態儲存於 localStorage | FR-01 |
| BR-04 | 搜尋功能過濾 Menu 項目 | FR-02 |
| BR-05 | 通知徽章顯示未讀數量 | FR-02 |
| BR-06 | 全部頁面統一使用 iframe 載入 | FR-04 |
| BR-07 | 外部頁面不載入 iframe-client.js | FR-04 |
| BR-08 | 設定檔使用 .js 格式 | FR-06 |
| BR-09 | 主題狀態儲存於 localStorage | FR-07 |
| BR-10 | 內部頁面自動同步主題 | FR-07 |
| BR-11 | 外部頁面不受主題切換影響 | FR-07 |
| BR-12 | 語言狀態儲存於 localStorage | FR-08 |
| BR-13 | 設定檔使用多語系格式 | FR-08 |
| BR-14 | 每個供應商有唯一 ID，名稱可自訂 | FR-11 |
| BR-15 | 同類型允許多個供應商 | FR-11 |
| BR-16 | 卡片預設收合，只顯示圖示 + 名稱 + 狀態 | FR-11 |
| BR-17 | 展開卡片顯示設定欄位 + 操作按鈕 | FR-11 |
| BR-18 | 新增供應商時先選類型，再帶入對應表單 | FR-11 |
| BR-19 | Debug panel 預設隱藏，`index.html?setting_debug=true` 啟用 | FR-11 |
| BR-20 | API Key 明文存 localStorage | FR-11 |
| BR-21 | Proxy 未運行時顯示狀態指示器 + 錯誤訊息 | FR-11 |
| BR-22 | 模型查詢透過 AI Proxy 即時呼叫供應商 API | FR-12 |
| BR-23 | 模型屬性只顯示 API 回傳的欄位 | FR-12 |
| BR-24 | 響應式佈局（>768px 左右分割，≤768px 上下分割） | FR-12 |
| BR-25 | 屬性面板標題列顯示圖示 + 模型 ID + 副標題 | FR-12 |
| BR-26 | 「使用此模型」按鈕展開頁面內聊天測試區塊 | FR-12 |
| BR-27 | 聊天測試使用 proxy 的 chat 端點 | FR-12 |
| BR-28 | MVP 模型查詢先做 OpenAI + Ollama | FR-12 |
| BR-29 | Proxy 預設 port 3001 | FR-13 |
| BR-30 | 聊天補全全部供應商都做 | FR-13 |
| BR-31 | 模型查詢 MVP 先做 OpenAI + Ollama | FR-13 |
| BR-32 | 每個 Agent Server 有唯一 ID，名稱可自訂 | FR-14 |
| BR-33 | 支援 HTTP Basic Auth（透過 AI Proxy 中轉） | FR-14 |
| BR-34 | 卡片顯示名稱、位址、連線狀態（綠燈/紅燈） | FR-14 |
| BR-35 | 展開卡片顯示設定欄位 + 操作按鈕 | FR-14 |
| BR-36 | 測試連線透過 AI Proxy 呼叫 `/api/opencode/:serverId/health` | FR-14 |
| BR-37 | 連線成功後自動抓取 project 列表 | FR-14 |
| BR-38 | App 項目以 project 名稱為標籤 | FR-15 |
| BR-39 | 點擊 App 項目載入 Chat Bot 頁面，帶入 serverId + projectPath | FR-15 |
| BR-40 | Agent Server 離線時對應 App 項目顯示離線狀態 | FR-15 |
| BR-41 | 刪除 Agent Server 時一併移除對應 App Menu 項目 | FR-15 |
| BR-42 | 頁面左側顯示 session 列表（樹狀結構） | FR-16 |
| BR-43 | 可建立/重新命名/刪除 session | FR-16 |
| BR-44 | 點選 session 載入歷史訊息 | FR-16 |
| BR-45 | 訊息輸入框支援發送文字訊息 | FR-16 |
| BR-46 | 頁面頂部顯示當前 project 名稱，支援切換 | FR-16 |
| BR-47 | 頁面提供供應商及模型選擇器 | FR-16 |
| BR-48 | 訊息回覆支援串流顯示 | FR-16 |
| BR-49 | 支援中斷正在進行的 AI 回覆 | FR-16 |
| BR-50 | AI Proxy 儲存 Agent Server 連線設定，請求時自動附加 | FR-17 |
| BR-51 | 認證資訊僅在 AI Proxy 內部使用，不傳前端 | FR-17 |
| BR-52 | 每個 serverId 對應一組 server 連線設定 | FR-17 |
| BR-53 | Proxy 轉發時保留原始 HTTP method、headers 與 body | FR-17 |
| BR-54 | 啟動腳本內服務路徑以 `%~dp0..` 相對推算 | FR-18 |
| BR-55 | 啟動腳本須通過結構/靜態測試，並可選 `-Live` 冒煙 | FR-18 |
| BR-56 | 健康檢查透過 `http://localhost:3001/api/health` | FR-18 |
| BR-57 | 每個 server 有獨立 id 與專案清單，存於 localStorage namespace `opencode_serve_servers` | FR-19 |
| BR-58 | V1 root 路由請求經 ai-proxy 中轉，proxy 保留 query string（`?directory=`） | FR-19 |
| BR-59 | SSE 長連線不得因固定 timeout 被掐斷，終止以 `req.on('close')` 為準 | FR-19 |
| BR-60 | Menu 專案項目為「server 名 · 專案 label」，點擊開啟單一專案聊天頁 | FR-19 |
| BR-61 | 聊天頁為單一專案，功能含 session/SSE/模型/權限/中斷/新對話/log | FR-19 |
| BR-62 | 刪除 server 時一併移除其專案 Menu 項目 | FR-19 |
| BR-63 | 聊天頁支援 i18n（zh-TW/en）與 iframe 主題同步 | FR-19 |
| BR-64 | Proxy 允許相同 host:port 重複註冊，跨 namespace 各自獨立 server id | FR-19 |
| BR-65 | 聊天頁以 `GET /config` 的 `model` 解析實際預設模型並標註於下拉，備援為 `/config/providers` 的 `default` 欄位 | FR-19 |
| BR-66 | 歷史訊息顯示 assistant 所用模型（`info.providerID/modelID`），TTFT/完成僅當下串流回合顯示 | FR-19 |

---

## 變更記錄

| 日期 | 版本 | 變更內容 |
|------|------|---------|
| 2026-07-14 | 1.0 | 建立初始需求文件，包含 FR-01 ~ FR-10（v1.0 已完成功能） |
| 2026-07-14 | 1.1 | 新增 FR-11（供應商管理）、FR-12（模型瀏覽器）、FR-13（AI Proxy），BR-14 ~ BR-31 |
| 2026-07-14 | 1.2 | 修正 BR-19：`?setting_debug=true` 改為加在 `index.html` 後面，query parameter 自動轉發到 iframe |
| 2026-07-14 | 1.3 | FR-11/12/13 狀態更新為 ✅ 已完成（v2.0 實作完成） |
| 2026-07-27 | 2.0 | 新增 FR-14（Agent Server 管理）、FR-15（動態 App Menu）、FR-16（Chat Bot 頁面）、FR-17（AI Proxy opencode 路由），BR-32 ~ BR-53 |
| 2026-08-02 | 2.1 | 新增 FR-18（Services 啟動批次腳本）、BR-54 ~ BR-56；`start-services.bat` 搬移至 `system-architecture\` 並採相對路徑 |
| 2026-08-02 | 2.2 | FR-14~17 狀態更新為 ✅（v3.0 實作完成）；新增 FR-19（OpenCode Serve 操作整合）、BR-57 ~ BR-63 |
| 2026-08-02 | 2.3 | FR-19 狀態更新為 ✅（v3.1 實作完成）；新增 BR-64（proxy 允許相同 host:port 重複註冊） |
| 2026-08-02 | 2.4 | 新增 BR-65（預設模型揭露）與 BR-66（歷史訊息顯示模型）；皆屬 FR-19 聊天頁 UX 強化（v3.2 計畫） |
