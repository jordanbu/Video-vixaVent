// Runnable self-check: `npx tsx src/components/chat/widget-parse-check.verify.ts`
// Covers a widget sample + formatWidgetAnswer building the answer + tolerance of malformed widgets.
import assert from 'node:assert';
import {
  parseWidgets, formatWidgetAnswer,
  type FormMulti, type FormRichChoice, type FormSingle,
} from './widget-parse';

const REAL_EXAMPLE = `Great! Before we start, I need a few key details:

<widget>
  <form-single id="duration" label="How long should the video be?" options="60s|About 1 minute,180s|About 3 minutes,300s|About 5 minutes" allow_other="false"/>
  <form-single id="ratio" label="Video aspect ratio" options="16:9|Landscape 16:9,9:16|Vertical 9:16,1:1|Square"/>
  <form-multi id="content" label="What should it focus on? (multiple choice)" options="Life story,Key poems,Historical context"/>
  <form-visual id="voiceId" label="Choose a voice" required="true">
    <visual-option value="ruyayichen" name="Ruya Yichen" media="/voice-samples/doubao-ruyayichen.mp3" aspect-ratio="16:5" summary="Male / young / refined"/>
    <visual-option value="morgan" name="Morgan" media="/voice-samples/x.mp3" summary="..."/>
  </form-visual>
</widget>`;

// ---- Segment order + field parsing ----
const segs = parseWidgets(REAL_EXAMPLE);
assert.strictEqual(segs.length, 2, 'there should be 2 segments (text + widget)');
assert.strictEqual(segs[0].type, 'text');
assert.ok(segs[0].type === 'text' && segs[0].text.includes('Great! Before we start'));
assert.strictEqual(segs[1].type, 'widget');
assert.ok(segs[1].type === 'widget');
const fields = segs[1].type === 'widget' ? segs[1].fields : [];
assert.strictEqual(fields.length, 4, 'should parse 4 fields');

const [duration, ratio, content, voiceId] = fields as [
  FormSingle,
  FormSingle,
  FormMulti,
  FormRichChoice,
];

assert.strictEqual(duration.kind, 'single');
assert.strictEqual(duration.id, 'duration');
assert.strictEqual(duration.label, 'How long should the video be?');
assert.strictEqual(duration.allowOther, false);
assert.deepStrictEqual(duration.options, [
  { value: '60s', display: 'About 1 minute' },
  { value: '180s', display: 'About 3 minutes' },
  { value: '300s', display: 'About 5 minutes' },
]);

assert.strictEqual(ratio.kind, 'single');
assert.strictEqual(ratio.allowOther, false, 'allow_other should default to false');
assert.deepStrictEqual(ratio.options, [
  { value: '16:9', display: 'Landscape 16:9' },
  { value: '9:16', display: 'Vertical 9:16' },
  { value: '1:1', display: 'Square' },
]);

assert.strictEqual(content.kind, 'multi');
assert.deepStrictEqual(content.options, [
  { value: 'Life story', display: 'Life story' },
  { value: 'Key poems', display: 'Key poems' },
  { value: 'Historical context', display: 'Historical context' },
]);

assert.strictEqual(voiceId.kind, 'visual');
assert.strictEqual(voiceId.required, true);
assert.strictEqual(voiceId.options.length, 2);
assert.deepStrictEqual(voiceId.options[0], {
  value: 'ruyayichen',
  name: 'Ruya Yichen',
  media: '/voice-samples/doubao-ruyayichen.mp3',
  description: 'Male / young / refined',
  aspectRatio: '16:5',
  submitPrompt: undefined,
});
assert.deepStrictEqual(voiceId.options[1], {
  value: 'morgan',
  name: 'Morgan',
  media: '/voice-samples/x.mp3',
  description: '...',
  aspectRatio: undefined,
  submitPrompt: undefined,
});

// ---- formatWidgetAnswer ----
const answer = formatWidgetAnswer(fields, {
  duration: '180s',
  ratio: '16:9',
  content: ['Life story', 'Key poems'],
  voiceId: 'ruyayichen',
});
assert.strictEqual(
  answer,
  [
    '- How long should the video be?: About 3 minutes',
    '- Video aspect ratio: Landscape 16:9',
    '- What should it focus on? (multiple choice): Life story, Key poems',
    '- Choose a voice: Ruya Yichen',
  ].join('\n'),
);

// Unanswered fields are skipped; allow_other free text is shown as is
const partial = formatWidgetAnswer(fields, { duration: 'Custom two minutes' });
assert.strictEqual(partial, '- How long should the video be?: Custom two minutes');

// ---- Plain text without a widget: returned whole, as is ----
const plain = parseWidgets('This is a plain reply with no form.');
assert.strictEqual(plain.length, 1);
assert.deepStrictEqual(plain[0], { type: 'text', text: 'This is a plain reply with no form.' });

// ---- Malformed widget: with no parsable fields the markup is stripped without throwing (untrusted model output leaves no tags) ----
const malformed = 'Before<widget><form-single id="x"/></widget>After';
assert.doesNotThrow(() => parseWidgets(malformed));
const malformedSegs = parseWidgets(malformed);
assert.strictEqual(malformedSegs.length, 2);
assert.deepStrictEqual(malformedSegs[0], { type: 'text', text: 'Before' });
assert.deepStrictEqual(malformedSegs[1], { type: 'text', text: 'After' });

// ---- An empty widget (no fields) is stripped too, leaving no tags ----
const empty = '<widget></widget>';
assert.doesNotThrow(() => parseWidgets(empty));
assert.deepStrictEqual(parseWidgets(empty), []);

console.log('widget-parse.check: ok');
