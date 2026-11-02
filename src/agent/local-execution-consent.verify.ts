// The built-in agent asks before running skill code on this machine (specs/08).
// npx tsx src/agent/local-execution-consent.verify.ts
import assert from 'node:assert/strict';

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => 'es', setItem: () => undefined },
});

const { ensureLocaleDict, setLocale } = await import('../i18n/locale');
const {
  LOCAL_EXECUTION_TOOLS, confirmLocalExecution, localExecutionPrompt, localExecutionRequest,
  resetLocalExecutionSession, setLocalExecutionConfirmer,
} = await import('./local-execution-consent');
type Request = NonNullable<ReturnType<typeof localExecutionRequest>>;
const CJK = /[㐀-鿿]/;
const script = (skill: string, command = 'bash scripts/render.sh') => ({ skill, command });

// Every local-execution tool has a question; other tools ask nothing.
for (const name of LOCAL_EXECUTION_TOOLS) {
  assert.ok(localExecutionPrompt(name, {}), `${name} must have a confirmation prompt`);
}
assert.equal(localExecutionRequest('read_timeline', {}), null);

// No window (node, a worker, a headless run) → the answer is no.
assert.equal(await confirmLocalExecution('run_skill_script', script('demo', 'bash SKILL.md')), false,
  'without a UI to ask, local execution is refused');
// Tools that run nothing locally never ask.
let asked = 0;
setLocalExecutionConfirmer(() => { asked += 1; return false; });
assert.equal(await confirmLocalExecution('read_timeline', {}), true);
assert.equal(asked, 0, 'a read tool never prompts');

// The request carries the exact skill and command, and a Spanish question.
await ensureLocaleDict('es');
let seen: Request | null = null;
setLocalExecutionConfirmer((request) => { seen = request; return 'allow'; });
assert.equal(await confirmLocalExecution('run_skill_script', script('paper-collage', 'bash SKILL.md')), true);
const first = seen as Request | null;
assert.equal(first?.tool, 'run_skill_script');
assert.equal(first?.skill, 'paper-collage');
assert.equal(first?.command, 'bash SKILL.md');
assert.match(first?.message ?? '', /El agente quiere ejecutar/);
assert.match(first?.message ?? '', /«paper-collage»/);
assert.doesNotMatch(first?.message ?? '', CJK, 'no Chinese in the Spanish question');

await confirmLocalExecution('install_skill', { repo: 'owner/skill' });
assert.equal((seen as Request | null)?.repo, 'owner/skill');
assert.match((seen as Request | null)?.message ?? '', /instalar una skill desde GitHub: owner\/skill/);

// A huge command is cut so the card stays readable.
await confirmLocalExecution('run_skill_script', script('s', `bash x.sh ${'a'.repeat(5_000)}`));
assert.ok(((seen as Request | null)?.command ?? '').length <= 601, 'long commands are truncated');

// Anything but an explicit yes is a no; a throwing dialog is a no.
setLocalExecutionConfirmer(() => undefined as unknown as boolean);
assert.equal(await confirmLocalExecution('install_skill', { repo: 'a/b' }), false);
setLocalExecutionConfirmer(() => { throw new Error('dialog blocked'); });
assert.equal(await confirmLocalExecution('install_skill', { repo: 'a/b' }), false);
setLocalExecutionConfirmer(() => 'deny');
assert.equal(await confirmLocalExecution('run_skill_script', script('demo')), false);

// "Always this session" covers later scripts of that skill only, and never installs.
resetLocalExecutionSession();
asked = 0;
setLocalExecutionConfirmer(() => { asked += 1; return 'allow-skill-session'; });
assert.equal(await confirmLocalExecution('run_skill_script', script('collage')), true);
setLocalExecutionConfirmer(() => { asked += 1; return 'deny'; });
assert.equal(await confirmLocalExecution('run_skill_script', script('collage', 'node render.mjs')), true,
  'a skill allowed for the session runs without asking again');
assert.equal(asked, 1);
assert.equal(await confirmLocalExecution('run_skill_script', script('other')), false, 'another skill still asks');
assert.equal(asked, 2);
setLocalExecutionConfirmer(() => 'allow-skill-session');
await confirmLocalExecution('install_skill', { repo: 'x/y' });
setLocalExecutionConfirmer(() => { asked += 1; return 'deny'; });
assert.equal(await confirmLocalExecution('install_skill', { repo: 'x/y' }), false, 'an install grant is never remembered');
resetLocalExecutionSession();
assert.equal(await confirmLocalExecution('run_skill_script', script('collage')), false, 'a reload forgets session grants');

// Stopping the run answers no, before or while asking.
const aborted = new AbortController();
aborted.abort();
setLocalExecutionConfirmer(() => 'allow');
assert.equal(await confirmLocalExecution('run_skill_script', script('demo'), aborted.signal), false);
const late = new AbortController();
setLocalExecutionConfirmer(() => { late.abort(); return 'allow'; });
assert.equal(await confirmLocalExecution('run_skill_script', script('demo'), late.signal), false,
  'a yes that arrives after the run stopped does not run anything');

// English question.
setLocale('en');
await ensureLocaleDict('en');
setLocalExecutionConfirmer((request) => { seen = request; return true; });
await confirmLocalExecution('run_skill_script', script('demo', 'node render.mjs'));
assert.match((seen as Request | null)?.message ?? '', /The agent wants to run this command/);

console.log('local-execution-consent.verify: es/en questions, once / this session / no, refuses without a UI, on abort or without a clear yes');
