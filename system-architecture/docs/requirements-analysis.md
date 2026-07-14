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

---

## 變更記錄

| 日期 | 版本 | 變更內容 |
|------|------|---------|
| 2026-07-14 | 1.0 | 建立初始需求文件，包含 FR-01 ~ FR-10（v1.0 已完成功能） |
| 2026-07-14 | 1.1 | 新增 FR-11（供應商管理）、FR-12（模型瀏覽器）、FR-13（AI Proxy），BR-14 ~ BR-31 |
| 2026-07-14 | 1.2 | 修正 BR-19：`?setting_debug=true` 改為加在 `index.html` 後面，query parameter 自動轉發到 iframe |
| 2026-07-14 | 1.3 | FR-11/12/13 狀態更新為 ✅ 已完成（v2.0 實作完成） |
