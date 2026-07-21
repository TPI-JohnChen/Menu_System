# 實作計畫：供應商管理頁面 Bug 修復

## 設計參考
`docs/superpowers/specs/2026-07-14-provider-management-bugfix-design.md`

---

## 任務

### Task 1：實作自製 Confirm Modal + 事件委派 + CSS 視覺反饋

- **範圍**：在 `web-menu/pages/provider-management.html` 中完成三項修改
- **修改檔案**：`web-menu/pages/provider-management.html`
- **具體變更**：
  1. **HTML**：在 `<div class="debug-panel">` 之前新增 `#confirmDialog` 結構（overlay + dialog + message + [取消][確認] 按鈕）
  2. **JS**：
     - 新增 `showConfirm(message)` 函式（回傳 Promise）
     - 在 `init()` 中新增 `#providerList` 的 click 事件委派與 change 事件委派
     - 移除 `renderProviderList()` 中 `providers.forEach` 內部的 `addEventListener` 與 header click listener
     - 將 `deleteProvider` 改為 `async`
     - 為 Confirm Modal 按鈕與 overlay 綁定事件
  3. **CSS**：在 `<style>` 區塊中新增 `:active` / `:focus-visible` 規則
- **驗收標準**：
  - [✅] 新增供應商後，[刪除] 按鈕點擊彈出自製確認對話框，確認後成功刪除
  - [✅] 展開卡片後，[測試連線][儲存][刪除] 三按鈕均可正常觸發
  - [✅] 重新整理頁面後展開卡片，按鈕仍然有效
  - [✅] 按鈕點擊時有視覺縮放或顏色變化反饋
  - [✅] 多語系（zh-TW / en）文字正確顯示
- **相依性**：無

---

## 未竟事項

- 無。設計已完整鎖定。

## 備註

- sandbox 屬性不修改，維持最小權限原則
- `provider-manager.js` 與 `ai-proxy/server.js` 不涉及變更
- 不影響現有單元測試或功能行為
