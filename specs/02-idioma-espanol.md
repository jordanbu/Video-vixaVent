# 02 — Idioma español

> Estado: implementado · Última actualización: 2026-10-25

## Problema

La interfaz estaba en chino (idioma de las claves), inglés, italiano y ruso. El equipo
trabaja en español y necesita la app completa en español: interfaz, contenido de las
bibliotecas, mensajes del servidor y respuestas del agente.

## Modelo

- **Claves**: el texto chino original sigue siendo la clave de `t('…')`. No se tocó la
  forma de escribir componentes.
- **Diccionario de interfaz**: `src/i18n/dict/es/*.ts`, un archivo por dominio (mismo
  reparto que `en/`), ensamblado en `es/index.ts`. Si falta una clave, se muestra el inglés,
  nunca el chino (`dictRegistry.ts`).
- **Diccionario de datos** (`tData`): `es/data.ts` junta nombres de plantillas, etiquetas
  de campos de plantillas (inspector), nombres y descripciones de efectos de sonido.
- **Catálogos con texto inglés/chino** (atajos de teclado, flujos creativos):
  `localizedCatalogText()` busca la etiqueta china en el diccionario del idioma activo
  (`es/catalog.ts`).
- **Estilos de diseño**: `src/components/settings/designStyleLocalizationEs.ts` (nombres,
  roles de color y fuente, y un resumen de cada estilo). La guía técnica que se envía al
  modelo sigue en inglés.
- **Servidor**: `server/ui-locale.ts` acepta `es` y es el predeterminado. Los mensajes que
  ve el usuario (pruebas de conexión, stock, proxy, exportación, carpetas, diálogos del
  escritorio, prompts MCP) están en español.
- **Agente**: `localeLanguageName('es') = 'Spanish'`, así el agente responde en español.
  `src/agent/tool-routing.ts` reconoce raíces en español (terminadas en `*`, por ejemplo
  `recort*`) para precargar las herramientas sin un turno extra de búsqueda.

## Reglas

1. Español es el idioma por defecto, sin importar el idioma del sistema.
2. El selector de idioma solo ofrece Español ⇄ Inglés. Una elección guardada de otro idioma
   (chino, italiano, ruso) vuelve a español al abrir la app.
3. Toda clave nueva de interfaz necesita su traducción en `en/` y en `es/`;
   `scripts/check-i18n.mjs` falla si una entrada en inglés no tiene su versión en español.
4. Ningún archivo de diccionario supera las 500 líneas (gate de `npm test`): se parten por
   dominio (`settings.ts` + `settingsProviders.ts`, `data-fields-1..3.ts`).
5. Español neutro: "tú" en instrucciones, infinitivo en botones, las variables `{…}` iguales
   al original.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Traducir sobre las claves chinas existentes | Cambiar todas las claves a inglés o a español | Hubiera tocado ~2.500 llamadas en el código y roto la paridad con los demás idiomas |
| Respaldo en inglés para claves faltantes | Respaldo en chino (como ruso) | Un texto nuevo sin traducir se entiende mejor en inglés |
| Selector solo Español/Inglés | Mantener los cinco idiomas | Evita que alguien termine en chino por error |
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
