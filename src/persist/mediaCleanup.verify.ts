// Media cleanup pure-logic checks: reference difference and exclusive-ownership semantics of cascading deletes
// (runs the real flow through the in-memory projectStore).
// Run: npx tsx src/persist/mediaCleanup.verify.ts (wired into verify:persist, runs with pretest).
import assert from 'node:assert/strict';
import { collectAllUploadRefs, orphanDocIdsToPurge, unreferencedOf } from './mediaCleanup';
import { createProject, listProjectDocIds, purgeProject } from './projectStore';
import { kvGet, kvSet } from './sharedKv';
import { listVersions, saveVersion } from './versionStore';
import type { ProjectDoc } from '../editor/types';

// ── unreferencedOf: on disk − referenced ─────────────────────────────────────
{
  const files = [
    { name: 'a.mp4', bytes: 10, mtimeMs: 1 },
    { name: 'poeta_01_inicio.mp3', bytes: 20, mtimeMs: 2 },
    { name: 'kept.png', bytes: 30, mtimeMs: 3 },
  ];
  const refs = new Set(['/media/uploads/kept.png']);
  const orphans = unreferencedOf(files, refs);
  assert.deepEqual(orphans.map((f) => f.name), ['a.mp4', 'poeta_01_inicio.mp3'], 'referenced files stay off the orphan list (non-ASCII names work as usual)');
  console.log('unreferencedOf: OK');
}

// ── orphanDocIdsToPurge: index health guard ──────────────────────────────────
{
  assert.deepEqual(orphanDocIdsToPurge(new Set(['a']), ['a', 'b']), ['b'], 'documents missing from the index are orphans');
  assert.deepEqual(orphanDocIdsToPurge(new Set(['a']), ['a']), [], 'no orphans when the index is complete');
  assert.deepEqual(orphanDocIdsToPurge(new Set(), []), [], 'nothing happens on an empty store');
  assert.deepEqual(orphanDocIdsToPurge(new Set(), ['a', 'b']), [],
    'an empty index with existing documents = lost/unreadable index; never purge every project as an orphan');
  console.log('orphanDocIdsToPurge: OK');
}

// ── reference union + exclusive ownership (in-memory projectStore) ───────────
{
  const doc = (src: string): ProjectDoc => ({
    version: 3,
    assets: [{ id: 'a1', name: 'x', kind: 'video', src, durationInFrames: 30 }],
    mediaFolders: [],
    timelines: [{ id: 'tl1', name: 'Sequence 1', fps: 30, width: 1920, height: 1080, selectedId: null, items: [] } as never],
    activeTimelineId: 'tl1',
  } as never);
  const shared = '/media/uploads/shared.mp4';
  const solo = '/media/uploads/solo.mp4';
  const p1 = await createProject('Alpha', doc(shared));
  const p2 = await createProject('Beta', doc(shared));
  const p3 = await createProject('Gamma', doc(solo));

  let refs = await collectAllUploadRefs();
  assert.ok(refs.has(shared) && refs.has(solo), 'the union contains every reference');

  // excluding p3, solo has no references → the cascade deletes it; shared is kept because p2 still uses it
  refs = await collectAllUploadRefs(p3.id);
  assert.ok(!refs.has(solo) && refs.has(shared), 'excluding itself: exclusive media is exposed, shared media stays protected');

  // after deleting p1, shared is still referenced by p2
  await purgeProject(p1.id);
  refs = await collectAllUploadRefs();
  assert.ok(refs.has(shared), 'while the copy exists, the shared media reference is not lost');

  for (const m of [p2, p3]) await purgeProject(m.id);
  assert.equal((await listProjectDocIds()).length, 0, 'no documents left after purge');
  console.log('collectAllUploadRefs/cascade semantics: OK');
}

// Snapshots that this build cannot display still own their uploaded media.
{
  const doc: ProjectDoc = {
    version: 3, assets: [], mediaFolders: [],
    timelines: [{ id: 'tl1', name: 'sequence', fps: 30, width: 1920, height: 1080, selectedId: null, items: [] } as never],
    activeTimelineId: 'tl1',
  } as never;
  const project = await createProject('snapshot cleanup safety', doc);
  const futureSrc = '/media/uploads/future-snapshot-only.mp4';
  const snapshots = [{ id: 'future', name: 'newer build', createdAt: 1,
    doc: { ...doc, version: 99, assets: [{ src: futureSrc }] } }];
  await kvSet(`versions:${project.id}`, snapshots);
  assert.deepEqual(await listVersions(project.id), [], 'future versions stay hidden from the display list');
  const spacedSrc = '/media/uploads/readable snapshot only.mp4';
  await saveVersion(project.id, 'readable snapshot', { ...doc, assets: [{ id: 'space', name: 'spaced', kind: 'video', src: spacedSrc, durationInFrames: 30 }] });
  const storedBefore = await kvGet(`versions:${project.id}`);
  const refs = await collectAllUploadRefs();
  assert.ok(refs.has(spacedSrc), 'readable snapshots retain their complete media paths');
  assert.ok(refs.has(futureSrc), 'cleanup protects media owned only by an unreadable snapshot');
  assert.deepEqual(unreferencedOf([{ name: 'future-snapshot-only.mp4', bytes: 1, mtimeMs: 1 }], refs), []);
  assert.deepEqual(await kvGet(`versions:${project.id}`), storedBefore, 'reference collection preserves snapshot bytes');
  assert.ok(!(await collectAllUploadRefs(project.id)).has(futureSrc), 'excluded projects exclude their snapshots too');
  await purgeProject(project.id);
}
console.log('\nmediaCleanup.check: ALL PASSED');
