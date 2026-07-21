# 設計文件：Ollama 聊天測試 502 修復與串流支援

**日期：** 2026-07-15
**版本：** 1.0
**狀態：** ✅ 設計已鎖定（已實作並驗證）

---

## 問題摘要

依 `第五問.md` 描述，於「模型瀏覽器」對 Ollama 供應商（`GB10--63`，model `gemma4:e4b`）送出聊天測試訊息時：

**前端**

```
錯誤：聊天補全失敗
```

**DevTools（F12）**

```
POST http://localhost:3001/api/providers/ollama/chat
502 Bad Gateway

Response:
{
  "error": "聊天補全失敗",
  "details": "invalid json response body at http://192.168.20.63:32665/api/chat reason: Unexpected non-whitespace character after JSON at position 131 (line 2 column 1)"
}
```

**後端 log**

```
[Chat] ollama 聊天失敗: invalid json response body at http://192.168.20.63:32665/api/chat reason: Unexpected non-whitespace character after JSON at position 139 (line 2 column 1)
```

| Bug | 現象 | 根因 |
|---|---|---|
| B1 | Ollama 聊天測試回傳 502 | `chatOllama()` 呼叫 Ollama `/api/chat` 時未帶 `stream: false`，Ollama 預設以 NDJSON（每行一個 JSON 物件）串流回應；程式碼用 `response.json()` 解析整個 body，遇到第二行開頭的 `{` 即拋出 "Unexpected non-whitespace character after JSON" |

「line 2」是關鍵線索：回應本體不是單一 JSON，而是多行、每行一個 JSON 物件，正是 Ollama `/api/chat` 端點在未關閉串流時的預設輸出格式。

### 需求變更

初版修復方案原本是在 request body 加上 `stream: false`（關閉串流，一次性回傳完整回覆），可解決 502。但使用者回饋：

> stream:false 使用這樣的設定人類體感會很差吧? 應該是使用 true, 且也要支援 stream 模式!

因此設計改為：**保留 Ollama 串流特性，由 proxy 逐段轉發給前端，前端逐字顯示**，而非關閉串流換取穩定性。範圍經確認：僅 Ollama 支援串流；OpenAI / Google / LM Studio / Anthropic / OpenAI Compatible 維持現狀（一次性回應），不在本次範圍內。

---

## 設計方案

### D1：後端新增 SSE 串流端點

新增 `chatOllamaStream(options, res)`，取代路由中對 Ollama 呼叫 `chatCompletionByType`：

```javascript
// POST /api/providers/:type/chat
if (type === 'ollama') {
  try {
    await chatOllamaStream({ baseUrl, model, messages, temperature }, res)
  } catch (error) {
    console.error(`[Chat] ollama 聊天失敗:`, error.message)
    if (!res.headersSent) {
      res.status(502).json({ error: '聊天補全失敗', details: error.message })
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      res.end()
    }
  }
  return
}
// 其餘供應商維持原本 chatCompletionByType + res.json()
```

`chatOllamaStream` 對 Ollama `/api/chat` 用 `stream: true` 呼叫，將回應設為 `text/event-stream`，逐行解析 Ollama 回傳的 NDJSON，把每個 `message.content` 片段包成 SSE 事件即時寫回：

```javascript
res.write(`data: ${JSON.stringify({ delta: chunk.message.content })}\n\n`)
```

串流結束（`chunk.done === true`）時取得 `prompt_eval_count` / `eval_count`，最後送出一個含 usage 的收尾事件：

```javascript
res.write(`data: ${JSON.stringify({ done: true, usage: {...} })}\n\n`)
res.end()
```

### D2：node-fetch 串流相容性

專案 `ai-proxy/server.js` 使用 `require('node-fetch')`，其 `response.body` 是 **Node.js Readable stream**，不是 Web `ReadableStream`，因此沒有 `getReader()`（實測會拋出 `response.body.getReader is not a function`）。改用 Node stream 的 async iterator：

```javascript
for await (const value of response.body) {
  buffer += value.toString('utf8')
  const lines = buffer.split('\n')
  buffer = lines.pop()
  for (const line of lines) {
    if (!line.trim()) continue
    const chunk = JSON.parse(line)
    // ...
  }
}
```

瀏覽器端（`provider-manager.js`）使用原生 `fetch`，其 `response.body` 本來就是 Web `ReadableStream`，`getReader()` 可正常使用，不需要相同處理。

### D3：前端串流消費

`ProviderManager.chatCompletion()` 新增第 4 個參數 `onDelta` callback；依回應 `content-type` 是否為 `text/event-stream` 決定走串流或既有的一次性 JSON 路徑：

```javascript
async function chatCompletion(provider, messages, options, onDelta) {
  const response = await fetch(...)
  const contentType = response.headers.get('content-type') || ''
  if (contentType.indexOf('text/event-stream') !== -1) {
    return await consumeChatStream(response, onDelta)
  }
  // 既有邏輯：const data = await response.json() ...
}
```

新增 `consumeChatStream(response, onDelta)`：用 `response.body.getReader()` 逐塊讀取，以 `\n\n` 切分 SSE 事件，解析 `data: {...}`：
- `evt.delta`：累加到 `fullContent`，並呼叫 `onDelta(evt.delta)` 讓 UI 即時更新
- `evt.usage`：記錄最終用量
- `evt.error`：拋出例外，交由既有的 `catch` 區塊處理（回傳 `{ success: false, error }`）

回傳格式與既有非串流路徑一致（`{ success, data: { choices, usage } }`），呼叫端不需分辨串流或非串流。

### D4：聊天泡泡逐字顯示

`model-browser.html` 的 `sendChatMessage()` 傳入 `onDelta`：收到第一個 delta 時清空「思考中…」佔位文字，之後每個 delta 累加並更新畫面：

```javascript
var loadingId = appendChatMessage('assistant', tt.thinking, true)
var streamedContent = ''
var receivedDelta = false

ProviderManager.chatCompletion(currentProvider, chatHistory, {
  model: selectedModel.id || selectedModel.name
}, function(delta) {
  if (!receivedDelta) { streamedContent = ''; receivedDelta = true }
  streamedContent += delta
  setChatMessageContent(loadingId, streamedContent)
}).then(function(result) {
  if (result.success && result.data.choices.length > 0) {
    var reply = result.data.choices[0].message.content || streamedContent
    setChatMessageContent(loadingId, reply)
    chatHistory.push({ role: 'assistant', content: reply })
  } else {
    removeChatMessage(loadingId)
    appendChatMessage('assistant', tt.toastError + (result.error || tt.unknownError))
  }
})
```

新增 `setChatMessageContent(id, content)` 輔助函式，取代泡泡內容並自動捲動到底部：

```javascript
function setChatMessageContent(id, content) {
  var el = document.getElementById(id)
  if (!el) return
  var bubble = el.querySelector('.bubble')
  if (bubble) bubble.innerHTML = escapeHtml(content)
  var container = document.getElementById('chatMessages')
  container.scrollTop = container.scrollHeight
}
```

---

## 檔案異動清單

| 檔案 | 變動類型 | 說明 |
|---|---|---|
| `ai-proxy/server.js` | 修改 | 新增 `chatOllamaStream()`；`/api/providers/:type/chat` 路由對 `type==='ollama'` 分流走 SSE |
| `web-menu/lib/provider-manager.js` | 修改 | `chatCompletion()` 新增 `onDelta` 參數；新增 `consumeChatStream()` |
| `web-menu/pages/model-browser.html` | 修改 | `sendChatMessage()` 改用串流 callback 逐字更新；新增 `setChatMessageContent()` |

---

## 不修改的檔案

| 檔案 | 原因 |
|---|---|
| `chatOllama()`（`ai-proxy/server.js` 內原有非串流函式） | 保留供 `chatCompletionByType` 其他情境使用，不影響 |
| `chatOpenAI` / `chatGoogle` / `chatLMStudio` / `chatAnthropic` | 範圍已確認僅 Ollama 支援串流，其餘供應商維持一次性回應 |
| `web-menu/index.html` | 與本次修復無關 |

---

## 設計決策記錄

| 決策 | 選擇 | 理由 |
|---|---|---|
| 502 修復方式 | SSE 串流轉發，而非 `stream: false` 一次性回應 | 使用者明確要求維持串流體感，不接受先關閉串流換穩定 |
| 串流範圍 | 僅 Ollama | 其餘供應商目前運作正常、非本次問題來源；一次改六種供應商風險與工作量都大幅提高，經詢問使用者選擇最小風險範圍 |
| 串流協定 | 自訂 SSE（`data: {...}\n\n`），非標準 OpenAI SSE 格式 | 前後端都是本專案自控程式碼，不需要相容外部 SSE 客戶端，用最簡單的 JSON delta 事件即可 |
| node-fetch 讀流方式 | `for await...of` 而非 `getReader()` | node-fetch 的 `response.body` 是 Node.js Readable stream，無 `getReader()`；瀏覽器端原生 `fetch` 的 `response.body` 是 Web ReadableStream，維持 `getReader()` 即可 |
| 保留原 `chatOllama()` | 不刪除 | `chatCompletionByType` 仍可能被其他呼叫路徑使用，刪除非必要 |
