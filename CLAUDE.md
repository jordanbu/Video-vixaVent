# Vixaventora

Editor de video con IA de uso interno: timeline multipista + agente conversacional + MCP.
Ver `README.md` para correrlo y `config/README.md` para la estructura del repo.

## Reglas del proyecto

- Node 24 obligatorio (`.nvmrc`, `engines` en `package.json`).
- Antes de cerrar un cambio: `npm run lint`, `npm test` y `npm run build`.
- Todo cambio de lógica no trivial lleva su chequeo ejecutable (`*.verify.ts`) y se
  agrega al script `verify:*` que corresponda en `package.json`.
- La app está en **español por defecto**. Las claves de i18n son el texto chino original
  (`t('…')`); todo texto nuevo de UI necesita su traducción en `src/i18n/dict/es/` y en
  `src/i18n/dict/en/`. Ver `specs/02-idioma-espanol.md`.
- Nunca exponer credenciales al navegador con `VITE_`. Las API keys viven en el keystore
  del servidor.
- La app no contacta servidores que no hayamos configurado. Ver `specs/01-marca-y-licencia.md`.
- Uso interno solamente: no entregar código ni instaladores fuera de la empresa sin
  revisar `specs/01-marca-y-licencia.md`.

## Spec plans

Los specs viven en `specs/`, uno por tema y numerados (`NN-tema.md`). La plantilla es
`specs/00-template.md` y la configuración del flujo está en `specs/.spec-config.yml`
(no crea ramas automáticamente; prefijo de rama `spec-`).

- Antes de implementar una feature, leer su spec. Si no existe, escribirlo primero.
- Cada spec tiene: Problema · Modelo · Reglas · **Decisiones** (con la alternativa
  descartada y el porqué) · **Verificación** (con resultados reales) · **Pendiente**.
- Si una decisión cambia, el spec se actualiza en el mismo cambio que toca el código.
