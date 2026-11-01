import assert from 'node:assert/strict';
import { makeDraft } from '../../editor/store';
import { docFromTimeline } from '../../persist/projectStore';
import type { AgentContext } from '../context';
import { execCoreDataTool } from './core-data-tools';

const doc = docFromTimeline({
  fps: 30, width: 1920, height: 1080, selectedId: null,
  trackOrder: ['A1'], tracks: { A1: { kind: 'audio' } },
  items: [{ id: 'audio', track: 'A1', startFrame: 0, durationInFrames: 60, srcInFrame: 7, playbackRate: 2, name: 'audio', kind: 'audio', src: '/media/a.mp3', sourceAssetId: 'asset-a', volume: 0.7, fadeInFrames: 2, fadeOutFrames: 5, keyframes: { volume: [{ frame: 0, value: 1, easing: 'easeOut' }] } }],
});
doc.assets.push({ id: 'asset-a', name: 'audio', kind: 'audio', src: '/media/a.mp3', durationInFrames: 200 });
const draft = makeDraft(doc);
const ctx = { commands: draft.commands, getState: draft.getState, getDoc: draft.getDoc, getCreativeMode: () => null, templates: [], audio: [] } as AgentContext;
const result = execCoreDataTool('read_timeline', {}, ctx) as { items: Array<Record<string, unknown>> };
assert.deepEqual(
  {
    src: result.items[0]?.src,
    sourceAssetId: result.items[0]?.sourceAssetId,
    resolvedSourceAssetId: result.items[0]?.resolvedSourceAssetId,
    linkStatus: result.items[0]?.linkStatus,
    keyframes: result.items[0]?.keyframes,
    transform: result.items[0]?.transform,
    filters: result.items[0]?.filters,
    volume: result.items[0]?.volume,
    fadeInFrames: result.items[0]?.fadeInFrames,
    fadeOutFrames: result.items[0]?.fadeOutFrames,
    sourceStartFrame: result.items[0]?.sourceStartFrame,
    sourceDurationInFrames: result.items[0]?.sourceDurationInFrames,
    sourceEndFrameExclusive: result.items[0]?.sourceEndFrameExclusive,
  },
  {
    src: '/media/a.mp3', sourceAssetId: 'asset-a', resolvedSourceAssetId: 'asset-a', linkStatus: 'linked',
    keyframes: { volume: [{ frame: 0, value: 1, easing: 'easeOut' }] }, transform: null, filters: null, volume: 0.7, fadeInFrames: 2, fadeOutFrames: 5,
    sourceStartFrame: 7, sourceDurationInFrames: 120, sourceEndFrameExclusive: 127,
  },
  'read_timeline shares the full media/state projection',
);
assert.deepEqual((result as { qualityIssues?: unknown }).qualityIssues, [], 'an audio-only timeline has no quality issues');

// read_timeline hands the agent the same quality check as the timeline badge (specs/05).
{
  const pictures = docFromTimeline({
    fps: 30, width: 1920, height: 1080, selectedId: null,
    trackOrder: ['V1'], tracks: { V1: { kind: 'video' } },
    items: [
      { id: 'hd', track: 'V1', startFrame: 0, durationInFrames: 30, name: 'hd', kind: 'video', src: '/media/hd.mp4', width: 1920, height: 1080 },
      { id: 'p720', track: 'V1', startFrame: 30, durationInFrames: 30, name: 'p720', kind: 'video', src: '/media/720.mp4', width: 1280, height: 720 },
      { id: 'p900', track: 'V1', startFrame: 60, durationInFrames: 30, name: 'p900', kind: 'image', src: '/media/900.jpg', width: 1600, height: 900 },
    ],
  });
  const picturesDraft = makeDraft(pictures);
  const picturesCtx = { ...ctx, commands: picturesDraft.commands, getState: picturesDraft.getState, getDoc: picturesDraft.getDoc } as AgentContext;
  const read = execCoreDataTool('read_timeline', {}, picturesCtx) as { qualityIssues: unknown };
  assert.deepEqual(read.qualityIssues, [
    { itemId: 'p720', severity: 'alert', enlargedPercent: 150 },
    { itemId: 'p900', severity: 'warning', enlargedPercent: 120 },
  ], '720p → alert at 150 %, 900p → warning at 120 %, 1080p → nothing');
}
console.log('core-data-tools.verify: shared timeline projection and quality issues passed');
