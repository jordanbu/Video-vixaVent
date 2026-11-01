# 02 — Idioma español

> Estado: implementado · Última actualización: 2026-11-01

## Problema

La interfaz estaba en chino (idioma de las claves), inglés, italiano y ruso. El equipo
trabaja en español y necesita la app completa en español: interfaz, contenido de las
bibliotecas, mensajes del servidor y respuestas del agente.

Desde el 2026-11-01 la app tiene **solo dos idiomas: español (predeterminado) e inglés**.
Los diccionarios de chino, italiano y ruso se borraron: nadie podía elegirlos desde el
selector y seguían costando mantenimiento en cada rama `locale === 'zh' | 'it' | 'ru'`.

## Modelo

- **Claves**: el texto chino original sigue siendo la clave de `t('…')`. No se tocó la
  forma de escribir componentes.
- **Idiomas**: `Locale = 'es' | 'en'` (`src/i18n/locale.ts`). En el servidor,
  `UiLocale = 'es' | 'en'` (`server/ui-locale.ts`) y `localized({ es, en })`.
- **Diccionario de interfaz**: `src/i18n/dict/es/*.ts`, un archivo por dominio (mismo
  reparto que `en/`), ensamblado en `es/index.ts`. Si falta una clave, se muestra el inglés,
  nunca el chino (`dictRegistry.ts`). `src/i18n/dict/en/` es el registro de claves que usa
  `scripts/check-i18n.mjs`.
- **Diccionario de datos** (`tData`): `es/data.ts` junta nombres de plantillas, etiquetas
  de campos de plantillas (inspector), nombres y descripciones de efectos de sonido.
- **Catálogos con texto inglés/chino** (atajos de teclado y sus grupos, flujos creativos):
  en inglés se muestra la etiqueta inglesa; en español `localizedCatalogText()` busca la
  etiqueta china en `es/catalog.ts` y, si no está, muestra la inglesa.
- **Estilos de diseño**: `src/components/settings/designStyleLocalizationEs.ts` (nombres,
  roles de color y fuente, y un resumen de cada estilo). La guía técnica que se envía al
  modelo sigue en inglés.
- **Servidor**: `server/ui-locale.ts` acepta `es` y `en`; `es` es el predeterminado y
  cualquier otro valor guardado en `UI_LOCALE` cae a español. Los mensajes que ve el usuario
  (pruebas de conexión, stock, proxy, exportación, carpetas, diálogos del escritorio,
  prompts MCP, página de subida desde el celular) están en español.
- **Agente**: `localeLanguageName('es') = 'Spanish'`, así el agente responde en español.
  `src/agent/tool-routing.ts` reconoce raíces en español (terminadas en `*`, por ejemplo
  `recort*`) para precargar las herramientas sin un turno extra de búsqueda.

## Reglas

1. Español es el idioma por defecto, sin importar el idioma del sistema.
2. Solo existen español e inglés; el selector alterna ES ⇄ EN. Una elección guardada de un
   idioma borrado (chino, italiano, ruso) vuelve a español al abrir la app, tanto en el
   navegador (`vx.locale`) como en el servidor (`UI_LOCALE`) y en la página del celular.
3. No se agregan ramas por idioma fuera de `es`/`en`: el tipo `Locale` no lo permite.
4. Toda clave nueva de interfaz necesita su traducción en `en/` y en `es/`;
   `scripts/check-i18n.mjs` falla si una entrada en inglés no tiene su versión en español.
5. Ningún archivo de diccionario supera las 500 líneas (gate de `npm test`): se parten por
   dominio (`settings.ts` + `settingsProviders.ts`, `data-fields-1..3.ts`).
6. Español neutro: "tú" en instrucciones, infinitivo en botones, las variables `{…}` iguales
   al original.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Traducir sobre las claves chinas existentes | Cambiar todas las claves a inglés o a español | Hubiera tocado ~2.500 llamadas en el código y roto la paridad con los demás idiomas |
| Respaldo en inglés para claves faltantes | Respaldo en chino (como ruso) | Un texto nuevo sin traducir se entiende mejor en inglés |
| Selector solo Español/Inglés | Mantener los cinco idiomas | Evita que alguien termine en chino por error |
| Borrar los diccionarios de chino, italiano y ruso (2026-11-01) | Dejarlos como respaldo sin selector | Nadie podía elegirlos y cada texto nuevo o rama por idioma seguía arrastrándolos; volver a tenerlos es un `git revert` |
| Quedarse con español + inglés | Solo español | El inglés es el registro de claves del chequeo y el respaldo de `es`; quitarlo exigía reescribir `check-i18n.mjs` y la cadena de respaldo. Decisión del equipo |
| Mantener las claves en chino | Pasar las claves a español al borrar el chino | Siguen siendo ~2.500 llamadas a `t('…')`; las claves no se ven en pantalla |
| Transcripción en español por defecto (`DEFAULT_TRANSCRIPTION_LANGUAGE`, `shared/transcription-language.ts`) | Seguir con chino hasta que alguien lo cambie en Ajustes | Sin configurar, el audio en español salía transcrito como chino. Había siete respaldos a `'zh'`; ahora leen una sola constante. Una elección guardada se respeta |
| Traducir los nombres de plantillas y campos al mostrarlos (`tData`) | Reescribir los JSON de plantillas | Los JSON son datos compartidos con el agente; traducir en pantalla no cambia lo que el agente lee |
| Mostrar un resumen en español de cada estilo de diseño | Traducir la guía técnica completa | La guía es una instrucción para el modelo; la versión china ya usa resúmenes |

## Verificación

Resultados del 2026-10-25:

- `node scripts/check-i18n.mjs` → `152 个 UI 文件，2536 个英文词条，3957 个西班牙语词条`
  (toda entrada en inglés tiene su español).
- `tsx src/i18n/dictRegistry.verify.ts`, `locale.verify.ts`,
  `design-style-localization.verify.ts`, `sound-localization.verify.ts`,
  `src/agent/tool-routing.verify.ts` → OK.
- Revisión visual con capturas (Electron, 1440×900) del panel principal, el editor, Ajustes,
  menús (＋ Nueva pista, modo del agente, selector de modelo, menú contextual de clip),
  inspector y panel MCP: sin textos en chino, sin textos cortados en las pantallas
  revisadas y sin menús encimados.

Resultados del 2026-11-01 (borrado de chino, italiano y ruso), con Node 24.22.1:

- `npx tsc -b` → sin errores (el tipo `Locale = 'es' | 'en'` marcó las únicas ramas
  sobrantes: tres verify).
- `node scripts/check-i18n.mjs` → `154 个 UI 文件，2546 个英文词条，3967 个西班牙语词条`
  (con los textos que se agregaron después en el mismo día —nombre de versión y aviso de
  ejecución local (specs/08)— queda en `2549 / 3970`).
- `src/i18n/locale.verify.ts` → una elección guardada `zh`, `it` o `ru` vuelve a español.
  `server/plugins/import-url-errors.verify.ts` y `server/plugins/mobile-upload.verify.ts` →
  lo mismo en el servidor y en la página del celular.
- `src/shortcuts/versionName.verify.ts` → `Versión 1/11, 10:35 · Version 11/1, 10:35 AM`
  (antes el atajo de guardar versión nombraba `版本 11/1 10:35` en cualquier idioma).
- `npm run lint` → 0 errores. `npm test` → 196/197; falla
  `server/plugins/sound-sonilo-job.verify.ts`, que busca ffmpeg en el PATH y ya fallaba antes
  (se corrigió el mismo día: ahora usa `ffmpegBin()`). `npm run posttest` aparte → OK.
- `npm run build` se corta en `sync:whisper-cli` por falta de `cmake` en esta máquina; los
  pasos restantes corridos a mano → OK (`sync-shader-sources --check`,
  `verify:server-tool-catalog`, `tsc -b`, `vite build`).

- `tsx src/transcript/transcription-default.verify.ts` → `unconfigured transcription is
  Spanish; 1387 sources scanned`. Contra el commit anterior falla con `'zh' !== 'es'`.

## Pendiente

- Documentación técnica para desarrolladores (`.env.example`, `FAL.md`,
  `MACOS-RENDER-TUNING.md`, `config/README.md`) sigue en inglés.
- Los comentarios del código y las skills del agente (`src/agent/skills/**`,
  `skills/vixaventora/`) siguen en inglés/chino: son instrucciones para el modelo, no texto
  de pantalla.
- El texto de muestra dentro de las plantillas (por ejemplo "Why most budgets…") sigue en
  inglés; se reemplaza al editar cada plantilla.
- La búsqueda semántica visual usa un modelo CLIP chino (`Xenova/chinese-clip-vit-base-patch16`):
  las búsquedas en español funcionan peor. Evaluar un modelo multilingüe.
- El orden por nombre del panel de media compara con `'zh-CN'`
  (`src/media/mediaPoolFilter.ts`); debería usar el idioma activo.
