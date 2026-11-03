# Changelog

## 0.1.0 — 2026-10-25

Primera versión de Vixaventora.

### Producto

- Marca propia: nombre, logo provisorio, CLI `vixa`, carpeta de datos `~/.vixaventora`,
  appId `com.vixaventora.app` y extensión de proyecto `.vxproj`.
- La app no contacta servidores que no configuremos: el chequeo de actualizaciones y el
  catálogo de extensiones quedan apagados hasta definir `VIXAVENTORA_RELEASE_REPOSITORY` y
  `VITE_RESOURCE_REGISTRY_URL`.

### Español

- Interfaz completa en español y por defecto; el selector ofrece Español ⇄ Inglés.
- Nombres de plantillas, campos del inspector, efectos de sonido, estilos de diseño, atajos
  de teclado y flujos creativos en español.
- Mensajes del servidor, diálogos del escritorio, página de subida desde el celular y
  prompts MCP en español.
- El agente responde en español y reconoce pedidos en español para activar sus
  herramientas sin pasos extra.
- Proyecto de ejemplo con texto en español.

### Interfaz

- Corregido: los paneles y menús se veían transparentes y se encimaban (variables de tema
  sin definir).
- Corregido: el menú + de la línea de tiempo y el menú "Más" no se cerraban con Escape ni
  con clic afuera.
- Columnas de Ajustes, etiquetas del inspector y pestañas del panel de media ajustadas a los
  textos en español.

### Conexión con Claude

- Claude Code se conecta con `claude mcp add --scope user` o con el botón **Conectar** de
  "Agentes externos (MCP)". El repo ya no trae `.mcp.json`: definía otro servidor con el
  mismo nombre que, sin token, tapaba la conexión del usuario.

### Verificación

Ver la sección *Verificación* de cada spec en `specs/`.
