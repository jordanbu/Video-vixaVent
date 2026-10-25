# Recursos del producto

Archivos estáticos que vienen con la app y se publican con cada versión. **No** son
material de proyectos subido por el usuario ni generado por IA.

| Carpeta / archivo | Prefijo de URL | Uso |
|---|---|---|
| `fonts/` | `/fonts/` | Fuentes CJK y de display incluidas (woff2) |
| `thumbnails/` | `/thumbnails/` | Miniaturas de la biblioteca de plantillas MG |
| `voice-samples/` | `/voice-samples/` | Muestras de voces TTS |
| `sound-effects/` | `/sound-effects/` | Biblioteca de efectos de sonido |
| `audio/` | `/audio/` | Pistas de audio de ejemplo |
| `media/` | `/media/` | Media de ejemplo del producto (por ejemplo speech-sample; **sin** uploads) |
| `luts/` | `/luts/` | LUTs `.cube` |
| `library-previews/` | `/library-previews/` | Imágenes de vista previa de la biblioteca |
| `plugins/` | `/plugins/` | Índice y ejemplos de plugins incluidos |
| `templates/` | `/templates/` | JSON de plantillas MG y de escenas (se importan al compilar) |
| `vendor-icons/` | `/vendor-icons/` | SVG de proveedores para la pantalla de ajustes (se importan al compilar) |
| `branding/` | — | Íconos de la app de escritorio (`.icns`) |
| `favicon.svg` / `icons.svg` | `/` | Íconos del sitio |

## Diferencia con `public/`

- **`assets/`** (esta carpeta) → recursos del producto, versionados en git.
- **`public/media/uploads/`** → solo uploads del usuario, contenido generado por IA e
  intermedios de exportación; ignorado por git.

En desarrollo y en el build, `server/product-assets.ts` (plugin de Vite) monta esta carpeta
en la raíz del sitio; la exportación con Remotion usa la misma superposición. Las URLs son
las mismas que cuando estos archivos vivían en `public/`.
