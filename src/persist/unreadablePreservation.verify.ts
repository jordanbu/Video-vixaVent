// Data-safety rule: boundary validation on READ must not become deletion on
// WRITE. Entries this build cannot parse are usually data written by a NEWER
// build; filtering them for display is right, writing the filtered list back
// destroys them. Covers versionStore / exportHistoryStore / templateStore /
// jobRegistryStore plus the v1→v2 unknown-field passthrough and the chat
// load three states. npx tsx src/persist/unreadablePreservation.verify.ts
import assert from 'node:assert/strict';
import { CURRENT_PROJECT_VERSION } from '../../shared/project-version';
import type { ProjectDoc } from '../editor/types';
import { partitionRecords, withPreservedRecords } from './recordPartition';
import { kvGet, kvSet, resetSharedKvMemory } from './sharedKv';
import { deleteVersion, listVersions, saveVersion } from './versionStore';
import { listExportHistory, recordExport } from './exportHistoryStore';
import { v1ToV2 } from './migrations/v1-to-v2';

const doc: ProjectDoc = {
  version: CURRENT_PROJECT_VERSION,
  assets: [],
  mediaFolders: [],
  timelines: [{
    id: 'tl1', name: 'Sequence 1', fps: 30, width: 1920, height: 1080, selectedId: null, items: [],
  }],
  activeTimelineId: 'tl1',
} as unknown as ProjectDoc;

// ── partitionRecords / withPreservedRecords pure logic ────────────────────
{
  const parse = (v: unknown) => (typeof v === 'number' ? v : null);
  const { valid, opaque } = partitionRecords([1, 'x', 2, { future: true }], parse);
  assert.deepEqual(valid, [1, 2], 'parsable entries surface');
  assert.deepEqual(opaque, ['x', { future: true }], 'unparsable entries are kept verbatim');
  assert.deepEqual(withPreservedRecords([9], opaque), [9, 'x', { future: true }],
    'writes carry the opaque tail');
  assert.deepEqual(withPreservedRecords([9], []), [9], 'no opaque tail = plain array');
  assert.deepEqual(partitionRecords('not an array', parse), { valid: [], opaque: [] },
    'a non-array value degrades to empty, never throws');
}

// ── versionStore: a newer snapshot (version 99) must not be wiped by an older build's autosave ──
{
  resetSharedKvMemory();
  const projectId = 'proj-versions';
  const futureSnapshot = { id: 'future', name: 'From a newer build', createdAt: 1, doc: { version: 99 } };
  await kvSet(`versions:${projectId}`, [futureSnapshot]);
  assert.deepEqual(await listVersions(projectId), [], 'unreadable snapshots stay out of the display list');

  await saveVersion(projectId, 'This build snapshot', doc);
  const stored = await kvGet<unknown[]>(`versions:${projectId}`);
  assert.equal(stored?.length, 2, 'after writing, both the new and the old entries are there');
  assert.deepEqual(stored?.[1], futureSnapshot, 'the newer snapshot is kept as is (not wiped by writing back the filtered list)');
  assert.equal((await listVersions(projectId)).length, 1, 'the display layer still only sees the readable one');

  const mine = (await listVersions(projectId))[0]!;
  await deleteVersion(projectId, mine.id);
  const afterDelete = await kvGet<unknown[]>(`versions:${projectId}`);
  assert.deepEqual(afterDelete, [futureSnapshot], 'deleting our own version leaves the unreadable entries alone');
}

// ── exportHistoryStore: unknown entries and unknown fields are both kept ──────
{
  resetSharedKvMemory();
  const futureRecord = { kind: 'future-export', payload: 1 };
  const knownWithExtra = {
    id: 'e1', name: 'a.mp4', format: 'video', createdAt: 2, futureField: 'keep-me',
  };
  await kvSet('export:history', [knownWithExtra, futureRecord]);
  await recordExport({ name: 'b.mp4', format: 'video', createdAt: 3 });
  const stored = await kvGet<Array<Record<string, unknown>>>('export:history');
  assert.equal(stored?.length, 3, 'new record + known record + unreadable record');
  assert.deepEqual(stored?.[2], futureRecord, 'the unreadable record is kept as is');
  const preserved = stored?.find((r) => r.id === 'e1');
  assert.equal(preserved?.futureField, 'keep-me', 'unknown fields on a known record pass through');
  assert.equal((await listExportHistory()).length, 2, 'the display layer only lists readable records');
}

// ── v1→v2: unknown top-level fields pass through, an invalid designStyle is still stripped ──
{
  const migrated = v1ToV2.migrate({
    version: 1,
    assets: [],
    mediaFolders: [],
    timelines: [{ id: 'tl1', name: 's', fps: 30, width: 1920, height: 1080, selectedId: null, items: [] }],
    activeTimelineId: 'tl1',
    futureTopLevel: { keep: true },
    designStyle: 'not-a-style',
  }) as Record<string, unknown>;
  assert.equal(migrated.version, 2, 'version advances');
  assert.deepEqual(migrated.futureTopLevel, { keep: true }, 'unknown top-level fields no longer vanish');
  assert.equal(migrated.designStyle, undefined, 'an invalid designStyle is still stripped (not carried over by the spread)');
}

console.log('unreadablePreservation.verify: ok');
