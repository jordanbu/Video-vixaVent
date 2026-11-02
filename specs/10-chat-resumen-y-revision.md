# 10 — El chat del editor hace el trabajo completo, lo resume y lo revisa

> Estado: implementado (partes A, B y C) · Última actualización: 2026-11-01

## Problema

El 2026-11-01 armamos el comercial de Vixaventora (75 s, 7 escenas) desde un agente externo
por MCP. El chat que está al lado del editor no podía hacer lo mismo ni contar lo que hizo:

1. **Al mejorar un gráfico animado, la línea de tiempo no cambiaba.** `edit_asset` reescribe el
   código del recurso, pero cada clip colocado guarda su propia copia de `code`
   (`pool.updateAsset` en `reducerProject.ts` no la toca). El usuario dijo "veo exactamente lo
   mismo"; hubo que borrar y volver a colocar los 7 clips, y con eso se perdieron las
   transiciones, que hubo que volver a poner.
2. **Sin una clave de voz no hay narración.** `submit_voice` solo acepta proveedores en la
   nube y todos fallan sin clave (`server/plugins/voice-providers.ts`). La narración se hizo
   a mano con `say` de macOS, midiendo cada frase para que entrara en su escena.
3. **Al terminar un pedido, el chat muestra el texto del modelo y una fila por herramienta.**
   No dice qué cambió en el proyecto: clips, transiciones, recursos, volúmenes ni
   exportaciones. El registro de cambios (`AgentChangeLogMenu`) existe, pero está escondido
   en un menú y lista operaciones, no un resumen.
4. **Ningún aviso de calidad llega al chat.** `qualityIssues` de `read_timeline` lo ve solo el
   modelo. Varios problemas reales del comercial no se detectan en ningún lado: clips con
   código viejo, música que entra y sale de golpe, cortes secos entre escenas gráficas.

## Modelo

### Parte A — `edit_asset` actualiza los clips colocados

- `pool.updateAsset` con `code` en el parche copia el código nuevo a los clips de gráfico
  animado que usan ese recurso, en todas las secuencias. Usa `mapTimelineAssetItems`
  (`src/editor/mediaAssetUsage.ts`), el mismo camino que ya usa el renombrado.
- Solo cambia `code`: los `props` de cada clip (textos, colores) se conservan, igual que su
  posición, duración, transiciones y efectos.
- `edit_asset` devuelve `updatedClips: n` para que el modelo sepa a cuántos clips llegó.

### Parte B — Tarjeta "Lo que hice" y "Revisión"

`src/agent/runSummary.ts`, puro:

```ts
summarizeProjectChange(before: ProjectDoc, after: ProjectDoc): RunChangeSummary
// por clip, comparando ids en la secuencia activa:
//   added / removed / changed (con el tipo y el nombre)
//   transiciones agregadas / quitadas, pistas nuevas
//   recursos nuevos en el pool (por tipo) y recursos con código cambiado
//   volúmenes cambiados (de → a), duración de la secuencia (de → a)

reviewTimeline(doc: ProjectDoc): ReviewIssue[]
interface ReviewIssue {
  code: 'upscaled_clip' | 'stale_motion_graphic' | 'black_gap' | 'audio_past_picture'
      | 'hard_cut_between_graphics' | 'music_without_fade';
  level: 'alert' | 'warning' | 'suggestion';
  itemIds: string[];
  // datos para el texto: porcentaje, segundos, cantidad…
  fixPrompt: string;   // pedido que se le manda al agente con "Arreglar"
}
```

| Código | Nivel | Cuándo |
|---|---|---|
| `upscaled_clip` | `alert` o `warning` | Lo que ya devuelve `assessTimelineQuality` (specs/05) |
| `stale_motion_graphic` | `warning` | Un clip de gráfico animado tiene un `code` distinto del de su recurso |
| `black_gap` | `alert` | Hay un tramo de ≥ 0,5 s sin ningún clip visual en pistas visibles, entre el cuadro 0 y el final de la secuencia |
| `audio_past_picture` | `warning` | El audio sigue ≥ 0,5 s después del último cuadro con imagen |
| `hard_cut_between_graphics` | `suggestion` | Dos clips gráficos (gráfico animado, imagen, texto, sólido) se tocan en la misma pista sin transición |
| `music_without_fade` | `suggestion` | Música de ≥ 5 s (un tema de la biblioteca, o un clip en una pista con rol `follower`) que empieza en el cuadro 0 sin fundido de entrada, o termina en el final de la secuencia sin fundido de salida |

**Dónde se ve.** Al terminar una ejecución que cambió el proyecto, el chat agrega un mensaje
nuevo con `role: 'summary'` y los datos en `DisplayMessage.summary`
(`{ changes, issues, exports }`), que `ChatMessage` dibuja como `RunSummaryCard`:

- **Lo que hice:** una línea por grupo ("Agregó 7 clips de gráfico animado", "Agregó 6
  transiciones", "Bajó el volumen de 4 clips de audio: 100 % → 35 %", "Exportó
  Vixaventora-comercial.mp4"). Los clips se pueden tocar para seleccionarlos en la línea de
  tiempo.
- **Revisión:** los avisos, ordenados por nivel (alerta, aviso, sugerencia) con su color. Cada
  uno tiene un botón **Arreglar**, que manda `fixPrompt` al chat como un pedido nuevo del
  usuario. Si no hay avisos, dice "Sin avisos de calidad".

El mensaje se arma en `finalizeCompletedTurn` (`serverRunProposalLifecycle.ts`). Se compara el
documento de antes de la primera edición de la ejecución (`turn.runBeforeDoc`, que se guarda
en `recordRunSession`) con el documento actual. Las exportaciones salen de los resultados de
`submit_export` de esa ejecución. Si se aprueba una propuesta (aplicación manual), se hace lo
mismo al aplicarla (`useAgentProposalActions.ts`).

### Parte C — Voz del sistema, sin clave

- Proveedor nuevo `system` en `submit_voice`: en macOS usa `say` (voz por idioma: Paulina para
  `es`, Samantha para `en`, o la que se pida en `voiceId`) y convierte a WAV con el ffmpeg del
  proyecto (`ffmpegBin()`). Fuera de macOS no está disponible y el banner de capacidades lo
  dice como hoy.
- Se marca como **provisoria** en el nombre del recurso ("Voz del sistema (provisoria)") y en la
  descripción de la herramienta, para que el modelo prefiera un proveedor configurado.
- Corre en el servidor local: no contacta a nadie (specs/01).

## Reglas

1. Cambiar el código de un recurso de gráfico animado cambia el de todos sus clips colocados y
   ningún otro campo de esos clips. Se deshace con un solo Ctrl+Z.
2. `summarizeProjectChange` y `reviewTimeline` son puras: sin React, sin navegador, sin red.
   Cada una tiene su `*.verify.ts` en `verify:agent` o `verify:editor`.
3. La tarjeta solo aparece si la ejecución cambió el proyecto o exportó algo. Una ejecución que
   solo leyó no agrega tarjeta.
4. **Arreglar** nunca cambia el proyecto por su cuenta: manda un pedido al agente, que pasa por
   el mismo camino (y las mismas aprobaciones) que cualquier pedido escrito.
5. Los avisos no bloquean nada: ni la edición ni la exportación.
6. El mensaje `summary` se persiste con el chat y nunca se le manda al modelo, igual que `note`.
7. Todo texto nuevo lleva su clave en chino y su traducción en `src/i18n/dict/es/` y
   `src/i18n/dict/en/`.
8. La voz del sistema solo corre `say` con argumentos fijos (voz, velocidad, archivo de salida
   en la carpeta temporal del servidor). El texto va por stdin, nunca como argumento de
   shell.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Propagar el código siempre que cambia el del recurso | Un parámetro opcional `updatePlacedClips` | El único que cambia el código de un recurso es `edit_asset`, y en el caso real el pedido era "mejorá la escena". Dejar los clips con la copia vieja es justo lo que confundió al usuario. Para una variante distinta, el modelo crea un recurso nuevo |
| No propagar `props` | Copiar también los props del recurso | Los props son los valores de cada clip: en el comercial, un mismo recurso de "servicio" se usó 4 veces con textos y colores distintos |
| Resumen por diferencia de documentos (antes/después) | Armarlo con los resultados de cada herramienta | La diferencia no depende de qué herramienta se usó ni de cómo responde cada una; una herramienta nueva queda cubierta sin tocar el resumen |
| Exportaciones sacadas de los resultados de `submit_export` | Dejarlas fuera | Exportar no cambia el documento, y es justo lo que el usuario quiere encontrar al final |
| Un mensaje nuevo con `role: 'summary'` dentro de la conversación | Mostrar el registro de cambios del menú | Queda donde el usuario está mirando, en orden, y se guarda con el chat |
| "Arreglar" manda un pedido al agente | Arreglar directamente desde la tarjeta | Pasa por el mismo camino, aprobación y registro de cambios que un pedido escrito, y el modelo puede decidir cómo arreglarlo (por ejemplo, qué transición usar) |
| `hard_cut_between_graphics` solo entre clips gráficos y como sugerencia | Avisar de todo corte sin transición | En video filmado, el corte seco es lo normal; entre placas gráficas parece una presentación de diapositivas, que es lo que el brief pedía evitar |
| Detectar huecos en negro por cobertura de pistas visibles | Analizar cuadros renderizados | Es instantáneo y exacto; el análisis de cuadros ya existe después de exportar (`verify_export`) |
| **Cambio al implementar:** "música" es un tema de la biblioteca (`AUDIO_ASSETS`, categoría `music`) o un clip en una pista `follower`; nunca una pista `anchor` ni un clip transcripto | Todo audio de ≥ 5 s sin transcripción, como decía el borrador | Con la regla del borrador, el único aviso sobre el comercial real fue un falso positivo: la narración subida, sin transcribir, salía como "entra y sale de golpe". Un aviso falso en cada tarjeta enseña a ignorarla |
| **Agregado al implementar:** los nombres de clips y recursos se muestran con `tData`, como en la línea de tiempo | Mostrar `item.name` tal cual | En el navegador, la tarjeta decía "Finance Explainer — …" mientras la línea de tiempo decía "Explicativo de finanzas — …" |
| **Agregado al implementar:** los textos de la tarjeta viven en `runSummaryText.ts` | Exportarlos desde el componente | `react(only-export-components)`: un archivo que exporta funciones además del componente pierde el refresco en caliente |
| Voz con `say` de macOS | Instalar un motor local (Piper, Kokoro) | `say` viene con el sistema y no descarga nada. La calidad es de borrador; para la versión final hay que usar un proveedor configurado |
| El texto de la voz va por stdin | Pasarlo como argumento | Evita cualquier interpretación del texto como opción o comando |
| **Agregado al implementar:** comprobar la voz pedida contra `say -v '?'` | Confiar en `say` | Con una voz inexistente `say` no falla: habla con otra. El agente creería que usó la voz que pidió |
| La capacidad "voz" sigue apagada sin claves; la voz del sistema se ofrece como alternativa en el texto de capacidades | Encender "voz" en macOS | El banner seguiría diciendo que falta un proveedor de voz de verdad, que es lo que hace falta para la versión final |

## Verificación

Resultados del 2026-11-01, con Node 24.22.1.

**Parte A — el código nuevo llega a los clips**

- `tsx src/editor/motionGraphicCodeUpdate.verify.ts` (en `verify:editor`) →
  `ok (3 clips actualizados, props y transiciones intactos, 1 deshacer)`. Cubre: clips del
  recurso en dos secuencias reciben el código; sus `props`, `transform`, tiempos y
  transiciones no cambian; un clip de otro recurso y uno de video quedan iguales (el mismo
  objeto); el mismo código otra vez no crea documento nuevo; cambiar `props` del recurso no
  pisa los del clip; renombrar y recodificar juntos; un solo deshacer vuelve todo atrás;
  `edit_asset` devuelve `updatedClips: 3`.
- `edit-asset-tools.verify.ts` y `mediaAssetUsage.verify.ts` (renombrado) → ok.
- Catálogo de herramientas del servidor regenerado (`assets/agent/vixaventora-tool-schemas.json`);
  `verify:server-tool-catalog` → `server tool catalog is current`.

**Parte B — tarjeta "Lo que hice" y "Revisión"**

- `tsx src/agent/runSummary.verify.ts` (en `verify:agent-tools`) → ok. Revisión de una línea de
  tiempo con un problema de cada tipo: `alert` foto 720p al 150 % y negro de 990 a 1050;
  `warning` gráfico con código viejo y audio 3 s después de la imagen (la pista oculta no
  estira la imagen, la silenciada no suena); `suggestion` corte seco B→C (A→B tiene
  transición, la foto después del hueco no toca) y música de biblioteca sin fundidos. La
  narración subida sin transcribir, la voz transcripta y los efectos cortos no salen. Una
  pista `follower` cuenta como música aunque el archivo sea subido; una `anchor` nunca. Con
  todo arreglado → `[]`. Una transición deshabilitada vuelve a ser corte seco. Corte entre
  dos videos → nada. Resumen: 1 alta, 1 baja, 1 cambio (no cuenta el cambio solo de volumen
  ni solo de código), 1 rediseño, 1 transición, 1 pista, 1 recurso, volumen 100 % → 35 %;
  mismo clip con las claves en otro orden → sin cambios; exportaciones solo de la última
  vuelta y solo las exitosas; una vuelta que solo conversó no agrega tarjeta; una tarjeta por
  vuelta.
- `tsx src/components/chat/RunSummaryCard.verify.tsx` (en `verify:components`) → ok: las 10
  líneas de cambios en español ("Duración 0:20 → 1:15", "Volumen 100 % → 35 % (4)",
  "Exportado: …"), tres avisos con "Arreglar", deshabilitados mientras corre el agente, sin
  botones si no hay manejadores, "Sin avisos de calidad" cuando no hay avisos; `ChatMessage`
  dibuja un mensaje `summary` como la tarjeta y nada si viene sin datos.
- **Comercial real** (proyecto guardado en el perfil, 7 escenas, 13 clips de audio):
  `reviewTimeline` → ningún aviso. Con la regla del borrador daba un solo aviso, falso (la
  narración); ver Decisiones.
- **Navegador real** (Chromium + Playwright, servidor aislado en `:5399`, proyecto de ejemplo):
  se sembró un chat con una vuelta cuya tarjeta se calcula del proyecto real (antes = sin sus
  dos placas). La tarjeta muestra "Clips agregados: 2" con "Explicativo de finanzas — Cuaderno
  con marcadores de capítulo" y "Tecno oscuro — Vitrina de funciones", "Duración 0:00 →
  0:06", "Exportado: ejemplo-1080p.mp4" y, en Revisión, "Sugerencia · Cortes secos entre
  placas gráficas: 1 [Arreglar]". Clic en un clip → queda seleccionado y el inspector muestra
  sus propiedades. Clic en "Arreglar" → llama al envío; ese servidor no tiene modelo, así que
  aparece el error de modelo no configurado, ahora en español (antes salía en chino). Sin
  errores de página. **No se probó** el arreglo completo con un modelo: sería correr al agente
  sobre un proyecto del usuario.
**Parte C — voz del sistema**

- `tsx server/plugins/voice-system.verify.ts` (en `verify:speech-providers`) →
  `ok (Paulina, 39.9 s de WAV a 48000 Hz; el texto con $(…) no se ejecutó)`. Cubre: voz por
  idioma (`es`/`es-MX` → Paulina, `en-US` → Samantha, nada → Paulina); nombres con acentos y
  paréntesis aceptados; `-o /etc/passwd`, `--interactive`, `Paulina; rm -rf ~`, `$(whoami)`
  rechazados; los argumentos de `say` son fijos y el texto nunca va entre ellos (va por
  stdin); velocidad 1,2 → 210 palabras por minuto, 3 → error; validación del servidor (solo
  texto, voz, velocidad e idioma); la entrada de la herramienta del agente; lectura de
  `say -v '?'`. Síntesis real en esta Mac: WAV RIFF de 48 kHz, y un texto con `$(touch …)` y
  comillas invertidas se lee en voz alta sin ejecutarse (el archivo marcador no aparece). Una
  voz que no existe da "La voz «VozQueNoExiste» no está instalada en esta Mac. Voces en
  español: Mónica, Paulina, …": **agregado al implementar**, porque `say` usaba otra voz en
  silencio.
- `voice.verify.ts` y `generation-tool-input.verify.ts` → ok. Catálogo del servidor regenerado.
- `submit_voice` devuelve `durationInFrames`, para que el agente coloque la narración frase por
  frase al comienzo de cada escena, como se hizo a mano en el comercial.

- `npx tsc -b` → sin errores. `node scripts/check-i18n.mjs` → 36 claves nuevas con español e
  inglés. `npx vite build --config config/vite.config.ts` → `✓ built`. `npm run build` completo
  se corta antes, en `sync:whisper-cli`, porque en esta Mac falta `cmake`; pasaba igual antes
  de este cambio (los registros de builds anteriores lo muestran) y en CI sí está.

## Pendiente

- **Balance voz/música** (música alta debajo de una narración): hace falta saber qué clip es
  voz y cuál es música, y hoy el recurso no lo guarda de forma confiable. El comercial necesitó
  bajar la música al 35 %. Por lo mismo, la música subida o generada solo se reconoce si su
  pista tiene el rol `follower`.
- **Escena que se apaga antes del corte** (el contenido hace un fundido a negro justo antes de
  una transición y la transición queda invisible): solo se ve renderizando cuadros.
- **Fotos**: generar imágenes sigue necesitando una clave de un proveedor; el chat ya puede
  hacerlo con `submit_image` cuando hay una.
- **Revisión a pedido** (un botón "Revisar calidad" sin ejecutar al agente): por ahora la
  revisión aparece al final de cada ejecución que cambió el proyecto.
