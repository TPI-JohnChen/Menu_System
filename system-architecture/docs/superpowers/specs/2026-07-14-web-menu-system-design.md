# 設計文件：Web Menu System

**日期**：2026-07-14
**作者**：John
**狀態**：已核准，準備實作

---

## 1. 概述

一個純靜態 HTML/CSS/JS 的 Web Menu 系統，作為承載內部應用頁面與嵌入外部系統的外殼框架。完全在客戶端執行，無需伺服器 — 直接開啟 `index.html` 即可使用（`file://` 協定），部署到任何 Web Server 也可正常運作。

### 為什麼選純 HTML/CSS/JS + 無伺服器？
- 零依賴 Node.js、建置工具或後端基礎設施
- 開發測試期間直接從檔案系統開啟 index.html
- 消除本機環境建置的摩擦
- 部署後無需修改程式碼即可運作

---

## 2. 系統架構

### 系統圖

```
┌────────────────────────────────────────────────────────────┐
│  index.html                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Header                                               │  │
│  │  [☰] [🔍 搜尋] [John ▼] [🔔3] [🌙] [🌐]             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │  Menu        │  │  Content Area                        │ │
│  │              │  │  ┌─────────────────────────────────┐ │ │
│  │  📊 儀表板   │  │  │  <iframe id="content-frame">     │ │ │
│  │    ├總覽     │  │  │  - pages/*.html (內部頁面)       │ │ │
│  │    └分析     │  │  │  - https:// (外部系統)           │ │ │
│  │  🔧 外部工具 │  │  └─────────────────────────────────┘ │ │
│  │    └系統A    │  └─────────────────────────────────────┘ │ │
│  └──────────────┘                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Footer                                               │  │
│  │  [v1.0.0]                    [© 2026] [🟢 系統正常]  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 資料流向

```
config/menu.js ──→ window.MENU_CONFIG ──→ components/menu.js ──→ 渲染 Menu DOM
config/header.js ──→ window.HEADER_CONFIG ─→ components/header.js ─→ 渲染 Header DOM
config/footer.js ──→ window.FOOTER_CONFIG ─→ components/footer.js ─→ 渲染 Footer DOM

點擊 Menu → app.js 設定 iframe.src = path → iframe 載入頁面
頁面透過 iframe-client.js → postMessage → lib/messenger.js 監聽處理

主框架發送事件 → lib/messenger.js → postMessage → 所有 iframe
```

### 為什麼全部頁面都用 iframe（包含內部頁面）？
- **file:// 相容性**：`fetch()` 在 `file://` 協定下會被 CORS 阻擋，`<iframe src="...">` 則原生支援
- **一致性**：內部頁面與外部頁面使用相同的嵌入機制
- **隔離性**：每個頁面擁有自己的 CSS 作用域、JS 執行環境與 DOM，不與主框架樣式衝突
- **可測試性**：`pages/*.html` 可直接在瀏覽器中獨立開啟測試
- **部署相容性**：`file://` 與 `https://` 下運作方式完全相同，無需修改程式碼

---

## 3. 設定檔系統

### 為什麼用 .js 檔案而非 .json？
- **file:// 限制**：`fetch('config/menu.json')` 在 `file://` 下會被 CORS 阻擋
- **解決方案**：`<script src="config/menu.js">` 是標準 HTML 元素，永遠被允許
- **遷移路徑**：日後若加上 Web Server，只需修改載入器即可改用 `fetch()`

### 設定檔格式

```js
// config/menu.js — 巢狀結構
window.MENU_CONFIG = [
  { id: 'dashboard', label: '儀表板', icon: '📊',
    children: [
      { id: 'overview', label: '總覽', path: 'pages/overview.html', external: false },
      { id: 'analytics', label: '分析', path: 'pages/analytics.html', external: false }
    ]},
  { id: 'external-tools', label: '外部工具', icon: '🔧',
    children: [
      { id: 'system-a', label: '系統A', path: 'https://system-a.example.com', external: true }
    ]}
]

// config/header.js — 三欄佈局（左/中/右）
window.HEADER_CONFIG = {
  left: [{ type: 'menu-toggle', id: 'menuToggle' }],
  center: [{ type: 'search', id: 'globalSearch', placeholder: '搜尋...' }],
  right: [
    { type: 'user-info', id: 'userInfo', username: 'John' },
    { type: 'notification', id: 'notifBell', badge: 3 },
    { type: 'theme-toggle', id: 'themeSwitch', defaultTheme: 'light' },
    { type: 'language', id: 'langSwitch', defaultLang: 'zh-TW', languages: ['zh-TW','en'] }
  ]
}

// config/footer.js
window.FOOTER_CONFIG = {
  left: [{ type: 'version', id: 'version', text: 'v1.0.0' }],
  center: [],
  right: [
    { type: 'copyright', id: 'copyright', text: '© 2026 Web Menu System' },
    { type: 'status', id: 'statusIndicator', status: 'healthy' }
  ]
}
```

---

## 4. Menu 元件

### 三態循環（透過 Header 左側 ☰ 按鈕）
```
展開 ──→ ☰ ──→ 僅第一層（圖示 + flyout）──→ ☰ ──→ 完全收合（寬度 0px）──→ ☰ ──→ 展開
```

### 為什麼收合按鈕放在 Header 左側？
- Menu 完全收合（0px 寬）時，按鈕若在 Menu 面板內將無法點擊
- Header 左側的位置符合常見 UX 設計（Gmail、Notion、VS Code）

---

## 5. Content Area 與 iframe 通訊

### 訊息格式
```js
{ type: string, action: string, payload: object }
```

### 定義的訊息（Phase 1 — 最小化初始版本）

| 方向 | Type | 說明 |
|---|---|---|
| iframe → 主框架 | navigate(menuId) | 要求導航到另一個 Menu 項目 |
| iframe → 主框架 | updateBadge(menuId, count) | 更新 Menu 徽章數字 |
| iframe → 主框架 | setTitle(title) | 設定 Header 標題 |
| 主框架 → iframe | themeChanged(theme) | 通知主題變更 |
| 主框架 → iframe | tokenRefreshed(token) | 傳遞更新後的認證 token |
| 主框架 → iframe | menuCollapsed(state) | 通知 Menu 收合狀態變更 |

### iframe-client.js API

```js
window.MenuAPI = { navigate(), updateBadge(), setTitle(), onThemeChange(), onTokenRefresh(), onMenuCollapse() }
```

**主題自動同步**：iframe-client.js 在非獨立模式（嵌入 iframe）下，會自動監聽 `themeChanged` 訊息並將主題 class 套用到 iframe 的 `<html>` 元素。內部頁面**無需手動呼叫 `MenuAPI.onThemeChange()`** 即可同步主題。

**外部頁面不受影響**：外部頁面（`external: true`）不載入 `iframe-client.js`，因此不會收到也不處理 `themeChanged`，主題切換不會影響外部嵌入內容。

**獨立模式**：當頁面直接開啟（非嵌入 iframe），所有 APIs 均為 no-op。

---

## 6. 檔案結構

```
web-menu/
├── index.html              # 進入點
├── style.css               # 全部樣式（淺色/深色透過 CSS custom properties）
├── app.js                  # 初始化、設定檔載入、協調
├── components/
│   ├── header.js           # Header 渲染器
│   ├── menu.js             # Menu 渲染器與收合邏輯
│   ├── content.js          # iframe 管理
│   └── footer.js           # Footer 渲染器
├── lib/
│   ├── iframe-client.js    # 嵌入頁面用的 SDK
│   ├── messenger.js        # 主框架端的 postMessage 處理
│   └── theme.js            # 主題切換邏輯
├── config/
│   ├── menu.js             # Menu 結構定義
│   ├── header.js           # Header 項目定義
│   └── footer.js           # Footer 項目定義
└── pages/
    ├── overview.html       # 範例頁：總覽
    ├── analytics.html      # 範例頁：分析
    ├── profile.html        # 範例頁：個人設定
    └── system-config.html  # 範例頁：系統設定
```

---

## 7. 主題系統

- CSS custom properties（--color-bg、--color-text、--color-primary…）
- 兩種主題：淺色（light）/ 深色（dark），儲存於 `localStorage`
- `<html class="theme-dark">` — 切換時發送 `themeChanged` 給所有 iframe

### 同步機制

| 目標 | 方式 |
|---|---|
| 主框架 Menu/Header/Footer | 直接切換 `<html>` 的 CSS class |
| 內部 iframe 頁面 | iframe-client.js 自動監聽 `themeChanged` 並套用 class 到自身的 `<html>` |
| 外部系統（external: true） | 不受影響 — 不載入 iframe-client.js，不監聽主題事件 |

內部頁面共用 `style.css`，主題變數透過 CSS custom properties 一體適用。

---

## 8. 錯誤處理

| 情境 | 行為 |
|---|---|
| iframe 載入失敗 | Content area 顯示錯誤訊息 |
| 設定檔缺失 | 使用硬編碼預設值，console 顯示警告 |
| postMessage 發送失敗 | 靜默捕獲，console 記錄 |
| 頁面獨立開啟（非 iframe） | iframe-client.js APIs 全部為 no-op |

---

## 9. 設計決策摘要

| 決策 | 選擇 | 理由 |
|---|---|---|
| 技術棧 | 純 HTML/CSS/JS | file:// 相容、零依賴 |
| 頁面嵌入方式 | 全部使用 iframe | CORS 解決方案 + 隔離性 |
| 設定檔格式 | .js 透過 `<script>` 載入 | file:// 下 fetch 被封鎖 |
| Menu 資料結構 | 巢狀陣列 | 直觀的父子對應 |
| 收合按鈕位置 | Header 左側 | 完全收合時仍可存取 |
| 通訊方式 | postMessage | 標準 API、跨來源相容 |
| 通訊協定 | 最小化（6 個 action） | 先實作核心功能，日後擴充 |
| 主題實作 | CSS custom properties | 執行時切換，無需重建 |
