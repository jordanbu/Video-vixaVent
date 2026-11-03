# 06 — Criterio de edición del agente

> Estado: implementado · Última actualización: 2026-10-26

## Problema

El 2026-10-25 se le pidió al chat del editor que dejara "profesional" un video de 10 s
grabado con el celular. El resultado tenía cuatro problemas:

- Salió negro: el chat puso `brightness: 0.05` pensando en "+5 %", pero en esa escala
  1 es el valor normal.
- Los títulos quedaron en la misma pista que el video, así que aparecían después de
  que el video terminaba.
- La línea de tiempo duraba 20 s, el doble que el video, porque la música no se recortó.
- No hubo selección de tomas, cortes, movimiento ni capas de sonido. Además, nadie avisó
  que la fuente (480×864) se estiraba al 225 %.

## Modelo

El agente recibe el criterio por dos vías.

| Dónde | Qué lleva | Cuándo llega |
|---|---|---|
| `src/agent/systemPrompt.ts`, secciones *Domain rules* y *Verification* | Las cuatro trampas del caso real: los filtros usan 1 = normal; títulos y capas van en una pista superior dentro de su toma; la línea de tiempo termina con la última toma; ampliación > 150 % y largo total | Siempre: es el prompt base, y también lo recibe el CLI de Claude Code (`turn-runner.ts`, `--append-system-prompt-file`) |
| `src/agent/skills/multi-clips-to-reels/references/packaging-craft.md` | El criterio de empaquetado: duración de tomas, movimiento de cámara, transiciones, textos, capas y niveles de sonido, encuadre y fondos, color, calidad de fuente y checklist de QA | Al cargar la skill `multi-clips-to-reels`, que ahora también cubre "un clip corto del celular cortado en varias tomas" |

## Reglas

1. El prompt base solo lleva reglas que, si no se cumplen, rompen el resultado (negro,
   textos fuera de lugar, duración incorrecta, calidad no avisada). El criterio de gusto
   va en la referencia de la skill.
2. Los valores de la referencia son por defecto: el pedido del usuario manda.
3. `systemPromptOrder.verify.ts` comprueba que las cuatro trampas siguen en el prompt base.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Trampas en el prompt base y el criterio en una referencia | Todo en el prompt base | El prompt base se cachea y lo paga cada turno; el criterio de montaje solo hace falta al editar clips |
| Ampliar `multi-clips-to-reels` a "un clip corto cortado en varias tomas" | Una skill nueva | La selección y el arco ya están en esa skill; una nueva duplicaría el flujo y competiría con ella al elegir |
| Usar el audio propio del clip como ambiente | Silenciarlo o generar ambiente | La biblioteca no trae sonidos de naturaleza; el viento y los pasos reales hacen creíble el lugar sin depender de un proveedor |
| Recomendar "enviar como documento" en WhatsApp | Solo decir "usa una fuente mejor" | Es la causa más común de fuentes de 480p en el equipo, y la solución es concreta |

## Verificación

Resultados del 2026-10-26:

- `tsx src/agent/systemPromptOrder.verify.ts` → `ok`, con las cuatro aserciones nuevas
  sobre las trampas.
- `plugin-skills.verify.ts` → `ok (30 skills / 3 forms of frontmatter / references complete)` (salida traducida del chino): la
  referencia nueva existe y está enlazada. `skill-loading`, `skills-catalog` y
  `skill-deps` → `ok`.
- El caso real, editado a mano siguiendo esta referencia (2026-10-26): 5 tomas cortadas
  a 72 BPM en 7,5 s, acercamientos de 4–8 %, un barrido, textos animados, ambiente
  original al 30 %, música al 60 % con fundidos y dos efectos en su propia pista. Se
  revisó con `view_timeline_frames` en cada toma.

## Pendiente

- Medir si el chat sigue la referencia: repetir el pedido original con el chat del
  editor y comparar contra el checklist de QA.
- `long-video-to-shorts` y `beat-sync-montage` podrían enlazar la misma referencia.
  Hoy cada skill carga solo sus propios archivos.
