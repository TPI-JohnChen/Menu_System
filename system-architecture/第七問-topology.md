# 系統 Data Flow

```
Web App -----------> AI Gateway ----------------> opencode serve1 / opencode serve2 /....
Web App -----------> AI Gateway ----------------> Java SpringBoot API
Web App -----------> AI Gateway ----------------> Agent (+skill) (+MCP) (+py) (+各種harness)
Agent   -----------> AI Gateway ----------------> Agent (+skill) (+MCP) (+py) (+各種harness)
        [Auth]                   [協定/格式]轉換
		Gateway 核發             納管的 Agent 可接受方式
		ex:                      ex:
		OAuth2.0                 API-key
		X-API-key                API-key
        X-API-key                無保護 (ex:Ollama / LM Studio)
```
