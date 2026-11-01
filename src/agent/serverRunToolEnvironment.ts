import { getLocale } from '../i18n/locale';

/** Add concrete recovery steps only for execution-environment failures. */
export function environmentFailureHint(error: unknown): string {
  const base = error instanceof Error ? error.message : String(error);
  if (!/unavailable|not connected|app-server|cannot call|no editor|bridge|environment|execution/i.test(base)) {
    return base;
  }
  const hint = getLocale() === 'es'
    ? ' Si es una falla del entorno de ejecución, comprueba que el proyecto esté abierto, que Codex tenga sesión iniciada (Ajustes → Codex) y que el servicio de la app esté funcionando.'
    : ' If this is an execution-environment failure, verify the project is open, Codex is signed in (Settings → Codex), and the app service is running.';
  return `${base}${hint}`;
}
