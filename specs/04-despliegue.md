# 04 — Despliegue

> Estado: borrador · Última actualización: 2026-10-25

## Problema

Vixaventora se va a usar internamente y hay que decidir dónde corre. El servidor está
pensado para un usuario o equipo por instancia: no tiene cuentas de usuario, guarda todo
en disco local (SQLite + media) y el editor exige HTTPS fuera de `localhost`.

## Modelo

El servidor de producción es `desktop/embedded-server.ts`: un HTTP de Node que monta los
plugins de `server/plugins/`. No depende de Electron. Hoy solo escucha en `127.0.0.1`.

| Opción | Cómo | Esfuerzo |
|---|---|---|
| A. App de escritorio | Instaladores de `npm run desktop:dist*`; cada persona edita en su máquina | Bajo. Para actualizaciones automáticas, compilar con `VIXAVENTORA_RELEASE_REPOSITORY` |
| B. Web en una VM de GCP | Compute Engine + disco persistente + Load Balancer HTTPS + IAP (login con Google) + Secret Manager. Una VM por equipo | Medio: falta un arranque headless para servidor y probar el render de Remotion en Linux |
| C. SaaS multiusuario | Cuentas, almacenamiento por usuario, base de datos, cola de renders | Alto: es reescribir el backend |

## Reglas

1. Cloud Run no sirve tal cual: disco efímero, SQLite sobre GCS sin locks, renders largos
   y varias instancias con estado partido.
2. Nunca exponer el editor sin HTTPS y sin control de acceso (IAP o equivalente).

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Mantener Remotion y pagar el plan *Creators* si se adopta | Reemplazar Remotion por un motor propio | Reemplazarlo son 2–3 meses de trabajo más mantenimiento; el plan cuesta US$25/mes por persona |

## Verificación

Nada desplegado todavía.

## Pendiente

- Elegir entre A y B.
- Para B: escribir el entrypoint headless (`server/start.ts` o similar), probar render y
  exportación en una VM Linux y escribir la infraestructura (Terraform o scripts `gcloud`).
- Es el requisito para conectar claude.ai por web (spec 03).
