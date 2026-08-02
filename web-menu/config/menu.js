window.MENU_CONFIG = [
  {
    id: 'dashboard',
    label: { 'zh-TW': '儀表板(demo)', 'en': 'Dashboard(demo)' },
    icon: '📊',
    children: [
      { id: 'overview', label: { 'zh-TW': '總覽', 'en': 'Overview' }, path: 'pages/overview.html' },
      { id: 'analytics', label: { 'zh-TW': '分析', 'en': 'Analytics' }, path: 'pages/analytics.html' }
    ]
  },
  {
    id: 'settings',
    label: { 'zh-TW': '設定(demo)', 'en': 'Settings(demo)' },
    icon: '⚙️',
    children: [
      { id: 'profile', label: { 'zh-TW': '個人設定', 'en': 'Profile' }, path: 'pages/profile.html' },
      { id: 'system-config', label: { 'zh-TW': '系統設定', 'en': 'System Config' }, path: 'pages/system-config.html' }
    ]
  },
  {
    id: 'external-tools',
    label: { 'zh-TW': '外部工具(demo)', 'en': 'External Tools(demo)' },
    icon: '🔧',
    children: [
      { id: 'kibana', label: { 'zh-TW': 'Kibana 報表', 'en': 'Kibana Reports' }, path: 'https://www.google.com', external: true },
      { id: 'system-a', label: { 'zh-TW': '系統A', 'en': 'System A' }, path: 'https://example.com', external: true }
    ]
  },
  {
    id: 'agent-app',
    label: { 'zh-TW': 'Agent App', 'en': 'Agent App' },
    icon: '🤖',
    children: [
      { id: 'agent-server-management', label: { 'zh-TW': 'Agent Server 管理', 'en': 'Agent Server Management' }, path: 'pages/agent-server-management.html' }
    ],
    dynamic: true
  },
  {
    id: 'opencode-serve',
    label: { 'zh-TW': 'OpenCode Serve', 'en': 'OpenCode Serve' },
    icon: '🔌',
    children: [
      { id: 'opencode-serve-management', label: { 'zh-TW': 'OpenCode Serve 管理', 'en': 'OpenCode Serve Management' }, path: 'pages/opencode-serve-management.html' }
    ],
    dynamic: true
  },
  {
    id: 'ai-agent',
    label: { 'zh-TW': '供應商設定', 'en': 'Provider Settings' },
    icon: '⚙️',
    children: [
      { id: 'provider-management', label: { 'zh-TW': '供應商管理', 'en': 'Provider Management' }, path: 'pages/provider-management.html' },
      { id: 'model-browser', label: { 'zh-TW': '模型瀏覽器', 'en': 'Model Browser' }, path: 'pages/model-browser.html' }
    ]
  }
]
