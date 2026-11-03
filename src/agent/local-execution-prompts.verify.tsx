// The editor card answers local-execution requests (specs/08): queue order, the three
// answers, abort, unmount, and what the card renders.
// npx tsx --tsconfig tsconfig.app.json src/agent/local-execution-prompts.verify.tsx
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => 'es', setItem: () => undefined },
});

const { ensureLocaleDict } = await import('../i18n/locale');
const { confirmLocalExecution, resetLocalExecutionSession } = await import('./local-execution-consent');
const {
  answerLocalExecutionPrompt, attachLocalExecutionUi, currentLocalExecutionPrompt, subscribeLocalExecutionPrompts,
} = await import('./local-execution-prompts');
const { LocalExecutionPrompt } = await import('../components/chat/LocalExecutionPrompt');
await ensureLocaleDict('es');

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const script = (skill: string, command: string) => ({ skill, command });

// Without a card mounted (and no window) nothing waits: the answer is no.
assert.equal(await confirmLocalExecution('run_skill_script', script('demo', 'bash a.sh')), false);
assert.equal(currentLocalExecutionPrompt(), null);

const detach = attachLocalExecutionUi();
let changes = 0;
const unsubscribe = subscribeLocalExecutionPrompts(() => { changes += 1; });

// A request waits for the card; the card shows the oldest one first.
const first = confirmLocalExecution('run_skill_script', script('collage', 'bash scripts/render.sh'));
const second = confirmLocalExecution('install_skill', { repo: 'owner/skill' });
await tick();
const shown = currentLocalExecutionPrompt();
assert.equal(shown?.skill, 'collage', 'the oldest request is shown first');
assert.ok(changes >= 2, 'subscribers hear about new requests');

// The rendered card: Spanish text, the exact command, three answers for a script.
const scriptCard = renderToStaticMarkup(createElement(LocalExecutionPrompt));
assert.match(scriptCard, /role="alertdialog"/);
assert.match(scriptCard, /El agente quiere ejecutar código en esta computadora/);
assert.match(scriptCard, /Comando de la skill «collage»:/);
assert.match(scriptCard, /bash scripts\/render\.sh/);
assert.match(scriptCard, />No permitir</);
assert.match(scriptCard, />Permitir siempre esta skill en esta sesión</);
assert.match(scriptCard, />Permitir</);
// CJK ideograph range, written as escapes (specs/11).
assert.doesNotMatch(scriptCard, /[\u3400-\u9fff]/, 'no Chinese on the card');

answerLocalExecutionPrompt(shown!.id, 'allow');
assert.equal(await first, true, '"Permitir" lets the script run');
assert.equal(currentLocalExecutionPrompt()?.tool, 'install_skill', 'the next request takes its place');

// An install card offers no "this session" answer.
const installCard = renderToStaticMarkup(createElement(LocalExecutionPrompt));
assert.match(installCard, /Instalar una skill desde GitHub:/);
assert.match(installCard, /owner\/skill/);
assert.doesNotMatch(installCard, /en esta sesión/);
answerLocalExecutionPrompt(currentLocalExecutionPrompt()!.id, 'deny');
assert.equal(await second, false, '"No permitir" refuses');
assert.equal(currentLocalExecutionPrompt(), null);
assert.equal(renderToStaticMarkup(createElement(LocalExecutionPrompt)), '', 'no request, no card');

// "This session": the next script of the same skill does not show a card.
resetLocalExecutionSession();
const grant = confirmLocalExecution('run_skill_script', script('collage', 'bash a.sh'));
await tick();
answerLocalExecutionPrompt(currentLocalExecutionPrompt()!.id, 'allow-skill-session');
assert.equal(await grant, true);
assert.equal(await confirmLocalExecution('run_skill_script', script('collage', 'bash b.sh')), true);
assert.equal(currentLocalExecutionPrompt(), null, 'no card for an allowed skill');

// Stopping the run drops the card and answers no; a late click is ignored.
const stop = new AbortController();
const stopped = confirmLocalExecution('run_skill_script', script('other', 'bash c.sh'), stop.signal);
await tick();
const stale = currentLocalExecutionPrompt()!;
stop.abort();
assert.equal(await stopped, false);
assert.equal(currentLocalExecutionPrompt(), null, 'the card goes away when the run stops');
answerLocalExecutionPrompt(stale.id, 'allow');

// Unmounting the card refuses what is still waiting and restores the plain dialog.
const orphan = confirmLocalExecution('run_skill_script', script('other', 'bash d.sh'));
await tick();
unsubscribe();
detach();
assert.equal(await orphan, false, 'a request left without a card is refused');
assert.equal(currentLocalExecutionPrompt(), null);
assert.equal(await confirmLocalExecution('run_skill_script', script('other', 'bash e.sh')), false,
  'after unmount the native dialog is back (none here, so no)');

console.log('local-execution-prompts.verify: card queue, allow / this session / no, abort and unmount refuse');
