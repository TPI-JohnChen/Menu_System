;(function(global) {
  'use strict'

  const PROXY_BASE_URL = 'http://localhost:3001'

  function generateId() {
    return 'srv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
  }

  function projectId() {
    return 'prj-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
  }

  function basename(p) {
    return String(p || '').split(/[/\\]/).filter(Boolean).pop() || p
  }

  // ========== 共享無狀態方法（不依賴 namespace） ==========

  async function checkHealth(serverId) {
    try {
      const response = await fetch(PROXY_BASE_URL + '/api/opencode/' + serverId + '/global/health', {
        signal: AbortSignal.timeout(5000)
      })
      if (!response.ok) return false
      const data = await response.json()
      return data && data.healthy === true
    } catch (e) {
      return false
    }
  }

  // MenuManager 以 `const` 宣告（global lexical binding），不掛到 window；
  // 主頁情境用裸識別字，iframe 情境回傳 null（改走 postMessage）。
  function menuManager() {
    if (global.MenuManager) return global.MenuManager
    if (typeof MenuManager !== 'undefined') return MenuManager
    return null
  }

  async function fetchProjects(serverId) {
    try {
      const response = await fetch(PROXY_BASE_URL + '/api/opencode/' + serverId + '/project', {
        signal: AbortSignal.timeout(5000)
      })
      if (!response.ok) return { success: false, projects: [], error: 'HTTP ' + response.status }

      var contentType = response.headers.get('content-type') || ''
      var data

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        var text = await response.text()
        try { data = JSON.parse(text) } catch (e) { data = text }
      }

      var raw
      if (Array.isArray(data)) {
        raw = data
      } else if (data && typeof data === 'object' && Array.isArray(data.projects)) {
        raw = data.projects
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        raw = data.data
      } else {
        raw = []
      }

      var projects = raw.map(function(p) {
        if (typeof p === 'string') {
          var name = p.split(/[\/\\\\]/).filter(Boolean).pop() || p
          return { name: name, path: p }
        }
        if (p && typeof p === 'object') {
          var worktree = p.worktree || p.path || p.directory || p.dir || ''
          var id = p.id || ''
          var n = p.name || p.title || ''
          if (!n && worktree) {
            n = worktree.split(/[\/\\\\]/).filter(Boolean).pop() || id
          }
          if (!n) n = id || 'unknown'
          return { name: n, path: worktree || id || '', id: id }
        }
        return { name: String(p), path: String(p) }
      })

      return { success: true, projects: projects }
    } catch (e) {
      return { success: false, projects: [], error: e.message }
    }
  }

  async function apiCall(serverId, method, path, body, timeout) {
    const url = PROXY_BASE_URL + '/api/opencode/' + serverId + '/' + path.replace(/^\//, '')
    const options = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeout || 15000)
    }
    if (body !== undefined) {
      options.body = JSON.stringify(body)
    }
    try {
      const response = await fetch(url, options)

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream')) {
        return { success: true, stream: response.body }
      }

      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text()

      if (!response.ok) {
        return { success: false, error: data.error || data.details || 'HTTP ' + response.status }
      }
      return { success: true, data: data }
    } catch (e) {
      if (e.name === 'AbortError') {
        return { success: false, error: '請求逾時' }
      }
      return { success: false, error: e.message }
    }
  }

  async function fetchSessionDirectories(serverId) {
    var result = await apiCall(serverId, 'GET', 'session')
    if (!result.success || !Array.isArray(result.data)) return []
    var seen = {}
    result.data.forEach(function(s) {
      if (s.directory) seen[s.directory] = true
    })
    return Object.keys(seen).sort()
  }

  // ========== namespace factory ==========

  function createManager(namespace, options) {
    const opts = options || {}
    const ns = namespace || 'opencode_servers'
    const parentId = opts.parentId || 'agent-app'
    const menuMode = opts.menuMode || 'sessions' // 'sessions' (v3) | 'projects' (OpenCode Serve)

    const STORAGE_KEY = ns
    const PENDING_KEY = 'opencode_pending_sync_' + ns
    const PROJECTS_KEY = 'opencode_projects_' + ns

    function getServers() {
      try {
        const data = localStorage.getItem(STORAGE_KEY)
        if (!data) return []
        const parsed = JSON.parse(data)
        return parsed.servers || []
      } catch (e) {
        console.error('[OpenCodeManager] 讀取 localStorage 失敗:', e)
        return []
      }
    }

    function saveAllServers(servers) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ servers: servers }))
        return true
      } catch (e) {
        console.error('[OpenCodeManager] 儲存 localStorage 失敗:', e)
        return false
      }
    }

    function getServerById(id) {
      const servers = getServers()
      return servers.find(function(s) { return s.id === id }) || null
    }

    function saveServer(server) {
      const servers = getServers()
      const idx = servers.findIndex(function(s) { return s.id === server.id })
      if (idx >= 0) {
        servers[idx] = server
      } else {
        servers.push(server)
      }
      const saved = saveAllServers(servers)
      if (saved) {
        syncToProxy(server)
      }
      return saved
    }

    function deleteServer(id) {
      const servers = getServers()
      const filtered = servers.filter(function(s) { return s.id !== id })
      const saved = saveAllServers(filtered)
      if (saved) {
        deleteFromProxy(id)
        clearProjects(id)
        const mm = menuManager()
        if (mm && mm.removeDynamicItems) {
          mm.removeDynamicItems(parentId)
        }
      }
      return saved
    }

    // ----- pending sync -----

    function getPendingSync() {
      try {
        const data = localStorage.getItem(PENDING_KEY)
        return data ? JSON.parse(data) : []
      } catch (e) { return [] }
    }

    function setPendingSync(pending) {
      try {
        localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
      } catch (e) { /* ignore */ }
    }

    function addPendingSync(server) {
      const pending = getPendingSync()
      const idx = pending.findIndex(function(s) { return s.id === server.id })
      if (idx >= 0) {
        pending[idx] = server
      } else {
        pending.push(server)
      }
      setPendingSync(pending)
    }

    function removePendingSync(id) {
      const pending = getPendingSync().filter(function(s) { return s.id !== id })
      setPendingSync(pending)
    }

    async function syncToProxy(server) {
      try {
        const response = await fetch(PROXY_BASE_URL + '/api/opencode/servers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(server)
        })
        if (response.ok) {
          removePendingSync(server.id)
          return true
        }
        addPendingSync(server)
        return false
      } catch (e) {
        console.warn('[OpenCodeManager] Proxy 同步失敗，加入重試佇列:', e.message)
        addPendingSync(server)
        return false
      }
    }

    async function deleteFromProxy(id) {
      try {
        await fetch(PROXY_BASE_URL + '/api/opencode/servers/' + id, {
          method: 'DELETE'
        })
        removePendingSync(id)
      } catch (e) {
        console.warn('[OpenCodeManager] Proxy 刪除失敗，加入重試佇列:', e.message)
        addPendingSync({ id: id, _delete: true })
      }
    }

    async function syncPendingToProxy() {
      const pending = getPendingSync()
      if (pending.length === 0) return

      for (const item of pending) {
        if (item._delete) {
          await deleteFromProxy(item.id)
        } else {
          await syncToProxy(item)
        }
      }
    }

    // ----- 專案 CRUD（per server） -----

    function readProjectMap() {
      try {
        const data = localStorage.getItem(PROJECTS_KEY)
        return data ? JSON.parse(data) : {}
      } catch (e) { return {} }
    }

    function writeProjectMap(map) {
      try {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(map))
        return true
      } catch (e) { return false }
    }

    function getProjects(serverId) {
      const map = readProjectMap()
      return Array.isArray(map[serverId]) ? map[serverId] : []
    }

    function saveProject(server, project) {
      const map = readProjectMap()
      const list = Array.isArray(map[server.id]) ? map[server.id] : []
      const directory = String(project.directory || '').trim()
      if (!directory) return false
      if (list.some(function(p) {
        return p.directory === directory && p.id !== project.id
      })) {
        return false // 同 server 重複 directory 拒絕
      }
      if (project.id) {
        const idx = list.findIndex(function(p) { return p.id === project.id })
        if (idx >= 0) {
          list[idx] = { id: project.id, label: project.label || '', directory: directory }
        } else {
          list.push({ id: project.id, label: project.label || '', directory: directory })
        }
      } else {
        list.push({ id: projectId(), label: project.label || '', directory: directory })
      }
      map[server.id] = list
      writeProjectMap(map)
      return true
    }

    function deleteProject(serverId, projectId) {
      const map = readProjectMap()
      const list = Array.isArray(map[serverId]) ? map[serverId] : []
      const next = list.filter(function(p) { return p.id !== projectId })
      map[serverId] = next
      writeProjectMap(map)
      return true
    }

    function clearProjects(serverId) {
      const map = readProjectMap()
      delete map[serverId]
      writeProjectMap(map)
    }

    // ----- Menu -----

    async function refreshMenu() {
      const servers = getServers()
      const items = []

      for (const server of servers) {
        if (server.status !== 'connected') continue

        if (menuMode === 'projects') {
          const projects = getProjects(server.id)
          projects.forEach(function(proj) {
            const projLabel = proj.label || basename(proj.directory)
            items.push({
              id: 'ocs-' + server.id + '-' + proj.id,
              label: server.name + ' · ' + projLabel,
              path: 'pages/opencode-serve-chat.html?serverId=' + server.id +
                '&worktree=' + encodeURIComponent(proj.directory) +
                '&label=' + encodeURIComponent(proj.label || '') +
                '&server=' + encodeURIComponent(server.name),
              icon: '💬'
            })
          })
        } else {
          const dirs = await fetchSessionDirectories(server.id)
          dirs.forEach(function(dir) {
            var label = basename(dir)
            items.push({
              id: 'oc-' + server.id + '-' + label.replace(/[^a-zA-Z0-9_-]/g, ''),
              label: label,
              path: 'pages/chat-bot.html?serverId=' + server.id + '&worktree=' + encodeURIComponent(dir),
              icon: '💬'
            })
          })
        }
      }

      const mm = menuManager()
      if (mm && mm.addDynamicItems) {
        mm.addDynamicItems(parentId, items)
      } else if (global.parent && global.parent !== global) {
        global.parent.postMessage({ type: 'addDynamicItems', payload: { parentId: parentId, items: items } }, '*')
      } else {
        console.warn('[OpenCodeManager] MenuManager 未就緒，無法更新選單')
      }
    }

    async function init() {
      syncPendingToProxy()
      await refreshMenu()
    }

    return {
      getServers: getServers,
      getServerById: getServerById,
      saveServer: saveServer,
      deleteServer: deleteServer,
      getProjects: getProjects,
      saveProject: saveProject,
      deleteProject: deleteProject,
      checkHealth: checkHealth,
      fetchProjects: fetchProjects,
      fetchSessionDirectories: fetchSessionDirectories,
      apiCall: apiCall,
      refreshMenu: refreshMenu,
      syncToProxy: syncToProxy,
      syncPendingToProxy: syncPendingToProxy,
      init: init
    }
  }

  // ========== 實例 ==========

  const OpenCodeManager = createManager('opencode_servers', { parentId: 'agent-app', menuMode: 'sessions' })
  OpenCodeManager.create = createManager

  const OpenCodeServeManager = createManager('opencode_serve_servers', { parentId: 'opencode-serve', menuMode: 'projects' })

  global.OpenCodeManager = OpenCodeManager
  global.OpenCodeServeManager = OpenCodeServeManager

})(window)
