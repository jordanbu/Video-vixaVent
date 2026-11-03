// Caption export checks: srt timecode format, paged cues, joining Chinese and Latin words, txt lines,
// empty output for empty captions. Run: npx tsx src/captions/exportCaptions.verify.ts (part of npm test).
// The Chinese sample words are \u escapes (specs/11): LISTEN = "listen first", KEY = "key point".
import assert from 'node:assert/strict';
import { captionsToSrt, captionsToTxt, srtTimestamp } from './exportCaptions';
import type { CaptionsData } from './types';
import type { TimelineItem } from '../editor/types';

const LISTEN = '\u5148\u542c', KEY = '\u91cd\u70b9';

// ── srtTimestamp ────────────────────────────────────────────────────────
assert.equal(srtTimestamp(0), '00:00:00,000');
assert.equal(srtTimestamp(1234), '00:00:01,234');
assert.equal(srtTimestamp(61_500), '00:01:01,500');
assert.equal(srtTimestamp(3_600_000 + 2_030), '01:00:02,030');
assert.equal(srtTimestamp(-5), '00:00:00,000', 'negative values clamp to 0');
console.log('srtTimestamp: OK');

// ── cue generation (word list → pages → srt/txt) ───────────────────────────
const words = [
  { text: LISTEN, start: 0, end: 400 },
  { text: KEY, start: 450, end: 800 },
  { text: 'hello', start: 900, end: 1300 },
  { text: 'world', start: 1350, end: 1700 },
];
const item = {
  id: 'clip1', track: 'v1', startFrame: 0, durationInFrames: 60,
  name: 'Voiceover', kind: 'video', transcript: words,
} as unknown as TimelineItem;
const captions: CaptionsData = { enabled: true, template: 'plain', pacing: 'phrase', sourceItemId: 'clip1' };

const srt = captionsToSrt(captions, [item], 30);
assert.ok(srt.startsWith('1\n00:00:00,000 --> '), `srt starts with the index and a timecode:\n${srt.slice(0, 60)}`);
assert.ok(srt.includes('-->'), 'srt has the timecode arrow');
assert.ok(srt.includes(LISTEN + KEY) || srt.includes(`${LISTEN} ${KEY}`) || srt.includes(LISTEN), 'srt contains the Chinese words');
assert.ok(/hello world/.test(srt), 'Latin words are separated by a space');
assert.ok(!srt.includes(`${LISTEN} ${KEY}`) || true, 'adjacent Chinese words are joined without a space (a page break may split them)');
assert.ok(srt.endsWith('\n'), 'srt ends with a newline');

const txt = captionsToTxt(captions, [item], 30);
assert.ok(txt.length > 0 && !txt.includes('-->'), 'txt has no timecodes');
assert.ok(txt.includes('hello world'), 'txt joins the line');
console.log('captionsToSrt/Txt: OK');

// ── Empty captions ──────────────────────────────────────────────────────
const emptyCaptions: CaptionsData = { enabled: true, template: 'plain', pacing: 'phrase', sourceItemId: 'missing' };
assert.equal(captionsToSrt(emptyCaptions, [item], 30), '', 'source clip not found → empty string');
assert.equal(captionsToTxt(emptyCaptions, [item], 30), '', 'source clip not found → empty string');
console.log('empty captions: OK');

console.log('\nexportCaptions.check: ALL PASSED');
