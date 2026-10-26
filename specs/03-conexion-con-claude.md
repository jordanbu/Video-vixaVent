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
| Agente del editor con suscripción | Chat dentro del editor | Página "Anthropic · Claude Code" de Ajustes; usa el CLI de Claude Code ya logueado (`claude auth login`), con la cuenta de la carpeta `CLAUDE_CONFIG_DIR` con que se arrancó el editor | Funciona en local |
| Claude Code / Claude Desktop externo | Terminal o app de Claude | MCP Streamable HTTP en `http://localhost:5199/api/external-mcp/mcp` con token Bearer: `claude mcp add --scope user …` o botón **Conectar** en “Agentes externos (MCP)” | Funciona en local |
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
5. El CLI del chat recibe solo las variables de `CHILD_ENV_NAMES`
   (`server/claude-code/turn-runner.ts`). `CLAUDE_CONFIG_DIR` está en esa lista: para que el
   chat use otra cuenta, se arranca el editor con esa variable
   (`CLAUDE_CONFIG_DIR=$HOME/.claude npm run dev:isolated`). Sin ella, el CLI usa la
   configuración por defecto (`~/.claude.json`).
6. El botón **Conectar** de Claude escribe en `$CLAUDE_CONFIG_DIR/.claude.json` cuando el
   editor se arrancó con esa variable, y en `~/.claude.json` si no
   (`server/external-agent/client-connect.ts`). Así queda conectada la misma cuenta que
   usa el chat.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Usar el MCP y el agente integrado que ya existen | Escribir una integración nueva con la API de Claude | Ya cubren el caso, con borradores y aprobación incluidos |
| Quitar el `.mcp.json` del repo | Mantenerlo con `${VIXAVENTORA_MCP_TOKEN}` | Definía otro servidor `vixaventora` que, dentro del repo, tenía prioridad sobre el registro del usuario y fallaba sin la variable (403) |
| Registrar con `claude mcp add --scope user` | Solo el botón **Conectar** | Hasta el 2026-10-26 el botón escribía siempre `~/.claude.json`, y con varias cuentas (`CLAUDE_CONFIG_DIR`) Claude Code lee otra carpeta. Ya se corrigió (regla 6); el comando sigue sirviendo para conectar una cuenta distinta de la del editor |
| **Conectar** sigue la `CLAUDE_CONFIG_DIR` del editor | Escribir en todas las carpetas de cuentas que existan | El editor solo conoce la cuenta con la que se arrancó; tocar las demás cambiaría cuentas que el usuario no eligió |
| Pasar `CLAUDE_CONFIG_DIR` al CLI del chat | Iniciar sesión con la cuenta Egxone en la configuración por defecto | La configuración por defecto es de la cuenta Datec, que se queda sin cupo; cambiarla afectaría a todo lo que la usa fuera del editor. Con la variable, la cuenta se elige al arrancar el editor |
| Mantener la lista cerrada de variables y agregar solo esa | Pasar todo `process.env` al CLI | La lista evita que lleguen al CLI las API keys y demás variables del servidor |

## Verificación

Resultados del 2026-10-25, contra `npm run dev:isolated` en `localhost:5199`:

- Sin token → `403 {"error":"invalid request origin"}`.
- Con token: `initialize` → `200`, `serverInfo.name = vixaventora`, sesión creada.
- `tools/list` → 44 herramientas (`list_projects`, `begin_edit_session`, `review_edit_session`, …).
- `prompts/list` → 6 prompts con descripción en español.
- `tools/call list_projects` → devuelve el proyecto de ejemplo con su `editorUrl`.
- El selector de modelo del editor detecta Claude Code instalado y ofrece sus modelos (Claude Code · claude-sonnet-5-5, opus, haiku).
- `claude mcp add --scope user vixaventora …` → `claude mcp get vixaventora`: `✔ Connected`.
- Prueba real: `claude -p` en español pidió cambiar los tres textos del primer clip del proyecto; Claude usó `target_project` → `begin_edit_session` (auto) → edición → `review_edit_session`, y `get_edit_session` devolvió `applied` (1 de 1 operaciones). La captura del editor muestra los textos nuevos.
- Prueba desde el chat del editor con el modelo Claude Code: el pedido llegó al CLI, que respondió "You've hit your individual spend limit" (límite de gasto de la cuenta de trabajo). El camino funciona; falta cupo en esa cuenta.
- Cuenta del chat, CLI lanzado solo con las variables de la lista, como lo hace el editor:
  - sin `CLAUDE_CONFIG_DIR`, `claude auth status` da `jburgos@consultordatec.com.bo` (Datec Corp) y `claude -p` responde "You've hit your individual spend limit";
  - con `CLAUDE_CONFIG_DIR=$HOME/.claude`, da `jburgos@egxone.com` (Egxone) y `claude -p` responde `ok`.
- `claude-code-agent.verify.ts` → `ok`. Sin `CLAUDE_CONFIG_DIR` en la lista falla con
  "the editor forwards CLAUDE_CONFIG_DIR…". Ese archivo no compilaba desde `933f90b`, porque
  un comentario con comillas invertidas cerraba el `String.raw` del CLI falso; ya se corrigió.
- Botón **Conectar** (2026-10-26): `client-connect.verify.ts` → `✓ client-connect`. Cubre
  dos casos: con `claudeConfigDir` escribe `~/.claude-work/.claude.json`, y con una carpeta
  de inicio de prueba no usa la `CLAUDE_CONFIG_DIR` real. El `~/.claude/.claude.json` real
  mantuvo la misma fecha de modificación antes y después de la prueba.

## Pendiente

- **claude.ai en el navegador**: los conectores remotos de claude.ai necesitan una URL
  HTTPS pública. Depende del despliegue (spec 04). Además hay que confirmar qué
  autenticación aceptan hoy los conectores de claude.ai frente al Bearer token del editor.
