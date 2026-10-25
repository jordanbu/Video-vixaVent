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
setLocale('zh');
assert.equal(persistedLocale, 'zh');
assert.equal(documentElement.lang, 'zh-CN');

setLocale('es');
assert.equal(persistedLocale, 'es');
assert.equal(documentElement.lang, 'es');

// Without a saved choice the app starts in Spanish, whatever the system language.
persistedLocale = '';
const fresh = await import(`./locale.ts?fresh=${Date.now()}`);
assert.equal(fresh.getLocale(), 'es', 'Spanish is the default interface language');

// A language the toggle no longer offers resets to Spanish.
persistedLocale = 'zh';
const legacy = await import(`./locale.ts?legacy=${Date.now()}`);
assert.equal(legacy.getLocale(), 'es', 'a saved Chinese choice resets to Spanish');

console.log('locale.verify: persisted and changed locales update the document language; Spanish is the default');
