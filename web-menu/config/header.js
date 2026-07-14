window.HEADER_CONFIG = {
  left: [
    { type: 'menu-toggle', id: 'menuToggle' }
  ],
  center: [
    { type: 'search', id: 'globalSearch', placeholder: { 'zh-TW': '搜尋 Menu 項目...', 'en': 'Search menu items...' } }
  ],
  right: [
    { type: 'user-info', id: 'userInfo', username: 'John' },
    { type: 'notification', id: 'notifBell', badge: 3 },
    { type: 'theme-toggle', id: 'themeSwitch', defaultTheme: 'light' },
    { type: 'language', id: 'langSwitch', defaultLang: 'zh-TW', languages: ['zh-TW', 'en'] }
  ]
}
