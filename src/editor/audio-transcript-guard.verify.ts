// Audio transcript window guard checks: npx tsx src/editor/audio-transcript-guard.verify.ts
// ASR run on non-speech audio (sound effects) invents words: a 3s sting gets "Music" at 24.4s.
// AudioClip plays those words as source windows, so the effect is trimmed to a span with no sound at
// all; the timeline looks fine but nothing is audible. There are two guards:
//   1) a source window starting past the media length → dropped
//   2) the user deleted no words yet less than half of the clip is left → play the whole clip flat
// When neither applies the behavior is unchanged (real word-by-word deletions still apply).
import assert from 'node:assert/strict';
import { keptSegments } from '../transcript/edit';
import type { TranscriptWord } from '../transcript/types';
import { audibleTranscriptSegments } from './audioTranscriptGuard';

const fps = 30;
const segmentsOf = (words: TranscriptWord[], deleted: number[] = []) => keptSegments(words, new Set(deleted), fps, 0, {});

// Sound-effect hallucination 1: a 3s (90-frame) sting, ASR returns "Music" at 24.42–24.44s → the window starts outside the file
{
  const segs = segmentsOf([{ text: 'Music', start: 24420, end: 24440 }]);
  assert.ok(segs[0]!.srcStartFrame >= 90, 'keptSegments does return an out-of-range window (precondition)');
  assert.equal(audibleTranscriptSegments(segs, { durationInFrames: 90, deletedWordCount: 0, sourceDurationInFrames: 90 }), null,
    'out-of-range window → play flat');
}

// Sound-effect hallucination 2: a 1.8s (55-frame) sting with one fake word inside the file → 15 frames left, less than half
{
  const segs = segmentsOf([{ text: 'Uh', start: 500, end: 1000 }]);
  assert.equal(audibleTranscriptSegments(segs, { durationInFrames: 55, deletedWordCount: 0, sourceDurationInFrames: 55 }), null,
    'unedited yet most of it swallowed → play flat');
}

const speech: TranscriptWord[] = [
  { text: 'one', start: 0, end: 900 },
  { text: 'two', start: 1000, end: 1900 },
  { text: 'three', start: 2000, end: 2900 },
  { text: 'four', start: 3000, end: 3900 },
];

// Normal speech: the transcript covers the whole clip → follow the transcript as is
{
  const segs = segmentsOf(speech);
  assert.deepEqual(audibleTranscriptSegments(segs, { durationInFrames: 118, deletedWordCount: 0, sourceDurationInFrames: 120 }), segs,
    'full coverage → respect the transcript');
}

// Real word deletions: the user deleted three words, so the short remainder is intended → follow the transcript
{
  const segs = segmentsOf(speech, [1, 2, 3]);
  assert.deepEqual(audibleTranscriptSegments(segs, { durationInFrames: 118, deletedWordCount: 3, sourceDurationInFrames: 120 }), segs,
    'deletions present → respect the transcript');
}

// With an unknown media length there is no out-of-range check (only the swallow rule)
{
  const segs = segmentsOf(speech);
  assert.deepEqual(audibleTranscriptSegments(segs, { durationInFrames: 118, deletedWordCount: 0 }), segs, 'unknown length → no false positive');
}

// Partly out of range: windows inside the file stay, the ones outside are dropped
{
  const segs = [
    { srcStartFrame: 0, srcEndFrame: 60, fromFrame: 0, durFrames: 60 },
    { srcStartFrame: 733, srcEndFrame: 734, fromFrame: 60, durFrames: 1 },
  ];
  assert.deepEqual(audibleTranscriptSegments(segs, { durationInFrames: 61, deletedWordCount: 0, sourceDurationInFrames: 90 }), [segs[0]],
    'only out-of-range windows are dropped');
}

console.log('audio-transcript-guard.verify: ok (out-of-range dropped/swallowed clip plays flat/deleted words as usual/unknown length no false positive/partly out of range)');
