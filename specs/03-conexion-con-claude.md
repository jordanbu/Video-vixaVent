# 03 — Conexión con Claude

> Estado: implementado en local · Última actualización: 2026-10-25

## Problema

El equipo quiere escribirle a Claude y que los videos se editen solos en Vixaventora.

## Modelo

Hay tres caminos, y los tres terminan en las mismas herramientas y comandos de
`EditorCore` (deshacer, versiones y validación funcionan igual):

| Camino | Dónde escribe el usuario | Cómo se conecta | Estado |
|---|---|---|---|
| Agente del editor con API key | Chat dentro del editor | Ajustes → Modelo del agente → Anthropic (API key) | Funciona en local |
| Agente del editor con suscripción | Chat dentro del editor | Página "Anthropic · Claude Code" de Ajustes; usa el CLI de Claude Code ya logueado (`claude auth login`) | Funciona en local |
| Claude Code / Claude Desktop externo | Terminal o app de Claude | MCP Streamable HTTP en `http://localhost:5199/api/external-mcp/mcp` con token Bearer (botón **Conectar** en “Agentes externos (MCP)”, o `.mcp.json` + `VIXAVENTORA_MCP_TOKEN`) | Funciona en local |
| claude.ai (web) | claude.ai | Conector remoto MCP | Pendiente: necesita el editor publicado por HTTPS |

Archivos clave: `server/external-agent/` (servidor MCP y sesiones de edición),
`server/plugins/claude-code-agent.ts` y `server/claude-code/` (agente con suscripción),
`skills/vixaventora/` (skill que guía a los agentes externos).

## Reglas

1. Los agentes externos editan en un borrador aislado (`begin_edit_session` →
   `review_edit_session`). En modo `manual` el cambio se aprueba en el editor.
2. En sesiones externas no se exponen herramientas con efectos que un rechazo no pueda
   revertir (generación, exportación, borrar proyectos).
3. El endpoint MCP siempre exige `Authorization: Bearer <token>`. El token se genera una vez y queda en `~/.vixaventora/mcp-token`; `VIXAVENTORA_MCP_TOKEN` lo reemplaza.
4. Los prompts MCP (`server/external-agent/mcp-prompts.ts`) están en español.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Usar el MCP y el agente integrado que ya existen | Escribir una integración nueva con la API de Claude | Ya cubren el caso, con borradores y aprobación incluidos |

## Verificación

Resultados del 2026-10-25, contra `npm run dev:isolated` en `localhost:5199`:

- Sin token → `403 {"error":"invalid request origin"}` (el `.mcp.json` original no traía token; se corrigió).
- Con token: `initialize` → `200`, `serverInfo.name = vixaventora`, sesión creada.
- `tools/list` → 44 herramientas (`list_projects`, `begin_edit_session`, `review_edit_session`, …).
- `prompts/list` → 6 prompts con descripción en español.
- `tools/call list_projects` → devuelve el proyecto de ejemplo con su `editorUrl`.
- El selector de modelo del editor detecta Claude Code instalado y ofrece sus modelos (Claude Code · claude-sonnet-5-5, opus, haiku).

## Pendiente

- **claude.ai en el navegador**: los conectores remotos de claude.ai necesitan una URL
  HTTPS pública. Depende del despliegue (spec 04). Además hay que confirmar qué
  autenticación aceptan hoy los conectores de claude.ai frente al Bearer token del editor.
