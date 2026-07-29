(function () {
  const langConfig = window.HEADER_CONFIG?.right?.find(i => i.type === 'language');
  I18n.init(langConfig?.defaultLang || 'zh-TW');

  const themeConfig = window.HEADER_CONFIG?.right?.find(i => i.type === 'theme-toggle');
  ThemeManager.init(themeConfig?.defaultTheme || 'light');

  Messenger.init();
  HeaderManager.init();
  MenuManager.init();
  ContentManager.init();
  FooterManager.init();
  OpenCodeManager.init();
})();
