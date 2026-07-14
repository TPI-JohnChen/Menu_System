const FooterManager = {
  init() {
    this.render();
  },

  render() {
    const container = document.getElementById('footer');
    container.innerHTML = '';
    const config = window.FOOTER_CONFIG;

    const left = this.createSection(config.left, 'footer-left');
    const center = this.createSection(config.center, 'footer-center');
    const right = this.createSection(config.right, 'footer-right');

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
      case 'version':
        const ver = document.createElement('span');
        ver.className = 'footer-version';
        ver.textContent = item.text || '';
        container.appendChild(ver);
        break;

      case 'copyright':
        const cr = document.createElement('span');
        cr.className = 'footer-copyright';
        cr.textContent = item.text || '';
        container.appendChild(cr);
        break;

      case 'status':
        const status = document.createElement('span');
        status.className = 'footer-status';
        const dot = document.createElement('span');
        dot.className = 'status-dot ' + (item.status || 'healthy');
        const text = document.createElement('span');
        text.textContent = item.status === 'healthy'
          ? I18n.t({ 'zh-TW': '系統正常', 'en': 'System Healthy' })
          : item.status === 'warning'
            ? I18n.t({ 'zh-TW': '系統異常', 'en': 'System Warning' })
            : I18n.t({ 'zh-TW': '系統錯誤', 'en': 'System Error' });
        status.appendChild(dot);
        status.appendChild(text);
        container.appendChild(status);
        break;
    }
  }
};
