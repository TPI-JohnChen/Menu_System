

# 系統主要功能需求描述

我想設計一套 AI Platform 系統, 它的概念是一套單機的 AI Agent安裝在筆電或GB10上,
此 AI Agent 本身可以執行對話、skill、MCP、定時任務...etc
就像 Codex , claude cowork , claude design 之類的軟體, 
就算它本身可以執行 SubAgent , MultiAgent, 我仍然把它歸類為獨立的 Agent.
此類產品定位為個人、工作室或五人小隊可用的 `AI Agent 助手`，產品名稱為 OrientAI。

當企業持續發展時，可能會購買第二套 OrientAI，或是有不少成員自己訂閱 Claude 、OpenAI Codex 服務,
這時候企業內部的 AI Agent 就像以前的 API 一樣四處散落了, 於是產出了不少的 `影子 Agent`,
它們將成為資安的破口之一，於是我想發展一套管理工具, 用於納管這些散落在各角落的 Agent,
作法如: 建構一個 AI Gateway, 把所有的 Agent 收入機房, 想要經過傳統存取方式來取用 Agent 功能路徑已被我的 AI Gateway 封鎖了, 設計一個上架管理功能, 把納管的 Agent 上架, 使用者可以查看有哪些 Agent 在 marketplace 上, 他們可以申請使用, 而員工也可以自行生產 Agent 註冊到 marketplace, 申請上架, 所有的過程都由組織中的 IT 部門監管/審核, 確保 Agent 的安全性, 由於 skill 功能強大, 可以把 skill 上架到 markplace 上, 使用者可以申使此 skill + 平台中的 Agent, 於 Agent 依 skill 在機房中執行, 使得所有的 Agent 都可以有效得到企業級的治理, Agent 和 Agent 之也可以使用A2A協定來溝通(需要先申請), 或是上架自己的 MCP 供 Agent 來申請使用, 此 AI Gateway 在 client 與 Agent 之間或是 Agent 與 Agent 之間或是扮演協定轉換與 Authrization 的角色 .

```
Web App -----------> AI Gateway ----------------> Agent (+skill) (+MCP) (+py) (+各種harness)
Agent   -----------> AI Gateway ----------------> Agent (+skill) (+MCP) (+py) (+各種harness)
        [Auth]                   [協定/格式]轉換
		Gateway 核發             納管的 Agent 可接受方式
		ex:                      ex:
		OAuth2.0                 API-key
		X-API-key                API-key
        X-API-key                無保護 (ex:Ollama / LM Studio)
```

上述這個 AI Gateway 的產品名稱為 OrientAI_Manager。

---

# 應用情境

套用上述的作法在企業應用情境如下:

(1) 1人/三人小隊
OrientAI 

---

(2) 5人 / 工作室
OrientAI * 2
OpenAI codex * 5
claude code * 3
Ollama * 1

---

(3) 公司行號或是 AI Agent 太多的組織
OrientAI_Manager  --------> OrientAI * 2
                   [管理]	OpenAI codex * 5
							claude code * 3
							Ollama * 1
					
AI Platform 系統 = OrientAI + OrientAI_Manager
支援由小到大的各種商模與治理

---

依此需求描述，請你設計一個 $CONTEXT_ROOT/PROGRESS/Menu.md 檔案,

例如:

- Agent App
	|
	- Agent Server 管理 : 具有功能 xxx、yyyy、zzz ...你自己寫
	- App名稱1 : 某功能CRUD
	- App名稱1 : 某特定流程




