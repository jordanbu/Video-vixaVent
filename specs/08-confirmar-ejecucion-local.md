# 08 — Confirmar antes de ejecutar código en el equipo

> Estado: implementado · Última actualización: 2026-11-01

## Problema

El agente del editor podía ejecutar código en la máquina del usuario sin preguntar:

- `run_skill_script` corre un binario de la whitelist (`bash`, `node`, `python`, `npm`,
  `npx`, `uv`, `uvx`, `cp`, `chmod`, `mkdir`, `ffmpeg`…) dentro de
  `~/.vixaventora/skills/<slug>/`.
- `install_skill` baja cualquier repo de GitHub a ese directorio.
- `manage_skill` (create/update) escribe un `SKILL.md` con texto que redacta el agente y lo
  copia al mismo directorio.

La guarda de intérpretes (`interpreterGuardError`) bloquea `bash -c` o `node -e`, pero no
alcanza: `bash SKILL.md` ejecuta como script un archivo que escribió el agente, `npx -y
<paquete>` baja y corre código y `cp`/`chmod` aceptaban rutas fuera del directorio. Una
inyección de prompt (una página de `web_search`, una skill instalada) bastaba para correr
comandos sin que el usuario se enterara.

Los agentes externos por MCP ya pedían una aprobación de un solo uso para estas
herramientas (`external-bridge-runtime.ts` → `runRealTool`). El agente interno no.

## Modelo

- `src/agent/local-execution-consent.ts`
  - `LOCAL_EXECUTION_TOOLS = { run_skill_script, install_skill }`.
  - `localExecutionPrompt(name, args)` arma el texto del aviso (skill + comando, o repo).
  - `confirmLocalExecution(name, args)` pregunta con `window.confirm` (el mismo patrón que
    ya usan borrar pista o revertir cambios). Sin ventana, o si el diálogo falla, la
    respuesta es **no**.
  - `setLocalExecutionConfirmer()` es la costura para los verify.
- `src/agent/codex/runtime.ts` → `executeVixaventoraTool`, el camino de todas las
  llamadas del agente interno (AI SDK y server-run): después de validar y registrar el
  pedido y **antes** de `recordToolStarted`, pide la confirmación. Si el usuario dice que no,
  la llamada termina con resultado `denied` / `user_declined` y nada se ejecuta.
- `server/plugins/skill-exec.ts` → `pathArgsGuardError`: `cp`, `mkdir` y `chmod` solo
  aceptan rutas dentro del directorio de la skill (también el valor de `--opción=valor`).

## Reglas

1. El agente interno no ejecuta `run_skill_script` ni `install_skill` sin un "Aceptar"
   del usuario en esa llamada. Vale también en modo de aplicación automática: ese modo
   aplica ediciones al timeline, no autoriza código local.
2. Sin interfaz para preguntar, la respuesta es no.
3. Una negativa no deja nada a medio hacer: el resultado es `denied` y no hay
   `recordToolStarted`.
4. Los agentes externos siguen con su tarjeta de aprobación; no se les pregunta dos veces.
5. `cp`, `mkdir` y `chmod` nunca reciben una ruta fuera de `~/.vixaventora/skills/<slug>/`.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Pedir confirmación al agente interno | Solo achicar la whitelist | El agente puede escribir `SKILL.md` y correrlo con `bash`; ninguna whitelist de binarios lo contiene. El límite real es que el usuario vea el comando |
| `window.confirm` | Tarjeta de aprobación dentro del chat | La app ya usa `window.confirm` para acciones peligrosas; una tarjeta en el chat implica tocar el protocolo de corridas del servidor. Queda pendiente |
| Revertir "no approval gate" del código original (`harness-runtime.verify.ts` lo afirmaba) | Mantenerlo | Era una decisión de comodidad; ejecutar código local por una inyección de prompt pesa más |
| Confirmar también en modo automático | Saltar la confirmación en ese modo | El modo automático es para propuestas del timeline; nadie lo activa pensando en scripts |
| Dejar `npm`/`npx`/`uv`/`uvx` en la whitelist | Quitarlos | Hay skills que los necesitan (por ejemplo `npx remotion`); con la confirmación el usuario ve el comando antes |

## Verificación

Resultados del 2026-11-01, con Node 24.22.1:

- `tsx src/agent/local-execution-consent.verify.ts` → `prompts in es/en, refuses without a
  UI or a clear yes`: sin ventana responde no, una excepción del diálogo es no, el aviso
  muestra «skill» y comando sin chino y corta comandos largos.
- `tsx src/agent/harness-runtime.verify.ts` → con "Aceptar", `install_skill` registra
  `requested, started, outcome:success` y corre una vez; con "Cancelar", registra
  `requested, outcome:denied`, nunca `started`, y no corre; sin interfaz tampoco corre.
- `tsx server/plugins/read-path-auth.verify.ts` → `skill-exec path guard: OK` (`cp` a
  `~/.zshrc`, `cp -t /etc`, `--target-directory=/etc`, `chmod 777 /etc/hosts`,
  `chmod -x ../otra-skill/…` y `mkdir -p /tmp/…` rechazados; `cp -r assets out/`,
  `chmod +x scripts/render.sh`, `chmod 755 run.sh` y `mkdir -p out/frames` permitidos).
- `npm run verify:harness`, `verify:approval-policy`, `verify:agent-tools`, `verify:mcp` y
  `verify:i18n` → OK.
- `npm run lint` → 0 errores. `npm test` → 196/197 (falla `sound-sonilo-job.verify.ts`,
  ffmpeg del sistema, ya fallaba). `npm run posttest`, `npx tsc -b` y `vite build` → OK.
- No probado en la app real: hace falta levantarla con un proveedor de IA y pedirle al
  agente que corra una skill.

## Pendiente

- Reemplazar `window.confirm` por una tarjeta en el chat, con "permitir siempre para esta
  skill" en la sesión. Hoy cada llamada pregunta.
- `npx -y` y `uvx` siguen pudiendo bajar paquetes; el usuario los ve en el aviso.
- `manage_skill` sigue escribiendo `SKILL.md` sin preguntar: no ejecuta nada por sí solo,
  y correrlo pasa por `run_skill_script`.
