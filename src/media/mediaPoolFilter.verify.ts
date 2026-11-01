// The media pool sorts names in the interface language (it used a fixed 'zh-CN').
// npx tsx src/media/mediaPoolFilter.verify.ts
import assert from 'node:assert/strict';
import type { MediaAsset } from '../editor/types';

let saved = 'es';
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } },
});
const { setLocale } = await import('../i18n/locale');
const { filterMediaAssets } = await import('./mediaPoolFilter');

const asset = (name: string, index: number): MediaAsset => ({
  id: `a${index}`, name, kind: 'video', src: `/m/${index}.mp4`, durationInFrames: 30 * (index + 1),
} as MediaAsset);
const names = ['zeta', 'clip 10', 'Ñandú', 'nube', 'Clip 2', 'árbol', 'Ola'];
const assets = names.map(asset);
const sorted = () => filterMediaAssets({
  assets, query: '', semanticResults: null, type: 'all', favoritesOnly: false, sort: 'name',
}).visible.map((item) => item.name);

assert.deepEqual(sorted(), ['árbol', 'Clip 2', 'clip 10', 'nube', 'Ñandú', 'Ola', 'zeta'],
  'Spanish: á with a, numbers by value, ñ after n, case ignored');

setLocale('en');
assert.deepEqual(sorted().slice(0, 3), ['árbol', 'Clip 2', 'clip 10'], 'English keeps numeric order too');

console.log(`mediaPoolFilter.verify: ${sorted().join(' · ')}`);
