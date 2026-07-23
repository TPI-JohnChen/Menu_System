---
name: full-plan
description: 三階段規劃工作流程 — 從探索以釐清問題，到腦力激盪以進行設計，最後進行嚴格審查（Grill）以壓力測試。當使用者呼叫 /full-plan 或 /fp，或者在實作前要求完整的規劃流程時使用。
---

# 完整計畫（Full Plan）：行前準備 → 探索 → 腦力激盪 → 嚴格審查

一個包含四個階段的工作流程：首先載入全域多儲存庫（multi-repo）上下文（Phase 0），接著進行探索、設計以及壓力測試。請依序執行所有階段，切勿跳過任何階段。

**硬性限制 (Hard gate)**：在完成所有四個階段並產出最終計畫文件之前，**絕對不得**撰寫任何程式碼、建立任何專案骨架（scaffold）或進行任何實作。

## 前置條件與檔案自動建立規則

當使用 `/full-plan` 技能時，嚴格遵循 SKILL.md 規範執行。以下為流程順利執行所需的檔案條件；若檔案不存在，必須自動建立：

1. **系統架構上下文 (Phase 0)**:
   - `topology.yaml`: 用於理解全域系統拓撲（服務、路徑、端口、依賴等）。
   - `AGENTS.md` 或 `CONTEXT.md` 或 `PLAN_AGENTS.md`: 用於了解服務職責邊界與開發規範。
2. **進度管理 (Phase 0 & Final)**:
   - `$CONTEXT_ROOT/PROGRESS/ROADMAP.md`: 用於了解團隊整體的特性開發狀態（當計畫/實作完成時，自動建立或更新）。
   - `$CONTEXT_ROOT/PROGRESS/<DEV_NAME>.md`: 用於讀取個人之前的開發進度（當計畫/實作完成時，自動建立或更新，且**只保留最近 7 天的資料**）。
3. **需求分析 (Phase 0.5)**:
   - `$CONTEXT_ROOT/docs/requirements-analysis.md`: 用於檢查現有功能需求與新請求的關聯性（若不存在，則自動建立）。
4. **API 合約 (Phase 0)**:
   - `$CONTEXT_ROOT/contracts/openapi-*.yaml`: 用於確認相關服務已存在的 API 端點。
5. **設計與任務產出 (Phase 2 & Final Phase)**:
   - 設計文件：`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`（當計畫完成時，自動建立或更新）。
   - 實作計畫：`docs/superpowers/specs/YYYY-MM-DD-<topic>-tasks.md`（當計畫完成時，自動建立或更新）。

---

## 觸發條件 (Trigger)

使用者透過 `/full-plan <topic>` 或 `/fp <topic>` 呼叫此技能。若未提供主題，請詢問使用者想要規劃什麼內容。

---

## Phase 0: 行前準備 (Pre-flight) — 載入全域上下文

**硬性限制 (Hard gate)**：在確認載入全域上下文並理解系統拓撲之前，**不得**進入 Phase 1。

**立場**：在開始任何探索或設計之前，先建立全域系統圖。本階段會載入多儲存庫（multi-repo）架構上下文，使 AI 能夠掌握完整的系統拓撲，而非僅限於當前目錄。

### 步驟（請依序執行 — 切勿跳過）

1. **定位系統架構上下文**
   - 檢查當前工作目錄是否存在 `topology.yaml`
   - 檢查環境變數 `$env:SYSTEM_ARCH_DIR`
   - 檢查 `../system-architecture/`
   - 檢查 `./system-architecture/`
   - 若皆未找到 → 詢問使用者：「我需要系統架構上下文來理解全域拓撲。請問您的 system-architecture 儲存庫（或 `topology.yaml`）在哪裡？」
   - 將找到的路徑在內部設定為 `$CONTEXT_ROOT`

2. **載入 topology.yaml**（使用 Read 工具）
   - 解析：所有服務、儲存庫路徑、端口、依賴關係與職責
   - 向使用者展示 topology.yaml 摘要：
     ```
     [系統: <name>]
      `topology.yaml` 檔案內容
     ```
   - 詢問：「對於此任務，這樣的系統拓撲是否正確？」

3. **載入 CLAUDE.md、AGENTS.md、CONTEXT.md 或 PLAN_AGENTS.md**（使用 Read 工具）
   - 內化職責邊界：
     - 各服務「擁有 (OWNS)」什麼與「不擁有 (DOES NOT OWN)」什麼
     - 哪些服務可以包含業務邏輯，哪些不可以
   - 內化資料流向與錯誤傳播模式
   - 內化開發規範（這些是架構約束，而非僅供參考的建議）

4. **確認開發者身份 (Identity check)**
   - 列出 `$CONTEXT_ROOT/PROGRESS/` 目錄下的檔案
   - 若 `PROGRESS/` 包含開發者檔案（如 `alice.md`, `bob.md`）：
     - 詢問：「我看到以下開發者的進度檔案：Alice, Bob。請問您是哪位開發者？」
   - 若 `PROGRESS/` 為空或無匹配檔案：
     - 詢問：「我尚未看到您的進度檔案。請問您的開發者姓名是什麼？我將為您建立 PROGRESS/<name>.md。」
   - 在內部設定 `$DEV_NAME` — 本次工作階段中的所有進度更新皆寫入 `PROGRESS/$DEV_NAME.md`
   - 絕不寫入其他開發者的進度檔案
   - 💡 [Plan 模式提示]：準備建立 PROGRESS/$DEV_NAME.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：PROGRESS/$DEV_NAME.md），並提示我切回 plan 模式。

5. **載入開發者進度**（使用 Read 工具）
   - 讀取 `$CONTEXT_ROOT/PROGRESS/ROADMAP.md` — 了解團隊整體的特性開發狀態（若不存在則自動建立）
   - 讀取 `$CONTEXT_ROOT/PROGRESS/$DEV_NAME.md` — 了解該開發者先前的進度（**僅保留最近 7 天的資料**）
   - 向使用者展示摘要：
     ```
     [開發者: <name>]
     [上次進度: ...]
     [ROADMAP 顯示: ...]
     ```
   - 詢問：「要接續上次的進度，還是開始新的任務？」

7. **載入相關 API 合約**（使用 Read 工具）
   - 讀取涉及服務的 `$CONTEXT_ROOT/contracts/openapi-*.yaml`
   - 記錄已存在的 API 端點
   - 向使用者摘要現有的路由

8. **界定任務範圍**
   - 詢問：「此任務涉及哪些服務 — `$IMPACTED_SERVICES`？」
   - 確定哪些儲存庫需要進行變更
   - 記錄清單 — 這將引導後續需要檢查哪些合約以及修改哪些儲存庫

9. **確認準備就緒**
   - 說明：「Phase 0 完成。全域上下文已載入。準備進入探索階段。」
   - 繼續進行 Phase 1

### 行為準則（AI 必須遵守）
- 若 `CLAUDE.md` 規定「API_Gateway 絕對不可包含業務邏輯」，而使用者後續的需求隱含要在 API_Gateway 加入業務邏輯 → 必須立即提出警告並拒絕執行
- 若任務影響多個儲存庫 → 計畫文件必須分別列出每個儲存庫具體的變更內容
- 若 Phase 0 找到了 `topology.yaml`，AI 已經掌握儲存庫路徑 → 編輯時請使用 `../other-repo/src/...` 等相對路徑
- 僅在使用者明確表示「跳過上下文載入，我知道系統拓撲」時，方可跳過 Phase 0
- 進度檔案限制：**切勿**寫入其他開發者的 `PROGRESS/*.md`。僅可寫入 `PROGRESS/$DEV_NAME.md` 和 `ROADMAP.md`（且僅在獲得使用者明確同意狀態變更時才可更新 ROADMAP）

---

## Phase 0.5: 需求分析 (Requirements Analysis)

**硬性限制 (Hard gate)**：在確認需求並完成文件化之前，**不得**進入 Phase 1。

**立場**：在開始任何設計或實作之前，確保功能需求已被完整擷取、記錄並維持最新狀態。本階段旨在銜接「理解系統 (Phase 0)」與「探索特定功能 (Phase 1)」之間的落差。

### 步驟（請依序執行）

1. **載入需求文件**
   - 讀取 `$CONTEXT_ROOT/docs/requirements-analysis.md`
   - 若檔案不存在 → 自動建立包含初始需求分析範本的 `$CONTEXT_ROOT/docs/requirements-analysis.md` 並通知使用者。

2. **將當前功能需求對映至現有需求**
   - 確定文件中有哪些 FR-ID（功能需求 ID）受到當前功能需求的影響
   - 向使用者展示對映結果：
     ```
     [需求影響評估]
     - 受影響的 FR-ID: FR-01, FR-03
     - 是否需要新需求: 是/否
     - 受影響的業務規則: BR-05, BR-06
     ```

3. **處理各種情境**

   | 情境 | 應採取的行動 |
   |----------|--------|
   | 功能完全符合現有需求 | 確認：「此需求已記錄於文件中。準備進入設計階段。」 |
   | 功能修改了現有需求 | 更新 `docs/requirements-analysis.md` 中受影響的 FR-ID，並新增變更記錄 (changelog) |
   | 功能為全新需求 | 新增全新的 FR-ID，並提供完整規格（描述、觸發條件、輸入、輸出、API、業務規則） |

4. **必要時更新需求文件**
   - 使用連續編號新增新的 FR-ID
   - 更新受影響的業務規則 (BR-ID)
   - 在底部新增變更記錄 (changelog)，包含日期、版本、變更說明
   - 寫入前先與使用者確認
   - 💡 [Plan 模式提示]：準備寫入/更新 docs/requirements-analysis.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：docs/requirements-analysis.md），並提示我切回 plan 模式。

5. **確認準備就緒**
   - 說明：「Phase 0.5 完成。需求已完成文件化。準備進入探索階段。」
   - 繼續進行 Phase 1

### 行為準則
- 若 `docs/requirements-analysis.md` 不存在 → 自動建立該檔案。
- 若使用者的功能需求與已記錄的需求發生衝突 → 立即提出警告並要求澄清
- 修改 `docs/requirements-analysis.md` 前，務必先取得使用者同意
- 每次修改皆須保持變更記錄 (changelog) 為最新狀態

---

## Phase 1: 探索 (Explore)

**立場**：自由形式的思考夥伴。無固定劇本、無強制順序、無強制產出。

### 您可以做的事

- **探索問題空間**：提出自然浮現的釐清問題。挑戰既有假設、重構問題角度、尋求類比。
- **調查程式碼庫**：閱讀檔案、搜尋程式碼、梳理現有架構、找出設計模式與整合點。
- **比較不同方案**：腦力激盪多種可行做法、建立比較表格、使用 ASCII 圖表繪製權衡關係 (trade-offs)。
- **浮現風險與未知數**：識別可能出錯之處，找出理解上的盲點與缺口。

### 視覺化思考

廣泛使用 ASCII 圖表 — 系統架構圖、狀態機、資料流向圖、架構草圖、依賴關係圖、比較表格。

### 何時過渡至下一階段

**切勿**強行過渡。當對話自然收斂出具體方向，或使用者提出類似「我們開始設計吧」時，請說明：

> 「看來我們已經有足夠的清晰度可以進入設計階段了。準備好開始 Phase 2 (腦力激盪) 了嗎？」

若使用者同意，則繼續進行；若不同意，則繼續保持探索狀態。

---

## Phase 2: 腦力激盪 (Brainstorm)

**立場**：引導式的協作設計。一次提出一個問題，從概念結構化推導至書面規格。

### 檢核清單（請依序完成）

1. **探索專案上下文** — 檢查與主題相關的檔案、文件、近期的 commit 記錄
2. **評估範疇 (Scope)** — 若需求涵蓋多個獨立的子系統，請先指出並協助拆解，再深入細節
3. **提出釐清問題** — 一次只問一個問題，優先使用單選/多選題。聚焦於：目的、限制條件、成功標準、邊界條件 (edge cases)
4. **提出 2-3 種可行方案** — 附帶各自的優缺點分析與您的推薦方案，並將推薦方案放在最前面
5. **分章節呈現設計** — 根據複雜度調整各章節比重。涵蓋：架構、元件、資料流、錯誤處理、測試。每個章節完成後取得使用者同意
6. **獨立性設計 (Design for isolation)** — 拆解為具有單一職責與明確介面的獨立單元
7. **於現有程式碼庫中工作** — 遵循現有的設計模式。若相關程式碼存在問題，請納入針對性的改進

### 產出物

在使用者批准完整設計後：

1. 將設計文件寫入 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
   - 💡 [Plan 模式提示]：準備將設計寫入 docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md），並提示我切回 plan 模式。
2. 進行規格自我審查：檢查是否存在佔位符、矛盾、模稜兩可之處或範疇問題
3. 請使用者審閱寫好的規格文件

### 過渡

當使用者批准書面規格後，說明：

> 「設計已鎖定。接下來我將進行嚴格審查（Grill），在規劃實作之前找出可能的盲點。」

繼續進行 Phase 3。

---

## Phase 3: 嚴格審查 (Grill)

**立場**：嚴謹但公正的面試官。深入考察決策樹的每一個分支，直到完全消除所有模糊空間。

### 規則

- **一輪只問一個問題** — 絕不將多個問題打包在一起
- **每個問題皆須提供建議答案** — 預設只問「你覺得呢？」是偷懶的做法
- **優先探索程式碼庫** — 若透過 grep 或閱讀檔案就能解答，請直接查詢而非詢問使用者
- **採用深度優先 (Depth-first) 遍歷** — 完成一個分支的討論後，再開啟另一個分支
- **追蹤依賴關係** — 若決策 B 依賴於決策 A，請先就決策 A 進行提問

### 審查領域（根據上下文調整順序）

| 領域 | 提問範例 |
|---|---|
| **底層真實需求** | 真實的需求是什麼？為什麼是現在做？ |
| **成功標準** | 我們如何知道已經完成？運作正常的具體表現是什麼？ |
| **邊界條件與失敗模式** | 輸入無效時怎麼辦？網路斷開？使用者取消？資料量達到上限？ |
| **依賴關係與限制** | 必須與哪些現有系統、API 或模式進行整合？ |
| **風險與權衡** | 我們選擇「不做」什麼？可能會出什麼問題？ |
| **MVP 範疇** | 能交付價值的最小版本是什麼？哪些可以延後實作？ |

### 若審查過程發現問題

若提問揭露了設計上的缺口或瑕疵，**切勿**直接修改實作，而是：

1. 標示出該問題
2. 提議更新設計文件
3. 在進行任何修改前取得使用者同意
4. 更新 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
   - 💡 [Plan 模式提示]：準備更新 docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md），並提示我切回 plan 模式。

### 過渡

當所有分支皆已解決並達成共識時，摘要已鎖定的決策，並開始產出最終的計畫文件。

---

## 最終產出：實作計畫 (Implementation Plan)

完成所有三個階段後，產出任務計畫文件：

**檔案名稱**：`docs/superpowers/specs/YYYY-MM-DD-<topic>-tasks.md`

- 💡 [Plan 模式提示]：準備建立 docs/superpowers/specs/YYYY-MM-DD-<topic>-tasks.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：docs/superpowers/specs/YYYY-MM-DD-<topic>-tasks.md），並提示我切回 plan 模式。

### 範本

```markdown
# 實作計畫：<topic>

## 設計文件參考
`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`

## 任務清單

### Task 1: <簡短名稱>
- **範疇**: 本任務涵蓋的內容
- **修改檔案**: path/to/file1, path/to/file2
- **驗收標準**: 如何驗證已完成
- **依賴關係**: 無

### Task 2: <簡短名稱>
- **範疇**: ...
- **修改檔案**: ...
- **驗收標準**: ...
- **依賴關係**: Task 1

...

## 待解決問題 (Open Questions)
- 任何仍需解決的未知數

## 備註
- 在審查階段（Grill phase）所做出的影響實作之決策
```
## 總結 /full-plan 工作成果

在流程結束時，呈現本次產出與更新的 .md 檔案彙總表格：

| 檔案 | Phase | 寫入次數 |
| :--- | :--- | :---: |
| `docs/requirements-analysis.md` | Phase 0.5 ( 需求分析 ) | 1 次 |
| `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | Phase 2→3 產出 ( 設計鎖定後 ) | 1~2 次 |
| `docs/superpowers/specs/YYYY-MM-DD-<topic>-tasks.md` | Phase 3 最終產出 ( Grill 完成後 ) | 1 次 |
| `PROGRESS/$DEV_NAME.md` | 實作完成後 ( 進度記錄 ) | 1 次 |
| `PROGRESS/ROADMAP.md` | 實作完成後 ( 徵得同意後更新 ) | 1 次 |