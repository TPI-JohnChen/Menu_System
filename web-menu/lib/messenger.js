const Messenger = {
  init() {
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'ready':
          if (event.source) {
            event.source.postMessage({ type: 'themeChanged', payload: { theme: ThemeManager.currentTheme } }, '*');
            event.source.postMessage({ type: 'languageChanged', payload: { lang: I18n.currentLang } }, '*');
          }
          break;
        case 'navigate':
          MenuManager.navigateTo(msg.payload.menuId);
          break;
        case 'updateBadge':
          MenuManager.updateBadge(msg.payload.menuId, msg.payload.count);
          break;
        case 'setTitle':
          HeaderManager.setTitle(msg.payload.title);
          break;
        case 'addDynamicItems':
          MenuManager.addDynamicItems(msg.payload.parentId, msg.payload.items);
          break;
      }
    });
  },

  broadcastToAllIframes(message) {
    const frame = document.getElementById('content-frame');
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(message, '*');
    }
  }
};
