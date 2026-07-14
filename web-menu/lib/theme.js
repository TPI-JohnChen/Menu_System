const ThemeManager = {
  currentTheme: 'light',

  init(defaultTheme) {
    this.currentTheme = localStorage.getItem('menu-theme') || defaultTheme || 'light';
    this.apply(this.currentTheme);
  },

  apply(theme) {
    this.currentTheme = theme;
    document.documentElement.className = theme === 'dark' ? 'theme-dark' : '';
    localStorage.setItem('menu-theme', theme);
    Messenger.broadcastToAllIframes({ type: 'themeChanged', payload: { theme } });
  },

  toggle() {
    const next = this.currentTheme === 'light' ? 'dark' : 'light';
    this.apply(next);
    return next;
  }
};
