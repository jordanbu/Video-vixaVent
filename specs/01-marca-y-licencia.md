# 01 — Marca y licencia

> Estado: implementado · Última actualización: 2026-10-25

## Problema

El código base llegó con otra marca: nombre, logo, CLI, variables de entorno, carpeta de
datos, prefijos internos y enlaces a servidores y repositorios que no son nuestros. La app
además consultaba esos servidores mientras corría: buscaba actualizaciones en un repo
ajeno y bajaba el catálogo de extensiones de un dominio ajeno.

## Modelo

| Elemento | Valor |
|---|---|
| Nombre del producto | `Vixaventora` |
| Identificador (paquete, MCP, skills, archivos) | `vixaventora` |
| Prefijo de variables de entorno | `VIXAVENTORA_*`; las internas de build y smoke usan `VXV_*` |
| CLI | `vixa` (`cli/vixa.mjs`, `npm run vixa`) |
| Carpeta de datos | `~/.vixaventora` |
| Prefijo de clases CSS, atributos `data-*` y claves de `localStorage` | `vx-` / `vx.` |
| appId de escritorio | `com.vixaventora.app` |
| Logo | `public/vixaventora-icon.png`, `assets/branding/vixaventora-icon.icns`, `assets/favicon.svg` (provisorio: "V" con botón de play) |
| Versión | `0.1.0` |

## Reglas

1. La app no contacta ningún servidor que no esté configurado explícitamente por nosotros:
   - Actualizaciones: solo si `VIXAVENTORA_RELEASE_REPOSITORY=owner/repo` está definida al
     compilar. Sin ella, el chequeo automático no corre, el botón de Ajustes queda
     deshabilitado y el instalador de escritorio no incluye feed (`publish: null`).
   - Catálogo de extensiones: solo si `VITE_RESOURCE_REGISTRY_URL` está definida.
2. No usar dominios con nuestro nombre que no controlemos. Los únicos dominios
   `vixaventora.*` del código son `.local` y `.test`, que no resuelven en internet.
3. El archivo `LICENSE` se mantiene tal cual. No nombra a nadie: es el texto genérico de
   la AGPL-3.0, y es lo que nos da derecho a usar y modificar el código.
4. **Uso interno solamente.** El código base está bajo AGPL-3.0-or-later y las skills de
   `src/agent/skills/` son GPL-3.0. Mientras el código y los instaladores no salgan de la
   empresa, esas licencias no exigen avisos de autoría ni publicar el código. Si algún día
   se entrega a un cliente, se publica el repo, se reparten instaladores afuera o se ofrece
   como servicio a terceros, hay que restaurar los avisos de origen y publicar el código
   fuente. Antes de hacer cualquiera de esas cosas, revisión legal.
5. Remotion (preview y render) tiene licencia propia: es gratis para empresas de hasta 3
   empleados o mientras se evalúa sin uso comercial. En uso productivo con más gente, el
   plan que corresponde es *Creators* (US$25/mes por persona).

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Reemplazo mecánico en todo el repo con un script, excluyendo `LICENSE`, las licencias de fuentes y los binarios de terceros minificados (`public/models/`) | Editar archivo por archivo | Eran más de 1.500 menciones en cientos de archivos; el script es reproducible y los tests detectan lo que se rompa |
| Renombrar también los prefijos cortos `cc-`, `cc.` y `CC_` | Dejarlos por ser internos | Eran la abreviatura de la marca anterior y se ven en el código, en el DOM y en el `localStorage` |
| No renombrar la variable `occ` de `src/geometry/` | Reemplazar `occ` en todos lados | Ahí significa *occupancy grid*, no es el nombre del CLI |
| Feed de actualizaciones apagado por defecto | Apuntarlo a un repo con nuestro nombre | Si alguien registrara ese repo podría publicar "actualizaciones" que la app instalaría. Solo se activa con un repo que controlemos |
| Historia de git nueva (un commit inicial) | Conservar el historial anterior | Pedido explícito: el proyecto debe quedar limpio |
| Mantener `LICENSE` | Borrarlo | Ver regla 3: sin ese archivo, quien herede el repo no sabría las condiciones del código y podría distribuirlo sin saberlo |

## Verificación

Resultados del 2026-10-25 (Node 24.22.1, macOS arm64):

- Búsqueda del nombre, el autor y los enlaces de la marca anterior en todos los archivos del repo → sin resultados.
- `npm run lint` → 0 errores. `npx tsc -b` → OK. `vite build` → OK.
- `npm test`: ver la corrida final registrada en `CHANGELOG.md`.
- El renombre de prefijos rompió las variables de tema (`src/skins.ts` generaba `--cc-*`);
  lo detectaron `skins.verify.ts` y `theme-tokenization.verify.ts` y se corrigió.

## Pendiente

- Logo definitivo: el actual es provisorio. Reemplazar los tres archivos del Modelo.
- Plantillas de motion graphics (`assets/templates/`): no se conoce su origen. Si el
  producto va a salir de la empresa, reemplazarlas por plantillas propias.
- Los comentarios del código siguen mezclando inglés y chino. No afectan al usuario;
  traducirlos no entra en este cambio.
