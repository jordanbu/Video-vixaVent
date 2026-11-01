// The built-in agent asks before running skill code on this machine (specs/08).
// npx tsx src/agent/local-execution-consent.verify.ts
import assert from 'node:assert/strict';

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => 'es', setItem: () => undefined },
});

const { ensureLocaleDict, setLocale } = await import('../i18n/locale');
const {
  LOCAL_EXECUTION_TOOLS, confirmLocalExecution, localExecutionPrompt, setLocalExecutionConfirmer,
} = await import('./local-execution-consent');
const CJK = /[㐀-鿿]/;

// Every local-execution tool has a question; other tools ask nothing.
for (const name of LOCAL_EXECUTION_TOOLS) {
  assert.ok(localExecutionPrompt(name, {}), `${name} must have a confirmation prompt`);
}
assert.equal(localExecutionPrompt('read_timeline', {}), null);

// No window (node, a worker, a headless run) → the answer is no.
assert.equal(await confirmLocalExecution('run_skill_script', { skill: 'demo', command: 'bash SKILL.md' }), false,
  'without a UI to ask, local execution is refused');
// Tools that run nothing locally never ask.
let asked = 0;
setLocalExecutionConfirmer(() => { asked += 1; return false; });
assert.equal(await confirmLocalExecution('read_timeline', {}), true);
assert.equal(asked, 0, 'a read tool never prompts');

// The prompt shows the exact skill and command, in Spanish.
await ensureLocaleDict('es');
let seen = '';
setLocalExecutionConfirmer((message) => { seen = message; return true; });
assert.equal(await confirmLocalExecution('run_skill_script', { skill: 'paper-collage', command: 'bash SKILL.md' }), true);
assert.match(seen, /El agente quiere ejecutar/);
assert.match(seen, /«paper-collage»/);
assert.match(seen, /bash SKILL\.md/);
assert.doesNotMatch(seen, CJK, 'no Chinese in the Spanish prompt');

await confirmLocalExecution('install_skill', { repo: 'owner/skill' });
assert.match(seen, /instalar una skill desde GitHub: owner\/skill/);

// A huge command is cut so the dialog stays readable.
await confirmLocalExecution('run_skill_script', { skill: 's', command: `bash x.sh ${'a'.repeat(5_000)}` });
assert.ok(seen.length < 1_200, `long commands are truncated in the prompt (${seen.length} chars)`);

// Anything but an explicit true is a no; a throwing dialog is a no.
setLocalExecutionConfirmer(() => undefined as unknown as boolean);
assert.equal(await confirmLocalExecution('install_skill', { repo: 'a/b' }), false);
setLocalExecutionConfirmer(() => { throw new Error('dialog blocked'); });
assert.equal(await confirmLocalExecution('install_skill', { repo: 'a/b' }), false);

// English prompt.
setLocale('en');
await ensureLocaleDict('en');
setLocalExecutionConfirmer((message) => { seen = message; return true; });
await confirmLocalExecution('run_skill_script', { skill: 'demo', command: 'node render.mjs' });
assert.match(seen, /The agent wants to run this command/);

console.log('local-execution-consent.verify: prompts in es/en, refuses without a UI or a clear yes');
