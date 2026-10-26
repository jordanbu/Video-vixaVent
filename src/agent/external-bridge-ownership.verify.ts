// Runnable check: `npx tsx src/agent/external-bridge-ownership.verify.ts`.
// Client half of "same project in two tabs" (specs/07-proyecto-en-varias-pestanas.md):
// what the bridge loop sends, which notice it shows, and how long it waits.
import assert from 'node:assert/strict';
import { BridgeOwnershipState, type BridgeOwnershipNotice } from './external-bridge-ownership.ts';
import { EditorBridgeRequestError, registerEditorBridge } from './external-bridge-registration.ts';

const timing = { retryMs: 30, displacedRecheckMs: 400 };
const DISPLACED = { displaced: true, reloadRequired: false };
const STALE = { displaced: false, reloadRequired: true };
const DISPLACED_OUTDATED = { displaced: true, reloadRequired: true };
const notices: BridgeOwnershipNotice[] = [];
const tab = new BridgeOwnershipState((notice) => notices.push(notice), timing);

// A new tab sends nothing: it takes the project over (most recent wins).
assert.deepEqual(tab.intent(), {});
tab.registered(7);
assert.deepEqual(tab.intent(), { heldEpoch: 7 }, 'a tab that owned the project says so');
assert.equal(tab.current(), null);

// A routine stale revision (own autosave in flight) stays a silent retry.
tab.intent();
tab.refused(STALE);
assert.equal(tab.current(), null);
assert.deepEqual(notices, []);

// Displaced by another tab: notice, no takeover, slow re-check.
tab.intent();
tab.refused(DISPLACED);
assert.equal(tab.current(), 'displaced');
assert.deepEqual(tab.intent(), { heldEpoch: 7 }, 'a displaced tab never reclaims by itself');
const never = new AbortController();
let started = Date.now();
await tab.retryDelay(never.signal);
assert(Date.now() - started >= timing.displacedRecheckMs - 5, 'a displaced tab re-checks slowly');

// The button ends the wait at once and sends takeover.
started = Date.now();
const waiting = tab.retryDelay(never.signal);
setTimeout(() => tab.requestTakeover(), 10);
await waiting;
assert(Date.now() - started < timing.displacedRecheckMs, 'the click wakes the loop immediately');
assert.deepEqual(tab.intent(), { heldEpoch: 7, takeover: true });
tab.registered(9);
assert.equal(tab.current(), null, 'a successful take-back clears the notice');
assert.deepEqual(tab.intent(), { heldEpoch: 9 }, 'takeover is sent once');
started = Date.now();
await tab.retryDelay(never.signal);
assert(Date.now() - started < timing.displacedRecheckMs, 'an owner reconnects at the normal pace');

// A click during a plain attempt is not lost when that attempt comes back displaced.
tab.intent();
tab.requestTakeover();
tab.refused(DISPLACED);
assert.deepEqual(tab.intent(), { heldEpoch: 9, takeover: true });
// The take-back itself found an outdated document: ask for a reload.
tab.refused(STALE);
assert.equal(tab.current(), 'reload-required');
assert.deepEqual(tab.intent(), { heldEpoch: 9 });
tab.refused(DISPLACED);
assert.equal(tab.current(), 'reload-required', 'an outdated tab never goes back to offering the button');

// A tab displaced after the owner already changed the project goes straight to "reload".
const late = new BridgeOwnershipState();
late.registered(3);
late.intent();
late.refused(DISPLACED_OUTDATED);
assert.equal(late.current(), 'reload-required');

// Abort ends the wait.
const aborted = new AbortController();
started = Date.now();
const pending = tab.retryDelay(aborted.signal);
aborted.abort();
await pending;
assert(Date.now() - started < timing.displacedRecheckMs);
assert.deepEqual(notices, ['displaced', null, 'displaced', 'reload-required']);

// The registration request carries the intent and reads the 409 reason.
const requests: Array<Record<string, unknown>> = [];
let reply: { status: number; body: unknown } = { status: 200, body: {} };
globalThis.fetch = (async (_url: string, init?: RequestInit) => {
  requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
  return new Response(JSON.stringify(reply.body), { status: reply.status });
}) as typeof fetch;
const signal = new AbortController().signal;
reply = { status: 200, body: { ok: true, ownershipEpoch: 12, registrationCapability: 'c'.repeat(43) } };
const ownership = await registerEditorBridge('p', 'e', 'rev', signal, undefined, { heldEpoch: 11, takeover: true });
assert.equal(ownership.epoch, 12);
assert.equal(requests.at(-1)?.heldEpoch, 11);
assert.equal(requests.at(-1)?.takeover, true);
await registerEditorBridge('p', 'e', 'rev', signal);
assert.equal('heldEpoch' in requests.at(-1)!, false, 'a new tab sends no held epoch');
async function refusal(body: unknown, status = 409): Promise<EditorBridgeRequestError> {
  reply = { status, body };
  const error = await registerEditorBridge('p', 'e', 'rev', signal).catch((caught: unknown) => caught);
  assert(error instanceof EditorBridgeRequestError);
  assert.equal(error.message, `registration failed: HTTP ${status}`);
  return error;
}
assert.deepEqual((await refusal({ error: 'x', displaced: true })).refusal, DISPLACED);
assert.deepEqual((await refusal({ error: 'x', reloadRequired: true })).refusal, STALE);
assert.deepEqual((await refusal({ error: 'x', displaced: true, reloadRequired: true })).refusal, DISPLACED_OUTDATED);
assert.equal((await refusal({ error: 'project is already owned' })).refusal, undefined,
  'an offline owner is not another tab');
assert.equal((await refusal({ displaced: true }, 500)).refusal, undefined);

console.log('external-bridge-ownership.verify: ok');
