import assert from 'node:assert/strict';

const documentElement = { lang: 'en' };
let persistedLocale = 'en';
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: () => persistedLocale,
    setItem: (_key: string, value: string) => { persistedLocale = value; },
  },
});
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { documentElement },
});

const { getLocale, setLocale } = await import('./locale');
assert.equal(getLocale(), 'en');
assert.equal(persistedLocale, 'en', 'initialization must preserve the saved language');
assert.equal(documentElement.lang, 'en', 'the persisted locale must set the initial document language');
setLocale('es');
assert.equal(persistedLocale, 'es');
assert.equal(documentElement.lang, 'es');

// Without a saved choice the app starts in Spanish, whatever the system language.
persistedLocale = '';
const fresh = await import(`./locale.ts?fresh=${Date.now()}`);
assert.equal(fresh.getLocale(), 'es', 'Spanish is the default interface language');

// A language that was removed (Chinese, Italian, Russian) resets to Spanish.
for (const removed of ['zh', 'it', 'ru']) {
  persistedLocale = removed;
  const legacy = await import(`./locale.ts?legacy=${removed}-${Date.now()}`);
  assert.equal(legacy.getLocale(), 'es', `a saved ${removed} choice resets to Spanish`);
}

// Only Spanish and English exist.
assert.deepEqual(fresh.ALL_LOCALES, ['es', 'en']);
assert.equal(fresh.isLocale('zh'), false, 'Chinese is no longer an interface language');

console.log('locale.verify: persisted and changed locales update the document language; Spanish is the default');
