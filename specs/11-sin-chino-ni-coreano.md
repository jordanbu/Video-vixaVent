# 11 — Sin chino ni coreano en la app

> Estado: en curso · Última actualización: 2026-11-01

## Problema

El editor viene de un proyecto escrito en chino. Aunque la interfaz ya está en español e
inglés (specs/02), el chino sigue en todos lados: el 2026-11-01 había chino en **639 archivos
versionados (11.751 líneas)** y coreano en 8. Se ve en:

- **Las claves de traducción.** Cada texto de la interfaz es `t('中文')` y los diccionarios
  traducen ese chino al español y al inglés (2.636 claves). Si falta una traducción, la
  pantalla muestra el chino.
- **Textos que no pasan por `t()`.** Mensajes del servidor y del MCP ("请在 Vixaventora 中确认…"),
  notas de las herramientas que lee el modelo ("时间线「…」7 帧…"), nombres por defecto
  ("纯色", nombres de proyecto al azar como "澄澈织机"), errores guardados en el chat
  ("服务端运行仅支持…"), datos de plantillas (`assets/templates`), documentos y comentarios.
- **Coreano y chino como datos de idioma.** Listas de idiomas de subtítulos ("中文", "한국어") y
  la tabla de puntuación del segmentador de subtítulos (`src/captions/segmenterData.ts`).

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

## Verificación

(Se completa al implementar.)

## Pendiente

- Chats y proyectos ya guardados pueden tener textos chinos (errores viejos, nombres
  "纯色"): se ven tal como se guardaron. No se migran datos del usuario.
