# 實作計畫：OrientAI Menu

## 設計文件參考
`docs/superpowers/specs/2026-07-29-menu-design.md`
`PROGRESS/Menu.md`

---

## 開發階段與任務清單

### Phase 1 — 核心骨架（MVP）

#### Task 1: Agent Server 管理
- **範疇**: Opencode 實例 CRUD（IP:port 註冊）、連線設定、狀態檢測
- **修改檔案**: ai-proxy/server.js, web-menu/lib/opencode-manager.js, web-menu/pages/agent-server-management.html
- **驗收標準**: 可新增/編輯/刪除/測試 Opencode 實例連線，狀態指示燈正常
- **依賴關係**: 無

#### Task 2: Provider 設定
- **範疇**: LLM Provider CRUD（可沿用既有供應商管理）
- **修改檔案**: ai-proxy/server.js, web-menu/lib/provider-manager.js, web-menu/pages/provider-management.html
- **驗收標準**: 可新增/編輯/刪除 Provider，支援 6 種供應商類型
- **依賴關係**: 無

#### Task 3: 快速對話 + Agent 對話
- **範疇**: 快速對話（個人預設）+ 完整 Chat Bot
- **修改檔案**: web-menu/pages/chat-bot.html, web-menu/config/menu.js
- **驗收標準**: 快速對話一鍵進入，Agent 對話可選實例+項目+Session
- **依賴關係**: Task 1, Task 2

#### Task 4: App CRUD 管理
- **範疇**: 動態新增/編輯/刪除 App 項目，設定 URL/圖示/範圍
- **修改檔案**: web-menu/pages/app-management.html, web-menu/config/menu.js, web-menu/components/menu.js
- **驗收標準**: 可 CRUD App 項目，Menu 動態顯示對應項目
- **依賴關係**: Task 3

---

### Phase 2 — 治理與協作

#### Task 5: Skill 管理 + 上傳 + 執行日誌
- **範疇**: Skill CRUD、Zip 上傳部署、執行日誌查詢
- **修改檔案**: ai-proxy/server.js, web-menu/pages/skill-management.html, web-menu/pages/skill-upload.html, web-menu/pages/skill-logs.html
- **驗收標準**: 可上傳 Skill 部署至指定實例+項目，查詢執行日誌
- **依賴關係**: Task 1

#### Task 6: RBAC 基礎（角色/部門/使用者）
- **範疇**: 部門管理、使用者管理、角色綁定
- **修改檔案**: web-menu/pages/department-management.html, web-menu/pages/user-management.html
- **驗收標準**: 可 CRUD 部門與使用者，設定角色，Menu 依權限過濾
- **依賴關係**: Task 1

#### Task 7: 外部 Agent
- **範疇**: 非 Opencode 的外部 Agent 連線管理
- **修改檔案**: ai-proxy/server.js, web-menu/pages/external-agent-management.html
- **驗收標準**: 可 CRUD 外部 Agent（Codex/Claude/Ollama）
- **依賴關係**: Task 1

---

### Phase 3 — 自動化與監控

#### Task 8: 定時任務
- **範疇**: 部門任務 + 個人任務 CRUD，Cron 排程
- **修改檔案**: ai-proxy/server.js, web-menu/pages/task-management.html, web-menu/pages/task-logs.html
- **驗收標準**: 可建立排程任務，依 Cron 執行，部門/個人 scope 正確
- **依賴關係**: Task 1, Task 5

#### Task 9: 儀表板（基礎）
- **範疇**: Agent 狀態、Skill 用量、異常與系統資源
- **修改檔案**: web-menu/pages/dashboard.html, ai-proxy/server.js
- **驗收標準**: 顯示 Agent 狀態、Skill 用量統計、系統資源
- **依賴關係**: Task 1, Task 5

#### Task 10: 稽核日誌
- **範疇**: 設定變更軌跡 + Chat Bot 對話往返日誌
- **修改檔案**: ai-proxy/server.js, web-menu/pages/audit-log.html
- **驗收標準**: 記錄所有設定變更與對話內容，可篩選查詢
- **依賴關係**: Task 6

---

### Phase 4 — 進階

#### Task 11: SOP 任務拆解 + Agentic Workflow
- **範疇**: Workflow 編輯器、Pipeline Steps 管理、Human in the Loop
- **修改檔案**: web-menu/pages/workflow-editor.html, ai-proxy/server.js
- **驗收標準**: 可建立 Workflow，拆解 Steps，設定人工檢查點
- **依賴關係**: Task 5

#### Task 12: LLM/Agent 性能面板
- **範疇**: TTFT/TOPS 收集與圖表、Opencode 比對
- **修改檔案**: ai-proxy/server.js, web-menu/pages/dashboard.html
- **驗收標準**: 顯示 TTFT/TOPS 圖表，比對 Opencode 與 OrientAI 端數據
- **依賴關係**: Task 9

#### Task 13: RAG 漂移監控 + Judge LLM 評分
- **範疇**: RAG 準確度趨勢圖、Judge LLM 評分報表
- **修改檔案**: ai-proxy/server.js, web-menu/pages/dashboard.html
- **驗收標準**: 顯示 RAG 漂移圖表與 Judge LLM 評分
- **依賴關係**: Task 9

#### Task 14: Import / Export
- **範疇**: 全系統設定 JSON 匯出/匯入
- **修改檔案**: ai-proxy/server.js, web-menu/pages/system-settings.html
- **驗收標準**: 可匯出/匯入全系統設定，驗證資料完整性
- **依賴關係**: Task 6

#### Task 15: 自訂角色 + 資源權限總覽
- **範疇**: 角色定義 CRUD、資源權限一覽
- **修改檔案**: web-menu/pages/role-definition.html, web-menu/pages/permission-overview.html
- **驗收標準**: 可建立自訂角色並勾選權限，資源權限總覽正確
- **依賴關係**: Task 6

---

## 待解決問題

- RAG 漂移監控與 Judge LLM 評分的運算邏輯需進一步設計
- TTFT/TOPS 的 Opencode 端回報協定需定義
- Skill Zip 套件的格式規範需定義

## 備註

- Grill 決策：部門採扁平不採樹狀，角色採固定 4 個 + 自訂混合模型
- 所有資源以 Opencode 實例 + 項目資料夾為 scope
- 代理人非獨立角色，為部門管理員的屬性
