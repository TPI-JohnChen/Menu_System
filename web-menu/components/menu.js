const MenuManager = {
  state: 0,
  activeId: null,
  badgeMap: {},
  dynamicItems: {},

  init() {
    const saved = localStorage.getItem('menu-state');
    this.state = saved !== null ? parseInt(saved, 10) : 0;
    this.render();
    this.restoreActiveFromHistory();
  },

  getStateClass() {
    const classes = ['', 'state-icons', 'state-collapsed'];
    return classes[this.state] || '';
  },

  toggle() {
    this.state = (this.state + 1) % 3;
    localStorage.setItem('menu-state', this.state);
    this.render();
    Messenger.broadcastToAllIframes({ type: 'menuCollapsed', payload: { state: this.state } });
  },

  addDynamicItems(parentId, items) {
    this.dynamicItems[parentId] = items;
    this.render();
  },

  removeDynamicItems(parentId) {
    delete this.dynamicItems[parentId];
    this.render();
  },

  getEffectiveConfig() {
    const config = JSON.parse(JSON.stringify(window.MENU_CONFIG));
    Object.keys(this.dynamicItems).forEach(parentId => {
      const parent = this._findItem(config, parentId);
      if (parent && parent.children) {
        const dynamicItems = this.dynamicItems[parentId];
        const staticChildren = parent.children.filter(c => !c._dynamic);
        parent.children = staticChildren.concat(
          dynamicItems.map(item => ({ ...item, _dynamic: true }))
        );
      }
    });
    return config;
  },

  _findItem(items, id) {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = this._findItem(item.children, id);
        if (found) return found;
      }
    }
    return null;
  },

  render() {
    const panel = document.getElementById('menu-panel');
    panel.className = 'menu-panel ' + this.getStateClass();
    panel.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'menu-list';
    this.renderItems(this.getEffectiveConfig(), ul, 0);
    panel.appendChild(ul);
    this.applyFlyoutListeners(panel);
  },

  renderItems(items, parentEl, depth) {
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'menu-item' + (depth === 0 ? ' first-level' : ' second-level');
      li.dataset.id = item.id;

      const label = document.createElement('div');
      label.className = 'menu-item-label';
      if (this.activeId === item.id) label.classList.add('active');

      if (depth === 0) {
        const icon = document.createElement('span');
        icon.className = 'menu-icon';
        icon.textContent = item.icon || '📄';
        label.appendChild(icon);
      }

      const text = document.createElement('span');
      text.className = 'menu-label-text';
      text.textContent = I18n.t(item.label);
      label.appendChild(text);

      if (item.children && item.children.length > 0 && depth === 0 && this.badgeMap[item.id]) {
        const badge = document.createElement('span');
        badge.className = 'notif-badge';
        badge.style.position = 'static';
        badge.style.marginLeft = 'auto';
        badge.textContent = this.badgeMap[item.id] > 99 ? '99+' : this.badgeMap[item.id];
        label.appendChild(badge);
      }

      if (depth === 0) {
        label.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.state === 1) {
            const wasOpen = li.classList.contains('flyout-open');
            document.querySelectorAll('.menu-item.first-level.flyout-open').forEach(el => el.classList.remove('flyout-open'));
            if (!wasOpen) {
              li.classList.add('flyout-open');
              const childUl = li.querySelector('.menu-children');
              if (childUl) {
                const rect = li.getBoundingClientRect();
                childUl.style.top = rect.top + 'px';
              }
            }
          }
        });
      } else {
        label.addEventListener('click', () => this.navigateToItem(item));
      }

      li.appendChild(label);

      if (item.children && item.children.length > 0 && depth === 0) {
        const childUl = document.createElement('ul');
        childUl.className = 'menu-children';
        this.renderItems(item.children, childUl, depth + 1);
        li.appendChild(childUl);
      }

      parentEl.appendChild(li);
    });
  },

  applyFlyoutListeners(panel) {
    panel.addEventListener('click', (e) => {
      const flyout = e.target.closest('.flyout-open');
      if (!flyout) {
        document.querySelectorAll('.menu-item.first-level.flyout-open').forEach(el => el.classList.remove('flyout-open'));
      }
    });
  },

  positionFlyouts(panel) {
    panel.querySelectorAll('.menu-item.first-level').forEach(item => {
      const rect = item.getBoundingClientRect();
      const childUl = item.querySelector('.menu-children');
      if (childUl) {
        childUl.style.top = rect.top + 'px';
      }
    });
  },

  navigateToItem(item) {
    if (!item || !item.path) return;
    this.activeId = item.id;
    this.render();

    ContentManager.loadPage(item.path);
    history.pushState({ menuId: item.id, path: item.path }, '', '#');
  },

  restoreActiveFromHistory() {
    if (location.hash) {
      const path = location.hash.slice(1);
      this.activeId = this.findIdByPath(path);
      this.render();
    }
  },

  findIdByPath(path) {
    const search = (items) => {
      for (const item of items) {
        if (item.path === path) return item.id;
        if (item.children) {
          const found = search(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return search(window.MENU_CONFIG);
  },

  updateBadge(menuId, count) {
    const search = (items) => {
      for (const item of items) {
        if (item.id === menuId) {
          this.badgeMap[menuId] = count;
          this.render();
          return;
        }
        if (item.children) search(item.children);
      }
    };
    search(window.MENU_CONFIG);
  },

  navigateTo(menuId) {
    const search = (items) => {
      for (const item of items) {
        if (item.id === menuId) return item;
        if (item.children) {
          const found = search(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    const item = search(window.MENU_CONFIG);
    if (item) {
      this.navigateToItem(item);
    }
  },

  filter(query) {
    const normalized = query.toLowerCase().trim();
    const labels = document.querySelectorAll('.menu-item-label .menu-label-text');
    labels.forEach(el => {
      const li = el.closest('.menu-item');
      const text = el.textContent.toLowerCase();
      const match = !normalized || text.includes(normalized);
      li.style.display = match ? '' : 'none';
    });
  },

  clearFilter() {
    document.querySelectorAll('.menu-item').forEach(el => el.style.display = '');
  }
};
