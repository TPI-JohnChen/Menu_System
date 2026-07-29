# ROADMAP — Web Menu System

| Feature | Status | Notes |
|---|---|---|
| Menu 2階層 + 三態收合 | ✅ Completed | v1.0 |
| Header（MenuToggle + 搜尋 + 登入者 + 通知 + 主題 + 語言） | ✅ Completed | v1.0 |
| Footer（版本 + 版權 + 狀態） | ✅ Completed | v1.0 |
| Content iframe（內/外部頁面） | ✅ Completed | v1.0 |
| iframe 雙向通訊（6 action） | ✅ Completed | v1.0，tokenRefreshed 延後 |
| 設定檔驅動 menu / header / footer | ✅ Completed | v1.0 |
| 主題切換（淺色/深色） | ✅ Completed | v1.0 |
| 語言切換（zh-TW / en） | ✅ Completed | v1.0 |
| 通知系統（鈴鐺 + badge） | ✅ Completed | v1.0 |
| 瀏覽器上一頁/下一頁 | ✅ Completed | v1.0 |
| 全域搜尋 Menu 項目 | ✅ Completed | v1.0 |

## v2 — AI Provider Settings（已完成）

| Feature | Status | Notes |
|---|---|---|
| 供應商管理（卡片式 UI） | ✅ Completed | v2.0 |
| 模型瀏覽器（響應式佈局） | ✅ Completed | v2.0 |
| 聊天測試（頁面內展開） | ✅ Completed | v2.0 |
| Debug Panel（JSON editor） | ✅ Completed | v2.0 |
| AI Proxy 服務（獨立 repo） | ✅ Completed | v2.0 |
| 供應商類型定義表 | ✅ Completed | v2.0 |
| provider-manager.js 共用邏輯 | ✅ Completed | v2.0 |

## v2.1 — Bug 修復與體驗優化

| Feature | Status | Notes |
|---|---|---|
| 供應商管理頁面按鈕修復（B1/B2/B3） | ✅ Completed | 2026-07-14，自製 Confirm Modal + 事件委派 + CSS 反饋 |
| Ollama 聊天測試 502 修復 + 串流支援 | ✅ Completed | 2026-07-15，SSE 逐字顯示，僅 Ollama；其餘供應商聊天補全仍待逐一實測 |

## v3 — OpenCode Serve Chat Bot（✅ Completed 2026-07-27）

| Feature | Status | Notes |
|---------|--------|-------|
| AI Proxy opencode 路由（通用轉發） | ✅ Completed | `/api/opencode/:serverId/*`，含 servers.json 持久化 + SSE pipe |
| Agent Server 管理（卡片式 UI） | ✅ Completed | 新增/編輯/刪除/測試連線，禁止 host:port 重複 |
| 動態 Menu（Agent App 父層） | ✅ Completed | 連線成功自動抓 project 列表，動態插入 Menu 項目 |
| Chat Bot 頁面（session 樹 + 對話區） | ✅ Completed | 左右分割 layout，樹狀 session 列表 |
| Session CRUD（建立/重新命名/刪除） | ✅ Completed | 透過 opencode REST API |
| 訊息發送與顯示 | ✅ Completed | user/assistant 氣泡，支援 Enter 發送 |
| 供應商/模型選擇器 | ✅ Completed | 從 `/config/providers` 動態載入 |
| 專案目錄切換 | ✅ Completed | 📂 dialog 列出 project，點選 reload |

## v4 — OrientAI Menu 重新設計（📋 規劃完成 2026-07-29）

| Feature | Status | Notes |
|---------|--------|-------|
| Menu 功能設計（完整文件） | ✅ 規劃完成 | `PROGRESS/Menu.md`，含 Menu 結構 + RBAC + SOP 工作流 |

### Phase 1 — 核心骨架（MVP）
| Feature | Status | Notes |
|---------|--------|-------|
| Agent Server 管理（強化） | 📋 待開發 | 部門歸屬 + 個人預設 + 共用/私有範圍設定 |
| Provider 設定（部門歸屬） | 📋 待開發 | 現有供應商管理加入部門 scope |
| 快速對話 + Agent 對話 | 📋 待開發 | 對話拆分為快速（個人預設）與完整（選實例+項目+Session） |
| App CRUD 管理 | 📋 待開發 | 動態新增獨立 HTML 頁面，預載 RAG/文件上傳/Agent 對話 |

### Phase 2 — 治理與協作
| Feature | Status | Notes |
|---------|--------|-------|
| Skill 管理 + 上傳 + 執行日誌 | 📋 待開發 | Zip 部署至指定實例+項目+部門 |
| RBAC 基礎（角色/部門/使用者） | 📋 待開發 | 4 固定角色 + 扁平部門 |
| 外部 Agent | 📋 待開發 | Codex/Claude/Ollama A2A 端點管理 |

### Phase 3 — 自動化與監控
| Feature | Status | Notes |
|---------|--------|-------|
| 定時任務（部門 + 個人） | 📋 待開發 | Cron 排程 Skill 執行 |
| 儀表板（基礎） | 📋 待開發 | Agent 狀態、Skill 用量、異常與資源 |
| 稽核日誌 | 📋 待開發 | 設定變更 + Chat Bot 對話往返紀錄 |

### Phase 4 — 進階
| Feature | Status | Notes |
|---------|--------|-------|
| SOP 任務拆解 + Agentic Workflow | 📋 待開發 | 四步驟方法論 + Human in the Loop |
| LLM/Agent 性能面板（TTFT/TOPS） | 📋 待開發 | OrientAI vs Opencode 效能比對 |
| RAG 漂移監控 + Judge LLM | 📋 待開發 | 準確度趨勢與品質評分 |
| Import / Export | 📋 待開發 | 全系統設定 JSON 匯出/匯入 |
| 自訂角色 + 資源權限總覽 | 📋 待開發 | 擴充 RBAC 彈性 |

### 排程中的維護項目（v3.x）
- tokenRefreshed 通訊實作
- 通知列表彈窗
- Anthropic 模型查詢（目前不支援）
- 其他供應商（OpenAI/Google/LM Studio/Anthropic）聊天串流支援
- Session 樹多層展開/收合（父子層級）
- 聊天歷史全文搜尋
