# 實作計畫：start-services.bat 搬移至 system-architecture 並加入測試

## 設計文件參考
`docs/superpowers/specs/2026-08-02-start-services-move-design.md`

## 任務清單

### Task 1: 搬移並改寫 start-services.bat
- **範疇**: 將批次檔從倉庫根目錄移到 `system-architecture\`，並把硬編絕對路徑改為 `%~dp0..` 相對推算，同時保留原本 menu/start/stop/status/exit 邏輯。
- **修改檔案**: `C:\D\ai_cli\Menu_System\start-services.bat`（移除）、`C:\D\ai_cli\Menu_System\system-architecture\start-services.bat`（新增）
- **驗收標準**: 新檔存在、舊檔消失；批次內以 `%~dp0..` 定址 `ai-proxy`，無殘留絕對路徑 `C:\D\ai_cli\Menu_System\ai-proxy`；含 5 個 label。
- **依賴關係**: 無

### Task 2: 新增 Pester 測試
- **範疇**: 建立 `system-architecture\tests\start-services.Tests.ps1`，含結構/靜態測試（預設）與 `-Live` 冒煙測試。
- **修改檔案**: `system-architecture\tests\start-services.Tests.ps1`（新增）
- **驗收標準**: `Invoke-Pester` 靜態測試全數通過；`-Live` 旗標下可啟動 ai-proxy 並健康檢查 200，測試後清理進程。
- **依賴關係**: Task 1（測試驗證移動後檔案）

### Task 3: 更新受影響文件
- **範疇**: 更新 `docs\quick-start.md` 位置段落（改為 system-architecture 下），並於 `docs\requirements-analysis.md` 新增 FR-18/Services 啟動腳本需求與變更記錄。
- **修改檔案**: `docs\quick-start.md`、`docs\requirements-analysis.md`
- **驗收標準**: 兩檔案反映新位置與新需求，changelog 有本日紀錄。
- **依賴關係**: Task 1

### Task 4: 執行測試並驗證
- **範疇**: 執行結構/靜態測試；評估可行時以 `-Live` 冒煙驗證。自我測試後以 Windows 通知使用者結果。
- **修改檔案**: 無
- **驗收標準**: 靜態測試通過；live 冒煙於安全環境下通過。
- **依賴關係**: Task 1, 2, 3

## 待解決問題
- `-Live` 冒煙測試需實體啟動 Node 服務與占用 port 3001；若機器上已有一實例運行會衝突，故透過專屬測試程序管理，且預設不執行。

## 備註
- 使用 `%~dp0..` 相對路徑確保搬移與未來重構穩健（DRY）。
- 互動式 `.bat` 無法全自動覆蓋，採結構驗證 + 可選 live 冒煙雙軌。