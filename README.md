# Vixaventora

Editor de video con IA para uso interno. Combina un timeline multipista real con un
agente conversacional: le pides los cambios por chat y quedan como clips, cortes,
transiciones, subtítulos y efectos editables en el proyecto. Puedes seguir editando a mano,
deshacer, guardar versiones o pasarle el proyecto a otro agente.

- **Agente integrado y externo**: el agente del editor y los agentes externos por MCP
  (Claude Code, Claude Desktop, Codex) usan las mismas herramientas de edición.
- **Timeline real**: varias pistas de video y audio, transiciones, efectos, LUTs, zooms
  y keyframes.
- **Edición por transcripción**: transcripción palabra por palabra, cortes por texto,
  manejo de pausas, hablantes y subtítulos vinculados.
- **Generación de media**: imágenes, video, voz, música, efectos de sonido y búsqueda
  de stock (cada proveedor se activa con su API key).
- **Motion graphics y WebGL**: plantillas animadas editables, shaders, efectos y
  transiciones.
- **Exportación**: MP4, audio, subtítulos (SRT), FCPXML y borrador de CapCut/JianYing.
- **Local primero**: los proyectos y la media quedan en la máquina; las API keys viven
  solo en el servidor.

## Requisitos

- Node.js 24.x y npm (`.nvmrc` ya apunta a la versión correcta).
- FFmpeg viene incluido como dependencia; no hace falta instalarlo aparte.
- En macOS, `cmake` (`brew install cmake`): `npm run dev` compila whisper.cpp la primera vez
  para la transcripción local del escritorio. Sin `cmake` puedes usar `npm run dev:isolated`,
  que salta ese paso.

## Correrlo en local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre <http://localhost:5199>.

El editor necesita un *secure context*: ábrelo en `http://localhost` o `http://127.0.0.1`
en la misma máquina, o sírvelo por HTTPS. Desde otra máquina por HTTP plano el navegador
desactiva Web Crypto, WebCodecs y el portapapeles, y el editor no abre.

En `.env.local` agrega solo las credenciales de los servicios que vayas a usar. Las
funciones sin credencial lo avisan y el resto del editor sigue funcionando.

Cada checkout guarda sus proyectos, media, credenciales y ajustes en su propio perfil
dentro de `~/.vixaventora/dev-profiles/`. `npm run dev:shared` usa el almacén compartido.

### App de escritorio

```bash
npm run desktop:dev
```

La app de escritorio usa Electron con los mismos servicios embebidos que la versión web.
Los instaladores se generan con `npm run desktop:dist` (macOS arm64),
`desktop:dist:mac-x64`, `desktop:dist:win` y `desktop:dist:linux`.

## Conectarlo con Claude

### Agente dentro del editor

En **Ajustes → Modelo del agente** elige Anthropic, guarda la API key y el modelo, y
escribe en el chat del editor. El agente corre en el servidor local y aplica los cambios
con comandos validados que se pueden deshacer.

Sin API key también sirve la suscripción de Claude: instala Claude Code, inicia sesión en
la terminal con `claude auth login` y elige la página **Anthropic · Claude Code** en
**Ajustes → Modelo del agente**. Las credenciales las maneja Claude Code; el editor nunca
las lee.

### Claude Code (MCP)

El editor expone un endpoint MCP (Streamable HTTP):

```text
http://localhost:5199/api/external-mcp/mcp
```

El endpoint siempre pide un token. El editor lo genera la primera vez que arranca y lo
guarda en `~/.vixaventora/mcp-token`; no cambia entre reinicios.

La forma más simple de conectar Claude Code: en el editor abre **Agentes externos (MCP)**
(el ícono de enchufe arriba a la derecha) y haz clic en **Conectar** junto a Claude Code.
Eso registra el servidor con su token en `~/.claude.json`; reinicia Claude Code después.

Si usas varias cuentas de Claude (`CLAUDE_CONFIG_DIR`), ese archivo no es el que lee tu
Claude Code: regístralo desde la terminal con el token que muestra el mismo panel, y queda
disponible en todas tus carpetas:

```bash
claude mcp add --transport http --scope user vixaventora http://localhost:5199/api/external-mcp/mcp \
  --header "Authorization: Bearer <token>"
```

Comprueba la conexión con `claude mcp get vixaventora` (debe decir `✔ Connected`).

Con el editor abierto, pídele el trabajo en lenguaje natural:

```text
Abre una sesión de edición de Vixaventora. Lee el borrador, agrega un efecto de sonido
de rayón a los 8 segundos en la segunda pista de audio y una transición glitch entre los
dos clips de video. Envía el borrador a revisión y espera a que lo apruebe en el editor.
```

Cómo funciona una sesión:

1. `begin_edit_session` devuelve un `editSessionId`. `approvalMode` puede ser `manual`
   (por defecto) o `auto`.
2. Todas las lecturas y ediciones usan ese id y se aplican sobre un borrador aislado.
3. `review_edit_session` envía el borrador. En modo `manual` lo apruebas o rechazas
   dentro del editor; en `auto` se aplica directo.
4. El cliente puede consultar `get_edit_session` hasta ver `applied`, `rejected` o
   `discarded`.

Los cambios aprobados entran como un solo paso de deshacer. En estas sesiones no se
exponen herramientas con efectos inmediatos (generación, exportación, borrar proyectos),
porque un rechazo no podría revertirlas.

Para instalar la skill de agente que guía a Claude Code y Codex:

```bash
npx skills add ./skills/vixaventora
```

### Proteger el acceso MCP

Si publicas el endpoint MCP fuera de la máquina, configura:

```bash
VIXAVENTORA_MCP_TOKEN=un-token-largo
VIXAVENTORA_EDITOR_URL=https://editor.tu-dominio.com
```

Los clientes deben enviar `Authorization: Bearer <token>`. El servidor está pensado para
un solo usuario o equipo por instancia, no como servicio multiusuario.

## Configuración opcional

| Variable | Para qué |
|---|---|
| `VIXAVENTORA_RELEASE_REPOSITORY` | `owner/repo` de GitHub cuyos releases alimentan las actualizaciones. Sin ella, la app nunca busca actualizaciones. |
| `VITE_RESOURCE_REGISTRY_URL` | Catálogo en línea de extensiones. Sin ella, la pestaña Descubrir no consulta ningún servidor. |
| `AGENT_IMPORT_ROOTS` | Carpetas que el agente puede explorar e importar (separadas por coma). |
| `MEDIA_DIR` | Carpeta donde se guarda la media importada. |
| `VIXAVENTORA_RENDER_CONCURRENCY`, `VIXAVENTORA_MAX_ACTIVE_EXPORTS` | Paralelismo del render y exportaciones simultáneas. |

El resto de las variables (proveedores de IA, generación y stock) están documentadas en
[`.env.example`](.env.example). Guías aparte: [Fal.ai](FAL.md) y
[ajuste de render en macOS](MACOS-RENDER-TUNING.md).

## Arquitectura

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite 8 |
| Núcleo de edición | Estado de timeline inmutable, capa de comandos y propuestas |
| Agente | Vercel AI SDK (Anthropic, OpenAI, Gemini y otros), Agent Skills, MCP SDK |
| Preview y visuales | Remotion Player, WebGL / GLSL |
| Servidor | Plugins de Vite que también monta Electron en un servidor HTTP embebido |
| Persistencia | Almacén local en `~/.vixaventora` (SQLite + archivos), caché IndexedDB, Cloudflare R2 opcional |
| Escritorio | Electron |
| Exportación | Remotion, FFmpeg, FCPXML, SRT |

| Carpeta | Qué contiene |
|---|---|
| `src/editor/` | Estado y comandos del timeline, independientes de la UI y de los LLM |
| `src/agent/` | Agente, herramientas, skills, progreso y ajustes |
| `src/library/` | Biblioteca de motion graphics, efectos de sonido, transiciones, efectos y LUTs |
| `src/transcript/` | Transcripción y edición por palabras |
| `src/captions/` | Modelos, estilos y capa de preview de subtítulos |
| `src/gl/` | Efectos, transiciones y runtime de shaders WebGL |
| `src/generate/` | Clientes de generación de imagen, video, voz, música y sonido |
| `src/persist/` | Persistencia de proyectos, chat, versiones y media |
| `server/plugins/` | Servicios de generación, transcripción, media, exportación y almacenamiento |
| `desktop/` | Proceso principal de Electron y servicios embebidos |
| `remotion/` | Render y exportación sin interfaz |
| `cli/` | CLI `vixa` para operar proyectos desde la terminal |
| `specs/` | Specs de cada tema (ver [`CLAUDE.md`](CLAUDE.md)) |

## Desarrollo y verificación

```bash
npm run lint      # análisis estático (oxlint)
npm test          # verificaciones de regresión
npm run build     # chequeo de tipos y build de producción
```

Después de tocar el agente, el timeline, el preview o la exportación, corre al menos
`npx tsc -b --force`, `npm test` y `npm run build`.

## Licencia

Ver [`LICENSE`](LICENSE). Es software de uso interno: antes de entregar el código o los
instaladores a alguien fuera de la empresa, revisa [`specs/01-marca-y-licencia.md`](specs/01-marca-y-licencia.md).
