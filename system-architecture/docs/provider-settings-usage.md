# 供應商設定 — Debug Panel 使用說明

**建立日期**：2026-07-14

---

## 概述

Debug Panel 是一個開發調試工具，允許開發者直接查看和編輯 localStorage 中的供應商設定原始資料。

---

## 如何啟用

Debug Panel 預設隱藏。要啟用它，請在**主頁面** `index.html` 的 URL 後面加上 `?setting_debug=true` 參數：

```
index.html?setting_debug=true
```

### 完整 URL 範例

```
file:///C:/D/ai_cli/Menu_System/web-menu/index.html?setting_debug=true
```

> 注意：`?setting_debug=true` 要加在 `index.html` 後面，query parameter 會自動轉發到 iframe 頁面（供應商管理）。

---

## Debug Panel 功能

### 1. JSON Editor

- 顯示當前 localStorage 中的供應商設定原始 JSON 資料
- 可直接在文字編輯器中修改 JSON 內容
- 修改後需點擊「儲存到 localStorage」按鈕才會生效

### 2. 儲存到 localStorage

- 將 JSON Editor 中的內容寫入 localStorage
- 如果 JSON 格式錯誤或資料無效，會顯示錯誤訊息
- 儲存成功後，供應商列表會自動重新載入

### 3. 匯出

- 將當前 localStorage 中的供應商設定匯出為 JSON 檔案
- 檔案名稱格式：`ai-providers-YYYY-MM-DD.json`
- 可用於備份或遷移設定

### 4. 匯入

- 從 JSON 檔案匯入供應商設定
- 匯入會**覆蓋**現有的所有供應商設定
- 匯入後需點擊「儲存到 localStorage」按鈕才會生效

---

## JSON 資料格式

```json
{
  "providers": [
    {
      "id": "openai-01",
      "name": "My OpenAI",
      "type": "openai",
      "enabled": true,
      "settings": {
        "apiKey": "sk-...",
        "baseUrl": "https://api.openai.com/v1",
        "organization": "org-xxx"
      },
      "lastConnected": "2026-07-14T10:00:00Z",
      "status": "connected"
    }
  ]
}
```

### 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | string | 供應商唯一 ID（UUID 格式） |
| `name` | string | 使用者自訂名稱 |
| `type` | string | 供應商類型：openai, google, ollama, lmstudio, openai-compatible, anthropic |
| `enabled` | boolean | 是否啟用 |
| `settings` | object | 供應商設定（API Key, Base URL 等） |
| `lastConnected` | string | 最後成功連線時間（ISO 8601） |
| `status` | string | 連線狀態：connected, error, unknown |

---

## 注意事項

### API Key 安全性

- API Key 以明文存在 localStorage 中
- 任何人都可以在瀏覽器開發者工具（F12 → Application → localStorage）中看到
- 這是**本機開發環境**的設計，不建議在生產環境使用
- 如需更安全的方案，請考慮使用後端儲存或加密機制

### 資料格式驗證

- 儲存時會驗證 JSON 格式和資料結構
- 如果格式錯誤，會顯示錯誤訊息且不會寫入 localStorage
- 請確保 `providers` 陣列中的每個物件都包含必要的欄位

### 常見問題

**Q: 為什麼 Debug Panel 沒有顯示？**
A: 請確認你是透過 `index.html?setting_debug=true` 啟動，而不是直接開啟 `pages/provider-management.html`。query parameter 必須加在 `index.html` 後面，系統會自動轉發到 iframe 頁面。

**Q: 修改 JSON 後儲存失敗怎麼辦？**
A: 請檢查 JSON 格式是否正確（括號、引號、逗號等）。可以使用 JSON 線上驗證工具檢查。

**Q: 匯入後資料不見了怎麼辦？**
A: 匯入會覆蓋現有資料。建議在匯入前先匯出備份。

---

## 使用場景

1. **開發調試**：直接查看和修改 localStorage 中的設定
2. **資料備份**：匯出設定到 JSON 檔案
3. **資料遷移**：從一個環境匯出，匯入到另一個環境
4. **批量修改**：一次修改多個供應商的設定
5. **疑難排解**：當 UI 操作有問題時，直接檢查原始資料
