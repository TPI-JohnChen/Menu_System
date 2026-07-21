---
name: tpi-report
description: 產生 TPI（昕力）官方視覺風格的 HTML 報告。套用白底紫字 sticky 標頭、TPI Logo、紫色主題、左側固定 sidebar 目錄（TOC）、閱讀進度條、右下 Go-to-Top 按鈕、RWD 響應式。當使用者要求「TPI 風格」「TPI 報告」「昕力風格報告」「紫色報告」「TPI 樣式」「套 TPI 設計」「公司風格的 HTML 報告」「帶側邊目錄的報告」時使用此 skill。
---

# TPI 風格 HTML 報告

當使用者要求「TPI 風格」的報告 / 文件時，套用以下設計規範，產出單一 HTML 檔。

## 使用方式

1. **拿骨架**：完整可直接套用的 HTML 範本在 `assets/template.html`（含全部 CSS 變數、字體設定、banner / sidebar / 進度條 / goto-top / footer / RWD 與 JS）。需要產報告時用 Read 讀取它當起點。
2. **填內容**：替換範本中的標題、副標題、TOC 連結、各 `<section>` 內容。每個 section 給唯一 `id`，TOC 的 `<a data-section="...">` 要對應同一個 id，active 高亮與進度追蹤才會運作。
3. **保留結構**：banner（sticky）→ reading-progress → page-layout（sidebar-toc + container）→ footer → script，順序與 class 名稱不要改，JS 靠這些 class/id 運作。

## 設計特點（必守）

- **白底紫字標頭** — 簡潔乾淨的頁面標頭，`position: sticky` 置頂
- **TPI Logo** — `https://www.tpisoftware.com/images/header/logo-pad-icon--en-15years.png`，高度 80px
- **紫色主題** — 主色 `--primary: #662E8D`（Web_P1000）
- **左側固定目錄 (Sidebar TOC)** — 寬 260px、sticky，含分組標籤、active 高亮、IntersectionObserver 自動追蹤捲動位置
- **閱讀進度條** — 固定於 banner 下方，紫→綠漸層，隨捲動即時更新
- **右下角 Go-to-Top 按鈕** — 圓形紫色，捲動超過 400px 時淡入，hover 上浮
- **RWD 響應式** — 900px 以下 sidebar 自動收合為水平列表

## 明確排除（不要出現）

- ❌ 不顯示使用者名稱 / 登入資訊
- ❌ 標題不含年份
- ❌ 不顯示「由 Claude Code 自動產生」或任何 AI 產生標註

## 配色速查（完整變數見範本 `:root`）

| 用途 | 變數 | 色碼 |
|------|------|------|
| 主色（最深紫） | `--primary` / `--purple-1000` | `#662E8D` |
| 紫色漸層 | `--purple-800`→`--purple-100` | `#7C4DB3` … `#E6E4FA` |
| 灰色基準 | `--gray-500` | `#8D98B1` |
| 深藍/黑 | `--dark` | `#01003B` |
| 狀態：高 / 中 / 低 | `--high` / `--medium` / `--low` | `#dc2626` / `#d97706` / `#16a34a` |
| 強調綠 | `--accent` | `#22c55e` |

## 字體規範

- **英文**（優先序）：Helvetica Neue Bold → Arial Bold → Noto Sans CJK TC Bold
- **中文**（優先序）：思源黑體繁中 Bold (Noto Sans CJK TC) → 蘋方-繁 Semibold (PingFang TC) → 微軟正黑體 Bold (Microsoft JhengHei)
- 標題 `h1`–`h6` 一律 `font-weight: 700`

## Code Block 排版

報告若含程式碼，`.code-block` 必須帶 `white-space: pre-wrap; word-wrap: break-word;` 以保留換行（範本已內建）。程式碼每行分開、適當縮排，不可擠成一行。
