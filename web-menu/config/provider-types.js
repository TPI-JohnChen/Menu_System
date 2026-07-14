/**
 * 供應商類型定義表
 * 驅動 UI 動態渲染供應商設定表單
 */
window.PROVIDER_TYPES = {
  openai: {
    label: { 'zh-TW': 'OpenAI', 'en': 'OpenAI' },
    icon: '🤖',
    defaults: { baseUrl: 'https://api.openai.com/v1' },
    fields: [
      { key: 'apiKey', label: { 'zh-TW': 'API Key', 'en': 'API Key' }, type: 'password', required: true },
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true },
      { key: 'organization', label: { 'zh-TW': 'Organization ID', 'en': 'Organization ID' }, type: 'text', required: false }
    ]
  },
  google: {
    label: { 'zh-TW': 'Google（Gemini）', 'en': 'Google (Gemini)' },
    icon: '🔷',
    defaults: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
    fields: [
      { key: 'apiKey', label: { 'zh-TW': 'API Key', 'en': 'API Key' }, type: 'password', required: true },
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true },
      { key: 'project', label: { 'zh-TW': 'Project ID', 'en': 'Project ID' }, type: 'text', required: false }
    ]
  },
  ollama: {
    label: { 'zh-TW': 'Ollama', 'en': 'Ollama' },
    icon: '🦙',
    defaults: { baseUrl: 'http://localhost:11434' },
    fields: [
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true }
    ]
  },
  lmstudio: {
    label: { 'zh-TW': 'LM Studio', 'en': 'LM Studio' },
    icon: '🏠',
    defaults: { baseUrl: 'http://localhost:1234' },
    fields: [
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true }
    ]
  },
  'openai-compatible': {
    label: { 'zh-TW': 'OpenAI 相容 API', 'en': 'OpenAI Compatible API' },
    icon: '🔌',
    defaults: {},
    fields: [
      { key: 'customName', label: { 'zh-TW': '自訂名稱', 'en': 'Custom Name' }, type: 'text', required: true },
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true },
      { key: 'apiKey', label: { 'zh-TW': 'API Key', 'en': 'API Key' }, type: 'password', required: false }
    ]
  },
  anthropic: {
    label: { 'zh-TW': 'Anthropic（Claude）', 'en': 'Anthropic (Claude)' },
    icon: '🧠',
    defaults: { baseUrl: 'https://api.anthropic.com' },
    fields: [
      { key: 'apiKey', label: { 'zh-TW': 'API Key', 'en': 'API Key' }, type: 'password', required: true },
      { key: 'baseUrl', label: { 'zh-TW': 'Base URL', 'en': 'Base URL' }, type: 'url', required: true }
    ]
  }
}

/**
 * 取得供應商類型定義
 * @param {string} type - 供應商類型
 * @returns {object|null} 供應商類型定義，若不存在則回傳 null
 */
window.getProviderType = function(type) {
  return window.PROVIDER_TYPES[type] || null
}

/**
 * 取得所有供應商類型列表
 * @returns {Array} 供應商類型陣列 [{key, label, icon}]
 */
window.getAllProviderTypes = function() {
  return Object.entries(window.PROVIDER_TYPES).map(([key, value]) => ({
    key: key,
    label: value.label,
    icon: value.icon
  }))
}

/**
 * 取得供應商類型的多語系標籤
 * @param {string} type - 供應商類型
 * @param {string} lang - 語言代碼（'zh-TW' 或 'en'）
 * @returns {string} 標籤文字
 */
window.getProviderLabel = function(type, lang) {
  const providerType = window.getProviderType(type)
  if (!providerType) return type
  return providerType.label[lang] || providerType.label['zh-TW'] || type
}
