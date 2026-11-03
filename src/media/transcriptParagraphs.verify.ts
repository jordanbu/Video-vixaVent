import assert from 'node:assert/strict';
import { transcriptParagraphs, transcriptTimestamp } from './transcriptParagraphs';

// Timestamps are word-level milliseconds (TranscriptWord contract).
const word = (text: string, start: number, end: number) => ({ text, start, end });

// Continuous speech stays in one paragraph.
assert.deepEqual(
  transcriptParagraphs([word('\u4f60', 0, 200), word('\u597d', 200, 400), word('\u554a', 400, 600)]),
  [{ start: 0, text: '\u4f60\u597d\u554a' }],
  'no gap keeps one paragraph',
);

// A gap > 0.8s opens a new paragraph carrying its own start time.
assert.deepEqual(
  transcriptParagraphs([word('First line', 0, 800), word('Second line', 2500, 3100)]),
  [
    { start: 0, text: 'First line' },
    { start: 2500, text: 'Second line' },
  ],
  'gap > 800ms splits paragraphs',
);

// A gap ≤ 0.8s merges (boundary inclusive).
assert.deepEqual(
  transcriptParagraphs([word('a', 0, 400), word('b', 1200, 1600)]),
  [{ start: 0, text: 'ab' }],
  'gap exactly 800ms merges',
);

// Empty input yields no paragraphs.
assert.deepEqual(transcriptParagraphs([]), [], 'empty transcript');

// Chinese text concatenates without spaces; mixed text preserves word text.
assert.equal(
  transcriptParagraphs([word('\u6211', 0, 300), word('\u4eec', 300, 600)])[0]?.text,
  '\u6211\u4eec',
  'concatenation is verbatim',
);

// Timestamps: milliseconds → m:ss.
assert.equal(transcriptTimestamp(0), '0:00');
assert.equal(transcriptTimestamp(5000), '0:05');
assert.equal(transcriptTimestamp(65000), '1:05');
assert.equal(transcriptTimestamp(605000), '10:05');

console.log('transcriptParagraphs.verify: paragraphing and timestamps passed');
