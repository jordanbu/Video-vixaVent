// Versions saved with the shortcut used to be named "版本 11/1 10:35" (Chinese word,
// zh-CN date) whatever the interface language. The name now follows the interface.
// npx tsx src/shortcuts/versionName.verify.ts
import assert from 'node:assert/strict';

let saved = 'es';
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } },
});

const { ensureLocaleDict, setLocale } = await import('../i18n/locale');
const { shortcutVersionName } = await import('./versionName');
const when = new Date(2026, 10, 1, 10, 35);
const CJK = /[㐀-鿿]/;

await ensureLocaleDict('es');
const spanish = shortcutVersionName(when);
assert.ok(spanish.startsWith('Versión '), `Spanish name starts with "Versión": ${spanish}`);
assert.match(spanish, /1\/11/, `Spanish date is day/month: ${spanish}`);
assert.doesNotMatch(spanish, CJK, 'no Chinese in the Spanish name');

setLocale('en');
await ensureLocaleDict('en');
const english = shortcutVersionName(when);
assert.ok(english.startsWith('Version '), `English name starts with "Version": ${english}`);
assert.match(english, /11\/1/, `English date is month/day: ${english}`);
assert.doesNotMatch(english, CJK, 'no Chinese in the English name');

console.log(`versionName.verify: ${spanish} · ${english}`);
