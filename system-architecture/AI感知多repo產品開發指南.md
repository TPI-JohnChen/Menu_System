# AI感知多repo產品開發指南

建立日期：2026-07-10
適用場景：多個 Http 微服務獨立 git repo 構成產品的團隊

## 一、問題

團隊使用 AI CLI 工具（opencode / claude code）時，工具作用範圍被限制在單一 working directory。當產品由 4 個獨立 git repo 組成：

```
Client_Web_APP ──→ API_Gateway ──→ Gateway_Plugin ──→ Service_API
     (repo A)           (repo B)          (repo C)          (repo D)
```

在任一 repo 下達指令，AI 看不到全局拓撲、資料流、職責邊界。例如「幫我加一支 API」，AI 會直接在當前目錄產生，而不是放在對的 Service_API，更不會知道要在 API_Gateway 註冊路由。

---
╔══════════════════════════════════════════════════════════════╗
║                     🚀 快速通道：開始開發                      ║
║                                                              ║
║   如果你已經讀過本指南、知道概念了，直接做這三行就好：            ║
║                                                              ║
║       cd C:\D\ai_cli\Plan_SKILL\JohnProj\system-architecture  ║
║       opencode                                                 ║
║       /full-plan "你想做的功能"                                 ║
║                                                              ║
║   AI 會自動載入全局地圖 → 問你是誰 → 載入你的進度 → 開始規劃   ║
║   想了解原理？從第二章往下讀。                                   ║
╚══════════════════════════════════════════════════════════════╝
---

## 二、解法核心：第 5 個 repo — system-architecture

建立一個不寫業務程式碼的「上下文 repo」，存放：
- 全局拓撲（誰依賴誰、哪個 port、repo 路徑）
- 職責邊界（每個服務該做與不該做的事）
- API 合約（各服務的 OpenAPI 定義）
- 資料流（請求完整生命週期、錯誤傳遞）
- AI skill（規劃用的 full-plan 等技能）

## 三、目錄結構

```
C:\D\ai_cli\Plan_SKILL\JohnProj\
├── system-architecture/     ← 第 5 repo：上下文中心（在此工作）
│   ├── CLAUDE.md            ← 兩 CLI 工具啟動時自動載入全局地圖
│   ├── topology.yaml        ← 結構化拓撲資料
│   ├── contracts/           ← OpenAPI 合約（定義見下方說明）
│   │   ├── openapi-gateway.yaml
│   │   ├── openapi-plugin.yaml
│   │   └── openapi-service.yaml
│   ├── data-flow/
│   │   └── request-lifecycle.md
│   └── .opencode/
│       └── skills/          ← 規劃技能（full-plan 等）
│
├── client-web-app/          ← repo A：純 HTML（無框架）
├── api-gateway/             ← repo B：Java Spring Boot（僅閘道）
├── gateway-plugin/          ← repo C：Java Spring Boot（商業邏輯層）
└── service-api/             ← repo D：Java Spring Boot（領域邏輯 + 持久化）
```

### 什麼是「合約」？

合約 = 介面定義，不是實作。它是每個服務對外承諾的 API 藍圖。

| 合約檔 | 定義的內容 |
|--------|-----------|
| `openapi-gateway.yaml` | API_Gateway 暴露哪些端點、forward 給誰、是否需要 auth |
| `openapi-plugin.yaml` | Gateway_Plugin 接受什麼請求、做哪些商業驗證 |
| `openapi-service.yaml` | Service_API 的 domain 端點、request/response 欄位結構 |

**核心規則：先寫合約，再寫程式。**

例如要加一個「緊急標記」功能，步驟是：
```
1. 先改 contracts/openapi-service.yaml → 加上 urgency 欄位定義
2. 再改 service-api 的 Java entity + controller
3. 再改 gateway-plugin 的驗證邏輯
4. 再改 api-gateway 的路由
5. 最後改 client-web-app 的 UI
```

合約是「要做什麼事」的藍圖，實作是「怎麼做」的細節。
AI 在 Phase 0 讀完合約就知道全域 API 長怎樣，不會憑空想像端點。

## 四、CLAUDE.md：跨工具通用上下文

opencode 自動偵測 AGENTS.md → fallback 到 CLAUDE.md。Claude Code 自動偵測 CLAUDE.md。

不需要任何設定檔，兩套 CLI 啟動後 AI 自動取得全局地圖。

## 五、full-plan skill：加入 Phase 0 Pre-flight

原有 3 階段（Explore → Brainstorm → Grill）前方加入：

**Phase 0：載入全局上下文**
1. 定位 system-architecture repo（檢查 topology.yaml 是否存在）
2. 讀 CLAUDE.md、topology.yaml、相關合約
3. 確認任務影響哪些服務
4. 鎖定 $IMPACTED_SERVICES
5. 進入 Phase 1 Explore（此時 AI 已有完整全局視野）

Hard gate：Phase 0 未完成前不得進入 Phase 1。

## 六、開發循環（Plan → Implement → Test → 記錄進度）

同一個 opencode session 完成所有步驟，上下文不中斷。

### Plan 重要步驟:
- Phase 0: 
- Phase 1: 探索
- Phase 2: 設計
- Phase 3: 拷問

### 三大 skill 組合成 /full-plan
* **OpenSpec (Explore-探險家)**：幫你深度拆解複雜的技術規範或龐大資料，快速梳理出核心架構與潛在風險。
* **SuperPowers (Brainstorming-頭腦風爆)**：利用多元視角與創意思維模型，迅速打破僵局並激發出大量破格的點子。
* **GrillMe (Grilling-靈魂拷問)**：透過高強度的模擬面試與精準提問，幫你在關鍵場合前做好高壓實戰準備。

```
┌─────────────────────────────────────────────────────────────┐
│                     開發循環 (1 session)                      │
│                                                             │
│   cd system-architecture && opencode                         │
│         │                                                    │
│         ▼                                                    │
│   ┌─────────────────────────┐                               │
│   │ Phase 0 載入全局上下文    │  1. topology.yaml            │
│   │ + 身份確認 + 進度接續     │  2. CLAUDE.md（責任邊界）     │
│   └────────┬────────────────┘  3. 問：「你是 Alice 還是 Bob？」│
│            │                    4. 載入 PROGRESS/<你>.md     │
│            ▼                    5. 載入 ROADMAP.md           │
│   ┌─────────────────────────┐                               │
│   │ /full-plan "需求"        │  Phase 1: 探索               │
│   │ 探索→設計→拷問            │  Phase 2: 設計（先合約再實作）│
│   └────────┬────────────────┘  Phase 3: Grill               │
│            │                    Final: 實作計畫              │
│            ▼                                                 │
│   ┌─────────────────────────┐                               │
│   │ 實作（同 session）       │  AI 編輯：                     │
│   │ 跨 repo 編輯             │  ../service-api/src/...       │
│   └────────┬────────────────┘  ../gateway-plugin/src/...    │
│            │                    ../api-gateway/src/...       │
│            ▼                    ../client-web-app/...        │
│   ┌─────────────────────────┐                               │
│   │ 測試                     │  開新終端機（不關 opencode）： │
│   │ 啟動服務驗證              │  mvn spring-boot:run ×3     │
│   └────────┬────────────────┘  瀏覽器操作驗證                │
│            │                                                 │
│            ▼                                                 │
│   ┌─────────────────────────┐                               │
│   │ 記錄進度                 │  更新 PROGRESS/<你>.md        │
│   │ + 更新 ROADMAP           │  更新 ROADMAP.md（需你核准）  │
│   └────────┬────────────────┘                                │
│            │                                                 │
│            ▼                                                 │
│   循環結束 → 你決定要不要 git commit                           │
│   下次開發 → 重新從 Phase 0 開始                              │
└─────────────────────────────────────────────────────────────┘
```

## 七、多人進度管理（PROGRESS/ 系統）

### 目錄結構

```
system-architecture/PROGRESS/
├── ROADMAP.md          ← 團隊功能總覽（AI + 所有人讀）
├── alice.md            ← Alice 的開發日誌（Alice 的 AI 獨佔）
├── bob.md              ← Bob 的開發日誌（Bob 的 AI 獨佔）
└── .sessions/          ← AI session 自動摘要（選用）
```

### ROADMAP.md（團隊視角）

AI 一眼讀懂全團隊狀態：

```
| 功能 | 狀態 | 負責人 | 涉及的 repo |
|------|------|--------|-------------|
| 審批流程 | ✅ 完成 | alice | service-api, gateway-plugin |
| 緊急標記 | 🔧 開發中 | bob | service-api, client-web-app |
```

### 開發者日誌（個人視角）

各 RD 的 AI 只讀寫自己的檔案：

```
# Alice 開發日誌
## 2026-07-10
- ✅ 審批流程完成（不可自審、只能審 PENDING）
## 進行中
（無）
```

### 身份確認流程（Phase 0 自動執行）

```
AI 啟動 → 看到 PROGRESS/ 有 alice.md, bob.md
       → 問：「我看到 Alice 和 Bob 的進度記錄，你是哪位？」
       → 你回答 Alice
       → AI 載入 alice.md，知道你的進度
       → 本 session 所有進度更新都寫到 alice.md
```

## 八、開發規則（寫在 CLAUDE.md 中，AI 自動遵守）

- API_Gateway 不得包含業務邏輯
- Client 不得直接呼叫 Service_API
- 新 API 端點：先定義合約、再實作
- 業務邏輯只存在於 Gateway_Plugin 或 Service_API
- 進度記錄：AI 只寫自己的 PROGRESS 檔，不碰別人的

## 九、MVP 業務場景

任務管理 + 審批流程

| Endpoint | 說明 |
|----------|------|
| POST /api/v1/tasks | 建立任務 |
| GET /api/v1/tasks | 列表任務 |
| POST /api/v1/tasks/{id}/approve | 審批通過 |
| POST /api/v1/tasks/{id}/reject | 審批駁回 |

```
Client (HTML:3000) → API_Gateway (8080) → Gateway_Plugin (8081) → Service_API + H2 (8082)
     auth filter         business validation + enrichment       domain logic + persist
```

## 十、適用限制

- 本指南適用於多 repo 微服務架構，單體 repo 不需要
- skills 為 opencode 專有功能，claude code 無法使用
- CLAUDE.md 兩工具皆可讀，但 Skill 的 Phase 0 流程目前只有 opencode + full-plan skill 能執行

## 十一、快速啟動

### 第一次啟動
```bash
# 依序啟動三個 Spring Boot 服務（各開一個終端機）
cd service-api     && mvn spring-boot:run
cd gateway-plugin  && mvn spring-boot:run
cd api-gateway     && mvn spring-boot:run

# 用瀏覽器打開 client-web-app/index.html
# 在「Logged in as」輸入用戶名（如 alice、bob）
# 即可建立任務、審批、拒絕
```

### 日常重啟（第二次以後）
```bash
# 三個服務都需要重啟時：
cd ../service-api     && mvn spring-boot:run
cd ../gateway-plugin  && mvn spring-boot:run
cd ../api-gateway     && mvn spring-boot:run

# 或用批次檔一次開三個（start-all.bat）：
start "service-api"     cmd /c "cd /d C:\D\ai_cli\Plan_SKILL\JohnProj\service-api     && mvn spring-boot:run"
start "gateway-plugin"  cmd /c "cd /d C:\D\ai_cli\Plan_SKILL\JohnProj\gateway-plugin  && mvn spring-boot:run"
start "api-gateway"     cmd /c "cd /d C:\D\ai_cli\Plan_SKILL\JohnProj\api-gateway     && mvn spring-boot:run"
```

## 十二、Session 中斷恢復

情境：做到一半關掉了 opencode，或 session 逾時被截斷。

### 復原步驟

```bash
cd system-architecture
opencode
```

Phase 0 自動執行：
1. 載入 CLAUDE.md → AI 重新獲得全局地圖
2. 問：「我看到 Alice 和 Bob 的進度記錄，你是哪位？」
3. 你回答後，AI 載入 `PROGRESS/<你>.md`
4. AI 知道上次做到哪

然後你告訴 AI：

> 「我上次在做緊急標記功能，進度到 Service_API 的 entity 加完欄位，還沒改 Gateway_Plugin。幫我看 git log 接續開發。」

→ AI 讀 git log → 結合 PROGRESS 記錄 → 知道精確中斷點 → 繼續開發

### 跨 session 建議
- 每次 session 結束前確認 PROGRESS 已更新
- 如果做不完 → 先寫 PROGRESS 記錄進度，下次靠 Phase 0 恢復

## 十三、合約變更與除錯循環

### 合約變更流程

```
情境：開發中發現 OpenAPI 合約需要修改

步驟：
  1. 先改 contracts/openapi-*.yaml
  2. 紀錄到 PROGRESS/<你>.md：「合約變更：加緊急標記欄位」
  3. 再改各 repo 的實作
  4. 下次 Phase 0 會自動載入新合約
```

規則：合約永遠先於實作。CLAUDE.md 有此規則，AI 會自動遵守。

### 除錯循環

```
情境：啟動服務後發現 bug

  告訴 AI 錯誤現象
  → 「approve 回傳 500，log 在哪？」

  AI 讀程式碼、找錯誤原因
  → 「Service_API 的 approve 少了狀態檢查」

  你核准 → AI 修正程式碼
  你重啟服務 → 再次驗證
  更新 PROGRESS/<你>.md：「修正 approve 狀態檢查 bug」
```
