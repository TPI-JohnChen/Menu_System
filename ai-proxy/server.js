/**
 * AI Proxy Service
 * Port: 3001
 * 職責：轉發前端請求到各供應商 API，處理 CORS
 */

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

const app = express()
const PORT = process.env.PORT || 3001
const SERVERS_FILE = path.join(__dirname, 'servers.json')

// Middleware
app.use(cors())
app.use(express.json())

// ========== opencode Server 設定管理 ==========

const serverMap = new Map()

function loadServers() {
  try {
    if (fs.existsSync(SERVERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SERVERS_FILE, 'utf8'))
      data.forEach(s => serverMap.set(s.id, s))
      console.log(`[OpenCode] 已載入 ${data.length} 個 server 設定`)
    }
  } catch (e) {
    console.error('[OpenCode] 讀取 servers.json 失敗:', e.message)
  }
}

function saveServers() {
  try {
    const data = Array.from(serverMap.values())
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('[OpenCode] 寫入 servers.json 失敗:', e.message)
  }
}

function generateId() {
  return 'srv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}

loadServers()

// ========== opencode Server CRUD ==========

app.get('/api/opencode/servers', (req, res) => {
  const servers = Array.from(serverMap.values()).map(s => ({
    ...s,
    password: s.password ? Buffer.from(s.password, 'base64').toString('utf8') : ''
  }))
  res.json({ servers })
})

app.post('/api/opencode/servers', (req, res) => {
  const { id, name, host, port, username, password } = req.body

  if (!name || !host || !port) {
    return res.status(400).json({ error: '缺少必要欄位: name, host, port' })
  }

  const targetId = id || generateId()

  const existing = Array.from(serverMap.values()).find(s =>
    s.host === host && s.port === port && s.id !== targetId
  )
  if (existing) {
    return res.status(409).json({ error: '相同 host:port 的 server 已存在', existingId: existing.id })
  }

  const server = {
    id: targetId,
    name,
    host,
    port: Number(port),
    username: username || '',
    password: password ? Buffer.from(password).toString('base64') : ''
  }

  serverMap.set(server.id, server)
  saveServers()
  res.json({ server: { ...server, password: password || '' } })
})

app.delete('/api/opencode/servers/:serverId', (req, res) => {
  const { serverId } = req.params
  if (!serverMap.has(serverId)) {
    return res.status(404).json({ error: 'server 未找到' })
  }
  serverMap.delete(serverId)
  saveServers()
  res.json({ success: true })
})

// ========== opencode 通用轉發路由 ==========

app.all('/api/opencode/:serverId/*', async (req, res) => {
  const { serverId } = req.params
  const targetPath = req.params[0] || ''

  const server = serverMap.get(serverId)
  if (!server) {
    return res.status(404).json({ error: 'Agent Server 未找到' })
  }

  const targetUrl = `http://${server.host}:${server.port}/${targetPath}`
  const headers = { 'Content-Type': 'application/json' }

  if (server.username && server.password) {
    const decodedPass = Buffer.from(server.password, 'base64').toString('utf8')
    const encoded = Buffer.from(`${server.username}:${decodedPass}`).toString('base64')
    headers['Authorization'] = `Basic ${encoded}`
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(120000)
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(targetUrl, fetchOptions)
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      response.body.pipe(res)
      return
    }

    res.status(response.status)

    if (contentType.includes('application/json')) {
      const data = await response.json()
      res.json(data)
    } else {
      const text = await response.text()
      res.send(text)
    }
  } catch (error) {
    console.error(`[OpenCode] ${serverId} 轉發失敗:`, error.message)
    if (error.name === 'AbortError') {
      res.status(504).json({ error: '連線逾時', details: 'Agent Server 無回應 (120s)' })
    } else {
      res.status(502).json({ error: '無法連線到 Agent Server', details: error.message })
    }
  }
})

// ========== Health Check ==========

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-proxy', timestamp: new Date().toISOString() })
})

// ========== Models Endpoint ==========

app.get('/api/providers/:type/models', async (req, res) => {
  const { type } = req.params
  const { baseUrl, apiKey } = req.query

  if (!baseUrl) {
    return res.status(400).json({ error: '缺少 baseUrl 參數' })
  }

  try {
    const models = await fetchModelsByType(type, baseUrl, apiKey)
    res.json({ models })
  } catch (error) {
    console.error(`[Models] ${type} 查詢失敗:`, error.message)
    res.status(502).json({ error: '查詢模型失敗', details: error.message })
  }
})

// ========== Test Connection Endpoint ==========

app.post('/api/providers/:type/test', async (req, res) => {
  const { type } = req.params
  const { baseUrl, apiKey } = req.body

  if (!baseUrl) {
    return res.status(400).json({ status: 'error', message: '缺少 baseUrl' })
  }

  try {
    const result = await testConnectionByType(type, baseUrl, apiKey)
    res.json(result)
  } catch (error) {
    console.error(`[Test] ${type} 測試失敗:`, error.message)
    res.status(502).json({ status: 'error', message: error.message })
  }
})

// ========== Chat Completion Endpoint ==========

app.post('/api/providers/:type/chat', async (req, res) => {
  const { type } = req.params
  const { baseUrl, apiKey, model, messages, temperature, max_tokens } = req.body

  if (!baseUrl) {
    return res.status(400).json({ error: '缺少 baseUrl' })
  }
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '缺少 messages 陣列' })
  }

  // Ollama 走 SSE 串流，逐 token 回傳給前端
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

  try {
    const result = await chatCompletionByType(type, {
      baseUrl,
      apiKey,
      model,
      messages,
      temperature,
      max_tokens
    })
    res.json(result)
  } catch (error) {
    console.error(`[Chat] ${type} 聊天失敗:`, error.message)
    res.status(502).json({ error: '聊天補全失敗', details: error.message })
  }
})

// ========== Provider-specific Functions ==========

// ----- Models -----

async function fetchModelsByType(type, baseUrl, apiKey) {
  switch (type) {
    case 'openai':
      return fetchOpenAIModels(baseUrl, apiKey)
    case 'ollama':
      return fetchOllamaModels(baseUrl)
    case 'google':
      return fetchGoogleModels(baseUrl, apiKey)
    case 'lmstudio':
      return fetchLMStudioModels(baseUrl)
    case 'anthropic':
      throw new Error('Anthropic 目前不支援模型查詢')
    case 'openai-compatible':
      return fetchOpenAIModels(baseUrl, apiKey)
    default:
      throw new Error('不支援的供應商類型: ' + type)
  }
}

async function fetchOpenAIModels(baseUrl, apiKey) {
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const response = await fetch(`${baseUrl}/models`, { headers })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`)
  }

  return data.data || []
}

async function fetchOllamaModels(baseUrl) {
  const response = await fetch(`${baseUrl}/api/tags`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error('Ollama API 回傳錯誤')
  }

  return (data.models || []).map(m => ({
    id: m.name,
    name: m.name,
    size: m.size,
    modified_at: m.modified_at
  }))
}

async function fetchGoogleModels(baseUrl, apiKey) {
  const headers = {}
  if (apiKey) headers['x-goog-api-key'] = apiKey

  const response = await fetch(`${baseUrl}/models`, { headers })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`)
  }

  return (data.models || []).map(m => ({
    id: m.name?.replace('models/', '') || m.name,
    name: m.displayName || m.name,
    description: m.description
  }))
}

async function fetchLMStudioModels(baseUrl) {
  const response = await fetch(`${baseUrl}/v1/models`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`)
  }

  return data.data || []
}

// ----- Test Connection -----

async function testConnectionByType(type, baseUrl, apiKey) {
  try {
    switch (type) {
      case 'openai':
      case 'openai-compatible':
        await testOpenAI(baseUrl, apiKey)
        break
      case 'ollama':
        await testOllama(baseUrl)
        break
      case 'google':
        await testGoogle(baseUrl, apiKey)
        break
      case 'lmstudio':
        await testLMStudio(baseUrl)
        break
      case 'anthropic':
        await testAnthropic(baseUrl, apiKey)
        break
      default:
        throw new Error('不支援的供應商類型: ' + type)
    }
    return { status: 'connected', message: 'OK' }
  } catch (error) {
    return { status: 'error', message: error.message }
  }
}

async function testOpenAI(baseUrl, apiKey) {
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const response = await fetch(`${baseUrl}/models`, { headers })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error?.message || `HTTP ${response.status}`)
  }
}

async function testOllama(baseUrl) {
  const response = await fetch(`${baseUrl}/api/tags`)
  if (!response.ok) {
    throw new Error('Ollama API 回傳錯誤')
  }
}

async function testGoogle(baseUrl, apiKey) {
  const headers = {}
  if (apiKey) headers['x-goog-api-key'] = apiKey

  const response = await fetch(`${baseUrl}/models`, { headers })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error?.message || `HTTP ${response.status}`)
  }
}

async function testLMStudio(baseUrl) {
  const response = await fetch(`${baseUrl}/v1/models`)
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error?.message || `HTTP ${response.status}`)
  }
}

async function testAnthropic(baseUrl, apiKey) {
  // Anthropic 沒有 models 端點，使用 messages 端點測試
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey || '',
    'anthropic-version': '2023-06-01'
  }

  // 發送一個最小的測試請求
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }]
    })
  })

  // 401 表示 API Key 無效，但連線正常
  if (response.status === 401) {
    throw new Error('API Key 無效')
  }
  // 其他錯誤（如模型不存在）也表示連線正常
  if (response.status === 400) {
    const data = await response.json()
    if (data.error?.type === 'invalid_request_error') {
      return // 連線正常，只是模型不存在
    }
  }
}

// ----- Chat Completion -----

async function chatCompletionByType(type, options) {
  switch (type) {
    case 'openai':
    case 'openai-compatible':
      return chatOpenAI(options)
    case 'ollama':
      return chatOllama(options)
    case 'google':
      return chatGoogle(options)
    case 'lmstudio':
      return chatLMStudio(options)
    case 'anthropic':
      return chatAnthropic(options)
    default:
      throw new Error('不支援的供應商類型: ' + type)
  }
}

async function chatOpenAI(options) {
  const { baseUrl, apiKey, model, messages, temperature, max_tokens } = options

  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const body = { model, messages }
  if (temperature !== undefined) body.temperature = temperature
  if (max_tokens !== undefined) body.max_tokens = max_tokens

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`)
  }

  return data
}

async function chatOllama(options) {
  const { baseUrl, model, messages, temperature } = options

  const body = { model, messages, stream: false }
  if (temperature !== undefined) body.options = { temperature }

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Ollama API 回傳錯誤')
  }

  // 轉換為 OpenAI 格式
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: data.message?.content || ''
      }
    }],
    usage: {
      prompt_tokens: data.prompt_eval_count || 0,
      completion_tokens: data.eval_count || 0,
      total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    }
  }
}

// Ollama 串流版：以 SSE 逐段回傳 delta，讓前端可以逐字顯示
async function chatOllamaStream(options, res) {
  const { baseUrl, model, messages, temperature } = options

  const body = { model, messages, stream: true }
  if (temperature !== undefined) body.options = { temperature }

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `HTTP ${response.status}`)
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  if (res.flushHeaders) res.flushHeaders()

  let buffer = ''
  let promptTokens = 0
  let completionTokens = 0

  // node-fetch 的 response.body 是 Node.js Readable stream，沒有 getReader()，
  // 改用 async iterator 逐塊讀取
  for await (const value of response.body) {
    buffer += value.toString('utf8')
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.trim()) continue
      const chunk = JSON.parse(line)
      if (chunk.message && chunk.message.content) {
        res.write(`data: ${JSON.stringify({ delta: chunk.message.content })}\n\n`)
      }
      if (chunk.done) {
        promptTokens = chunk.prompt_eval_count || 0
        completionTokens = chunk.eval_count || 0
      }
    }
  }

  res.write(`data: ${JSON.stringify({
    done: true,
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    }
  })}\n\n`)
  res.end()
}

async function chatGoogle(options) {
  const { baseUrl, apiKey, model, messages, temperature, max_tokens } = options

  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['x-goog-api-key'] = apiKey

  // 轉換 OpenAI messages 格式為 Google 格式
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

  const body = { contents }
  if (temperature !== undefined) body.generationConfig = { temperature }
  if (max_tokens !== undefined) {
    if (!body.generationConfig) body.generationConfig = {}
    body.generationConfig.maxOutputTokens = max_tokens
  }

  const response = await fetch(`${baseUrl}/models/${model}:generateContent`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`)
  }

  // 轉換為 OpenAI 格式
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      }
    }],
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata?.totalTokenCount || 0
    }
  }
}

async function chatLMStudio(options) {
  // LM Studio 使用 OpenAI 相容格式
  return chatOpenAI(options)
}

async function chatAnthropic(options) {
  const { baseUrl, apiKey, model, messages, temperature, max_tokens } = options

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey || '',
    'anthropic-version': '2023-06-01'
  }

  // 轉換 OpenAI messages 格式為 Anthropic 格式
  const systemMsg = messages.find(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')

  const body = {
    model: model || 'claude-3-haiku-20240307',
    messages: chatMessages.map(m => ({
      role: m.role,
      content: m.content
    })),
    max_tokens: max_tokens || 1024
  }

  if (systemMsg) body.system = systemMsg.content
  if (temperature !== undefined) body.temperature = temperature

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`)
  }

  // 轉換為 OpenAI 格式
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: data.content?.[0]?.text || ''
      }
    }],
    usage: {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    }
  }
}

// ========== Static Files ==========

const WEB_MENU_DIR = path.join(__dirname, '..', 'web-menu')
app.use(express.static(WEB_MENU_DIR))

// ========== Start Server ==========

app.listen(PORT, () => {
  console.log(`[AI Proxy] 服務已啟動: http://localhost:${PORT}`)
  console.log(`[AI Proxy] Web Menu: http://localhost:${PORT}/index.html`)
  console.log(`[AI Proxy] 健康檢查: http://localhost:${PORT}/api/health`)
  console.log(`[AI Proxy] 支援的供應商: openai, ollama, google, lmstudio, anthropic, openai-compatible`)
  console.log(`[AI Proxy] OpenCode 路由: /api/opencode/:serverId/* (已載入 ${serverMap.size} 個 server)`)
})
