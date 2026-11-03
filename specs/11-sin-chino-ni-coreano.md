# 11 — Sin chino ni coreano en la app

> Estado: implementado · Última actualización: 2026-11-01

## Problema

El editor viene de un proyecto escrito en chino. Aunque la interfaz ya está en español e
inglés (specs/02), el chino sigue en todos lados: el 2026-11-01 había chino en **639 archivos
versionados (11.751 líneas)** y coreano en 8. Se ve en:

- **Las claves de traducción.** Cada texto de la interfaz es `t('<texto en chino>')` y los
  diccionarios traducen ese chino al español y al inglés (2.636 claves). Si falta una
  traducción, la pantalla muestra el chino.
- **Textos que no pasan por `t()`.** Mensajes del servidor y del MCP (el pedido de confirmar
  en Vixaventora, en chino), notas de las herramientas que lee el modelo (del tipo «línea de
  tiempo «…» 7 fotogramas…», en chino), nombres por defecto (el nombre del sólido y los
  nombres de proyecto al azar, en chino), errores guardados en el chat (del tipo «la
  ejecución en el servidor solo admite…», en chino), datos de plantillas
  (`assets/templates`), documentos y comentarios.
- **Coreano y chino como datos de idioma.** Listas de idiomas de subtítulos (los nombres
  «chino» y «coreano» escritos en su propio idioma) y la tabla de puntuación del segmentador
  de subtítulos (`src/captions/segmenterData.ts`).

El equipo pidió quitarlo todo: la app se maneja solo en español e inglés.

## Modelo

**Clave = texto en inglés.** `t('Export video')`; el diccionario español traduce del inglés
(`'Export video': 'Exportar video'`). En inglés, `t()` devuelve la clave tal cual, salvo las
pocas claves con contexto (abajo).

Medido el 2026-11-01: el código usa 1.650 claves literales en `t()`; los diccionarios tienen
2.636 claves chinas, de las cuales 2.562 ya tienen inglés y 74 solo español. 49 textos en
inglés los comparten varias claves chinas, y en 6 el español difiere por género o número
("Off" → "Desactivado" / "Desactivados").

| Fase | Qué cambia | Cómo |
|---|---|---|
| 1. Claves | Todo literal del código que sea una clave china (2.422 literales distintos) pasa a su inglés; los diccionarios `es` cambian de clave; `en` queda solo con las claves con contexto | Script de migración con el mapa chino → inglés de los diccionarios. Las 74 sin inglés se traducen a mano. Las 6 en conflicto llevan contexto en la clave (`'Off·plural'`) y su inglés en `en` |
| 2. Textos sueltos | Los ~2.400 literales chinos que no son claves: mensajes al modelo y del servidor → inglés; textos que ve el usuario → `t()` con clave en inglés y traducción al español | A mano, por carpeta |
| 3. Comentarios | 410 líneas de comentario en chino → inglés | A mano |
| 4. Datos de idioma | Nombres de idioma en español/inglés ("Chino", "Coreano"); la puntuación y los rangos CJK del segmentador quedan como escapes `\u…` | A mano; el comportamiento con videos en esos idiomas no cambia |
| 5. Documentos y plantillas | `.md`, `assets/templates/*.json` | A mano |
| 6. Guardia | `scripts/check-i18n.mjs` pasa a verificar claves en inglés; un verify nuevo falla si aparece un carácter chino o coreano en un archivo versionado | Script |

## Reglas

1. Ningún archivo versionado de texto contiene caracteres de los bloques CJK (U+3400–U+9FFF,
   U+F900–U+FAFF, puntuación U+3000–U+303F y ancho completo U+FF00–U+FFEF) ni hangul
   (U+AC00–U+D7AF, U+1100–U+11FF, U+3130–U+318F). Los datos que necesitan esos caracteres los
   escriben como escapes `\u…`.
2. Todo texto que ve el usuario pasa por `t()` con una clave en inglés y tiene traducción al
   español.
3. Lo que lee el modelo (descripciones de herramientas, notas, errores) va en inglés.
4. La migración no cambia el comportamiento: las mismas pruebas pasan antes y después, salvo
   las que verificaban el texto chino, que pasan a verificar el inglés o el español.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Clave en inglés | Claves técnicas (`chat.summary.title`) | El inglés ya existe para el 97 % de las claves y el script lo aplica sin inventar nombres; el código queda legible y en inglés no hace falta diccionario |
| Escapes `\u…` para los datos CJK del segmentador | Borrar el soporte de subtítulos CJK | La regla es que no haya chino ni coreano escrito; el comportamiento con videos en otros idiomas no es parte del pedido y romperlo no aporta nada |
| Trabajar en una copia aparte (worktree) y unir al final | Cambiar la copia principal | La app en :5199 corre desde la copia principal y la está usando el trabajo del comercial; un cambio a medias la rompería |
| **Agregado al implementar:** las claves que en español distinguen género o número llevan contexto (`'Off·2'`) y su inglés en `en/index.ts` | Una sola clave y perder una variante | Eran 6 casos ("Desactivado"/"Desactivados"); con una sola clave, una de las dos pantallas quedaba mal |
| **Agregado al implementar:** la compatibilidad con datos guardados (idiomas de subtítulos viejos, categorías de plantillas viejas, el nombre viejo de las secuencias, el error de importación de servidores viejos) vive en archivos `.ts`, escrita con escapes | Borrarla | Un proyecto guardado antes del cambio tiene que seguir abriéndose igual |
| **Cambio de comportamiento aceptado:** los pedidos escritos en chino ya no activan herramientas por palabra clave | Mantener las palabras clave chinas como escapes | La app se maneja en español e inglés; las palabras clave se cubrieron en esos dos idiomas |
| **Cambio de comportamiento aceptado:** el modelo de visión describe las imágenes en inglés y la etiqueta pasó a "[Image content]" | Seguir pidiéndolo en chino | Lo lee el modelo; el resto de lo que lee el modelo ya es inglés |

## Verificación

Resultados del 2026-11-02/03, con Node 24.22.1, en la rama `chore/sin-chino`:

- **Fase 1 (script de migración):** 2.639 claves chinas pasaron a 2.593 claves en inglés (7 con
  contexto); 3.438 literales reemplazados en 272 archivos; 2.599 entradas en español
  reescritas; 74 claves que solo tenían español se tradujeron a mano. Las 4 entradas que el
  script marcó como conflicto venían de `Object.assign` entre archivos y se resolvieron con el
  valor que gana en ejecución, así que el español que se ve no cambió.
- **Fases 2 a 5 (431 archivos, en tres grupos):** agente y servidor, 178 archivos (79
  traducciones nuevas); interfaz y editor, 224 archivos (89); datos y documentos, 29 archivos
  (155 claves de datos migradas a inglés, 235 plantillas con nombres, etiquetas y textos de
  ejemplo en inglés que siguen compilando).
- `node scripts/no-cjk.verify.mjs` (nuevo, primero en `verify:i18n`) →
  `2372 text files, no Chinese or Korean characters`.
- `node scripts/check-i18n.mjs` (reescrito: el diccionario español es el registro de claves y
  cada clave literal de `t()` necesita su español) →
  `i18n check passed: 156 UI files, 4110 Spanish entries keyed by English`, con la lista de
  excepciones vacía.
- Todos los comandos de prueba de `pretest`, `test:serial` y `posttest` corridos en paralelo
  (644) → 0 fallos. `npm test` → `188 test segments passed`, con `pretest` y `posttest`
  enteros. `npm run lint` → sale con 0 (solo advertencias que ya estaban).
  `npx tsc -b` → sin errores. `npx vite build --config config/vite.config.ts` → `built`.
- El segmentador de subtítulos CJK quedó con los mismos valores que antes (comparados contra
  `95e78f2`); el grupo de interfaz corrigió un carácter que la fase 1 había reemplazado por
  error.

## Pendiente

- Chats y proyectos ya guardados pueden tener textos chinos (errores viejos, nombres por
  defecto como el del sólido): se ven tal como se guardaron. No se migran datos del usuario.
  Incluye los clips de las plantillas verticales y "a cámara" agregados antes del cambio:
  guardan el nombre de la plantilla y sus textos de ejemplo en chino, y como los
  diccionarios de datos ya no tienen claves chinas, el nombre se muestra en chino (las
  etiquetas de los campos salen de la plantilla y sí cambian).
- `server/plugins/hf-proxy.verify.ts` incluye una prueba de integración contra ModelScope que
  depende de la red; sin conexión pasa con `HF_PROXY_SKIP_INTEGRATION=1`.
