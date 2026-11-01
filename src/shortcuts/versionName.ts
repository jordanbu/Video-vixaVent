import { getLocale, t } from '../i18n/locale';

/**
 * Name for a version saved from the keyboard shortcut: "Versión 1/11, 10:35" in
 * Spanish, "Version 11/1, 10:35 AM" in English. Uses the interface language for
 * both the word and the date format.
 */
export function shortcutVersionName(now: Date = new Date()): string {
  const time = now.toLocaleString(getLocale(), {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return t('版本 {time}', { time });
}
