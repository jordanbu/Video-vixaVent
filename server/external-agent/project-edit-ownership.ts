import { runProjectMigrations } from '../../src/persist/migrations/index.ts';
import { revisionOf } from '../../src/agent/external-edit-session.ts';
import type { ProjectDoc } from '../../src/editor/types.ts';
import {
  withSerializedProjectStore,
  type LockedProjectStore,
  type StoredEntryValue,
} from '../plugins/project-store.ts';
import {
  parseProjectEditOwnership,
  projectEditOwnershipKey,
  renewedProjectEditOwnership,
  validProjectEditOwnershipIdentity,
  type ProjectEditOwnershipClaim,
  type ProjectEditOwnershipRow,
} from './project-edit-ownership-codec.ts';
export {
  projectEditOwnershipKey,
  projectEditOwnershipMatches,
  renewedProjectEditOwnership,
} from './project-edit-ownership-codec.ts';
export type { ProjectEditOwnershipClaim } from './project-edit-ownership-codec.ts';


/** What a browser editor asks for when it (re)registers. */
export interface BrowserOwnershipClaimIntent {
  /** Last epoch this same editor id held. Absent for a new or reloaded tab. */
  readonly heldEpoch?: number;
  /** The user explicitly asked to edit this project in this editor. */
  readonly takeover?: boolean;
}

export type BrowserOwnershipClaimResult =
  | { status: 'claimed'; claim: ProjectEditOwnershipClaim }
  | { status: 'stale'; currentRevision?: string }
  /** reloadRequired: the owner already changed the project, so this tab's
   * document is outdated and only a reload can bring it back. */
  | { status: 'displaced'; reloadRequired: boolean }
  | { status: 'blocked' };

/** A released or expired browser owner still counts as present for this long, so a
 * displaced editor cannot slip in while the owner is only reconnecting (~1 s). */
export const BROWSER_HANDOFF_GRACE_MS = 15_000;

export type OfflineOwnershipClaimResult =
  | { status: 'claimed'; claim: ProjectEditOwnershipClaim; doc: ProjectDoc; revision: string }
  | { status: 'busy' | 'missing' | 'blocked' };

export type OwnershipRenewResult =
  | { status: 'renewed'; claim: ProjectEditOwnershipClaim; doc: ProjectDoc }
  | { status: 'stale' | 'blocked' };


function normalizedProject(value: unknown): ProjectDoc | null {
  return runProjectMigrations(value)?.doc ?? null;
}


function ownershipCompatibility(entry: StoredEntryValue, projectId: string): 'absent' | 'current' | 'blocked' {
  if (!entry.found) return 'absent';
  return parseProjectEditOwnership(entry.value, projectId) ? 'current' : 'blocked';
}


async function storedProject(
  store: LockedProjectStore,
  projectId: string,
): Promise<{ doc: ProjectDoc; revision: string } | null> {
  const entry = await store.readEntry(`project:${projectId}`);
  const doc = entry.found ? normalizedProject(entry.value) : null;
  return doc ? { doc, revision: revisionOf(doc) } : null;
}

/** True when this editor held the project and ANOTHER browser editor, still present,
 * took it over afterwards. Such an editor must not take it back without a click. */
function displacedByAnotherBrowser(
  current: ProjectEditOwnershipRow | null,
  ownerId: string,
  intent: BrowserOwnershipClaimIntent,
  now: number,
): boolean {
  if (intent.takeover || intent.heldEpoch === undefined || !current) return false;
  if (current.ownerKind !== 'browser' || current.ownerId === ownerId) return false;
  if (current.epoch <= intent.heldEpoch) return false;
  return current.leaseExpiresAt > now || now - current.updatedAt < BROWSER_HANDOFF_GRACE_MS;
}

export async function claimBrowserProjectOwnership(
  projectId: string,
  ownerId: string,
  expectedRevision: string,
  intent: BrowserOwnershipClaimIntent = {},
): Promise<BrowserOwnershipClaimResult> {
  if (!validProjectEditOwnershipIdentity(projectId, ownerId) || !expectedRevision) {
    return { status: 'blocked' };
  }
  return withSerializedProjectStore(async (store) => {
    const entry = await store.readEntry(projectEditOwnershipKey(projectId));
    const compatibility = ownershipCompatibility(entry, projectId);
    const current = compatibility === 'current' ? parseProjectEditOwnership(entry.value, projectId)! : null;
    const now = Date.now();
    // The same project open in two tabs (or two browsers): the most recently opened
    // or reloaded one owns it. The tab it replaced comes back with its heldEpoch and
    // is told it was displaced instead of silently taking the project back, which
    // made two tabs trade ownership every ~1.5 s and staled every MCP session.
    // Checked before the revision so a displaced tab hears "open elsewhere" even
    // after the owner saved; the row's baseRevision follows every owner save, so
    // it also tells that tab whether it must reload. No project read, no write.
    // See specs/07-proyecto-en-varias-pestanas.md.
    if (current && displacedByAnotherBrowser(current, ownerId, intent, now)) {
      return { status: 'displaced', reloadRequired: current.baseRevision !== expectedRevision };
    }
    const project = await storedProject(store, projectId);
    if (!project || project.revision !== expectedRevision) {
      return { status: 'stale', currentRevision: project?.revision };
    }
    if (compatibility === 'blocked') return { status: 'blocked' };
    const sameOwner = current?.ownerKind === 'browser'
      && current.ownerId === ownerId
      && current.leaseExpiresAt > now;
    // A browser window that already owns this project (the same ownerId, still a
    // live lease) may re-claim it even without its in-memory capability. In
    // normal use the bridge occasionally tears down and reconnects with the same
    // editor id but no capability; blocking that re-claim produced a spurious 409
    // that flashed "close the other window" during routine use. Same-id recovery
    // is never displacement (displacedByAnotherBrowser requires another owner id).
    // Genuine anti-spoof is enforced at the registration-route capability layer
    // (broker capabilityMatches), so this claim gate only needs to fence
    // cross-layer writes, not same-owner recovery.
    // A DIFFERENT browser editor that holds the expected revision takes over when
    // it is new (no heldEpoch: a fresh or reloaded tab, even from a hung tab whose
    // lease is still live), when the user asked for it (takeover), or when the
    // editor that displaced it is gone. We still refuse to steal from a live
    // OFFLINE writer (external MCP / a serialized offline commit) or an
    // epoch-pinned owner, so the browser cannot clobber a non-browser write in
    // flight. Lost-update protection additionally holds via the CAS revision
    // match in createProjectDocumentStoreOperation.
    if (current && current.leaseExpiresAt > now && current.ownerKind !== 'browser') {
      return { status: 'blocked' };
    }
    if (current && current.epoch === Number.MAX_SAFE_INTEGER) return { status: 'blocked' };
    const claim: ProjectEditOwnershipClaim = {
      projectId,
      ownerKind: 'browser',
      ownerId,
      epoch: sameOwner ? current.epoch : (current?.epoch ?? 0) + 1,
      baseRevision: expectedRevision,
    };
    await store.writeEntry(projectEditOwnershipKey(projectId), renewedProjectEditOwnership(claim, expectedRevision));
    return { status: 'claimed', claim };
  });
}

export async function claimOfflineProjectOwnership(
  projectId: string,
  ownerId: string,
): Promise<OfflineOwnershipClaimResult> {
  if (!validProjectEditOwnershipIdentity(projectId, ownerId)) {
    return { status: 'blocked' };
  }
  return withSerializedProjectStore(async (store) => {
    const project = await storedProject(store, projectId);
    if (!project) return { status: 'missing' };
    const entry = await store.readEntry(projectEditOwnershipKey(projectId));
    const compatibility = ownershipCompatibility(entry, projectId);
    if (compatibility === 'blocked') return { status: 'blocked' };
    const current = compatibility === 'current' ? parseProjectEditOwnership(entry.value, projectId)! : null;
    if (current && current.leaseExpiresAt > Date.now()) return { status: 'busy' };
    if (current?.epoch === Number.MAX_SAFE_INTEGER) return { status: 'blocked' };
    const claim: ProjectEditOwnershipClaim = {
      projectId,
      ownerKind: 'offline',
      ownerId,
      epoch: (current?.epoch ?? 0) + 1,
      baseRevision: project.revision,
    };
    await store.writeEntry(projectEditOwnershipKey(projectId), renewedProjectEditOwnership(claim, project.revision));
    return { status: 'claimed', claim, ...project };
  });
}

export async function renewProjectEditOwnership(
  claim: ProjectEditOwnershipClaim,
  _baseRevision = claim.baseRevision,
): Promise<OwnershipRenewResult> {
  return withSerializedProjectStore(async (store) => {
    const ownership = await store.readEntry(projectEditOwnershipKey(claim.projectId));
    if (ownershipCompatibility(ownership, claim.projectId) === 'blocked') return { status: 'blocked' };
    const current = parseProjectEditOwnership(ownership.value, claim.projectId);
    if (!current
      || current.ownerKind !== claim.ownerKind
      || current.ownerId !== claim.ownerId
      || current.epoch !== claim.epoch
      || current.leaseExpiresAt <= Date.now()) return { status: 'stale' };
    const project = await storedProject(store, claim.projectId);
    if (!project || current.baseRevision !== project.revision) return { status: 'stale' };
    const renewed = { ...claim, baseRevision: project.revision };
    await store.writeEntry(
      projectEditOwnershipKey(claim.projectId),
      renewedProjectEditOwnership(renewed, project.revision),
    );
    return { status: 'renewed', claim: renewed, doc: project.doc };
  });
}

export async function releaseProjectEditOwnership(claim: ProjectEditOwnershipClaim): Promise<void> {
  await withSerializedProjectStore(async (store) => {
    const key = projectEditOwnershipKey(claim.projectId);
    const entry = await store.readEntry(key);
    const current = parseProjectEditOwnership(entry.value, claim.projectId);
    if (!current
      || current.ownerKind !== claim.ownerKind
      || current.ownerId !== claim.ownerId
      || current.epoch !== claim.epoch) return;
    await store.writeEntry(key, {
      ...renewedProjectEditOwnership(current, current.baseRevision),
      leaseExpiresAt: 0,
    });
  });
}
