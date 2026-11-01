// Language status + t(): The original Chinese text is the key (no additional key namespace is created),
// if the active-language dictionary is not loaded yet, it falls back to that key.
// Never go blank. Only Spanish and English exist (specs/02-idioma-espanol.md). Switch persistence localStorage('vx.locale'), subscription rerendering (useSyncExternalStore).
// Rules: Use useT() (subscription switching) in React components; pure helper modules can directly import { t }
//  — As long as the component that renders its output calls useT(), it will be recalculated when switching languages.
// LLM interface (systemPrompt/tool ​​description/skill content) and persistent dynamic history tags do not enter i18n.
// Default language: the saved choice wins; otherwise Spanish, whatever the system language.
import { useSyncExternalStore } from 'react';
import { ensureLocaleDict, localeDictReady, localeDicts } from './dictRegistry';

export { ensureLocaleDict } from './dictRegistry';

export type Locale = 'es' | 'en';

/** Every interface language; the toggle cycles through them in this order. */
export const ALL_LOCALES: readonly Locale[] = ['es', 'en'];

export const DEFAULT_LOCALE: Locale = 'es';

const STORAGE_KEY = 'vx.locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (ALL_LOCALES as readonly string[]).includes(value);
}

function readInitial(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // A language that no longer exists (zh, it, ru saved by an older build) resets to Spanish.
    if (isLocale(stored)) return stored;
  } catch {
    // Private mode / storage disabled → default language below.
  }
  return DEFAULT_LOCALE;
}

let current: Locale = readInitial();
if (typeof document !== 'undefined') document.documentElement.lang = current;
const subscribers = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

/** Subscribe to locale switches; returns the unsubscribe function. */
export function subscribeLocale(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => { subscribers.delete(onChange); };
}

export function localeLanguageName(locale: Locale): 'Spanish' | 'English' {
  return locale === 'es' ? 'Spanish' : 'English';
}

/** Catalog labels carry English and Chinese; Spanish looks the Chinese label up in its UI dictionary. */
export function localizedCatalogText(
  english: string,
  chinese: string,
  locale: Locale = current,
): string {
  if (locale === 'en') return english;
  return localeDicts(locale).ui[chinese] ?? english;
}

function notifySubscribers(): void {
  subscribers.forEach((notify) => notify());
}

export function setLocale(next: Locale): void {
  if (next === current) return;
  const alreadyLoaded = localeDictReady(next);
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch { /* If the private mode cannot be saved, it will only affect this session */ }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next;
  }
  // Switch the UI now — an unloaded dictionary renders the Chinese original
  // rather than nothing — then re-render once the dictionary lands. In practice
  // prefetchLocaleDicts() has already loaded it and no second pass happens.
  notifySubscribers();
  if (!alreadyLoaded) void ensureLocaleDict(next).then(notifySubscribers);
}

/**
 * Warm the dictionaries the user has not selected, so switching language is
 * instant. Call after the first paint — never before, it competes with it.
 */
export function prefetchLocaleDicts(): void {
  for (const locale of ALL_LOCALES) {
    if (locale !== current) void ensureLocaleDict(locale);
  }
}

/** t('Selected {n}', { n: 3 }) - The Chinese original text is the key; the placeholder {name} has the same name in both languages. */
export function t(zh: string, params?: Record<string, string | number>): string {
  const { ui, uiFallback } = localeDicts(current);
  const raw = ui[zh] ?? uiFallback[zh] ?? zh;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

/** Data localization: **data** names (template names, etc.) are displayed in the current language by table lookup. If not found, they are returned as they are.
 * Built-in data is keyed in English (shown as-is in en, ES_DATA in es); Chinese-keyed data (self-made packages) reads EN_DATA in en.
 * It is only used for display and does not change the data itself (the name is also a reference key). */
export function tData(text: string): string {
  const { data, dataFallback } = localeDicts(current);
  return data[text] ?? dataFallback[text] ?? text;
}

/** Get t in the component: subscribe to language switching, trigger rerendering of this component when switching. */
export function useT(): typeof t {
  useSyncExternalStore(
    (onChange) => {
      subscribers.add(onChange);
      return () => subscribers.delete(onChange);
    },
    () => current,
    () => current,
  );
  return t;
}
