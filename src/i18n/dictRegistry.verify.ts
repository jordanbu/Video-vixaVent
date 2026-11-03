// Locale dictionaries are fetched per locale on demand, so t()/tData() read a
// table that may not be loaded yet. This pins the lookup semantics per language:
//   t:     en → EN · es → ES then EN
//   tData: en → EN_DATA · es → ES_DATA then EN_DATA
// and the "never go blank" contract while a dictionary is still in flight.
// npx tsx src/i18n/dictRegistry.verify.ts
import assert from 'node:assert/strict';

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => 'en', setItem: () => undefined },
});
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { documentElement: { lang: 'en' } },
});

const { ensureLocaleDict, localizedCatalogText, setLocale, t, tData } = await import('./locale.ts');
const { localeDicts } = await import('./dictRegistry.ts');
const { EN } = await import('./dict/en');
const { ES } = await import('./dict/es');
const { ES_DATA } = await import('./dict/es/data');
const EN_DATA = (await import('./dict/en/templates-data')).default;

// ── in flight: the English key stands in, never an empty string ─────────────
{
  const untranslatedYet = t('Export');
  assert.equal(untranslatedYet, 'Export',
    'before the dictionary lands, t() returns the key rather than blank');
  assert.equal(tData('Bar Chart - Annual Sales'), 'Bar Chart - Annual Sales',
    'tData() likewise passes the original through');
}

// ── en ──────────────────────────────────────────────────────────────────────
{
  await ensureLocaleDict('en');
  const key = Object.keys(EN)[0]!;
  assert.equal(t(key), EN[key], 'en reads the English dictionary');
  assert.equal(t('This key is in no dictionary'), 'This key is in no dictionary',
    'an unknown key falls back to the key itself');
  assert.deepEqual(EN_DATA, {}, 'built-in data is keyed in English, so en needs no data entries');
  assert.equal(tData('Vertical · Keyword Pop'), 'Vertical · Keyword Pop', 'en shows English-keyed data names as-is');
  assert.equal(localizedCatalogText('Undo', 'Undo'), 'Undo', 'en catalog labels use the English label');
}

// ── es: Spanish first, then English ─────────────────────────────────────────
{
  setLocale('es');
  await ensureLocaleDict('es');
  const spanish = Object.keys(ES).find((k) => ES[k] !== EN[k])!;
  assert.equal(t(spanish), ES[spanish], 'es reads the Spanish dictionary');
  const untranslated = Object.keys(EN).filter((k) => !(k in ES));
  assert.deepEqual(untranslated, [], 'every English UI entry has a Spanish translation');
  assert.equal(localeDicts('es').uiFallback, EN, 'es is wired to fall back to English for new keys');
  const dataKey = Object.keys(ES_DATA)[0]!;
  assert.equal(tData(dataKey), ES_DATA[dataKey], 'es data names read ES_DATA');
  assert.equal(localeDicts('es').dataFallback, EN_DATA, 'es is wired to fall back to EN_DATA for data names');
  assert.equal(localizedCatalogText('Undo', 'Undo'), 'Deshacer', 'catalog labels read the Spanish dictionary');
  assert.equal(localizedCatalogText('Brand new', 'Brand new label'), 'Brand new', 'an untranslated catalog label shows English');
  assert.equal(tData('Vertical · Keyword Pop'), 'Vertical · Palabra clave destacada', 'built-in template names read Spanish by their English key');
}

// ── placeholders survive the table swap ─────────────────────────────────────
{
  assert.equal(t('Missing {missing}', {}), 'Missing {missing}', 'an absent param leaves the placeholder');
  const withParam = Object.keys(ES).find((k) => /\{n\}/.test(k) && /\{n\}/.test(ES[k]!));
  assert.ok(withParam, 'the fixture needs a Spanish entry with an {n} placeholder');
  assert.equal(t(withParam, { n: 3 }), ES[withParam]!.replace(/\{n\}/g, '3'), 'placeholders are substituted');
}

console.log('dictRegistry.verify: per-locale lazy dictionaries preserve every lookup rule (es, en)');
