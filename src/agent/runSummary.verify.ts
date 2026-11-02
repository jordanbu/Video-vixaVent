// End-of-run card: what the run changed and the timeline review (specs/10, part B).
// npx tsx src/agent/runSummary.verify.ts
import assert from 'node:assert/strict';
import { CURRENT_PROJECT_VERSION } from '../../shared/project-version';
import type { MediaAsset, ProjectDoc, Timeline, TimelineItem } from '../editor/types';
import { reviewTimeline } from '../editor/timelineReview';
import { appendRunSummary, buildRunSummary, runExports, summarizeProjectChange } from './runSummary';
import type { DisplayMessage } from './agent-session';

const OLD = 'const Component = () => null;';
const NEW = 'const Component = () => null; // v2';
const svc: MediaAsset = { id: 'svc', name: 'Servicio', kind: 'motion-graphic', src: '', durationInFrames: 330, code: OLD };
const closing: MediaAsset = { id: 'closing', name: 'Cierre', kind: 'motion-graphic', src: '', durationInFrames: 330, code: NEW };

const mg = (id: string, templateId: string, startFrame: number, code = OLD): TimelineItem => ({
  id, track: 'V1', startFrame, durationInFrames: 330, name: id, kind: 'motion-graphic', templateId, code, props: {},
});
const audio = (id: string, track: string, startFrame: number, durationInFrames: number, extra: Partial<TimelineItem> = {}): TimelineItem => ({
  id, track, startFrame, durationInFrames, name: id, kind: 'audio', src: `/m/${id}.wav`, ...extra,
});

// ── review: a commercial-like timeline with one of each problem ──
const reviewed: Timeline = {
  id: 'main', name: 'Comercial', order: 0, fps: 30, width: 1920, height: 1080, selectedId: null,
  items: [
    mg('mgA', svc.id, 0), mg('mgB', svc.id, 330), mg('mgC', closing.id, 660, OLD),
    // 2 s with no picture (990–1050), then a 720p photo on a 1080p canvas.
    { id: 'foto', track: 'V1', startFrame: 1050, durationInFrames: 150, name: 'foto', kind: 'image', src: '/m/foto.jpg', width: 1280, height: 720 },
    // Picture on a hidden track never counts.
    { id: 'oculto', track: 'V9', startFrame: 1200, durationInFrames: 300, name: 'oculto', kind: 'image', src: '/m/o.jpg', width: 1920, height: 1080 },
    audio('musica', 'A1', 0, 1290, { src: '/audio/track-3.mp3' }),
    audio('whoosh', 'A2', 320, 20),
    audio('voz', 'A3', 0, 990, { transcript: [{ text: 'Hola', start: 0, end: 400 }] as TimelineItem['transcript'] }),
    // Uploaded narration with no transcript: nothing says it is music (the real commercial's false positive).
    audio('narracion', 'A5', 0, 1290, { src: '/media/uploads/narracion.wav' }),
    audio('silenciada', 'A4', 0, 1400),
  ],
  tracks: {
    V1: { kind: 'video' }, V9: { kind: 'video', hidden: true },
    A1: { kind: 'audio' }, A2: { kind: 'audio' }, A3: { kind: 'audio' }, A4: { kind: 'audio', muted: true }, A5: { kind: 'audio' },
  },
  trackOrder: ['V9', 'V1', 'A1', 'A2', 'A3', 'A4', 'A5'],
  transitions: [{ id: 't1', type: 'cross-dissolve', durationInFrames: 12, outgoingItemId: 'mgA', incomingItemId: 'mgB', trackId: 'V1' }],
};
const issues = reviewTimeline(reviewed, [svc, closing]);
const codes = issues.map((issue) => `${issue.level}:${issue.code}`);
assert.deepEqual(codes, [
  'alert:upscaled_clip',
  'alert:black_gap',
  'warning:stale_motion_graphic',
  'warning:audio_past_picture',
  'suggestion:hard_cut_between_graphics',
  'suggestion:music_without_fade',
], `issues in level order: ${codes.join(', ')}`);
const byCode = Object.fromEntries(issues.map((issue) => [issue.code, issue]));
assert.equal(byCode.upscaled_clip!.percent, 150, '720p on 1080p is 150 %');
assert.deepEqual(byCode.upscaled_clip!.itemIds, ['foto']);
assert.deepEqual([byCode.black_gap!.fromFrame, byCode.black_gap!.toFrame], [990, 1050], 'the empty span');
assert.deepEqual(byCode.stale_motion_graphic!.itemIds, ['mgC'], 'only the clip whose asset has newer code');
assert.equal(byCode.audio_past_picture!.seconds, 3, 'music runs 3 s past the photo; the hidden picture does not count');
assert.deepEqual(byCode.audio_past_picture!.itemIds, ['musica', 'narracion'], 'a muted track is not heard');
assert.deepEqual(byCode.hard_cut_between_graphics!.itemIds, ['mgC'], 'A>B has a transition; B>C is a dry cut; the photo after the gap does not touch');
assert.deepEqual(byCode.music_without_fade!.itemIds, ['musica'], 'library music only: effects, speech and uploaded narration are skipped');
assert.equal(byCode.music_without_fade!.edge, 'both');
// A track that ducks under speech is music whatever its source; an anchor (speech) track never is.
const roles = reviewTimeline({
  ...reviewed, transitions: [], items: [mg('mgA', svc.id, 0, OLD), audio('importada', 'A1', 0, 330, { src: '/media/uploads/tema.mp3' }), audio('locucion', 'A2', 0, 330, { src: '/audio/track-1.mp3' })],
  tracks: { V1: { kind: 'video' }, A1: { kind: 'audio', role: 'follower' }, A2: { kind: 'audio', role: 'anchor' } },
}, [svc]);
assert.deepEqual(roles.filter((issue) => issue.code === 'music_without_fade').map((issue) => issue.itemIds[0]), ['importada']);

// Fixing everything leaves no issue.
const clean = reviewTimeline({
  ...reviewed,
  items: [
    mg('mgA', svc.id, 0), mg('mgB', svc.id, 330), mg('mgC', closing.id, 660, NEW),
    audio('musica', 'A1', 0, 990, { src: '/audio/track-3.mp3', fadeInFrames: 30, fadeOutFrames: 60 }),
  ],
  transitions: [
    ...reviewed.transitions!,
    { id: 't2', type: 'whip-pan', durationInFrames: 14, outgoingItemId: 'mgB', incomingItemId: 'mgC', trackId: 'V1' },
  ],
}, [svc, closing]);
assert.deepEqual(clean, [], 'a finished commercial has no issues');
// A disabled transition is a dry cut again.
const disabled = reviewTimeline({
  ...reviewed, items: [mg('mgA', svc.id, 0), mg('mgB', svc.id, 330)],
  transitions: [{ ...reviewed.transitions![0]!, enabled: false }],
}, [svc]);
assert.deepEqual(disabled.map((issue) => issue.code), ['hard_cut_between_graphics']);
// Filmed footage cut to footage is normal: no suggestion.
const footage = reviewTimeline({
  ...reviewed, transitions: [],
  items: [
    { id: 'v1', track: 'V1', startFrame: 0, durationInFrames: 90, name: 'v1', kind: 'video', src: '/m/v1.mp4', width: 1920, height: 1080 },
    { id: 'v2', track: 'V1', startFrame: 90, durationInFrames: 90, name: 'v2', kind: 'video', src: '/m/v2.mp4', width: 1920, height: 1080 },
  ],
}, []);
assert.deepEqual(footage, [], 'video-to-video cuts are not flagged');

// ── summary: what a run changed ──
const doc = (timeline: Partial<Timeline>, assets: MediaAsset[]): ProjectDoc => ({
  version: CURRENT_PROJECT_VERSION, assets, mediaFolders: [], activeTimelineId: 'main',
  timelines: [{ id: 'main', name: 'Comercial', order: 0, fps: 30, width: 1920, height: 1080, selectedId: null, items: [], tracks: { V1: { kind: 'video' }, A1: { kind: 'audio' } }, trackOrder: ['V1', 'A1'], transitions: [], ...timeline }],
});
const kept = mg('kept', svc.id, 0);
const moved = mg('moved', svc.id, 330);
const recoded = mg('recoded', svc.id, 660);
const gone = mg('gone', svc.id, 990);
const music = audio('music', 'A1', 0, 1320);
const before = doc({ items: [kept, moved, recoded, gone, music] }, [svc]);
const narration: MediaAsset = { id: 'narr', name: 'Narración', kind: 'audio', src: '/m/narr.wav', durationInFrames: 2250 };
const after = doc({
  items: [kept, { ...moved, startFrame: 360 }, { ...recoded, code: NEW }, mg('nuevo', svc.id, 990), { ...music, volume: 0.35 }],
  transitions: [{ id: 'tx', type: 'whip-pan', durationInFrames: 14, outgoingItemId: 'kept', incomingItemId: 'moved', trackId: 'V1' }],
  tracks: { V1: { kind: 'video' }, A1: { kind: 'audio' }, A2: { kind: 'audio', name: 'Voz' } },
}, [svc, narration]);
const changes = summarizeProjectChange(before, after)!;
assert.ok(changes, 'a changed project has a summary');
assert.deepEqual(changes.clipsAdded.map((clip) => clip.id), ['nuevo']);
assert.deepEqual(changes.clipsRemoved.map((clip) => clip.id), ['gone']);
assert.deepEqual(changes.clipsChanged.map((clip) => clip.id), ['moved'], 'volume-only and code-only changes are reported apart');
assert.deepEqual(changes.clipsRecoded.map((clip) => clip.id), ['recoded']);
assert.equal(changes.transitionsAdded, 1);
assert.equal(changes.transitionsRemoved, 0);
assert.equal(changes.tracksAdded, 1);
assert.deepEqual(changes.assetsAdded, [{ id: 'narr', kind: 'audio', name: 'Narración' }]);
assert.deepEqual(changes.volumeChanges, [{ from: 100, to: 35, count: 1 }]);
assert.deepEqual([changes.durationFrom, changes.durationTo, changes.fps], [1320, 1320, 30]);
assert.equal(summarizeProjectChange(before, before), null, 'no change, no summary');
// Key order does not make an unchanged clip look changed.
const reordered = doc({ items: [kept, moved, recoded, gone, Object.fromEntries(Object.entries(music).reverse()) as unknown as TimelineItem] }, [svc]);
assert.equal(summarizeProjectChange(before, reordered), null, 'same clip, different key order');

// ── exports and the chat message ──
const exportTool = (name: string, ok: boolean): DisplayMessage => ({ role: 'tool', text: '', tool: { name: 'submit_export', args: {}, result: ok ? { ok: true, name } : { error: 'falló' } } });
const messages: DisplayMessage[] = [
  { role: 'user', text: 'exporta' },
  exportTool('viejo.mp4', true),
  { role: 'assistant', text: 'listo' },
  { role: 'user', text: 'mejora y exporta' },
  exportTool('fallido.mp4', false),
  exportTool('comercial-v3.mp4', true),
  { role: 'assistant', text: 'hecho' },
];
assert.deepEqual(runExports(messages), ['comercial-v3.mp4'], 'only successful exports of the latest turn');
const exportOnly = buildRunSummary(before, before, ['comercial.mp4'])!;
assert.equal(exportOnly.changes, null, 'an export-only run has a card without changes');
assert.deepEqual(exportOnly.exports, ['comercial.mp4']);
assert.equal(buildRunSummary(before, before, []), null, 'a read-only run has no card');

const withCard = appendRunSummary(messages, before, after);
assert.equal(withCard.length, messages.length + 1);
const card = withCard.at(-1)!;
assert.equal(card.role, 'summary');
assert.equal(card.summary?.timelineId, 'main');
assert.deepEqual(card.summary?.exports, ['comercial-v3.mp4']);
assert.ok(card.summary?.issues.some((issue) => issue.code === 'hard_cut_between_graphics'), 'the review rides along');
assert.equal(appendRunSummary(withCard, before, after), withCard, 'one card per turn');
assert.equal(appendRunSummary([{ role: 'user', text: 'hola' }, { role: 'assistant', text: 'hola' }], before, before).length, 2, 'a chat-only turn adds nothing');

console.log(`runSummary.verify: ok (${issues.length} avisos en el caso del comercial, resumen de 1 alta / 1 baja / 1 cambio / 1 rediseño / 1 volumen)`);
