# 設計：start-services.bat 搬移至 system-architecture 並加入測試

**日期**：2026-08-02
**版本**：1.0
**狀態**：✅ 已鎖定（full-plan Phase 2/3 完成）

## 動機

`start-services.bat` 是「一鍵啟動整個 ecosystem」的操作腳本，本質上屬於**系統架構 / 運維**範疇。目前置於倉庫根目錄 `C:\D\ai_cli\Menu_System\start-services.bat`，與其功能屬性的分類不符。將之移入 `system-architecture/`（架構與規範存放庫），並新增加測試以確保「移動後仍能順利啟動 ecosystem」。

## 目標

1. 將 `start-services.bat` 從 `C:\D\ai_cli\Menu_System\start-services.bat` 移動至 `C:\D\ai_cli\Menu_System\system-architecture\start-services.bat`。
2. 將腳本內的硬編絕對路徑改為「以批次自身位置推算」的相對路徑（`%~dp0..`），讓搬移與未來重構更穩健（符合 DRY）。
3. 增加測試，驗證移動與腳本正確性。
4. 同步更新文件引用（`docs/quick-start.md`、`docs/requirements-analysis.md`）。

## 設計圖（移動前 → 移動後）

```
移動前：
C:\D\ai_cli\Menu_System\
└── start-services.bat          ← 腳本在根目錄

移動後：
C:\D\ai_cli\Menu_System\
├── ai-proxy\                    （不變）
└── system-architecture\
    ├── start-services.bat      ← 移至此處
    └── tests\
        └── start-services.Tests.ps1   ← 新增測試
```

## 路徑推導（相對路徑）

批次檔位於 `system-architecture\`，其套用的路徑規則：

- `%~dp0` = `C:\D\ai_cli\Menu_System\system-architecture\`（含尾端反斜線）
- 倉庫根目錄 = `%~dp0..` → `C:\D\ai_cli\Menu_System\`
- `ai-proxy` 目錄 = `%~dp0..\ai-proxy`
- 健康檢查 URL = `http://localhost:3001/api/health`
- 開啟頁面 = `http://localhost:3001/pages/provider-management.html`

```batch
@echo off
setlocal
set "ROOT=%~dp0.."
set "PROXY=%ROOT%\ai-proxy"
...
start "AI Proxy" cmd /c "cd /d "%PROXY%" && npm start"
```

## 元件 / 職責

| 元件 | 職責 |
|------|------|
| `system-architecture\start-services.bat` | 互動式 menu（Start / Stop / Status / Exit），以相對路徑定址 `ai-proxy`，啟動服務並開啟前端頁面 |
| `system-architecture\tests\start-services.Tests.ps1` | Pester 測試：結構/靜態驗證 + `-Live` 可選的真正啟動冒煙測試 |

## 錯誤處理

- 若 `ai-proxy` / `node_modules` 不存在 → 測試會失敗並提示確切路徑（靜態測試即診斷）。
- 若 `npm start` 無法啟動 Node → live 冒煙測試透過健康檢查逾時失敗。
- `.bat` 互動式輸入流程無法全自動覆蓋 → 以「結構驗證 + 可選 live 冒煙」雙軌補足。

## 測試設計（Pester 3.4）

### A. 結構 / 靜態測試（預設，無副作用）

1. `system-architecture\start-services.bat` 存在。
2. 倉庫根目錄**不再**存在 `start-services.bat`（已移動）。
3. 批次內容自訂路徑 `%~dp0..\ai-proxy` 對應的真實目錄存在，且含 `package.json`、`node_modules`。
4. 批次內所有 label（`:menu` `:start` `:stop` `:status` `:exit`）與對應 goto 平衡。
5. 內容包含關鍵項目：`npm start`、`api/health`、`localhost:3001`、無殘留硬編絕對路徑 `C:\D\ai_cli\Menu_System\ai-proxy`。

### B. Live 冒煙測試（`-Live` 旗標，有副作用）

啟動 `ai-proxy`（`node server.js`），輪詢 `http://localhost:3001/api/health` 至就緒，驗證為 `200 OK`，最後清理關閉進程。此測試模擬「start-services」動作，驗證移轉後的路徑能實際啟動並可連線。

## 受影響文件清單

| 檔案 | 操作 |
|------|------|
| `system-architecture\start-services.bat` | 新增（原根目錄檔遷移 + 改相對路徑） |
| `system-architecture\tests\start-services.Tests.ps1` | 新增 |
| `system-architecture\docs\quick-start.md` | 修改（位置段落更新） |
| `system-architecture\docs\requirements-analysis.md` | 修改（新增 FR） |
| `system-architecture\PROGRESS\John.md` | 修改（進度記錄） |

## 決策記錄（Phase 3 Grill 結論）

- 移動目標：`system-architecture/` 根目錄（與 topology.yaml 同層）。
- 路徑策略：改用 `%~dp0` 相對推算，取代硬編絕對路徑。
- 測試深度：結構/靜態（預設）+ 可選 `-Live` 冒煙（互動式批次無法全自動）。
- 以 `node server.js` 作為 live 冒煙的啟動動作，驗證移轉後可啟動並連線。