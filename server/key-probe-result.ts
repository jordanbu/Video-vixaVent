export interface ProbeResult {
  ok: boolean;
  message: string;
  status?: number;
  latencyMs?: number;
  models?: string[];
}

export function parseModelCatalog(bodyText: string): string[] {
  try {
    const body = JSON.parse(bodyText) as {
      data?: Array<{ id?: unknown; name?: unknown }>;
      models?: Array<{ id?: unknown; name?: unknown }>;
    };
    const rows = Array.isArray(body.data) ? body.data : Array.isArray(body.models) ? body.models : [];
    return [...new Set(rows
      .map((row) => typeof row.id === 'string' ? row.id : typeof row.name === 'string' ? row.name : '')
      .map((id) => id.trim())
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/** Cheaper Inference also lists image/video models; chat keeps text and untyped rows. */
export function parseTextModelCatalog(bodyText: string): string[] {
  try {
    const body = JSON.parse(bodyText) as { data?: Array<{ type?: unknown } | null> };
    if (!Array.isArray(body.data)) return parseModelCatalog(bodyText);
    const data = body.data.filter((row) => row != null && (row.type === undefined || row.type === 'text'));
    return parseModelCatalog(JSON.stringify({ data }));
  } catch {
    return [];
  }
}

export function sanitizeProbeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 140);
}

/** MiniMax: HTTP 200 may also cause authentication failure, the truth is in base_resp.status_code(0 = success).*/
export function minimaxPostCheck(bodyText: string): string | null {
  try {
    const body = JSON.parse(bodyText) as { base_resp?: { status_code?: number; status_msg?: string } };
    const code = body.base_resp?.status_code ?? 0;
    if (code === 0) return null;
    const msg = body.base_resp?.status_msg ?? '';
    const hint = code === 1004 ? ' (clave rechazada, revísala)' : '';
    return `MiniMax base_resp ${code}${msg ? ` · ${sanitizeProbeText(msg)}` : ''}${hint}`;
  } catch {
    return null; // Non-JSON 2xx are counted as successful
  }
}

/** Doubao 音频生成新版接口：HTTP 200 也可能带业务 code，非 0 即失败。 */
export function doubaoPostCheck(bodyText: string): string | null {
  try {
    const body = JSON.parse(bodyText) as { code?: number; message?: string };
    if (body.code == null || body.code === 0) return null;
    const hint = body.code === 401 || body.code === 403 ? ' (clave rechazada, revisa la API key)' : '';
    return `Doubao ${body.code}${body.message ? ` · ${sanitizeProbeText(body.message)}` : ''}${hint}`;
  } catch {
    return null; // Non-JSON 2xx are counted as successful
  }
}

/** Convert a provider response into a user-facing connectivity conclusion. */
export function classifyStatus(status: number, bodyText: string): ProbeResult {
  if (status === 401 || status === 403) {
    return { ok: false, status, message: `Clave rechazada (HTTP ${status}) · la clave no es válida, venció o no tiene permiso para esta API` };
  }
  if (status === 404) {
    return { ok: false, status, message: 'El endpoint de prueba devolvió 404 · puede que la URL base esté mal (o que el servicio no reconozca esta ruta de prueba)' };
  }
  if (status === 429) {
    return { ok: true, status, message: 'Clave aceptada (HTTP 429 por límite de solicitudes: la clave es válida)' };
  }
  const detail = sanitizeProbeText(bodyText);
  return { ok: false, status, message: `HTTP ${status}${detail ? ` · ${detail}` : ''}` };
}

/** Distinguish transport failures from rejected credentials. */
export function networkMessage(error: unknown): string {
  const raw = error instanceof Error
    ? `${error.name}: ${error.message}${error.cause instanceof Error ? ` (${error.cause.message})` : ''}`
    : String(error);
  if (/timeout|abort/i.test(raw)) {
    return 'Tiempo de conexión agotado · el servicio no responde o la red está restringida (puede hacer falta un proxy); no significa que la clave esté mal';
  }
  return `Red inaccesible · ${sanitizeProbeText(raw)} · este equipo no llega al servicio (puede hacer falta un proxy); no significa que la clave esté mal`;
}
