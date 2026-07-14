const I18n = {
  currentLang: 'zh-TW',

  init(defaultLang) {
    this.currentLang = localStorage.getItem('menu-lang') || defaultLang || 'zh-TW';
  },

  t(obj) {
    if (typeof obj === 'string') return obj;
    return obj[this.currentLang] || obj['zh-TW'] || '';
  },

  switchTo(lang) {
    this.currentLang = lang;
    localStorage.setItem('menu-lang', lang);
  }
};
