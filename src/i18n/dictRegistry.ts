// The locale dictionaries are large. Importing them statically put both in the
// entry chunk, so every user downloaded and parsed a language they were not
// using before the first frame. Each locale is fetched on demand instead.
//
// t()/tData() stay SYNCHRONOUS: they read whatever is loaded and fall back to
// the Chinese original, which is also the dictionary key — the same "never go
// blank" contract locale.ts always had. main.tsx awaits the active locale's
// dictionary before the first render, so no rendered frame sees the fallback.
import type { Locale } from './locale';

export interface LocaleDicts {
  /** UI copy for the active locale. */
  readonly ui: Record<string, string>;
  /** UI copy consulted when `ui` has no entry (Spanish falls back to English). */
  readonly uiFallback: Record<string, string>;
  /** Display names for **data** (template/sound/music names). */
  readonly data: Record<string, string>;
  /** Data names consulted when `data` has no entry. */
  readonly dataFallback: Record<string, string>;
}

const EMPTY: Record<string, string> = Object.freeze({});

/** Nothing loaded: every lookup falls through to the Chinese original. */
const NONE: LocaleDicts = Object.freeze({
  ui: EMPTY, uiFallback: EMPTY, data: EMPTY, dataFallback: EMPTY,
});

// Replaced, never mutated, so a lookup mid-load sees one consistent snapshot.
let loaded: Readonly<Partial<Record<Locale, LocaleDicts>>> = {};
const inFlight = new Map<Locale, Promise<void>>();

async function fetchDicts(locale: Locale): Promise<LocaleDicts> {
  if (locale === 'en') {
    const [en, enData] = await Promise.all([
      import('./dict/en'), import('./dict/en/templates-data'),
    ]);
    return { ui: en.EN, uiFallback: EMPTY, data: enData.default, dataFallback: EMPTY };
  }
  // Spanish falls back to English for anything not translated yet, never to Chinese.
  const [es, esData, en, enData] = await Promise.all([
    import('./dict/es'), import('./dict/es/data'),
    import('./dict/en'), import('./dict/en/templates-data'),
  ]);
  return { ui: es.ES, uiFallback: en.EN, data: esData.ES_DATA, dataFallback: enData.default };
}

/** The dictionaries currently in memory for `locale` (empty until loaded). */
export function localeDicts(locale: Locale): LocaleDicts {
  return loaded[locale] ?? NONE;
}

/** True once `locale`'s dictionaries are in memory and lookups are complete. */
export function localeDictReady(locale: Locale): boolean {
  return loaded[locale] !== undefined;
}

/** Load `locale`'s dictionaries once; concurrent callers share the same fetch. */
export function ensureLocaleDict(locale: Locale): Promise<void> {
  const pending = inFlight.get(locale);
  if (pending) return pending;
  const task = fetchDicts(locale)
    .then((dicts) => { loaded = { ...loaded, [locale]: dicts }; })
    .catch(() => {
      // A failed chunk fetch (offline, stale deploy) must not blank the UI —
      // t() keeps returning the Chinese original. Drop the memo so switching
      // back to this locale retries instead of being stuck on the failure.
      inFlight.delete(locale);
    });
  inFlight.set(locale, task);
  return task;
}
