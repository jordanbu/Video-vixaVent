// Runnable check: `npx tsx src/transcript/cutPad.verify.ts`.
// Verify the breathing opening of the deletion cut: only mute the opening cut by deletion/rearrangement, and the beginning and end of the segment itself will be muted
// The gap controlled by the compression rules will not be borrowed; the amount borrowed shall be based on the actual silence on site. If you cannot borrow, borrow less.
import assert from 'node:assert/strict';
import { keptSegments } from './edit';
import type { TranscriptWord } from './types';

const fps = 100; // 10ms one frame, so that milliseconds can be read directly into frames
// 100ms per word, 200ms between words mute: w0 [0,100] w1 [300,400] w2 [600,700] w3 [900,1000]
const words: TranscriptWord[] = [0, 1, 2, 3].map((i) => ({
  text: `w${i}`, start: i * 300, end: i * 300 + 100,
}));

const spans = (deleted: number[], cutPadFrames?: number) =>
  keptSegments(words, new Set(deleted), fps, 0, { cutPadFrames })
    .map((s) => [s.srcStartFrame, s.srcEndFrame]);

// ── Default (not passed) = old behavior, precise at word boundaries ──
{
  assert.deepEqual(spans([1]), [[0, 10], [60, 100]], 'without breathing room the cut points are exact');
  assert.deepEqual(spans([]), [[0, 100]], 'no deleted words means one whole segment');
}

// ── Borrow half on each side of the cut: 60 frames budget → 30 frames per side, 20 frames live mute, only borrow 20 ──
{
  assert.deepEqual(
    spans([1], 60),
    [[0, 30], [40, 100]],
    'the first segment tail borrows up to w1 start, the second head up to w1 end, both stopped by the live mute',
  );
}

// ── If the budget is less than the on-site silence, borrow according to the budget ──
{
  assert.deepEqual(spans([1], 20), [[0, 20], [50, 100]], '10 frames per side');
  assert.deepEqual(spans([1], 1), [[0, 10], [60, 100]], 'half rounds to 0, which means no borrowing');
}

// ── Only incisions are borrowed: after deleting the first/last word, the new one is the incision (borrowing), and the other end is not (not borrowing) ──
{
  assert.deepEqual(spans([3], 60), [[0, 90]], 'last word deleted → the end becomes a cut and borrows forward to w3 start');
  assert.deepEqual(spans([0], 60), [[10, 100]], 'first word deleted → the start becomes a cut and borrows back to w0 end');
  // When not a single word is deleted, neither end is a cut, and no matter how big the budget is, not a single frame is borrowed.
  assert.deepEqual(spans([], 600), [[0, 100]], 'the clip’s own start and end do not borrow');
}

// ── The gaps governed by the silent compression rules are not borrowed: the length has been determined by cap ──
{
  const capped = keptSegments(words, new Set(), fps, 0, { cutPadFrames: 60, gapCapsMs: { 1: 50 } })
    .map((s) => [s.srcStartFrame, s.srcEndFrame]);
  assert.deepEqual(capped, [[0, 15], [30, 100]], 'after the cap the w0 segment ends at 10+5 with no extra borrowing; the next head does not borrow either');
}

// ── Incisions caused by rearrangements are also considered incisions──
{
  const reordered = keptSegments(words, new Set(), fps, 0, { cutPadFrames: 60, playOrder: [2, 3, 0, 1] })
    .map((s) => [s.srcStartFrame, s.srcEndFrame]);
  assert.deepEqual(reordered, [[40, 100], [0, 60]], 'each segment borrows silence on the side that was cut');
}

// ── Timeline positions are still connected end to end: borrowed frames are included in the duration and cannot leave overlaps or holes ──
{
  const segs = keptSegments(words, new Set([1]), fps, 500, { cutPadFrames: 60 });
  let cursor = 500;
  for (const seg of segs) {
    assert.equal(seg.fromFrame, cursor, 'each segment follows the previous one directly');
    assert.equal(seg.durFrames, seg.srcEndFrame - seg.srcStartFrame, 'duration equals the source span after borrowing');
    cursor += seg.durFrames;
  }
}

console.log('cutPad.verify: ok (default unchanged/split per side/live-mute cap/no borrow at clip ends/no borrow past cap/reordered cuts/continuous timeline)');
