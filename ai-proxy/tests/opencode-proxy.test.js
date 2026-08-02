'use strict'

/**
 * OpenCode Proxy 整合測試
 * 驗證 ai-proxy `/api/opencode/:serverId/*` 通用轉發路由：
 *   [B1] query string（`?directory=`）有被轉發到上游
 *   [B2] SSE 長連線不被固定 timeout 掐斷，client 斷線後上游被釋放
 *
 * 用法：
 *   node tests/opencode-proxy.test.js                # 完整測試（SSE 等待 125s）
 *   SSE_WAIT_MS=6000 node tests/opencode-proxy.test.js   # 快速模式（縮短 SSE 等待）
 */

const http = require('http')
const { spawn } = require('child_process')
const path = require('path')
const net = require('net')
const fs = require('fs')

const SERVER_JS = path.join(__dirname, '..', 'server.js')
const SERVERS_FILE = path.join(__dirname, '..', 'servers.json')
const SSE_WAIT_MS = parseInt(process.env.SSE_WAIT_MS || '125000', 10)

let passed = 0
let failed = 0

function ok(cond, name) {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}`)
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

function request(port, method, reqPath, { body, timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const options = {
      host: '127.0.0.1',
      port,
      method,
      path: reqPath,
      headers: data
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        : {}
    }
    const req = http.request(options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let json = null
        try { json = JSON.parse(text) } catch (e) { /* ignore */ }
        resolve({ status: res.statusCode, text, json })
      })
    })
    req.on('error', reject)
    req.setTimeout(timeout, () => req.destroy(new Error('request timeout')))
    if (data) req.write(data)
    req.end()
  })
}

async function waitForProxy(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await request(port, 'GET', '/api/health', { timeout: 1000 })
      if (r.status === 200) return true
    } catch (e) { /* retry */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

let mockSseDisconnects = 0

async function main() {
  // 1) mock 上游（echo query + SSE 每 1s 送 ping）
  const mock = http.createServer((req, res) => {
    const url = req.url || ''
    if (url.startsWith('/event')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      })
      let n = 0
      const iv = setInterval(() => {
        n++
        res.write(`data: {"type":"ping","n":${n},"ts":${Date.now()}}\n\n`)
      }, 1000)
      req.on('close', () => {
        clearInterval(iv)
        mockSseDisconnects++
      })
      return
    }
    if (url.startsWith('/session')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', () => {
          let parsed = null
          try { parsed = JSON.parse(body) } catch (e) { parsed = body }
          res.end(JSON.stringify({ receivedUrl: url, receivedBody: parsed }))
        })
        return
      }
      res.end(JSON.stringify({ receivedUrl: url }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, receivedUrl: url }))
  })
  const mockPort = await getFreePort()
  await new Promise((resolve) => mock.listen(mockPort, '127.0.0.1', resolve))

  // 2) 啟動 ai-proxy 子程序（獨立 port）
  const proxyPort = await getFreePort()
  const child = spawn(process.execPath, [SERVER_JS], {
    env: { ...process.env, PORT: String(proxyPort) },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let childLogs = ''
  child.stdout.on('data', (d) => { childLogs += d })
  child.stderr.on('data', (d) => { childLogs += d })

  // 備份/還原 servers.json（避免污染真實設定）
  const backup = fs.existsSync(SERVERS_FILE) ? fs.readFileSync(SERVERS_FILE, 'utf8') : null

  let serverId = null
  let serverId2 = null
  try {
    if (!await waitForProxy(proxyPort)) {
      console.error('ai-proxy 未就緒。logs:\n' + childLogs)
      process.exitCode = 1
      return
    }

    // 3) 註冊 mock server
    const reg = await request(proxyPort, 'POST', '/api/opencode/servers', {
      body: { name: 'mock', host: '127.0.0.1', port: mockPort }
    })
    ok(reg.status === 200 && reg.json && reg.json.server && reg.json.server.id, '註冊 mock server 成功')
    serverId = reg.json && reg.json.server ? reg.json.server.id : null
    if (!serverId) return

    // 3.1) [C1] 相同 host:port 允許重複註冊（跨 namespace 獨立 id）
    const reg2 = await request(proxyPort, 'POST', '/api/opencode/servers', {
      body: { name: 'mock-2', host: '127.0.0.1', port: mockPort }
    })
    ok(
      reg2.status === 200 && reg2.json && reg2.json.server && reg2.json.server.id && reg2.json.server.id !== serverId,
      'C1 相同 host:port 可重複註冊（回傳新 id，非 409）'
    )
    serverId2 = reg2.json && reg2.json.server ? reg2.json.server.id : null
    if (serverId2) {
      const b1b = await request(proxyPort, 'GET', `/api/opencode/${serverId2}/session`)
      ok(b1b.status === 200 && b1b.json && b1b.json.receivedUrl, 'C1 第二個 server 也可正常轉發')
    }

    // 4) [B1] query string 轉發
    const enc = encodeURIComponent('C:\\D\\ai_cli\\Fast_Agent')
    const b1 = await request(proxyPort, 'GET', `/api/opencode/${serverId}/session?directory=${enc}`)
    ok(b1.status === 200 && b1.json && b1.json.receivedUrl, 'B1 上游回應 JSON（receivedUrl）')
    ok(
      b1.json && b1.json.receivedUrl.startsWith('/session?directory=') && b1.json.receivedUrl.includes(`directory=${enc}`),
      `B1 query string 已轉發（mock 收到 ${b1.json && b1.json.receivedUrl}）`
    )

    // 5) [B1+] POST body + query string 轉發（聊天頁 /session/:id/message 路徑）
    const encMsg = encodeURIComponent('C:\\D\\ai_cli\\Fast_Agent')
    const msg = await request(proxyPort, 'POST', `/api/opencode/${serverId}/session/sess-1/message?directory=${encMsg}`, {
      body: { parts: [{ type: 'text', text: 'hi' }] }
    })
    ok(
      msg.status === 200 && msg.json && msg.json.receivedUrl.startsWith('/session/sess-1/message?directory='),
      `B1+ POST query string 已轉發（mock 收到 ${msg.json && msg.json.receivedUrl}）`
    )
    ok(
      msg.json && msg.json.receivedBody && msg.json.receivedBody.parts &&
        msg.json.receivedBody.parts[0] && msg.json.receivedBody.parts[0].text === 'hi',
      'B1+ POST body 已轉發（mock 收到訊息內容）'
    )

    // 6) [B2] SSE 長連線不被掐斷
    console.log(`\n  [B2] 建立 SSE 連線並等待 ${SSE_WAIT_MS}ms（確認超過 120s 不被掐斷）...`)
    const sse = await new Promise((resolve) => {
      const req = http.get(
        { host: '127.0.0.1', port: proxyPort, path: `/api/opencode/${serverId}/event` },
        (res) => {
          let bytes = 0
          let count = 0
          const started = Date.now()
          const done = (result) => {
            if (res._settled) return
            res._settled = true
            resolve(result)
          }
          res.on('data', (c) => { bytes += c.length; count++ })
          res.on('end', () => done({ ended: true, elapsed: Date.now() - started, bytes, count }))
          res.on('error', () => done({ ended: true, elapsed: Date.now() - started, bytes, count }))
          setTimeout(() => {
            done({ ended: false, elapsed: Date.now() - started, bytes, count })
            req.destroy()
          }, SSE_WAIT_MS)
        }
      )
      req.on('error', () => resolve({ ended: true, elapsed: -1, bytes: 0, count: 0 }))
    })
    ok(sse.ended === false, `B2 SSE 存活 ${sse.elapsed}ms 未被掐斷（收到 ${sse.count} 個事件）`)
    ok(sse.bytes > 0, 'B2 SSE 有收到資料')

    // 7) client 斷線 → 上游連線被釋放
    const before = mockSseDisconnects
    await new Promise((r) => setTimeout(r, 500))
    ok(mockSseDisconnects > before, 'B2 client 斷線後上游 SSE 連線被釋放')
  } finally {
    try {
      if (serverId) await request(proxyPort, 'DELETE', `/api/opencode/servers/${serverId}`)
    } catch (e) { /* ignore */ }
    try {
      if (serverId2) await request(proxyPort, 'DELETE', `/api/opencode/servers/${serverId2}`)
    } catch (e) { /* ignore */ }
    child.kill()
    mock.close()
    if (backup !== null) {
      fs.writeFileSync(SERVERS_FILE, backup)
    } else {
      try { fs.unlinkSync(SERVERS_FILE) } catch (e) { /* ignore */ }
    }
  }

  console.log(`\n結果: ${passed} passed, ${failed} failed`)
  process.exitCode = failed === 0 ? 0 : 1
}

main().catch((e) => {
  console.error('測試執行失敗:', e)
  process.exitCode = 1
})
