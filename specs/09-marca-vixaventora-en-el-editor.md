# 09 — La marca Vixaventora en el editor

> Estado: en curso · Última actualización: 2026-11-01

## Problema

El editor se ve como un editor genérico: gris neutro (tema Graphite), un coral que no es el
de la marca y textos muy chicos en varios lugares (9,5–10,5 px). La empresa ya tiene un
sistema visual propio en <https://vixaventora.com/> —neutros cálidos, terracota, tarjetas
con borde fino y mucho orden— y el equipo pidió que el editor se vea así: sencillo,
ordenado y fácil de leer.

## Modelo

### Sistema de la web (extraído el 2026-11-01 con Chromium, estilos computados)

| Grupo | Tokens |
|---|---|
| Tipografía | Títulos *Source Serif 4* 400, interletrado negativo (60 / 44 / 20 px). UI *Instrument Sans* (cuerpo 16–19 px; sobretítulo 12 px mayúsculas, 600, +1,68 px). Números *JetBrains Mono* |
| Ink (neutros cálidos) | 950 `#0d0c0b` · 900 `#161513` · 800 `#1f1e1b` · 700 `#33322e` · 600 `#4a4843` · 500 `#66635c` · 400 `#8a867d` · 300 `#b0aca3` · 200 `#d2cfc7` · 100 `#e9e7e1` · 50 `#f5f4f0` |
| Stone (papel) | 50 `#fbfaf6` · 100 `#f5f2ea` · fondo `#faf8f3` · tarjeta `#fffefb` · borde `#e3ddd0` |
| Clay (acento) | 300 `#e1987a` · 400 `#d57a57` · 500 `#c4613c` (anillo de foco) · 600 `#a54e2f` · 700 `#843f27` |
| Otros | Ochre 400 `#d6a03e` · Mist 400 `#6f8ba6` · destructivo `#b3261e` · éxito `#4f7a4a` |
| Formas | Botones 40–48 px, radio 10 px; tarjetas radio 14 px, padding 24–28 px, borde 1 px; inputs 44–46 px, radio 8 px; sombras mínimas (`0 1px 2px` al 6 %) |
| Secciones oscuras | Fondo ink-900, tarjetas ink-800 con borde blanco al 10 %, texto ink-200, sobretítulos clay-300 |

### En el editor

- **Tema "Vixaventora"** en `src/skins.ts`, por defecto (`DEFAULT_SKIN`). Superficies con la
  escala ink de las secciones oscuras de la web; acento clay; el resto de los temas sigue
  disponible en el selector.
- **Tipografía de marca**, alojada en `public/fonts/` (subconjunto `latin`, variable por peso,
  registrada en `assets/fonts/LICENSES.md` con SHA-256): `--vx-font-sans` = Instrument Sans,
  `--vx-font-serif` = Source Serif 4, `--vx-font-mono` = JetBrains Mono (`src/index.css`).
  Cada pila de fuentes de la interfaz las pone primero y deja Geist / Geist Mono de respaldo.
  El `body` usa `--vx-font-sans`, así los menús montados en `<body>` también la toman.
- **Títulos en serif, como en la web, solo en lo grande**: "Proyectos" en el panel (28 px, 400)
  y el encabezado del chat vacío (21 px, 400), con el sobretítulo de marca encima ("EMPIEZA
  AQUÍ": 11 px, mayúsculas, 600, +0,14 em, clay).
- **Piso de tamaño**: los textos de 9 y 9,5 px pasan a 10,5 px (50 lugares: 26 en CSS y 24 en
  componentes). En el escritorio, con la base de 110 %, se ven de ~11,5 px.

| Token del editor | Valor | Origen |
|---|---|---|
| `bg` / `inset` | `#0d0c0b` / `#121110` | ink-950 |
| `panel` / `panelAlt` | `#161513` / `#1f1e1b` | ink-900 / ink-800 (sección y tarjeta oscuras) |
| `hover` | `#2a2925` | entre ink-800 y ink-700 |
| `border` / `borderLight` | `#33322e` / `#4a4843` | ink-700 / ink-600 (≈ blanco 10 % sobre ink-800) |
| `text` / `textMuted` / `textDim` / `textStrong` | `#e9e7e1` / `#b0aca3` / `#8a867d` / `#fbfaf6` | ink-100 / 300 / 400, stone-50 |
| `accent` / `accentDeep` / `onAccent` | `#d57a57` / `#c4613c` / `#161513` | clay-400 / 500; texto oscuro como el botón ocre de la web |
| `gold` | `#d6a03e` | ochre-400 |
| `tlTrack` / `tlSidePanel` | `#24231f` / `#1d1c19` | ink cálido entre 800 y 700 |
| colores semánticos (selección, pistas, clips, éxito, error) | los de Graphite | se comparten entre temas para que un clip de video se vea igual en cualquiera |

## Reglas

1. Un tema nuevo cumple el mismo contraste que los demás (`src/skins.verify.ts`): texto/panel
   ≥ 7, textMuted/panel ≥ 4,5, textDim/panel ≥ 4,4, onAccent/accent ≥ 3 (y ≥ 4,5 cuando se
   puede), textStrong/hover ≥ 4,5.
2. Los colores semánticos de pistas y clips no cambian con el tema.
3. Sin fuentes ni recursos de servidores externos (specs/01): las fuentes, si se cambian, se
   alojan en `public/fonts/`.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Llevar la marca como un tema más y ponerlo por defecto | Reescribir los colores de Graphite | El sistema de temas ya maneja todos los tokens y sus contrastes; Graphite queda para quien lo prefiera |
| Superficies de las secciones oscuras de la web, no el papel crema | Un editor claro como la portada | Un editor de video se trabaja en oscuro: el color del video tiene que leerse sin un marco claro alrededor. El tema claro "Latte" sigue existiendo |
| Acento clay-400 con texto oscuro | clay-500 con texto blanco | Blanco sobre `#c4613c` da ~4,1:1; texto ink-900 sobre `#d57a57` da ~6:1, y la web ya usa texto oscuro sobre su color cálido (botón ocre) |
| Alojar Instrument Sans, Source Serif 4 y JetBrains Mono (decidido con el equipo el 2026-11-01) | Seguir con Geist | La interfaz queda igual que la web. Alojadas en `public/fonts/` no se contacta a Google (specs/01); el subconjunto latin pesa 30 + 122 + 31 KB |
| Las capas de texto del video siguen en Geist (`TimelineGraphicLayers.tsx`) y el logo no cambia | Cambiar también la letra por defecto del contenido | Cambiaría la letra de proyectos existentes y de sus exportaciones; la marca es para la interfaz |
| Fuentes de marca primero y Geist de respaldo en cada pila | Reemplazar Geist por completo | Si falta un glifo fuera del subconjunto latin, cae en una letra parecida en vez de en la del sistema |
| Subir solo los textos de 9–9,5 px (decidido con el equipo) | Subir todo o subir el zoom a 120 % | Lo ilegible desaparece sin cambiar la densidad; en el escritorio ya hay una base de 110 % y subir todo la duplicaría |
| No usar la guía genérica de la skill (rosa/azul, Inter, patrón landing) | Aplicarla tal cual | La marca ya existe; la skill aporta las reglas de contraste, foco, tamaños mínimos y movimiento |

## Verificación

Resultados del 2026-11-01, con Node 24.22.1:

- `tsx src/skins.verify.ts` → `ok (7 skins, 对比度门全过)`. Para la marca además: texto
  oscuro sobre clay ≥ 4,5 (blanco no llegaba), textDim sobre tarjetas ≥ 4,5, y los 11
  colores semánticos iguales a Graphite. Migración: un `graphite` guardado antes pasa al
  nuevo predeterminado una sola vez; elegir Graphite después se respeta; cualquier otro
  tema guardado se respeta.
- `tsx src/theme-tokenization.verify.ts` → ok. `npx tsc -b` → OK. `check-i18n` → OK.
- Navegador real (Chromium + Playwright, servidor aislado en `:5399`): sin tema guardado
  el `body` queda en `rgb(13, 12, 11)` (ink-950); el panel de proyectos, el editor, la
  tarjeta de permiso y el selector de temas se ven con la paleta de marca; el selector
  muestra "Vixaventora" marcado y el resto disponible. Sin errores en la página.
- Tipografía (mismo servidor aislado): `document.fonts` → Instrument Sans y Source Serif 4
  cargadas, ningún 404 en `/fonts/`; el `body` y los menús usan Instrument Sans; el `h1` del
  panel usa Source Serif 4. Instrument Sans trae dígitos tabulares (con `tabular-nums`,
  "1111" y "0000" miden lo mismo), así que los tiempos del timeline no bailan.
- Tamaños: en el editor no queda texto de 9–9,5 px (lo más chico visible son los 10 px de la
  regla); ningún texto recortado por su caja (escaneo de `scrollWidth`/`scrollHeight`).
  Capturas del chat, la regla, los cabezales de pista y las insignias de duración sin
  desbordes.

## Pendiente

- Los números de la regla del timeline siguen en 10 px (19 en pantalla): no estaban en el
  rango acordado (9–9,5 px).
- Menú contextual del clip: ocultar los ítems que no aplican al tipo de clip (siguiente
  cambio de este spec).
