import assert from 'node:assert/strict';
import { classifyExternalFile, parseDroppedCaptions } from './externalFileDrop';

assert.deepEqual(classifyExternalFile({ name: 'viaje.mp4', type: 'video/mp4' }), {
  type: 'media', mediaKind: 'video',
});
assert.deepEqual(classifyExternalFile({ name: 'narración.mp3', type: 'audio/mpeg' }), {
  type: 'media', mediaKind: 'audio',
});
assert.deepEqual(classifyExternalFile({ name: 'subtítulos.srt', type: '' }), {
  type: 'caption', format: 'srt',
});
assert.deepEqual(
  parseDroppedCaptions(
    'subtítulos.srt',
    '1\n00:00:01,000 --> 00:00:02,500\nFirst line\n\n2\n00:00:03,000 --> 00:00:04,000\nSecond line',
    10000,
  ),
  [
    { text: 'First line', start: 10000, end: 11500 },
    { text: 'Second line', start: 12000, end: 13000 },
  ],
);
assert.deepEqual(
  parseDroppedCaptions('guion.txt', 'Line one\n\nLine two', 4000),
  [
    { text: 'Line one', start: 4000, end: 7000 },
    { text: 'Line two', start: 7000, end: 10000 },
  ],
);

console.log('externalFileDrop.verify: Finder media and caption classification OK');
