# 設計文件：供應商管理頁面 Bug 修復

**日期：** 2026-07-14
**版本：** 1.0
**狀態：** ✅ 設計已鎖定

---

## 問題摘要

| Bug | 現象 | 根因 |
|-----|------|------|
| B1 | [刪除] 按鈕完全沒作用 | iframe sandbox 缺少 `allow-modals`，`confirm()` 被靜默阻擋 |
| B2 | 卡片展開後 [測試連線][儲存][刪除] 按鈕全部無反應 | 事件監聽器只在 `renderProviderList()` 中附加，re-render 或重新展開後 listener 丟失 |
| B3 | 按鈕按下無視覺反饋 | CSS 缺少 `:active` / `:focus-visible` 定義 |

---

## 設計方案

### D1：自製 Confirm Modal

取代 `confirm()`，在頁面內建輕量確認對話框。

**HTML** — 新增 dialog 結構：

```
#confirmDialog.dialog-overlay
  └── .dialog
      ├── #confirmMessage (提示文字)
      └── .dialog-actions
          ├── #confirmCancelBtn.btn.btn-secondary (取消)
          └── #confirmOkBtn.btn.btn-danger (確認)
```

**JS** — Promise 封裝：

```javascript
function showConfirm(message) {
  return new Promise(function(resolve) {
    // 顯示 #confirmDialog
    // #confirmOkBtn click → resolve(true) + 隱藏
    // #confirmCancelBtn click → resolve(false) + 隱藏
    // overlay click → resolve(false) + 隱藏
  })
}
```

`deleteProvider` 改為：

```javascript
async function deleteProvider(id) {
  var tt = t()
  var confirmed = await showConfirm(tt.confirmDelete)
  if (!confirmed) return
  ProviderManager.deleteProvider(id)
  delete expandedCards[id]
  renderProviderList()
  showToast(tt.toastDeleted, 'success')
}
```

### D2：事件委派（Event Delegation）

在 `#providerList` 層級用單一 `click` 監聽器取代逐個 button `addEventListener`。

**新增監聽（在 init 中）：**

```javascript
document.getElementById('providerList').addEventListener('click', function(e) {
  var target = e.target.closest('button, .provider-card-header')
  if (!target) return

  var card = target.closest('.provider-card')
  if (!card) return
  var id = card.id.replace('card-', '')

  if (target.classList.contains('test-btn')) { testConnection(id) }
  else if (target.classList.contains('save-btn')) { saveProviderSettings(id) }
      else if (target.classList.contains('delete-btn')) { deleteProvider(id) }
  else if (target.classList.contains('provider-card-header')) { toggleCard(id) }
})
```

**移除（在 renderProviderList 中）：**
- 整個 `providers.forEach` 區塊內的 `addEventListener` 相關程式碼移除
- header click 監聽也移除（由委派處理）

input `change` 事件也改用 `input` 事件委派（監聽 `#providerList` 上的 `change` 事件）：

```javascript
document.getElementById('providerList').addEventListener('change', function(e) {
  var input = e.target.closest('input[data-field]')
  if (!input) return
  var card = input.closest('.provider-card')
  if (!card) return
  var id = card.id.replace('card-', '')
  updateSettingsField(id, input.dataset.field, input.value)
})
```

### D3：CSS 按鈕視覺反饋

在 `<style>` 區塊中新增：

```css
.btn:active {
  transform: scale(0.96);
}
.btn-primary:active { background: #0d47a1; }
.btn-danger:active { background: #b71c1c; }
.btn-success:active { background: #1b5e20; }
.btn-secondary:active { opacity: 0.7; }
.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### D4：iframe sandbox

**不修改。** 維持 `sandbox="allow-scripts allow-same-origin"`。

---

## 檔案異動清單

| 檔案 | 變動類型 | 說明 |
|------|----------|------|
| `web-menu/pages/provider-management.html` | 修改 | 新增 Confirm Modal HTML、事件委派 JS、`:active` CSS |

---

## 不修改的檔案

| 檔案 | 原因 |
|------|------|
| `web-menu/index.html` | sandbox 維持最小權限 |
| `web-menu/lib/provider-manager.js` | CRUD 邏輯無錯誤 |
| `ai-proxy/server.js` | 非前端範圍 |

---

## 設計決策記錄

| 決策 | 選擇 | 理由 |
|------|------|------|
| confirm 替代方案 | 自製 Modal，不修改 sandbox | 維持最小權限，UX 一致 |
| 事件繫結策略 | Event Delegation | 避免 re-render 後 listener 丟失，程式碼更簡潔 |
| input 事件 | 保留 `change` event delegation | 與現有 `updateSettingsField` 行為一致 |
| 功能函式名 | 改 `deleteProvider` 為 `async` | 配合 `showConfirm` 的 Promise API |
