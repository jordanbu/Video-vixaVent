// Runnable self-check: `npx tsx src/agent/followup-tools.check.ts`
// The core of ask_followup_questions is serializing fields into <widget> text that the UI's parseWidgets
// turns into a form card. This check proves the round trip buildFollowupWidget → parseWidgets is lossless,
// and that the execFollowupTool __followup contract, the no-options fallback and the empty-fields error hold.
import assert from 'node:assert';
import { buildFollowupWidget, execFollowupTool, FOLLOWUP_TOOL_NAMES } from './followup-tools';
import { parseWidgets, type FormMulti, type FormSingle, type WidgetField } from '../../components/chat/widget-parse';
import type { AgentContext } from '../context';

const ctx = {} as AgentContext; // followup never touches the editor state

// ---- Round trip: single + multi fields through buildFollowupWidget → parseWidgets are lossless ----
const text = buildFollowupWidget(
  [
    { id: 'ratio', label: 'Aspect ratio', type: 'single', options: [{ value: '16:9', display: 'Horizontal 16:9' }, { value: '9:16', display: 'Vertical 9:16' }], required: true },
    { id: 'topics', label: 'Key topics', type: 'multi', options: [{ value: 'a', display: 'Biography' }, { value: 'b', display: 'Works' }], allowOther: true },
  ],
  'A few things to confirm before starting:',
);
const segs = parseWidgets(text);
assert.strictEqual(segs.length, 2, 'should be two segments: text + widget');
assert.ok(segs[0].type === 'text' && segs[0].text.includes('A few things to confirm'), 'the prompt should be the leading text segment');
assert.ok(segs[1].type === 'widget', 'the second segment should be the widget');
const fields = segs[1].type === 'widget' ? segs[1].fields : [];
assert.strictEqual(fields.length, 2, 'should parse 2 fields');
const [ratio, topics] = fields as [FormSingle, FormMulti];
assert.strictEqual(ratio.kind, 'single');
assert.strictEqual(ratio.id, 'ratio');
assert.strictEqual(ratio.label, 'Aspect ratio');
assert.strictEqual(ratio.required, true, 'required should be kept');
assert.deepStrictEqual(ratio.options, [{ value: '16:9', display: 'Horizontal 16:9' }, { value: '9:16', display: 'Vertical 9:16' }]);
assert.strictEqual(topics.kind, 'multi');
assert.strictEqual(topics.allowOther, true, 'allow_other should be kept');

// ---- A field without options falls back to a prompt line and produces no widget field ----
const freeText = buildFollowupWidget([{ id: 'title', label: 'Video title', type: 'single', options: [] }], '');
const freeSegs = parseWidgets(freeText);
assert.ok(!freeSegs.some((s) => s.type === 'widget'), 'a field without options should not produce a widget card');
assert.ok(freeSegs.some((s) => s.type === 'text' && s.text.includes('- Video title')), 'a field without options should fall back to a question line');

// ---- Mixed: one with options + one free text → the widget card holds only the one with options; free text goes to the leading text ----
const mixed = buildFollowupWidget(
  [
    { id: 'q1', label: 'With options', type: 'single', options: ['x', 'y'] },
    { id: 'q2', label: 'Free input', type: 'single', options: [] },
  ],
  '',
);
const mixedSegs = parseWidgets(mixed);
const mixedWidget = mixedSegs.find((s) => s.type === 'widget');
assert.ok(mixedWidget && mixedWidget.type === 'widget' && mixedWidget.fields.length === 1, 'the field with options gets its own card');
assert.ok(mixedSegs.some((s) => s.type === 'text' && s.text.includes('- Free input')), 'the free-text field falls back to a question line');

// ---- Special characters (quotes / angle brackets / &) survive esc → decodeEntities ----
const escaped = buildFollowupWidget([{ id: 'q', label: 'A & B <c> "d"', type: 'single', options: [{ value: 'v', display: 'x & y' }] }], '');
const escFields = (parseWidgets(escaped).find((s) => s.type === 'widget') as { type: 'widget'; fields: WidgetField[] }).fields;
assert.strictEqual(escFields[0].label, 'A & B <c> "d"', 'special characters in labels should round-trip losslessly');
const escOpt = (escFields[0] as FormSingle).options[0] as { display?: string; value?: string };
assert.strictEqual(escOpt.display ?? escOpt.value, 'x & y', 'special characters in options should round-trip losslessly');

// ---- execFollowupTool contract: valid input returns __followup; empty fields fail ----
assert.ok(FOLLOWUP_TOOL_NAMES.has('ask_followup_questions'));
const ok = execFollowupTool('ask_followup_questions', { fields: [{ id: 'r', label: 'Ratio', type: 'single', options: ['16:9', '9:16'] }], prompt: 'Pick one' }, ctx) as { __followup?: string; note?: string };
assert.ok(typeof ok.__followup === 'string' && ok.__followup.includes('<widget>'), 'a valid call should return the __followup widget text');
assert.ok(typeof ok.note === 'string' && ok.note.length > 0, 'it should carry a note saying it waits for the answer');
const empty = execFollowupTool('ask_followup_questions', { fields: [] }, ctx) as { error?: string };
assert.ok(empty.error, 'empty fields should fail');
const noRenderable = execFollowupTool('ask_followup_questions', { fields: [{ label: '', type: 'single', options: [] }] }, ctx) as { error?: string };
assert.ok(noRenderable.error, 'no renderable field should fail');
const badName = execFollowupTool('nope', { fields: [] }, ctx) as { error?: string };
assert.ok(badName.error, 'an unknown tool name should fail');

console.log('followup-tools.check.ts ✓ (widget round trip / no-options fallback / special characters / exec contract)');
