// Runnable contract check: `npx tsx src/transcript/variants.check.ts`.
// Focus: multilingual transcript variants stay consistent with word frames: variants carry text only,
// timestamps always come from the source.
import assert from 'node:assert';
import type { TranscriptWord, TranscriptVariant } from './types';
import { resolveVariantText, createVariant, upsertVariant, findVariantByLang } from './variants';
import { retimeWords } from './edit';
import { makeDraft } from '../editor/store';
import type { TimelineState } from '../editor/types';
import { docFromTimeline } from '../persist/projectStore';

const source: TranscriptWord[] = [
  { text: 'Hello', start: 0, end: 200, speaker: 'A' },
  { text: 'world', start: 200, end: 500, speaker: 'A' },
  { text: 'Goodbye', start: 500, end: 900, speaker: 'B' },
];

// ── 1) resolveVariantText: only text changes, start/end/speaker always come from the source; missing entries return the source word reference ──
const variant: TranscriptVariant = {
  id: 'v1', lang: 'English', kind: 'translation', label: 'English',
  words: [
    { i: 0, text: 'hello' },
    { i: 2, text: 'bye' },
    { i: 99, text: 'OUT_OF_RANGE' }, // out of range: must be ignored safely without touching any word
  ],
};
const out = resolveVariantText(source, variant);
assert.strictEqual(out.length, source.length, 'variant never changes word count');
assert.strictEqual(out[0].text, 'hello', 'i=0 text swapped');
assert.strictEqual(out[1].text, 'world', 'no entry for i=1 → source text');
assert.strictEqual(out[2].text, 'bye', 'i=2 text swapped');
// Every word's start/end/speaker equals the source word.
for (let i = 0; i < source.length; i++) {
  assert.strictEqual(out[i].start, source[i].start, `word ${i} start from source`);
  assert.strictEqual(out[i].end, source[i].end, `word ${i} end from source`);
  assert.strictEqual(out[i].speaker, source[i].speaker, `word ${i} speaker from source`);
}
// Out-of-range entries have no side effects: the unmapped i=1 returns the very same source word reference (no copy, no change)
assert.ok(Object.is(out[1], source[1]), 'untouched word keeps the source reference');

// ── 2) Empty variant = the source word array itself (byte-identical, backward compatible) ──
const empty: TranscriptVariant = { id: 'e', lang: 'x', kind: 'corrected', label: 'x', words: [] };
assert.ok(Object.is(resolveVariantText(source, empty), source), 'empty variant is a no-op (same array reference)');

// ── 3) Retiming after applying a variant gives exactly the same timeline as retiming the source ──
// (a translation changes text only; it must not reorder or move any word's frames)
const fps = 30;
const timedSource = retimeWords(source, new Set(), fps, 0);
const timedVariant = retimeWords(out, new Set(), fps, 0);
assert.strictEqual(timedVariant.length, timedSource.length, 'retime keeps the same word count');
for (let i = 0; i < timedSource.length; i++) {
  assert.strictEqual(timedVariant[i].start, timedSource[i].start, `retimed start ${i} unaffected by variant text`);
  assert.strictEqual(timedVariant[i].end, timedSource[i].end, `retimed end ${i} unaffected by variant text`);
}
// The text does follow the variant (the translation reaches the caption stream)
assert.strictEqual(timedVariant[0].text, 'hello');
assert.strictEqual(timedVariant[2].text, 'bye');

// ── 4) createVariant: boundary validation drops bad entries (LLM output is untrusted) ──
const built = createVariant({
  lang: '  Japanese  ', kind: 'translation',
  words: [
    { i: 0, text: 'こんにちは' },
    { i: -1, text: 'bad-index' },      // negative index → dropped
    { i: 1.5, text: 'bad-float' },     // not an integer → dropped
    { i: 2, text: 3 as unknown as string }, // not a string → dropped
  ],
});
assert.strictEqual(built.lang, 'Japanese', 'lang trimmed');
assert.strictEqual(built.label, 'Japanese', 'translation label defaults to lang');
assert.deepStrictEqual(built.words, [{ i: 0, text: 'こんにちは' }], 'only the valid word entry survives');
assert.ok(built.id.startsWith('var_'), 'variant gets an id');
assert.throws(() => createVariant({ lang: '   ', kind: 'translation', words: [] }), /lang is required/);

// ── 5) upsertVariant / findVariantByLang: immutable add/replace + lookup by language ──
const list0: TranscriptVariant[] = [];
const list1 = upsertVariant(list0, built);
assert.strictEqual(list0.length, 0, 'upsert does not mutate the input list');
assert.strictEqual(list1.length, 1);
const replaced = createVariant({ id: built.id, lang: 'Japanese', kind: 'translation', words: [{ i: 0, text: 'やあ' }] });
const list2 = upsertVariant(list1, replaced);
assert.strictEqual(list2.length, 1, 'same id replaces in place');
assert.strictEqual(list2[0].words[0].text, 'やあ');
assert.strictEqual(findVariantByLang(list2, 'Japanese', 'translation')?.id, built.id);
assert.strictEqual(findVariantByLang(list2, 'nope'), undefined);

// ── 6) Storage round trip: setItemVariants persists; transcript/timing/duration untouched ──
const state: TimelineState = {
  fps, width: 1920, height: 1080, selectedId: null,
  items: [{ id: 'clip', track: 'A1', startFrame: 0, durationInFrames: 24, name: 'vo', kind: 'audio', src: '/vo.mp3', transcript: source }],
};
const draft = makeDraft(docFromTimeline(state));
draft.commands.setItemVariants('clip', [variant]);
const item = draft.getState().items.find((it) => it.id === 'clip')!;
assert.strictEqual(item.variants?.length, 1, 'variant persisted on the item');
assert.strictEqual(item.variants![0].id, 'v1');
assert.deepStrictEqual(item.transcript, source, 'transcript words untouched by setItemVariants');
assert.strictEqual(item.durationInFrames, 24, 'clip duration untouched');

console.log('variants.check: ok');
