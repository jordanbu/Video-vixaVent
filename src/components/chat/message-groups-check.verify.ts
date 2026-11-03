// Runnable check: `npx tsx src/components/chat/message-groups.check.ts`.
// groupMessages folds consecutive same-name tool rows into a group (≥GROUP_MIN) and leaves the rest as is;
// checks folding/threshold/order/indices.
import assert from 'node:assert/strict';
import type { DisplayMessage } from '../../agent/agent-session';
import { groupMessages, GROUP_MIN } from './message-groups';

const tool = (name: string, id = ''): DisplayMessage => ({ role: 'tool', text: '', tool: { name, args: { id }, result: { ok: true } } });
const txt = (t: string): DisplayMessage => ({ role: 'assistant', text: t });

// 20× edit_gap between a text and another tool → folded into one toolgroup, the neighbours stay their own rows
const msgs: DisplayMessage[] = [
  txt('Start'),
  ...Array.from({ length: 20 }, (_, i) => tool('edit_gap', 'g' + i)),
  tool('read_timeline'),
  txt('Done'),
];
const items = groupMessages(msgs);
assert.deepStrictEqual(items.map((it) => it.kind), ['single', 'toolgroup', 'single', 'single'], '20 consecutive edit_gap fold into 1 group; text/other tools stay their own rows');
const grp = items[1];
assert.ok(grp.kind === 'toolgroup');
assert.strictEqual(grp.kind === 'toolgroup' && grp.name, 'edit_gap');
assert.strictEqual(grp.kind === 'toolgroup' && grp.items.length, 20, 'the group holds all 20 calls');
assert.strictEqual(grp.kind === 'toolgroup' && grp.items[0].index, 1, 'the group keeps the original message indices (for key/feedback)');
assert.strictEqual(grp.kind === 'toolgroup' && grp.items[19].index, 20);

// threshold: GROUP_MIN-1 calls do not fold (each its own row), GROUP_MIN calls fold
const below = groupMessages(Array.from({ length: GROUP_MIN - 1 }, () => tool('search_templates')));
assert.ok(below.every((it) => it.kind === 'single'), `fewer than ${GROUP_MIN} calls do not fold`);
const at = groupMessages(Array.from({ length: GROUP_MIN }, () => tool('search_templates')));
assert.deepStrictEqual(at.map((it) => it.kind), ['toolgroup'], `${GROUP_MIN} calls fold`);

// adjacent tools with different names do not merge (information is kept)
const distinct = groupMessages([tool('clean_script'), tool('read_timeline'), tool('manage_timelines')]);
assert.ok(distinct.every((it) => it.kind === 'single'), 'tools with different names stay their own rows, no false folding');

// two same-name runs separated by another tool → two separate groups
const split = groupMessages([...Array.from({ length: 4 }, () => tool('edit_gap')), tool('read_timeline'), ...Array.from({ length: 3 }, () => tool('edit_gap'))]);
assert.deepStrictEqual(split.map((it) => it.kind), ['toolgroup', 'single', 'toolgroup'], 'separated same-name runs each form their own group');

console.log('message-groups.check: ok (folding/threshold/indices/no false folding/runs)');
