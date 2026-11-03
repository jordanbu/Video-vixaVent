// Runnable self-check: `npx tsx src/agent/tools/skill-tools.check.ts`
// The manage_skill current / activate contract (creative mode dump and switch): current with and without a value,
// activate validates the id + lands through ctx.setCreativeMode + an empty string clears it, and the error when the
// host has no setter. Custom skill CRUD goes through IDB (browser only) and refresh is skipped silently under node,
// so only built-in skills are used here.
import assert from 'node:assert';
import { execSkillTool, SKILL_TOOL_NAMES, SKILL_TOOL_SCHEMAS } from './skill-tools';
import { CREATIVE_SKILLS } from '../skills/skills-catalog';
import type { AgentContext } from '../context';

assert.ok(SKILL_TOOL_NAMES.has('manage_skill'));
const actions = (SKILL_TOOL_SCHEMAS[0].input_schema as unknown as { properties: { action: { enum: string[] } } }).properties.action.enum;
for (const a of ['list', 'get', 'current', 'activate', 'create', 'update', 'delete']) {
  assert.ok(actions.includes(a), `the schema should include action ${a}`);
}

// Fake host: one readable/writable creative mode slot
let mode: string | null = null;
const ctx = {
  getCreativeMode: () => mode,
  setCreativeMode: (id: string | null) => { mode = id; },
} as unknown as AgentContext;

const builtinId = CREATIVE_SKILLS[0]?.id ?? null;

// ---- current: nothing selected → active:null ----
{
  const r = await execSkillTool('manage_skill', { action: 'current' }, ctx) as { active: unknown; note?: string };
  assert.strictEqual(r.active, null, 'no selected mode should return active:null');
  assert.ok(r.note?.includes('No creative mode is selected'), 'it should explain nothing is selected');
}

// ---- activate a built-in skill → lands + returns its summary; current reads back the same one ----
// (under node, getPluginSkill uses Vite `?raw` and cannot read the built-in files → CREATIVE_SKILLS is empty,
// so the built-in activation asserts are skipped and we check the contract does not break when empty.)
if (builtinId) {
  const r = await execSkillTool('manage_skill', { action: 'activate', skillId: builtinId }, ctx) as {
    ok?: boolean; active?: { id: string; builtin: boolean }; note?: string;
  };
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.active?.id, builtinId);
  assert.strictEqual(r.active?.builtin, true, 'a built-in skill should be marked builtin');
  assert.ok(r.note?.includes('next message'), 'it should explain when it is injected (the system prompt is built once per runAgent)');
  assert.strictEqual(mode, builtinId, 'ctx.setCreativeMode should be called');

  const cur = await execSkillTool('manage_skill', { action: 'current' }, ctx) as { active: { id: string } };
  assert.strictEqual(cur.active.id, builtinId, 'current should read back the activated mode');

  const unknown = await execSkillTool('manage_skill', { action: 'activate', skillId: 'skill_nope' }, ctx) as { error?: string };
  assert.ok(unknown.error?.includes('no skill'), 'an unknown id should fail');
  assert.strictEqual(mode, builtinId, 'an error should not change the current mode');
}

// ---- activate with an empty string → clears ----
{
  const r = await execSkillTool('manage_skill', { action: 'activate', skillId: '' }, ctx) as { ok?: boolean; active?: unknown };
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.active, null);
  assert.strictEqual(mode, null, 'an empty string should clear the mode');
}

// ---- host without a setter (old check-style ctx) → explicit error ----
{
  const bare = { getCreativeMode: () => null } as unknown as AgentContext;
  const r = await execSkillTool('manage_skill', { action: 'activate', skillId: builtinId ?? 'skill_any' }, bare) as { error?: string };
  assert.ok(r.error, 'a host without setCreativeMode should fail instead of staying silent');
}

console.log('skill-tools.check: ALL PASSED');
