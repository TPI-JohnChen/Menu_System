# Menu System 架構圖設計規格

## 目標

製作一張可用於技術文件與簡報的 Menu System 系統架構圖，精準呈現前端主框架、AI Proxy 與外部 AI 供應商之間的元件邊界及資料流。交付可編輯的 SVG 原始圖，並轉出相同內容的 PNG。

## 視覺方向

- 採 16:9 橫向畫布與深藍雜誌風，不使用藍紫科技風或霓虹效果。
- 背景使用深海軍藍；主要文字使用霧白；青綠表示主要資料流；暖橘僅用於重點與串流標示。
- 以清楚的資訊層級、留白、細線框與大型標題建立雜誌版面感。
- 使用繁體中文作為主要標籤，技術名稱與 API 路徑保留英文。

## 版面架構

採由左至右的三層架構：

1. 使用者瀏覽器：呈現 Web Menu 前端及其內部模組。
2. AI Proxy：呈現 Node.js、Express 與四組 API 能力。
3. AI Providers：呈現六種支援的 AI 供應商。

頁首顯示「Menu System｜系統架構」及簡短副標題；頁尾配置資料流圖例。

## 元件內容

### 使用者瀏覽器

- 主框架：`index.html`、`app.js`
- UI 元件：Header、Menu、Content iframe、Footer
- 共用服務：i18n、Theme、Messenger、Provider Manager
- 設定來源：Menu Config、Header Config、Footer Config、Provider Types
- iframe 頁面：Provider Management、Model Browser、內部與外部頁面
- 瀏覽器儲存：localStorage

### AI Proxy

- 執行環境：Node.js + Express
- 預設位址：`localhost:3001`
- API：`/api/health`
- API：`/api/providers/:type/models`
- API：`/api/providers/:type/test`
- API：`/api/providers/:type/chat`
- 職責：處理 CORS、轉送請求、統一回應格式與 Ollama SSE 串流

### AI Providers

- OpenAI
- Google Gemini
- Ollama
- LM Studio
- Anthropic Claude
- OpenAI-Compatible API

## 資料流

- 實線青綠箭頭：前端與 AI Proxy 之間的 HTTP REST 請求與回應。
- 實線霧藍箭頭：AI Proxy 與 AI Providers 之間的供應商 API 呼叫。
- 雙向虛線：主框架與 iframe 之間的 `postMessage` 通訊。
- 暖橘虛線：Ollama 聊天的 SSE 串流。
- 細線箭頭：Config 對 UI 元件的設定驅動關係。
- localStorage 僅連接前端模組，不跨越瀏覽器邊界。

## 輸出

- SVG：保留文字、線條與元件的可編輯性。
- PNG：由 SVG 等比例轉出，尺寸至少 1920 × 1080。
- 檔案存放於 `output/architecture/`，使用語意化檔名且不覆寫既有檔案。

## 驗收條件

- SVG 能由瀏覽器正常開啟，且無 XML 語法錯誤。
- PNG 格式正確，尺寸至少為 1920 × 1080。
- 所有繁體中文標籤清晰可讀，無文字截斷或重疊。
- 三層系統邊界、主要元件及四類資料流可被直接辨識。
- 圖面內容與現有專案架構一致，不加入尚未實作的服務。
- SVG 與 PNG 的視覺內容一致。

## 轉檔策略

優先使用本機可用的無頭瀏覽器載入 SVG 並輸出 PNG；若專案環境未提供可用瀏覽器自動化套件，則使用已安裝的瀏覽器命令列截圖能力。轉檔僅改變檔案格式，不改動圖面內容。
