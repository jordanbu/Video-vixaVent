#!/bin/sh
# Inicia Vixaventora en local (el servidor guarda el token MCP y no cambia al reiniciar).
# Uso: ./dev-with-mcp.sh
exec npm run dev:isolated
