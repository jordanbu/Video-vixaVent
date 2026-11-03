// Multicam/link group normalization must repair what it can instead of
// discarding a whole group: normalizeTimelineGroups runs on EVERY load, and
// the next save makes the discard permanent.
// npx tsx src/persist/multicamPreservation.verify.ts
import assert from 'node:assert/strict';
import type { Timeline, TimelineItem } from '../editor/types';
import { normalizeTimelineGroups } from './migrations/normalize';

const item = (id: string): TimelineItem => ({
  id, track: 'V1', startFrame: 0, durationInFrames: 60,
  kind: 'video', name: id, src: `/${id}.mp4`,
} as TimelineItem);

const angle = (id: string, over: Record<string, unknown> = {}) => ({
  id, itemId: id, label: id, offsetFrames: 0, confidence: 0.9, source: item(id), ...over,
});

const groupWith = (angles: unknown[], evidence: unknown[]): Timeline => ({
  id: 'tl1', name: 'Sequence 1', fps: 30, width: 1920, height: 1080, selectedId: null,
  items: [item('a'), item('b')],
  multicamGroups: [{
    id: 'g1', angles, referenceAngleId: 'a', masterAngleId: 'a', syncMethod: 'audio', evidence,
  }],
} as unknown as Timeline);

const evidenceFor = (angleId: string, confidence = 0.8) => ({
  angleId, method: 'audio', confidence, offsetFrames: 0,
});

// ── Complete data stays unchanged ─────────────────────────────────────────
{
  const out = normalizeTimelineGroups(groupWith(
    [angle('a'), angle('b')],
    [evidenceFor('a'), evidenceFor('b')],
  ));
  assert.equal(out.multicamGroups?.length, 1, 'a complete group survives');
  assert.equal(out.multicamGroups?.[0]?.angles.length, 2);
}

// ── confidence float out of range: clamp instead of dropping the group ───────
{
  const out = normalizeTimelineGroups(groupWith(
    [angle('a', { confidence: 1.0000000000000002 }), angle('b')],
    [evidenceFor('a'), evidenceFor('b')],
  ));
  assert.equal(out.multicamGroups?.length, 1,
    'float noise above 1 must not delete the group');
  assert.equal(out.multicamGroups?.[0]?.angles[0]?.confidence, 1, 'confidence is clamped to 1');

  const negative = normalizeTimelineGroups(groupWith(
    [angle('a', { confidence: -0.0001 }), angle('b')],
    [evidenceFor('a'), evidenceFor('b')],
  ));
  assert.equal(negative.multicamGroups?.[0]?.angles[0]?.confidence, 0, 'clamped to 0 below range');
}

// ── out-of-range evidence is clamped too ────────────────────────────────────
{
  const out = normalizeTimelineGroups(groupWith(
    [angle('a'), angle('b')],
    [evidenceFor('a', 1.5), evidenceFor('b')],
  ));
  assert.equal(out.multicamGroups?.length, 1, 'out-of-range evidence confidence does not drop the group');
  const clamped = out.multicamGroups?.[0]?.evidence.find((e) => e.angleId === 'a');
  assert.equal(clamped?.confidence, 1, 'evidence confidence is clamped');
}

// ── an angle missing evidence: keep the group (evidence is provenance, not structure) ──
{
  const out = normalizeTimelineGroups(groupWith(
    [angle('a'), angle('b')],
    [evidenceFor('a')],
  ));
  assert.equal(out.multicamGroups?.length, 1,
    'an angle without evidence must NOT discard the whole group');
  assert.equal(out.multicamGroups?.[0]?.angles.length, 2, 'both angles are kept');
  assert.equal(out.multicamGroups?.[0]?.evidence.length, 1, 'only real evidence is kept — never synthesized');
}

// ── real structural damage is still rejected ────────────────────────────────
{
  const brokenAngle = normalizeTimelineGroups(groupWith(
    [angle('a'), { id: 'b', label: 'b' }],
    [evidenceFor('a')],
  ));
  // An empty result is normalized to `undefined` by normalizeTimelineGroups.
  assert.equal(brokenAngle.multicamGroups?.length ?? 0, 0,
    'fewer than two structurally valid angles is still rejected');

  const nonFinite = normalizeTimelineGroups(groupWith(
    [angle('a', { confidence: Number.NaN }), angle('b')],
    [evidenceFor('a'), evidenceFor('b')],
  ));
  assert.equal(nonFinite.multicamGroups?.length ?? 0, 0,
    'NaN confidence is not clampable and is still rejected');
}

console.log('multicamPreservation.verify: ok');
