# AI Proxy Service

AI Provider Proxy Service — 轉發前端請求到各供應商 API，處理 CORS。

---

## 安裝與啟動

### 第一次使用

```bash
# 1. 進入 ai-proxy 目錄
cd C:\D\ai_cli\Menu_System\ai-proxy

# 2. 安裝依賴（只需第一次）
npm install

# 3. 啟動服務
npm start
```

### 日常啟動

```bash
# 直接啟動（已安裝過依賴）
cd C:\D\ai_cli\Menu_System\ai-proxy
npm start
```

### 停止服務

在終端機中按 `Ctrl + C` 停止服務。

### 確認服務運行

服務啟動後會顯示：
```
[AI Proxy] 服務已啟動: http://localhost:3001
[AI Proxy] 健康檢查: http://localhost:3001/api/health
```

可在瀏覽器中開啟 http://localhost:3001/api/health 確認服務是否正常運行。

---

## 快速測試

```bash
# 測試 Ollama 連線（假設 Ollama 在 localhost:11434）
curl -X POST http://localhost:3001/api/providers/ollama/test \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:11434"}'

# 測試 OpenAI 模型查詢（需要 API Key）
curl "http://localhost:3001/api/providers/openai/models?baseUrl=https://api.openai.com/v1&apiKey=sk-xxx"
```

---

## API 端點

### 健康檢查

```
GET /api/health

Response: { "status": "ok", "service": "ai-proxy", "timestamp": "..." }
```

### 查詢模型列表

```
GET /api/providers/:type/models?baseUrl=xxx&apiKey=xxx

支援的 type: openai, ollama, google, lmstudio, openai-compatible
（anthropic 暫不支援模型查詢）

Response 200: { "models": [...] }
Response 400: { "error": "缺少 baseUrl 參數" }
Response 502: { "error": "查詢模型失敗", "details": "..." }
```

### 測試連線

```
POST /api/providers/:type/test
Body: { "baseUrl": "xxx", "apiKey": "xxx" }

Response 200: { "status": "connected", "message": "OK" }
Response 400: { "status": "error", "message": "缺少 baseUrl" }
Response 502: { "status": "error", "message": "..." }
```

### 聊天補全

```
POST /api/providers/:type/chat
Body: {
  "baseUrl": "xxx",
  "apiKey": "xxx",
  "model": "gpt-4o",
  "messages": [{ "role": "user", "content": "Hello" }],
  "temperature": 0.7,
  "max_tokens": 1024
}

Response 200: {
  "choices": [{ "message": { "role": "assistant", "content": "..." } }],
  "usage": { "prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15 }
}
```

---

## 支援的供應商

| 供應商 | 模型查詢 | 聊天補全 | 測試連線 |
|--------|----------|----------|----------|
| OpenAI | ✅ | ✅ | ✅ |
| Ollama | ✅ | ✅ | ✅ |
| Google (Gemini) | ✅ | ✅ | ✅ |
| LM Studio | ✅ | ✅ | ✅ |
| Anthropic (Claude) | 📋 TODO | ✅ | ✅ |
| OpenAI Compatible | ✅ | ✅ | ✅ |

---

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `PORT` | 3001 | 服務监听的 port |

---

## 注意事項

1. **CORS**：服務已啟用 CORS，允許前端跨域呼叫
2. **API Key**：API Key 透過 URL 參數或 Request Body 傳遞，不會被記錄
3. **錯誤處理**：所有錯誤都會回傳 JSON 格式的錯誤訊息
4. **供應商格式**：服務會自動轉換不同供應商的 API 格式為統一格式
