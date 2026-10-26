// Runnable check: `npx tsx server/external-agent/project-edit-ownership.verify.ts`.
//
// The same project open in two tabs: the most recently opened/reloaded tab owns it,
// the tab it replaced is told it was displaced (and stops reclaiming), and the
// project only moves back on an explicit take-back. Drives the real registration
// route, the real ownership store and the real broker registry, with each "tab"
// running the client's BridgeOwnershipState. See specs/07-proyecto-en-varias-pestanas.md.
import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { isolateVerifyHome } from '../../shared/verify-home.ts';
import type { BridgeOperations } from '../plugins/external-agent-bridge-routes.ts';

const fixture = await mkdtemp(join(tmpdir(), 'vixa-tab-ownership-'));
const restoreHome = isolateVerifyHome(fixture);
const previousDataDir = process.env.VIXAVENTORA_DATA_DIR;
process.env.VIXAVENTORA_DATA_DIR = fixture;

// Store paths are captured at import time; keep the real SQLite store isolated.
const { getStoredEntry, setStoredEntry, withSerializedProjectStore } = await import('../plugins/project-store.ts');
const { resetSqliteStoreForTests } = await import('../storage/sqlite-store.ts');
const { resetSearchForTests } = await import('../storage/fulltext-search.ts');
const {
  BROWSER_HANDOFF_GRACE_MS,
  claimBrowserProjectOwnership,
  claimOfflineProjectOwnership,
  projectEditOwnershipKey,
  releaseProjectEditOwnership,
  renewedProjectEditOwnership,
} = await import('./project-edit-ownership.ts');
const { parseProjectEditOwnership } = await import('./project-edit-ownership-codec.ts');
const {
  editorRegistrationMatches,
  registerEditor,
  resetExternalAgentBrokerForTest,
  touchEditor,
  unregisterEditor,
} = await import('./broker.ts');
const { routeExternalAgentBridge } = await import('../plugins/external-agent-bridge-routes.ts');
const { BridgeOwnershipState } = await import('../../src/agent/external-bridge-ownership.ts');
const { docFromTimeline } = await import('../../src/persist/projectStore.ts');
const { INITIAL } = await import('../../src/editor/initial.ts');
const { revisionOf } = await import('../../src/agent/external-edit-session.ts');

const projectId = 'two-tabs';
const operations = {
  claimBrowserOwnership: claimBrowserProjectOwnership,
  editorRegistrationMatches,
  registerEditor,
  unregisterEditor,
} as BridgeOperations;

async function post(path: string, body: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const req = Object.assign(Readable.from([JSON.stringify(body)]), {
    method: 'POST',
    headers: {},
  }) as unknown as IncomingMessage;
  let text = '';
  const res = {
    statusCode: 0,
    setHeader: () => undefined,
    end: (value?: string) => { text = value ?? ''; },
  } as unknown as ServerResponse;
  await routeExternalAgentBridge(req, res, new URL(`http://vixaventora.local${path}`), operations);
  return { status: res.statusCode, body: text ? JSON.parse(text) as Record<string, unknown> : {} };
}

async function row() {
  const value = parseProjectEditOwnership((await getStoredEntry(projectEditOwnershipKey(projectId))).value, projectId);
  assert(value, 'the ownership row is readable');
  return value;
}

/** Rewrites the (server-managed) ownership row, e.g. to simulate time passing. */
async function writeOwnershipRow(value: unknown): Promise<void> {
  await withSerializedProjectStore((store) => store.writeEntry(projectEditOwnershipKey(projectId), value));
}

/** One browser tab: the parts of the client's runBridge loop that touch ownership. */
class Tab {
  readonly id: string;
  revision: string;
  capability: string | undefined;
  readonly state = new BridgeOwnershipState();
  /** Pre-fix client: never sends heldEpoch, so every retry takes the project back. */
  readonly legacy: boolean;

  constructor(id: string, revision: string, legacy = false) {
    this.id = id;
    this.revision = revision;
    this.legacy = legacy;
  }

  async register(): Promise<number> {
    const intent = this.legacy ? {} : this.state.intent();
    const response = await post('/register', {
      projectId, editorId: this.id, baseRevision: this.revision, tools: [], ...intent,
    });
    if (response.status === 200) {
      this.capability = response.body.registrationCapability as string;
      this.state.registered(response.body.ownershipEpoch as number);
    } else if (response.body.displaced === true || response.body.reloadRequired === true) {
      this.state.refused({
        displaced: response.body.displaced === true,
        reloadRequired: response.body.reloadRequired === true,
      });
    }
    return response.status;
  }

  connected(): boolean {
    return Boolean(this.capability) && editorRegistrationMatches(projectId, this.id, this.capability);
  }

  /** One loop iteration: keep polling while registered, otherwise re-register. */
  async step(): Promise<void> {
    if (this.connected()) {
      assert.equal(await touchEditor(projectId, this.id, this.revision, this.capability), true);
      return;
    }
    this.capability = undefined; // runBridgeAttempt's finally clears the installed ownership
    await this.register();
  }

  async close(): Promise<void> {
    if (this.capability) await unregisterEditor(projectId, this.id, this.capability);
    this.capability = undefined;
  }
}

/** Runs both tabs' loops and counts how often the stored owner changed. */
async function alternate(tabs: Tab[], rounds: number): Promise<{ flips: number; epochs: Set<number> }> {
  let owner = (await row()).ownerId;
  let flips = 0;
  const epochs = new Set<number>();
  for (let round = 0; round < rounds; round += 1) {
    for (const tab of tabs) {
      await tab.step();
      const current = await row();
      if (current.ownerId !== owner) flips += 1;
      owner = current.ownerId;
      epochs.add(current.epoch);
    }
  }
  return { flips, epochs };
}

let summary = '';
try {
  const first = docFromTimeline({ ...INITIAL, width: 1920, height: 1080, items: [] });
  await setStoredEntry(`project:${projectId}`, first);
  const revision = revisionOf(first);

  // The bug: with the pre-fix client two tabs take the project from each other forever.
  const legacyA = new Tab('legacy-a', revision, true);
  const legacyB = new Tab('legacy-b', revision, true);
  assert.equal(await legacyA.register(), 200);
  assert.equal(await legacyB.register(), 200);
  const legacy = await alternate([legacyA, legacyB], 10);
  assert(legacy.flips >= 19, `pre-fix tabs trade ownership on every retry (${legacy.flips} flips)`);
  await legacyA.close();
  await legacyB.close();

  // Most recent tab wins, then the two tabs stay put.
  const a = new Tab('tab-a', revision);
  const b = new Tab('tab-b', revision);
  assert.equal(await a.register(), 200);
  const epochA = (await row()).epoch;
  assert.equal(await b.register(), 200, 'a new tab takes over a live browser owner');
  const epochB = (await row()).epoch;
  assert.equal(epochB, epochA + 1);
  const steady = await alternate([a, b], 30);
  assert.equal(steady.flips, 0, 'two tabs no longer trade ownership');
  assert.deepEqual([...steady.epochs], [epochB], 'the epoch stays still while both tabs keep running');
  assert.equal((await row()).ownerId, b.id);
  assert.equal(a.state.current(), 'displaced', 'the replaced tab gets the displaced signal');
  assert.equal(b.state.current(), null);
  summary = `pre-fix: ${legacy.flips} owner flips and ${legacy.epochs.size} epochs in 10 rounds; `
    + `fixed: ${steady.flips} flips, epoch held at ${[...steady.epochs].join(',')} over 30 rounds`;

  // The displaced answer is distinct and writes nothing.
  const before = await row();
  const refused = await post('/register', {
    projectId, editorId: a.id, baseRevision: revision, tools: [], heldEpoch: epochA,
  });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.displaced, true);
  assert.equal(refused.body.reloadRequired, undefined, 'displaced is not a stale revision');
  assert.deepEqual(await row(), before, 'a displaced claim does not touch the ownership row');

  // Explicit take-back moves the project once; now the other tab is displaced.
  a.state.requestTakeover();
  assert.deepEqual(a.state.intent(), { heldEpoch: epochA, takeover: true });
  await a.step();
  assert.equal((await row()).ownerId, a.id, 'take-back claims the project');
  assert.equal((await row()).epoch, epochB + 1);
  assert.equal(a.state.current(), null);
  const afterTakeBack = await alternate([a, b], 30);
  assert.equal(afterTakeBack.flips, 0, 'no ping-pong after a take-back');
  assert.equal(b.state.current(), 'displaced', 'the other tab now shows the notice');
  assert.equal((await row()).ownerId, a.id);

  // Same-id reconnect is never displacement, live lease or released.
  const ownerEpoch = (await row()).epoch;
  a.capability = undefined;
  assert.equal(await a.register(), 200, 'same id re-registers without its capability');
  assert.equal((await row()).epoch, ownerEpoch, 'a live same-owner reconnect keeps its epoch');
  await a.close();
  assert.equal(await a.register(), 200, 'same id recovers after its own teardown');
  assert.equal((await row()).ownerId, a.id);
  assert.equal(a.state.current(), null);

  // While the owner is only reconnecting, the displaced tab still cannot slip in.
  await a.close();
  await b.step();
  assert.equal(b.state.current(), 'displaced', 'a just-released owner is still present (grace)');
  assert.equal(await a.register(), 200);
  assert.equal((await row()).ownerId, a.id);

  // A reload (new editor id) takes over, even from a hung tab with a live lease.
  const reloaded = new Tab('tab-a-reloaded', revision);
  assert(Date.now() < (await row()).leaseExpiresAt, 'the old tab still holds a live lease');
  assert.equal(await reloaded.register(), 200, 'a reloaded tab takes over cleanly');
  assert.equal((await row()).ownerId, reloaded.id);
  await a.step();
  assert.equal(a.state.current(), 'displaced');

  // Closing the owner lets a displaced tab resume by itself once the grace has passed.
  await reloaded.close();
  await b.step();
  assert.equal(b.state.current(), 'displaced');
  const released = await row();
  const aged = Date.now() - BROWSER_HANDOFF_GRACE_MS - 1_000;
  await writeOwnershipRow({
    ...renewedProjectEditOwnership(released, released.baseRevision, aged),
    leaseExpiresAt: 0,
  });
  await b.step();
  assert.equal((await row()).ownerId, b.id, 'the displaced tab resumes once the other tab is gone');
  assert.equal(b.state.current(), null);

  // A crashed owner whose lease expired is gone too.
  await a.step();
  assert.equal(a.state.current(), 'displaced');
  const live = await row();
  await writeOwnershipRow({
    ...renewedProjectEditOwnership(live, live.baseRevision, Date.now() - 120_000),
  });
  await a.step();
  assert.equal((await row()).ownerId, a.id, 'an expired owner no longer displaces');
  await b.step();
  assert.equal(b.state.current(), 'displaced');

  // A take-back with an outdated document asks for a reload (stale revision).
  const edited = structuredClone(first);
  edited.timelines[0]!.width = 1280;
  await setStoredEntry(`project:${projectId}`, edited);
  a.revision = revisionOf(edited);
  b.state.requestTakeover();
  await b.step();
  assert.equal(b.state.current(), 'reload-required', 'an outdated tab must reload to take over');
  assert.equal((await row()).ownerId, a.id, 'a stale take-back changes nothing');
  await b.step();
  assert.equal(b.state.current(), 'reload-required', 'the reload notice does not flip back');

  // Displacement is still answered first once the owner saved, and says the
  // displaced tab is outdated (the owner's save moved the row's base revision).
  const c = new Tab('tab-c', revision);
  c.state.registered(1);
  const ownerSaved = await row();
  await writeOwnershipRow(renewedProjectEditOwnership(ownerSaved, a.revision));
  const savedRow = await row();
  const outdated = await post('/register', {
    projectId, editorId: c.id, baseRevision: revision, tools: [], heldEpoch: 1,
  });
  assert.equal(outdated.status, 409);
  assert.equal(outdated.body.displaced, true, 'open elsewhere, even after the owner saved');
  assert.equal(outdated.body.reloadRequired, true, 'and this tab must reload to come back');
  await c.step();
  assert.equal(c.state.current(), 'reload-required', 'an outdated displaced tab offers a reload, not the button');
  assert.deepEqual(await row(), savedRow, 'an outdated displaced claim writes nothing either');

  // A routine stale revision in a tab that was never displaced stays silent.
  const fresh = new BridgeOwnershipState();
  fresh.refused({ displaced: false, reloadRequired: true });
  assert.equal(fresh.current(), null);

  // Offline-writer fencing is unchanged.
  await a.close();
  const aRow = await row();
  await writeOwnershipRow({
    ...renewedProjectEditOwnership(aRow, aRow.baseRevision, Date.now() - 120_000),
    leaseExpiresAt: 0,
  });
  const offline = await claimOfflineProjectOwnership(projectId, 'offline-writer');
  assert.equal(offline.status, 'claimed');
  const newcomer = new Tab('tab-new', a.revision);
  assert.equal(await newcomer.register(), 409, 'a live offline writer still fences a browser');
  assert.equal(newcomer.state.current(), null, 'an offline owner is not another tab');
  b.revision = a.revision;
  assert.equal(await b.register(), 409);
  assert.equal((await row()).ownerKind, 'offline');
  if (offline.status === 'claimed') await releaseProjectEditOwnership(offline.claim);
  assert.equal(await newcomer.register(), 200, 'a released offline writer lets the browser in');
} finally {
  resetExternalAgentBrokerForTest();
  resetSqliteStoreForTests();
  resetSearchForTests();
  if (previousDataDir === undefined) delete process.env.VIXAVENTORA_DATA_DIR;
  else process.env.VIXAVENTORA_DATA_DIR = previousDataDir;
  restoreHome();
  await rm(fixture, { recursive: true, force: true });
}

console.log(`project-edit-ownership.verify: ok (${summary})`);
