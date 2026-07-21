- 當使用 /full-plan 技能時, 必需嚴格按 skill 要求執行
根據 SKILL.md 的內容，full-plan 需要以下檔案存在或可讀取才能順利執行，若不存在必需自動建立：
1. 系統架構上下文 (Phase 0):
- topology.yaml: 用於理解全域系統拓撲（服務、路徑、端口、依賴等）。
- AGENTS.md 或 CONTEXT.md 或 PLAN_AGENTS.md: 用於了解服務的職責邊界與開發規範。
2. 進度管理 (Phase 0):
- $CONTEXT_ROOT/PROGRESS/ROADMAP.md: 用於了解團隊整體的特性開發狀態（當計畫完成時，自動建立或更新）。
- $CONTEXT_ROOT/PROGRESS/<你的名字>.md: 用於讀取你個人之前的開發進度（當計畫/開發完成時，自動建立或更新，只保留最近7天的資料）。
3. 需求分析 (Phase 0.5):
- $CONTEXT_ROOT/docs/requirements-analysis.md: 用於檢查現有功能需求與新請求的關聯性（若不存在，則自動建立）。
4. API 合約 (Phase 0):
- $CONTEXT_ROOT/contracts/openapi-*.yaml: 用於確認相關服務已存在的 API 端點（當計畫完成時，自動建立或更新）。
5. 設計與任務產出 (Phase 2 & Final Phase):
- 設計文件應寫入 docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md（當計畫完成時，自動建立或更新）。
- 實作計畫應寫入 docs/superpowers/specs/YYYY-MM-DD-<topic>-tasks.md（當計畫完成時，自動建立或更新）。