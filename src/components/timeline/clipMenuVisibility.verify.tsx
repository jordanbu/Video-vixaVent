// The clip context menu hides entries that never apply to the clip's kind and keeps
// the ones that apply but are missing something disabled (specs/09).
// npx tsx --tsconfig tsconfig.app.json src/components/timeline/clipMenuVisibility.verify.tsx
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// The menu clamps its first position to the window size while rendering.
Object.defineProperty(globalThis, 'window', { configurable: true, value: { innerWidth: 1440, innerHeight: 900 } });
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => 'es', setItem: () => undefined },
});

const { ensureLocaleDict } = await import('../../i18n/locale');
const { clipMenuVisibility } = await import('./clipMenuVisibility');
const { ClipContextMenu } = await import('./ClipContextMenu');
type Item = Parameters<typeof clipMenuVisibility>[0];
await ensureLocaleDict('es');

const clip = (kind: Item['kind'], patch: Partial<Item> = {}): Item => ({
  id: `c-${kind}`, track: kind === 'audio' ? 'A1' : 'V1', startFrame: 0, durationInFrames: 60,
  name: kind, kind, ...(kind === 'video' || kind === 'audio' || kind === 'image' ? { src: `/m/${kind}` } : {}), ...patch,
} as Item);
const none = { inMulticamGroup: false, linked: false };

// ── the rule, kind by kind ──
const video = clipMenuVisibility(clip('video'), none);
assert.deepEqual(video, { multicam: true, linkAudioVideo: true, effects: true, speed: true, relink: true, exportMg: false, convertToVideo: true });
const audio = clipMenuVisibility(clip('audio'), none);
assert.deepEqual(audio, { multicam: true, linkAudioVideo: true, effects: false, speed: true, relink: true, exportMg: false, convertToVideo: false });
const mg = clipMenuVisibility(clip('motion-graphic'), none);
assert.deepEqual(mg, { multicam: false, linkAudioVideo: false, effects: true, speed: false, relink: false, exportMg: true, convertToVideo: true });
assert.equal(clipMenuVisibility(clip('text'), none).exportMg, true);
assert.equal(clipMenuVisibility(clip('sequence'), none).speed, true, 'a nested sequence has a speed');
assert.equal(clipMenuVisibility(clip('image'), none).relink, true);
assert.equal(clipMenuVisibility(clip('video', { src: undefined }), none).relink, false, 'nothing to relink without a file');
assert.equal(clipMenuVisibility(clip('video', { src: undefined }), none).multicam, false, 'multicam needs media');
// An existing group keeps its entry so it can be undone.
assert.equal(clipMenuVisibility(clip('motion-graphic'), { inMulticamGroup: false, linked: true }).linkAudioVideo, true);
assert.equal(clipMenuVisibility(clip('motion-graphic'), { inMulticamGroup: true, linked: false }).multicam, true);

// ── the rendered menu ──
const render = (item: Item) => renderToStaticMarkup(createElement(ClipContextMenu, {
  item, transitions: [], x: 10, y: 10, playhead: 999, commands: {} as never,
  timeline: { fps: 30, width: 1920, height: 1080, items: [item], tracks: { V1: { kind: 'video' }, A1: { kind: 'audio' } }, trackOrder: ['V1', 'A1'], transitions: [] } as never,
  selectedIds: [item.id], fxClip: null, onCopyFx: () => undefined, onClose: () => undefined,
  onExportMg: () => undefined, onConvertToVideo: () => undefined, onAddComment: () => undefined,
  onAddToChat: () => undefined, onRelinkFile: () => undefined,
}));
const has = (markup: string, label: string) => markup.includes(`>${label}</span>`);
const separators = (markup: string) => (markup.match(/height:0\.5px/g) ?? []).length;

const mgMenu = render(clip('motion-graphic'));
for (const hidden of ['Velocidad', 'Volver a vincular archivo', 'Sincronización multicámara con IA']) {
  assert.ok(!has(mgMenu, hidden), `a motion graphic hides "${hidden}"`);
}
for (const shown of ['Exportar animación MG', 'Convertir a video', 'Copiar efectos', 'Pegar efectos', 'Dividir', 'Eliminar']) {
  assert.ok(has(mgMenu, shown), `a motion graphic shows "${shown}"`);
}
assert.match(mgMenu, /disabled=""[^>]*>(?:(?!<button).)*Pegar efectos/s, 'paste stays disabled while nothing is copied');
assert.match(mgMenu, /disabled=""[^>]*>(?:(?!<button).)*Dividir/s, 'split stays disabled with the playhead outside the clip');

const audioMenu = render(clip('audio'));
for (const hidden of ['Copiar efectos', 'Pegar efectos', 'Convertir a video', 'Exportar animación MG']) {
  assert.ok(!has(audioMenu, hidden), `an audio clip hides "${hidden}"`);
}
assert.ok(has(audioMenu, 'Velocidad') && has(audioMenu, 'Volver a vincular archivo'));

const videoMenu = render(clip('video'));
assert.ok(!has(videoMenu, 'Exportar animación MG'));
assert.ok(has(videoMenu, 'Velocidad') && has(videoMenu, 'Convertir a video'));

// Hidden entries never leave two separators in a row, or one at an edge.
for (const [name, markup] of [['mg', mgMenu], ['audio', audioMenu], ['video', videoMenu]] as const) {
  assert.doesNotMatch(markup, /height:0\.5px[^<]*<\/div><div style="height:0\.5px/, `${name}: no double separator`);
  assert.ok(separators(markup) >= 4, `${name}: groups are still separated`);
}
const itemsIn = (markup: string) => (markup.match(/<button/g) ?? []).length;
console.log(`clipMenuVisibility.verify: entries — motion graphic ${itemsIn(mgMenu)}, audio ${itemsIn(audioMenu)}, video ${itemsIn(videoMenu)}`);
