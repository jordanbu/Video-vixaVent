// Turn a low-level network failure from a remote media import into something the agent
// and the user can act on.
//
// The raw failure was `connect ETIMEDOUT 159.106.121.75:443`: an IP with no hostname, no
// hint that the address is simply unreachable from this network, and no pointer to the
// proxy setting that fixes it. download_media then registered the URL as a "remote src"
// and reported success, so a blocked host produced a dead asset and a misleading "done".
// Unreachable is a distinct outcome — it names the host, says what to change, and carries
// a code the tool can turn into a real failure instead of a downgrade.
import { PublicConnectTimeoutError, PublicResponseTimeoutError } from '../safe-public-fetch.ts';
import { outboundProxyUrl } from '../outbound-proxy.ts';
import { localized } from '../ui-locale.ts';

const UNREACHABLE_CODES: ReadonlySet<string> = new Set([
  'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH',
  'ENOTFOUND', 'EAI_AGAIN', 'EPIPE',
]);

export class ImportUnreachableError extends Error {
  readonly code = 'upstream_unreachable';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ImportUnreachableError';
  }
}

const hostOf = (remote: string): string => {
  try {
    return new URL(remote).host;
  } catch {
    return remote;
  }
};

const errorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
};

const DIRECT_REMEDY = {
  es: 'Puede que esta red bloquee el host o que haga falta un proxy. Revisa la conexión, configura PROXY_URL en Ajustes → Modelo del agente o usa una URL de media a la que se llegue directo.',
  en: 'The host may be blocked on this network or need a proxy. Check the connection, set PROXY_URL under Settings → Agent model, or use a media URL that is reachable directly.',
};
const PROXIED_REMEDY = {
  es: 'La solicitud ya pasó por el proxy y tampoco el proxy llega a este host. Revisa las reglas del proxy o usa una URL de media a la que pueda llegar.',
  en: 'The request already went through the proxy and the proxy could not reach this host either. Check the proxy rules, or use a media URL it can reach.',
};
const CONNECT_TIMEOUT = {
  es: (host: string, ms: number, address: string) => `Se agotó el tiempo al conectar con ${host} (sin conexión en ${ms} ms, ${address}). `,
  en: (host: string, ms: number, address: string) => `Connecting to ${host} timed out (no connection within ${ms}ms, ${address}). `,
};
const RESPONSE_TIMEOUT = {
  es: (host: string, ms: number, address: string) => `${host} aceptó la conexión pero no respondió en ${ms} ms (${address}). `,
  en: (host: string, ms: number, address: string) => `${host} accepted the connection but sent no response within ${ms}ms (${address}). `,
};
const UNREACHABLE = {
  es: (host: string, code: string) => `No se pudo conectar con ${host} (${code}). `,
  en: (host: string, code: string) => `Could not connect to ${host} (${code}). `,
};

/** Which of the two things the user can change is the one that matters right now, in the interface language. */
const remedy = (): string => localized(outboundProxyUrl() ? PROXIED_REMEDY : DIRECT_REMEDY);

/** Null when the failure is not a connectivity problem, so callers keep their own handling. */
export function unreachableImportError(error: unknown, remote: string): ImportUnreachableError | null {
  const host = hostOf(remote);
  if (error instanceof PublicConnectTimeoutError) {
    return new ImportUnreachableError(
      `${localized(CONNECT_TIMEOUT)(host, error.timeoutMs, error.address)}${remedy()}`,
      { cause: error },
    );
  }
  if (error instanceof PublicResponseTimeoutError) {
    return new ImportUnreachableError(
      `${localized(RESPONSE_TIMEOUT)(host, error.timeoutMs, error.address)}${remedy()}`,
      { cause: error },
    );
  }
  const code = errorCode(error);
  if (!code || !UNREACHABLE_CODES.has(code)) return null;
  return new ImportUnreachableError(`${localized(UNREACHABLE)(host, code)}${remedy()}`, { cause: error });
}
