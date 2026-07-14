(function () {
  const isStandalone = window.parent === window;

  window.MenuAPI = {
    navigate(menuId) {
      if (isStandalone) return;
      parent.postMessage({ type: 'navigate', payload: { menuId } }, '*');
    },

    updateBadge(menuId, count) {
      if (isStandalone) return;
      parent.postMessage({ type: 'updateBadge', payload: { menuId, count } }, '*');
    },

    setTitle(title) {
      if (isStandalone) return;
      parent.postMessage({ type: 'setTitle', payload: { title } }, '*');
    },

    onThemeChange(callback) {
      if (isStandalone) return;
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'themeChanged') {
          callback(event.data.payload.theme);
        }
      });
    },

    onTokenRefresh(callback) {
      if (isStandalone) return;
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'tokenRefreshed') {
          callback(event.data.payload.token);
        }
      });
    },

    onMenuCollapse(callback) {
      if (isStandalone) return;
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'menuCollapsed') {
          callback(event.data.payload.state);
        }
      });
    },

    onLanguageChange(callback) {
      if (isStandalone) return;
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'languageChanged') {
          callback(event.data.payload.lang);
        }
      });
    }
  };

  if (!isStandalone) {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'themeChanged') {
        const theme = event.data.payload.theme;
        document.documentElement.className = theme === 'dark' ? 'theme-dark' : '';
      }
      if (event.data?.type === 'languageChanged') {
        const lang = event.data.payload.lang;
        localStorage.setItem('lang', lang);
        localStorage.setItem('menu-lang', lang);
      }
    });

    parent.postMessage({ type: 'ready' }, '*');
  }
})();
