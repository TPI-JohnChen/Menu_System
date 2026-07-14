const HeaderManager = {
  currentTitle: '',

  init() {
    this.render();
  },

  render() {
    const container = document.getElementById('header');
    container.innerHTML = '';
    const config = window.HEADER_CONFIG;

    const left = this.createSection(config.left, 'header-left');
    const center = this.createSection(config.center, 'header-center');
    const right = this.createSection(config.right, 'header-right');

    container.appendChild(left);
    container.appendChild(center);
    container.appendChild(right);
  },

  createSection(items, className) {
    const div = document.createElement('div');
    div.className = className;
    items.forEach(item => this.createItem(item, div));
    return div;
  },

  createItem(item, container) {
    switch (item.type) {
      case 'menu-toggle':
        const btn = document.createElement('button');
        btn.className = 'header-btn';
        btn.id = 'menu-toggle-btn';
        btn.innerHTML = '☰';
        btn.title = I18n.t({ 'zh-TW': '切換 Menu', 'en': 'Toggle Menu' });
        btn.addEventListener('click', () => MenuManager.toggle());
        container.appendChild(btn);
        break;

      case 'search':
        const input = document.createElement('input');
        input.className = 'header-search';
        input.id = 'global-search';
        input.type = 'text';
        input.placeholder = I18n.t(item.placeholder);
        input.addEventListener('input', (e) => {
          const q = e.target.value;
          if (q.trim()) MenuManager.filter(q);
          else MenuManager.clearFilter();
        });
        container.appendChild(input);
        break;

      case 'user-info':
        const info = document.createElement('div');
        info.className = 'user-info';
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = (item.username || 'U')[0].toUpperCase();
        const name = document.createElement('span');
        name.className = 'user-name';
        name.textContent = item.username || '';
        info.appendChild(avatar);
        info.appendChild(name);
        container.appendChild(info);
        break;

      case 'notification':
        const notif = document.createElement('button');
        notif.className = 'header-btn notif-btn';
        notif.id = 'notif-btn';
        notif.innerHTML = '🔔';
        if (item.badge > 0) {
          const badge = document.createElement('span');
          badge.className = 'notif-badge';
          badge.id = 'notif-badge-count';
          badge.textContent = item.badge > 99 ? '99+' : item.badge;
          notif.appendChild(badge);
        }
        container.appendChild(notif);
        break;

      case 'theme-toggle':
        const themeBtn = document.createElement('button');
        themeBtn.className = 'header-btn';
        themeBtn.id = 'theme-toggle-btn';
        const isDark = ThemeManager.currentTheme === 'dark';
        themeBtn.textContent = isDark ? '☀️' : '🌙';
        themeBtn.title = I18n.t({ 'zh-TW': '切換主題', 'en': 'Toggle Theme' });
        themeBtn.addEventListener('click', () => {
          ThemeManager.toggle();
          themeBtn.textContent = ThemeManager.currentTheme === 'dark' ? '☀️' : '🌙';
        });
        container.appendChild(themeBtn);
        break;

      case 'language':
        const langBtn = document.createElement('button');
        langBtn.className = 'header-btn lang-btn';
        langBtn.id = 'lang-toggle-btn';
        langBtn.textContent = I18n.currentLang.toUpperCase();
        langBtn.title = I18n.t({ 'zh-TW': '切換語言', 'en': 'Switch Language' });
        langBtn.addEventListener('click', () => {
          const langs = item.languages;
          const idx = langs.indexOf(I18n.currentLang);
          const next = langs[(idx + 1) % langs.length];
          I18n.switchTo(next);
          this.render();
          MenuManager.render();
          FooterManager.render();
          ContentManager.broadcast({ type: 'languageChanged', payload: { lang: next } });
        });
        container.appendChild(langBtn);
        break;
    }
  },

  setTitle(title) {
    this.currentTitle = title;
  }
};
