// The interface language, as the server knows it.
//
// Server-authored text that reaches the user — the remedy on a failed import, a note
// pushed into a run — used to be written in one fixed language, because the server has
// no navigator and no localStorage. The browser now mirrors its locale switch into the
// non-secret UI_LOCALE setting (src/i18n/localeSync.ts), so every server message can ask
// here instead of guessing. Unset means Spanish, the app's default language.
import { getKey } from './keystore.ts';

export type UiLocale = 'es' | 'en';

const LOCALES: ReadonlySet<string> = new Set(['es', 'en']);

export function parseUiLocale(value: unknown): UiLocale | null {
  const tag = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return LOCALES.has(tag) ? (tag as UiLocale) : null;
}

export function uiLocale(): UiLocale {
  return parseUiLocale(getKey('UI_LOCALE')) ?? 'es';
}

/** Pick the variant for the current interface language (Spanish or English). */
export function localized<T>(variants: { es: T; en: T }, locale: UiLocale = uiLocale()): T {
  return locale === 'en' ? variants.en : variants.es;
}
