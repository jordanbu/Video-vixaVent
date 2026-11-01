# 07 — Proyecto abierto en varias pestañas

> Estado: implementado · Última actualización: 2026-10-26

## Problema

Con el mismo proyecto abierto en dos pestañas (o dos navegadores), cada pestaña le quitaba
el proyecto a la otra cada ~1,5 s, sin fin. En el store se veía `ownerId` alternando entre
dos editores y `epoch` pasando de 11.000. Cada cambio de dueño deja vencidas las sesiones
MCP externas ("MCP session binding … is stale"): los cambios del agente nunca llegaban y el
usuario no veía nada. Cerrar una pestaña lo cortaba en el acto.

La causa: `claimBrowserProjectOwnership` deja que cualquier otro editor del navegador tome
el proyecto (epoch + 1), y el bucle de reconexión de la pestaña desplazada
(`runBridge` en `useExternalAgentBridge.ts`) se vuelve a registrar al segundo. El 409 se
tragaba en silencio, así que los avisos que ya existían ("Este proyecto está abierto en
otro editor…") nunca se mostraban.

## Modelo

- **Fila de dueño** (sin cambios de formato): `project-edit-ownership:<projectId>` en el
  store, con `ownerKind`, `ownerId` (id del editor), `epoch`, `leaseExpiresAt`,
  `updatedAt`. La escriben `server/external-agent/project-edit-ownership.ts` y su codec.
- **Intención del registro** (nueva). `POST /api/external-agent/register` acepta, además de
  lo de siempre:
  - `heldEpoch`: el último epoch que **este mismo id de editor** tuvo. Lo manda una pestaña
    que ya fue dueña; una pestaña nueva o recargada (id nuevo) no lo manda.
  - `takeover: true`: el usuario pidió usar el proyecto en esta pestaña (botón).
- **Resultado `displaced`** (nuevo) de `claimBrowserProjectOwnership`: la pestaña ya fue
  dueña y otro editor del navegador la reemplazó después. La ruta responde
  `409 { displaced: true }`, y agrega `reloadRequired: true` si el dueño ya cambió el
  proyecto (el `baseRevision` de la fila, que avanza con cada guardado del dueño, no es la
  revisión de esta pestaña). No lee el proyecto ni escribe nada: ni epoch nuevo ni cambio
  en el registro.
- **Cliente**:
  - `src/agent/external-bridge-registration.ts` manda la intención y lee el motivo del 409
    (`displaced`, `reloadRequired`) en `EditorBridgeRequestError.refusal`.
  - `src/agent/external-bridge-ownership.ts` (`BridgeOwnershipState`) recuerda el epoch,
    el pedido del botón y el aviso, y decide cuánto esperar entre intentos.
  - `useExternalAgentBridge.ts` expone `ownershipNotice` y `takeOwnership()`.
  - `src/components/chat/ProjectElsewhereNotice.tsx` muestra el aviso arriba al centro,
    con el panel de chat abierto o cerrado.

Flujo con dos pestañas, A (vieja) y B (nueva):

1. B se registra sin `heldEpoch` → toma el proyecto (epoch + 1). Gana la más reciente.
2. El long-poll de A recibe 409 en menos de un segundo, A se vuelve a registrar con
   `heldEpoch` → `displaced`. A deja de reclamar y muestra:
   "Este proyecto está abierto en otra pestaña. Los cambios del agente se aplican allí."
   con el botón "Usar en esta pestaña".
3. A sigue preguntando cada 3 s, sin quitarle nada a nadie: si B se fue (lease vencido o
   liberado hace más de 15 s), A retoma sola y el aviso desaparece.
4. Clic en el botón → registro con `takeover: true` → A toma el proyecto y ahora B muestra
   el aviso.
5. Si el documento de A quedó viejo (B guardó cambios, por ejemplo una edición del agente),
   el botón ya no sirve: el siguiente chequeo trae `displaced` + `reloadRequired` y A pasa a
   "El proyecto cambió en otra pestaña. Recarga esta página para seguir aquí." con el botón
   "Recargar". Recargar es un id nuevo, así que toma el proyecto con el documento al día.

## Reglas

1. Un registro sin `heldEpoch` (pestaña nueva o recargada) toma el proyecto de otro editor
   del navegador aunque su lease siga vivo, como antes. Cubre el caso de una pestaña que
   se colgó.
2. Un registro con `heldEpoch`, sin `takeover`, recibe `displaced` cuando el dueño actual es
   **otro** editor del navegador con un epoch mayor y ese dueño está vivo: lease vigente, o
   liberado/vencido hace menos de 15 s (`BROWSER_HANDOFF_GRACE_MS`). `displaced` no escribe
   nada en el store.
3. `takeover: true` toma el proyecto si la revisión coincide, igual que una pestaña nueva.
4. El mismo id de editor nunca está desplazado de sí mismo: la reconexión con el mismo id
   (con o sin capability) sigue recuperando su propio dueño.
5. El cerco contra escritores offline (MCP sin navegador) no cambia: con un dueño offline
   vivo, el navegador recibe `blocked` como antes.
6. El chequeo de `displaced` va antes que el de revisión: mientras el otro editor esté vivo,
   la pestaña desplazada ve "abierto en otra pestaña" aunque su documento ya esté viejo.
7. Un `stale` solo se muestra como "recarga" si la pestaña ya estaba desplazada o el usuario
   acaba de pedir el proyecto. En uso normal sigue siendo un reintento silencioso (un
   guardado propio en curso también da `stale` por un momento).
8. Una pestaña desplazada con el documento viejo muestra "recarga", nunca "Usar en esta
   pestaña"; una vez en "recarga" no vuelve al otro aviso.
9. La señal es del servidor, así que funciona entre navegadores distintos.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| El cliente manda `heldEpoch` y el servidor compara con la fila | Guardar en la fila una lista de ids desplazados | Con tres o más pestañas una lista acotada se llena y vuelve el ping-pong; el epoch que tuvo cada pestaña alcanza y no cambia el formato de la fila |
| Gana la pestaña más reciente (sin `heldEpoch`) | Bloquear a la nueva mientras la vieja siga viva | Una recarga crea un id nuevo y tiene que poder tomar el proyecto, incluso de una pestaña colgada cuyo lease no venció |
| La pestaña desplazada pregunta cada 3 s y retoma si el otro editor se fue hace más de 15 s | No retomar nunca sin clic | El caso más común es cerrar la pestaña duplicada; sin retomar, la que queda mostraría "abierta en otra pestaña" sin que exista. Los 15 s evitan robarle el proyecto a una pestaña que solo se está reconectando (tarda ~1 s) |
| Señal del servidor (`409 displaced`) | `BroadcastChannel` entre pestañas | `BroadcastChannel` no cruza navegadores. La pestaña desplazada ya se entera en menos de un segundo por su long-poll, así que tampoco se agregó como extra |
| Aviso fijo arriba al centro, sin cerrar | Mostrarlo dentro de la lista de mensajes del chat, como los errores del puente | Con el chat cerrado o con mucho historial no se vería, y el usuario que trabaja desde Claude Code tiene que enterarse de que los cambios no llegan a esta pestaña |
| Textos nuevos para el aviso | Reusar "工程已在其他窗口编辑或版本已变化，请关闭其他窗口后手动刷新页面。" | Ese texto pide cerrar la otra ventana y recargar "a mano"; ahora no hace falta cerrar nada y el botón hace la acción |
| Si el documento quedó viejo, pedir recargar con un botón | Recargar solo al tocar "Usar en esta pestaña" | El editor evita navegar por su cuenta (el aviso de `beforeunload` con un guardado pendiente); que el usuario apriete "Recargar" deja la decisión de su lado |
| **Cambio al implementar:** el 409 `displaced` dice si la pestaña quedó vieja (`reloadRequired`, comparando con el `baseRevision` de la fila) | Que el clic en "Usar en esta pestaña" lo descubra con un `stale` | En la prueba e2e, después de una edición del agente el botón llevaba a "recarga" y a los 3 s el chequeo volvía a mostrar el botón. La fila ya trae la revisión del dueño, así que no hace falta leer el proyecto en cada chequeo |

## Verificación

Resultados del 2026-10-26, con Node 24.22.1:

- `tsx server/external-agent/project-edit-ownership.verify.ts` (en `verify:mcp`) →
  `ok (pre-fix: 20 owner flips and 20 epochs in 10 rounds; fixed: 0 flips, epoch held at
  24 over 30 rounds)`. Usa la ruta `/register` real, el store SQLite real y el registro del
  broker, con cada pestaña corriendo `BridgeOwnershipState`. Cubre: el cliente viejo (sin
  `heldEpoch`) cambia de dueño en cada reintento; con el arreglo, 30 rondas de dos pestañas
  sin cambios de dueño ni de epoch; `displaced` es distinto de `stale` y no escribe la
  fila; la toma explícita mueve el proyecto una sola vez y la otra pestaña queda con el
  aviso; reconexión con el mismo id (lease vivo y liberado) no es desplazamiento; un dueño
  recién liberado sigue presente (gracia); una pestaña recargada (id nuevo) toma el
  proyecto de una con lease vivo; la desplazada retoma sola cuando el otro se fue (liberado
  hace más de 15 s o lease vencido); toma con documento viejo → "recarga" y no vuelve al
  botón; `displaced` + `reloadRequired` cuando el dueño ya guardó; un `stale` normal queda
  en silencio; un escritor offline vivo sigue bloqueando al navegador.
- `tsx src/agent/external-bridge-ownership.verify.ts` (en `verify:mcp`) → `ok`. Intención
  enviada, avisos, espera de 1 s / 3 s, el clic corta la espera, un clic durante un intento
  no se pierde, y lectura del cuerpo del 409.
- `tsx server/plugins/external-agent.verify.ts` → `external-agent loopback trust
  verification passed` (agregado: 409 `{ displaced: true }`, `heldEpoch`/`takeover` llegan
  al claim, intenciones inválidas se rechazan). `offline-project-store.verify.ts`,
  `mcp-recovery-race.verify.ts`, `broker.verify.ts`, `mcp.verify.ts`,
  `external-bridge-attempt-error.verify.ts` → OK.
- `npm run lint` → sin errores. `npx tsc -b` → OK. `npx vite build --config
  config/vite.config.ts` → `✓ built`. `npm test` → `pretest` completo OK (incluye
  `verify:mcp` con los dos verify nuevos) y `✗ 1/197 segments FAILED`: solo
  `server/plugins/sound-sonilo-job.verify.ts`, que necesita ffmpeg del sistema y ya fallaba
  antes. `npm run posttest` aparte → OK. `node scripts/check-i18n.mjs` → `2546 个英文词条，
  3967 个西班牙语词条`.
- E2E con un servidor aislado en `:5399` (perfil y carpeta de datos propios) y Playwright:
  pestañas A y B en el mismo Chromium, C en Google Chrome aparte.
  - B abre el proyecto → A muestra "Este proyecto está abierto en otra pestaña…";
    20 s de muestreo: dueño `[B]`, epoch `[2]`.
  - Clic en "Usar en esta pestaña" en A → dueño A, B con el aviso; 15 s: epoch `[3]`.
  - Un cliente MCP con las dos pestañas abiertas: `target_project` → `bindingMode browser`,
    10 s después `begin_edit_session` → `set_aspect_ratio 9:16` → `review_edit_session`
    `status: applied`; el lienzo guardado pasó de 1920×1080 a 1080×1920. B pasó solo a
    "El proyecto cambió en otra pestaña…" con "Recargar".
  - C (otro navegador) abre el proyecto → dueño C (epoch 4), A "displaced", B "recarga".
  - Se cierra C → A retoma sola pasada la gracia (epoch 5); B sigue en "recarga".
  - "Recargar" en B → id nuevo, dueño B (epoch 6), A con el aviso; 12 s sin cambios.
  - Cada aumento de epoch corresponde a una acción (abrir, clic, otro navegador, cerrar,
    recargar). Respuestas de `/register`: A 3 OK / 25 `displaced`, B 1 OK / 28 `displaced`.

## Pendiente

- Si la pestaña desplazada editó algo mientras no era dueña, su documento ya no coincide
  con el store y tomar el proyecto pide recargar: esos cambios locales se pierden (el
  navegador avisa con `beforeunload` si hay un guardado pendiente).
- Después de dormir la computadora vencen los leases de las dos pestañas; la que se
  reconecte primero se queda con el proyecto, que puede ser la más vieja. La otra muestra
  el aviso con el botón; no hay ping-pong, pero el ganador no es siempre la más reciente.
- Fuera de este caso, un `stale` que no se resuelve (por ejemplo, un MCP offline guardó
  mientras la pestaña dormía) sigue reintentando en silencio. Mostrar "recarga" tras varios
  `stale` seguidos queda para otro cambio.
