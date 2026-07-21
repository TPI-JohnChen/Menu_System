/**
 * AI Proxy Service
 * Port: 3001
 * 職責：轉發前端請求到各供應商 API，處理 CORS
 */

const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

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

// ========== Start Server ==========

app.listen(PORT, () => {
  console.log(`[AI Proxy] 服務已啟動: http://localhost:${PORT}`)
  console.log(`[AI Proxy] 健康檢查: http://localhost:${PORT}/api/health`)
  console.log(`[AI Proxy] 支援的供應商: openai, ollama, google, lmstudio, anthropic, openai-compatible`)
})
