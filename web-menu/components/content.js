const ContentManager = {
  iframe: null,
  spinner: null,
  errorOverlay: null,
  isLoading: false,

  init() {
    this.iframe = document.getElementById('content-frame');
    this.spinner = document.getElementById('spinner-overlay');
    this.errorOverlay = document.getElementById('error-overlay');

    this.iframe.addEventListener('load', () => {
      this.hideSpinner();
      this.hideError();
    });

    this.iframe.addEventListener('error', () => {
      this.hideSpinner();
      this.showError();
    });

    this.iframe.src = 'about:blank';

    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.path) {
        this.loadPage(e.state.path);
        if (e.state.menuId) {
          MenuManager.activeId = e.state.menuId;
          MenuManager.render();
        }
      }
    });

    this.loadDefaultPage();
  },

  loadPage(path) {
    this.showSpinner();
    this.hideError();
    const qs = location.search;
    this.iframe.src = qs ? path + qs : path;
  },

  loadDefaultPage() {
    const config = window.MENU_CONFIG;
    if (!config || config.length === 0) return;

    const hash = location.hash.slice(1);
    if (hash) {
      const findItem = (items) => {
        for (const item of items) {
          if (item.path === hash) return item;
          if (item.children) { const f = findItem(item.children); if (f) return f; }
        }
        return null;
      };
      const item = findItem(config);
      if (item) {
        MenuManager.activeId = item.id;
        this.loadPage(item.path);
        history.replaceState({ menuId: item.id, path: item.path }, '', '#');
        MenuManager.render();
        return;
      }
    }

    if (config[0].children && config[0].children.length > 0) {
      const first = config[0].children[0];
      MenuManager.activeId = first.id;
      this.loadPage(first.path);
      history.replaceState({ menuId: first.id, path: first.path }, '', '#');
      MenuManager.render();
    }
  },

  showSpinner() {
    this.isLoading = true;
    this.spinner.classList.remove('hidden');
  },

  hideSpinner() {
    this.isLoading = false;
    this.spinner.classList.add('hidden');
  },

  showError() {
    this.errorOverlay.classList.remove('hidden');
  },

  hideError() {
    this.errorOverlay.classList.add('hidden');
  },

  broadcast(message) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }
};
