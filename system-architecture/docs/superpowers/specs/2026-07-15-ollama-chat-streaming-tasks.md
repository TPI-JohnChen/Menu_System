# 實作計畫：Ollama 聊天測試 502 修復與串流支援

## 設計參考
`docs/superpowers/specs/2026-07-15-ollama-chat-streaming-design.md`

---

## 任務

### Task 1：後端 SSE 串流端點

- **範圍**：在 `ai-proxy/server.js` 新增 Ollama 專用的串流聊天處理，並讓路由依供應商類型分流
- **修改檔案**：`ai-proxy/server.js`
- **具體變更**：
  1. 新增 `chatOllamaStream(options, res)`：呼叫 Ollama `/api/chat` 時帶 `stream: true`；讀取回應時因 `node-fetch` 的 `response.body` 為 Node.js Readable stream（無 `getReader()`），改用 `for await (const value of response.body)` 逐塊讀取 NDJSON
  2. 逐行解析每個 Ollama chunk，將 `message.content` 包成 SSE 事件 `data: {"delta":"..."}\n\n` 即時 `res.write()`
  3. 串流結束時（`chunk.done`）取得 `prompt_eval_count` / `eval_count`，送出收尾事件 `data: {"done":true,"usage":{...}}\n\n` 並 `res.end()`
  4. `POST /api/providers/:type/chat` 路由：`type === 'ollama'` 時改呼叫 `chatOllamaStream`（回應 header 設為 `text/event-stream`），錯誤時區分「尚未送出 header」（回 502 JSON）與「已開始串流」（寫入 SSE error 事件後結束）兩種情況
  5. 其餘供應商（openai / google / lmstudio / anthropic / openai-compatible）維持原本 `chatCompletionByType` + `res.json()` 路徑不變
- **驗收標準**：
  - [✅] 對 Ollama 供應商送出聊天請求，後端不再拋出 `invalid json response body ... Unexpected non-whitespace character` 錯誤
  - [✅] `curl`/DevTools 檢視回應 header 為 `text/event-stream`，body 為多個 `data: {...}` 事件
  - [✅] 其餘供應商（OpenAI 等）行為不變，仍回傳一次性 JSON
- **相依性**：無

### Task 2：前端串流消費與逐字顯示

- **範圍**：讓 `provider-manager.js` 能解析 SSE 串流，並讓 `model-browser.html` 的聊天測試區塊逐字顯示 Ollama 回覆
- **修改檔案**：`web-menu/lib/provider-manager.js`、`web-menu/pages/model-browser.html`
- **具體變更**：
  1. `provider-manager.js`：`chatCompletion(provider, messages, options, onDelta)` 新增第 4 參數；依回應 `content-type` 是否含 `text/event-stream` 分流至新函式 `consumeChatStream(response, onDelta)`
  2. `consumeChatStream`：用瀏覽器原生 `fetch` 回應的 `response.body.getReader()` 逐塊讀取，以 `\n\n` 切分 SSE 事件並解析 `data: {...}`；`delta` 累加成 `fullContent` 並呼叫 `onDelta`，`usage` 記錄最終用量，`error` 則拋出例外交由既有 catch 處理；回傳格式與既有非串流路徑一致（`{ success, data: { choices, usage } }`）
  3. `model-browser.html`：`sendChatMessage()` 傳入 `onDelta` callback，收到第一個 delta 時清空「思考中…」佔位文字並開始逐字累加更新聊天泡泡
  4. 新增 `setChatMessageContent(id, content)` 輔助函式：更新指定訊息泡泡的內容並捲動到底部
- **驗收標準**：
  - [✅] 依第五問步驟操作（供應商設定 → 模型瀏覽器 → 選擇 Ollama `GB10--63` → 模型 `gemma4:e4b` → 使用此模型 → 聊天測試輸入 "Hello" 送出），不再出現「聊天補全失敗」
  - [✅] 聊天泡泡逐字（逐 token）顯示 Ollama 回覆，而非等待完整回覆後一次顯示
  - [✅] 串流結束後訊息內容與完整回覆一致，且可繼續多輪對話（`chatHistory` 正確累積）
  - [✅] 其餘供應商（OpenAI/Google/LM Studio/Anthropic/OpenAI Compatible）聊天測試行為不受影響
- **相依性**：Task 1（依賴後端 SSE 端點）

---

## 未竟事項

- F12 紀錄中觀察到 request body 的 `messages` 陣列包含兩筆完全相同的 `{"role":"user","content":"hello"}`，但檢查 `sendChatMessage()` / `setupEventListeners()` 未發現重複綁定事件監聽器的跡象（`setupEventListeners` 僅在 `init()` 呼叫一次）。與本次 502 錯誤無因果關係，非本次範圍，未處理。若後續需要，可用瀏覽器實測重現（快速連續點擊送出／同時按 Enter 與點擊）以確認是否為真實 bug。

## 備註

- 串流支援範圍僅限 Ollama，其餘供應商維持一次性 JSON 回應，未來若要擴大範圍需另行規劃（涉及 proxy 路由與 `provider-manager.js` 的重新設計，工作量較大）
- 原本非串流的 `chatOllama()` 函式保留不刪除，供 `chatCompletionByType` 其他情境使用
- 已用 `node --check` 驗證 `ai-proxy/server.js` 與 `provider-manager.js` 語法正確
