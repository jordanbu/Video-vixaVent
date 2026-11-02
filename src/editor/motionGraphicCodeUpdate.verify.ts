// New motion-graphic code reaches the clips already placed (specs/10, part A).
// npx tsx src/editor/motionGraphicCodeUpdate.verify.ts
import assert from 'node:assert/strict';
import { CURRENT_PROJECT_VERSION } from '../../shared/project-version';
import { historyReduce, projectReduce } from './reduce';
import type { MediaAsset, ProjectDoc, TimelineItem } from './types';
import type { AgentContext } from '../agent/context';
import { execEditAssetTool } from '../agent/tools/edit-asset-tools';

const OLD = 'const Component = ({ item }) => { const rootStyle = { position: "absolute", inset: 0 }; return <div style={rootStyle}>{item.props.title}</div>; };';
const NEW = 'const Component = ({ item }) => { const rootStyle = { position: "absolute", inset: 0, color: "red" }; return <div style={rootStyle}>{item.props.title}</div>; };';

const service: MediaAsset = { id: 'mg-service', name: 'Servicio', kind: 'motion-graphic', src: '', durationInFrames: 330, code: OLD, props: { title: 'Plantilla' } };
const closing: MediaAsset = { id: 'mg-closing', name: 'Cierre', kind: 'motion-graphic', src: '', durationInFrames: 360, code: OLD };
const video: MediaAsset = { id: 'vid', name: 'Toma.mp4', kind: 'video', src: '/media/toma.mp4', durationInFrames: 90 };

const mgClip = (id: string, templateId: string, startFrame: number, title: string): TimelineItem => ({
  id, track: 'V1', startFrame, durationInFrames: 330, name: id, kind: 'motion-graphic',
  templateId, code: OLD, props: { title, sectionAccent: '#c4613c' },
});
const ia = mgClip('ia', service.id, 0, 'Inteligencia artificial');
const energia = { ...mgClip('energia', service.id, 330, 'Energía solar'), transform: { scale: 1.1 } } as TimelineItem;
const cierre = mgClip('cierre', closing.id, 660, 'Cierre');
const toma: TimelineItem = { id: 'toma', track: 'V2', startFrame: 0, durationInFrames: 90, name: 'Toma.mp4', kind: 'video', src: video.src, sourceAssetId: video.id };
const otherSequenceClip = mgClip('otra-secuencia', service.id, 0, 'Vertical');

const doc: ProjectDoc = {
  version: CURRENT_PROJECT_VERSION,
  assets: [service, closing, video],
  mediaFolders: [],
  activeTimelineId: 'main',
  timelines: [
    {
      id: 'main', name: 'Comercial', order: 0, fps: 30, width: 1920, height: 1080,
      items: [ia, energia, cierre, toma],
      tracks: { V1: { kind: 'video' }, V2: { kind: 'video' } }, trackOrder: ['V1', 'V2'],
      transitions: [{ id: 't1', type: 'whip-pan', durationInFrames: 14, outgoingItemId: ia.id, incomingItemId: energia.id, trackId: 'V1' }],
      selectedId: null,
    },
    {
      id: 'vertical', name: 'Vertical', order: 1, fps: 30, width: 1080, height: 1920,
      items: [otherSequenceClip], tracks: { V1: { kind: 'video' } }, trackOrder: ['V1'], transitions: [],
      selectedId: null,
    },
  ],
};

// ── the reducer ──
const next = projectReduce(doc, { type: 'pool.updateAsset', id: service.id, patch: { code: NEW } });
const item = (d: ProjectDoc, timeline: number, id: string) => d.timelines[timeline]!.items.find((it) => it.id === id)!;
assert.equal(next.assets.find((a) => a.id === service.id)?.code, NEW, 'the asset gets the new code');
assert.equal(item(next, 0, 'ia').code, NEW, 'a placed clip gets the new code');
assert.equal(item(next, 0, 'energia').code, NEW);
assert.equal(item(next, 1, 'otra-secuencia').code, NEW, 'clips in every sequence are updated');
assert.deepEqual(item(next, 0, 'ia').props, ia.props, 'each clip keeps its own props');
assert.deepEqual(item(next, 0, 'energia').props, energia.props);
assert.deepEqual(item(next, 0, 'energia').transform, { scale: 1.1 }, 'and its transform');
assert.equal(item(next, 0, 'energia').startFrame, 330, 'and its timing');
assert.equal(item(next, 0, 'cierre').code, OLD, 'clips of another asset keep their code');
assert.equal(item(next, 0, 'toma'), toma, 'a video clip is untouched (same object)');
assert.deepEqual(next.timelines[0]!.transitions, doc.timelines[0]!.transitions, 'transitions survive');
const { code: _ignored, ...nextWithoutCode } = item(next, 0, 'ia');
const { code: _ignoredOld, ...oldWithoutCode } = ia;
assert.deepEqual(nextWithoutCode, oldWithoutCode, 'nothing but code changes on the clip');

// Same code again: nothing changes (no new document).
const same = projectReduce(next, { type: 'pool.updateAsset', id: service.id, patch: { code: NEW } });
assert.equal(same, next, 'an unchanged code is a no-op');

// Props on the asset do not overwrite the props of placed clips.
const propsOnly = projectReduce(doc, { type: 'pool.updateAsset', id: service.id, patch: { props: { title: 'Nueva plantilla' } } });
assert.deepEqual(item(propsOnly, 0, 'ia').props, ia.props, 'asset props never overwrite clip props');
assert.equal(item(propsOnly, 0, 'ia').code, OLD);

// Rename and new code together.
const both = projectReduce(doc, { type: 'pool.updateAsset', id: service.id, patch: { name: 'Servicio v2', code: NEW } });
assert.equal(item(both, 0, 'ia').name, 'Servicio v2');
assert.equal(item(both, 0, 'ia').code, NEW);

// One undo step brings back the old code everywhere.
const history = { past: [], present: doc, future: [] } as unknown as Parameters<typeof historyReduce>[0];
const edited = historyReduce(history, { type: 'pool.updateAsset', id: service.id, patch: { code: NEW } });
assert.equal(item(edited.present, 0, 'ia').code, NEW);
const undone = historyReduce(edited, { type: 'undo' });
assert.equal(item(undone.present, 0, 'ia').code, OLD, 'one undo restores the clip code');
assert.equal(undone.present.assets.find((a) => a.id === service.id)?.code, OLD, 'and the asset code');

// ── edit_asset reports how many clips it reached ──
const calls: unknown[][] = [];
const ctx = {
  getDoc: () => doc,
  getState: () => doc.timelines[0],
  commands: { editMediaAsset: (...args: unknown[]) => { calls.push(args); } },
} as unknown as AgentContext;
const result = await execEditAssetTool('edit_asset', { action: 'update', assetId: service.id, code: NEW }, ctx) as { ok?: boolean; updatedClips?: number; error?: string };
assert.equal(result.error, undefined, String(result.error));
assert.equal(result.ok, true);
assert.equal(result.updatedClips, 3, 'two clips in the main sequence and one in the vertical one');
assert.deepEqual(calls[0], [service.id, { code: NEW }]);
const renameOnly = await execEditAssetTool('edit_asset', { action: 'update', assetId: service.id, name: 'Otro' }, ctx) as { updatedClips?: number };
assert.equal(renameOnly.updatedClips, undefined, 'no clip count without a code change');

console.log('motionGraphicCodeUpdate.verify: ok (3 clips actualizados, props y transiciones intactos, 1 deshacer)');
