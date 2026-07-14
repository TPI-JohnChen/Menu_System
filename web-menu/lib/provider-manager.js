/**
 * ProviderManager — 供應商管理共用邏輯
 * 職責：localStorage CRUD、API 呼叫介面、供應商驗證
 */
;(function(global) {
  'use strict'

  const STORAGE_KEY = 'ai_providers'
  const PROXY_BASE_URL = 'http://localhost:3001'

  // ========== UUID 產生 ==========

  function generateId() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, function() {
      return Math.floor(Math.random() * 16).toString(16)
    })
  }

  // ========== localStorage CRUD ==========

  function getProviders() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return []
      const parsed = JSON.parse(data)
      return parsed.providers || []
    } catch (e) {
      console.error('[ProviderManager] 讀取 localStorage 失敗:', e)
      return []
    }
  }

  function saveAllProviders(providers) {
    try {
      const data = { providers: providers }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      return true
    } catch (e) {
      console.error('[ProviderManager] 儲存 localStorage 失敗:', e)
      if (e.name === 'QuotaExceededError') {
        console.error('[ProviderManager] localStorage 空間已滿')
      }
      return false
    }
  }

  function getProviderById(id) {
    const providers = getProviders()
    return providers.find(function(p) { return p.id === id }) || null
  }

  function saveProvider(provider) {
    const providers = getProviders()
    const existingIndex = providers.findIndex(function(p) { return p.id === provider.id })

    if (existingIndex >= 0) {
      providers[existingIndex] = provider
    } else {
      providers.push(provider)
    }

    return saveAllProviders(providers)
  }

  function deleteProvider(id) {
    const providers = getProviders()
    const filtered = providers.filter(function(p) { return p.id !== id })
    return saveAllProviders(filtered)
  }

  function updateProvider(id, data) {
    const provider = getProviderById(id)
    if (!provider) return false

    const updated = Object.assign({}, provider, data)
    return saveProvider(updated)
  }

  // ========== 驗證 ==========

  function validateProvider(provider) {
    const errors = []

    if (!provider.type) {
      errors.push({ field: 'type', message: '請選擇供應商類型' })
      return { valid: false, errors: errors }
    }

    if (!provider.name || provider.name.trim() === '') {
      errors.push({ field: 'name', message: '請輸入供應商名稱' })
    }

    const providerType = window.getProviderType(provider.type)
    if (!providerType) {
      errors.push({ field: 'type', message: '不支援的供應商類型: ' + provider.type })
      return { valid: false, errors: errors }
    }

    // 檢查必填欄位
    if (provider.settings) {
      providerType.fields.forEach(function(field) {
        if (field.required) {
          const value = provider.settings[field.key]
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errors.push({
              field: field.key,
              message: (field.label['zh-TW'] || field.key) + ' 為必填欄位'
            })
          }
        }
      })
    }

    return { valid: errors.length === 0, errors: errors }
  }

  // ========== 建立新供應商 ==========

  function createNewProvider(type, name) {
    const providerType = window.getProviderType(type)
    if (!providerType) return null

    const settings = Object.assign({}, providerType.defaults)

    return {
      id: generateId(),
      name: name || providerType.label['zh-TW'],
      type: type,
      enabled: true,
      settings: settings,
      lastConnected: null,
      status: 'unknown'
    }
  }

  // ========== API 呼叫介面 ==========

  async function checkProxyStatus() {
    try {
      const response = await fetch(PROXY_BASE_URL + '/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
      return response.ok
    } catch (e) {
      return false
    }
  }

  async function fetchModels(provider) {
    const url = new URL(PROXY_BASE_URL + '/api/providers/' + provider.type + '/models')
    url.searchParams.set('baseUrl', provider.settings.baseUrl || '')
    if (provider.settings.apiKey) {
      url.searchParams.set('apiKey', provider.settings.apiKey)
    }

    try {
      const response = await fetch(url.toString())
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '查詢模型失敗')
      }

      return { success: true, models: data.models || [] }
    } catch (e) {
      console.error('[ProviderManager] fetchModels 失敗:', e)
      return { success: false, error: e.message }
    }
  }

  async function testConnection(provider) {
    try {
      const response = await fetch(PROXY_BASE_URL + '/api/providers/' + provider.type + '/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: provider.settings.baseUrl || '',
          apiKey: provider.settings.apiKey || ''
        })
      })

      const data = await response.json()
      return {
        success: response.ok && data.status === 'connected',
        status: data.status,
        message: data.message
      }
    } catch (e) {
      console.error('[ProviderManager] testConnection 失敗:', e)
      return {
        success: false,
        status: 'error',
        message: '無法連線到 Proxy 服務: ' + e.message
      }
    }
  }

  async function chatCompletion(provider, messages, options) {
    options = options || {}

    try {
      const response = await fetch(PROXY_BASE_URL + '/api/providers/' + provider.type + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: provider.settings.baseUrl || '',
          apiKey: provider.settings.apiKey || '',
          model: options.model || 'default',
          messages: messages,
          temperature: options.temperature,
          max_tokens: options.max_tokens
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '聊天補全失敗')
      }

      return { success: true, data: data }
    } catch (e) {
      console.error('[ProviderManager] chatCompletion 失敗:', e)
      return { success: false, error: e.message }
    }
  }

  // ========== 匯出/匯入 ==========

  function exportData() {
    const providers = getProviders()
    return JSON.stringify({ providers: providers }, null, 2)
  }

  function importData(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      if (!data.providers || !Array.isArray(data.providers)) {
        throw new Error('無效的資料格式：缺少 providers 陣列')
      }
      return saveAllProviders(data.providers)
    } catch (e) {
      console.error('[ProviderManager] 匯入資料失敗:', e)
      return false
    }
  }

  // ========== 公開 API ==========

  window.ProviderManager = {
    // UUID
    generateId: generateId,

    // localStorage CRUD
    getProviders: getProviders,
    getProviderById: getProviderById,
    saveProvider: saveProvider,
    deleteProvider: deleteProvider,
    updateProvider: updateProvider,

    // 驗證
    validateProvider: validateProvider,

    // 建立新供應商
    createNewProvider: createNewProvider,

    // API 呼叫
    checkProxyStatus: checkProxyStatus,
    fetchModels: fetchModels,
    testConnection: testConnection,
    chatCompletion: chatCompletion,

    // 匯出/匯入
    exportData: exportData,
    importData: importData
  }

})(window)
