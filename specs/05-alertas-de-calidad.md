# 05 — Alertas de calidad

> Estado: implementado (fase 1) · Última actualización: 2026-10-26

## Problema

Mientras editas, el editor no avisa cuando un clip se va a ver borroso o pixelado. Pasa,
por ejemplo, con un video de 720p en una secuencia de 1080p, con un zoom de 2× sobre un
celular o al exportar en 4K material grabado en 1080p. Hoy solo se sabe después de
exportar, mirando el archivo. El chequeo automático posterior a la exportación
(`src/export/quality.ts`) compara el archivo con los ajustes de exportación, no con la
calidad de las fuentes.

## Modelo

**Qué ya existe y se reutiliza**

- Tamaño de la fuente por clip: `TimelineItem.width/height` (`src/editor/clipTypes.ts`),
  copiado del asset al colocarlo.
- Encaje en el lienzo: `renderedVisualFrameRect` (`src/editor/visualFrameGeometry.ts`),
  con contain o cover (`TimelineState.fit`, contain si falta).
- Escala del clip: `transform.scale/scaleX/scaleY` y sus keyframes
  (`resolveClipScaleAxes`, `src/editor/clipTransformScale.ts`; `sampleKeyframes`,
  `src/editor/keyframes.ts`).
- Zoom animado: `zoomAt` sobre `zoom.magnification`, `envelope` y `reframeCurve`
  (`src/editor/zoom.ts`).
- Escala de exportación: `exportScale` (`src/export/mediaSettings.ts`).
- Piezas de UI: insignias de clip (`ClipEffectBadges` en `TrackLane.tsx`), el patrón de
  aviso del inspector (`PreviewFidelityStatus.tsx`) y el estilo de la tarjeta de QA de
  exportación (`ExportQaCard`, clase `vx-export-qa-card`).

**Qué se agregó**

`src/editor/qualityAlerts.ts`, puro (sin React ni navegador):

```ts
interface QualityIssue {
  code: 'upscaled_clip' | 'export_above_sources';
  severity: 'warning' | 'alert';
  itemId?: string;          // clip afectado (upscaled_clip)
  factor: number;           // cuánto se amplía (1.8 = 180 %)
  sourceShortSide?: number; // export_above_sources: lado corto de la fuente más grande (1080 = 1080p)
}

assessTimelineQuality(timeline, { exportResolution? }) → QualityIssue[]
clipQualityIssue(item, lienzo, escala = 1) → QualityIssue | null   // un clip
clipUpscaleFactor(item, lienzo, escala = 1) → number | null
qualitySeverity(factor) → 'warning' | 'alert' | null
```

**Ampliación efectiva** de un clip visual (video o imagen), en su peor momento:

```
encaje(contain|cover) × escala máxima (estática o de keyframes) × zoom máximo × escala de exportación
```

Por eje: `renderedVisualFrameRect(...).width / item.width × scaleX` y lo mismo en alto;
gana el eje mayor.

**`export_above_sources`**: lado corto de la exportación (`min(ancho, alto) × exportScale`)
dividido por el lado corto de la fuente más grande (video o imagen). Usa los mismos umbrales.

Mientras se edita, se calcula contra el lienzo de la secuencia (escala de exportación = 1).
En el diálogo de exportación, se recalcula con la resolución elegida.

**Dónde se ve**

| Lugar | Qué muestra | Archivo |
|---|---|---|
| Clip en la línea de tiempo | Insignia `⚠ 180%` (ámbar si es `warning`, roja si es `alert`) con el tooltip "Se amplía al 180 %: puede verse borroso" | `TrackLane.tsx`; el cálculo va en `buildTimelineIndexes` (`timelineUtil.ts`), una vez por cambio de estado |
| Inspector del clip | Arriba de las pestañas, con un solo clip seleccionado: "Se amplía al 180 %: puede verse borroso. Baja el zoom o la escala, o usa una fuente de mayor resolución." | `SourceQualityStatus.tsx` en `InspectorContent.tsx` |
| Diálogo de exportación (pestaña Video) | Tarjeta "Calidad de las fuentes", entre los ajustes y el QA posterior: "3 clips se van a ver ampliados (hasta el 180 %)" y, si corresponde, "Exportar en 4K no agrega calidad: la fuente más grande es 1080p". Pie: "Es solo un aviso: no impide exportar." | `ExportSourceQualityCard` en `ExportDialogParts.tsx`, usada en `ExportDialogTabs.tsx` |

## Reglas

1. Hasta 110 % de ampliación no se avisa. Más de 110 % y menos de 150 % es `warning`;
   desde 150 % es `alert`.
2. Se usa el peor momento del clip: la escala y el zoom máximos dentro del clip. Los
   keyframes de escala se muestrean en los dos bordes del clip y en cada keyframe que cae
   dentro; un keyframe fuera del clip recortado cuenta solo hasta donde el clip lo alcanza.
   El zoom de `reframeCurve` o `envelope` se muestrea en sus propios puntos; el de forma
   (`shape`) llega a su `magnification`.
3. Solo se evalúan clips `video` e `image` con `width/height` conocidos. Audio, texto,
   formas, SVG, gráficos animados y secuencias anidadas no se evalúan. Si no se sabe el
   tamaño de la fuente, no se adivina.
4. Las alertas solo informan: nunca bloquean la edición ni la exportación.
5. La insignia y el inspector miden el clip, esté o no su pista oculta. El resumen de
   exportación (`assessTimelineQuality`) salta las pistas ocultas, porque no salen en el
   archivo.
6. `assessTimelineQuality` es pura y no depende de React ni del navegador. Tiene su
   `qualityAlerts.verify.ts`, que entra en `verify:editor` (corre en `npm test`).
7. Los textos nuevos llevan su clave en chino y su traducción en `src/i18n/dict/es/` y
   `src/i18n/dict/en/`.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Medir la ampliación con los datos que ya tiene cada clip | Analizar los cuadros del video (nitidez, artefactos) | Lo primero es instantáneo y exacto. Analizar cuadros es lento y da falsos positivos con fondos desenfocados a propósito |
| Avisar durante la edición | Solo en el QA posterior a la exportación | El QA de después ya existe; el problema es enterarse cuando ya se exportó |
| Calcular contra el lienzo y recalcular en el diálogo de exportación | Calcular siempre contra la resolución de exportación | Mientras se edita, todavía no hay resolución de exportación elegida |
| Dos niveles (110 % y 150 %) | Un solo umbral | Un 120 % casi no se nota y un 200 % sí; con un solo nivel, o sobra ruido o se escapan los casos graves |
| **Cambio al implementar:** 150 % exacto ya es `alert` (con tolerancia de 1e-6 por el redondeo a píxeles) | "Más de 150 %", como decía el borrador | 720p en 1080p, el caso que motivó el spec, da exactamente 150 %. Con el borde estricto quedaba como `warning` |
| Escala máxima × zoom máximo, cada uno por separado | Recorrer el clip cuadro a cuadro multiplicando ambos | Es lo que pide la fórmula del spec, es barato y nunca se queda corto. Solo exagera si el pico de escala y el de zoom caen en momentos distintos, y para un aviso es preferible pasarse a callarse |
| No perseguir el rebote de una curva bezier entre dos keyframes | Muestrear la curva completa | Se avisa con el valor de los keyframes, que es lo que el usuario puso. El rebote dura pocos cuadros |
| **Agregado al implementar:** campo `sourceShortSide` en `QualityIssue` | Deducir la fuente de `factor` y la resolución | El mensaje "la fuente más grande es 1080p" necesita el número exacto; deducirlo arrastra redondeos |
| Calcular las insignias una vez por cambio de estado, dentro de `buildTimelineIndexes` | Calcular en cada `TrackLane` | Cada pista se redibuja por separado; así el cálculo no se repite por pista |
| La insignia de calidad es la única que recibe el puntero (`pointer-events: auto`) | Dejarla como las demás | El contenedor de insignias ignora el puntero, así que su tooltip nunca aparecía; los clics igual llegan al clip |
| La tarjeta del diálogo usa el estilo de `vx-export-qa-card` | Un estilo nuevo | Se ve igual que el QA de exportación que está justo debajo; no suma CSS |
| Insignia e inspector ignoran si la pista está oculta; el resumen de exportación no | Saltar pistas ocultas en todos lados | El clip sigue estando ampliado si se vuelve a mostrar la pista; el resumen habla del archivo que se va a exportar |

## Verificación

Resultados del 2026-10-26, con Node 24.22.1:

- `tsx src/editor/qualityAlerts.verify.ts` → `qualityAlerts.verify: ok`. Cubre: bordes
  110 % / 150 % (1.5 exacto y 1.4999999 dan `alert`); 720p en lienzo 1080p → `alert` a
  150 %; 1080p y 4K en 1080p → nada; keyframe de reframe a 2× → `alert` 200 %; zoom de
  forma 2× → 200 %; zoom de alejamiento → 100 %; envelope con rebote → 250 %; escala
  estática 130 % → `warning`; keyframe de escala más allá del clip recortado → 199 %;
  `scaleX` 1.6 → 160 %; encaje × escala × zoom se multiplican; 4:3 con cover → 133 %;
  celular vertical con cover → 178 %; imagen 800×600 → `alert` 180 % y como logo al 25 %
  → nada; audio, texto, sólido, SVG, gráfico animado y secuencia → nada; sin tamaño de
  fuente → nada; pista oculta fuera del resumen; exportación 4K con fuentes 1080p →
  `export_above_sources` 200 % con `sourceShortSide` 1080, y los clips a 200 % y 300 %;
  1080p y 720p → sin `export_above_sources`.
- `npm run lint` → sale con 0; 0 errores, 201 advertencias, ninguna en archivos de este cambio.
- `npm test` → el `pretest` pasa entero (incluye `verify:editor` con el verify nuevo,
  `verify:i18n` y `theme-tokenization.verify.ts`); `test:serial`: 196 de 197 segmentos
  pasan. El que falla es `server/plugins/sound-sonilo-job.verify.ts`, que ya fallaba antes
  porque no hay ffmpeg en el sistema. Como `npm` corta ahí, `npm run posttest` se corrió
  aparte → sale con 0.
- `scripts/verify-registration.verify.mjs` exige que todo verify registrado esté en git:
  falla mientras `qualityAlerts.verify.ts` no está agregado. Con `git add -N` (o al
  commitear) → `all 632 tracked verify files are registered`.
- `node scripts/check-i18n.mjs` → `153 个 UI 文件，2543 个英文词条，3964 个西班牙语词条`
  (7 claves nuevas, todas con español).
- `npx tsc -b` → sin errores. `npx vite build --config config/vite.config.ts` →
  `✓ built in 2.12s`.
- Revisión visual (servidor de desarrollo aislado en `localhost:5299`, Chrome sin interfaz
  a 1440×900, proyecto de ejemplo con dos imágenes de 1280×720 y 1920×1080):
  - Línea de tiempo: el clip de 720p muestra la insignia roja `⚠ 150%` con el tooltip
    "Se amplía al 150 %: puede verse borroso"; el de 1080p no muestra nada. Con escala
    130 %, el de 1080p muestra la insignia ámbar `⚠ 130%`. La insignia recibe el puntero
    (`elementFromPoint` la devuelve a ella).
  - Inspector: al seleccionar el clip de 720p aparece la línea roja "Se amplía al 150 %:
    puede verse borroso. Baja el zoom o la escala, o usa una fuente de mayor resolución.";
    con el de 1080p a 130 %, la misma línea en ámbar; sin escala, no aparece.
  - Diálogo de exportación: en 1080p, "2 clips se van a ver ampliados (hasta el 150 %)";
    en 4K, "2 clips se van a ver ampliados (hasta el 300 %)" y "Exportar en 4K no agrega
    calidad: la fuente más grande es 1080p"; en 720p la tarjeta desaparece. Con la tarjeta a la vista
    (1080p), el botón "Exportar video" sigue habilitado; el código del botón no lee las
    alertas.

## Pendiente

Queda para una segunda fase, porque hoy esos datos no se guardan en el asset:

- **fps de la fuente distinto al de la secuencia** (por ejemplo, 24 fps en 30 fps, que
  se ve a saltos). El servidor ya mide el fps, pero `resolveReadySource`
  (`src/media/upload.ts`) lo descarta.
- **Bitrate bajo de la fuente** (videos de WhatsApp o redes). Solo se lee dentro de
  `server/media-normalization.ts` y no se guarda.
- **Audio que satura**, avisado durante la edición. Hoy se detecta solo en el QA
  posterior a la exportación (`audio_peak`).
- Exponer las alertas al agente (por ejemplo, en `read_timeline`) para que las tenga en
  cuenta al editar.

Quedó fuera de la fase 1:

- **GIF animados**: también son ráster y se ven borrosos al ampliarse, pero el spec acotó
  la fase 1 a video e imagen. Sumarlos es agregar el tipo en `sourceSize`
  (`qualityAlerts.ts`) y un caso en el verify.
- **Clips dentro de secuencias anidadas**: se ignora el clip `sequence` y no se mira su
  contenido. Habría que componer la escala de la secuencia con la de sus clips.
- **Revisión visual con un video real**: se hizo con imágenes, porque en esa máquina no
  hay ffmpeg para importar video. Los clips de video usan el mismo `width/height` y el
  verify los cubre.
