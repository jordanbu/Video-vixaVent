// Runnable check: `npx tsx src/editor/qualityAlerts.verify.ts`.
// Quality alerts (specs/05-alertas-de-calidad.md): effective upscale per picture
// clip (fit × peak scale × peak zoom × export scale), the 110 % / 150 % bands,
// kinds that are never evaluated, and the export-above-sources check.
import assert from 'node:assert/strict';
import {
  assessTimelineQuality,
  clipQualityIssue,
  clipUpscaleFactor,
  qualityPercent,
  qualitySeverity,
} from './qualityAlerts';
import type { TimelineItem, TimelineState } from './types';

const near = (actual: number | null | undefined, expected: number, message: string) => {
  assert.ok(actual !== null && actual !== undefined, `${message}: no value`);
  assert.ok(Math.abs(actual - expected) < 1e-3, `${message}: ${actual} ≠ ${expected}`);
};

const clip = (patch: Partial<TimelineItem> = {}): TimelineItem => ({
  id: 'v', track: 'V1', startFrame: 0, durationInFrames: 100,
  kind: 'video', name: 'clip', src: '/m/clip.mp4', width: 1920, height: 1080, ...patch,
} as TimelineItem);

const timeline = (items: TimelineItem[], patch: Partial<TimelineState> = {}): TimelineState => ({
  fps: 30, width: 1920, height: 1080, selectedId: null,
  tracks: { V1: { kind: 'video' }, V2: { kind: 'video' }, A1: { kind: 'audio' } },
  trackOrder: ['V2', 'V1', 'A1'], items, ...patch,
});

const canvas1080 = { width: 1920, height: 1080, fit: 'contain' as const };

// ── bands: up to 110 % nothing, above it a warning, 150 % and up an alert ──
{
  assert.equal(qualitySeverity(1), null);
  assert.equal(qualitySeverity(1.1), null, '110 % exactly is still fine');
  assert.equal(qualitySeverity(1.11), 'warning');
  assert.equal(qualitySeverity(1.49), 'warning');
  assert.equal(qualitySeverity(1.5), 'alert', '150 % exactly (720p → 1080p) is an alert');
  assert.equal(qualitySeverity(1.4999999), 'alert', 'pixel rounding just under 1.5 still alerts');
  assert.equal(qualitySeverity(Number.NaN), null);
  assert.equal(qualityPercent(1.8), 180);
}

// ── 720p in a 1080p canvas → alert at 150 % ──
{
  const issues = assessTimelineQuality(timeline([clip({ id: 'hd', width: 1280, height: 720 })]));
  assert.equal(issues.length, 1);
  assert.equal(issues[0]!.code, 'upscaled_clip');
  assert.equal(issues[0]!.severity, 'alert');
  assert.equal(issues[0]!.itemId, 'hd');
  near(issues[0]!.factor, 1.5, '720p fills 1080p at 150 %');
}

// ── 1080p in a 1080p canvas → nothing; 4K source → nothing (downscaled) ──
{
  assert.deepEqual(assessTimelineQuality(timeline([clip()])), []);
  assert.deepEqual(assessTimelineQuality(timeline([clip({ width: 3840, height: 2160 })])), []);
}

// ── zoom: reframe keyframe at 2×, shape curve at 2×, plugin envelope overshoot ──
{
  const reframed = clip({
    zoom: {
      reframeCurve: {
        version: 1, timebase: 'effect-frame', coordinateSpace: 'composition-normalized',
        keyframes: [
          { frame: 0, focalPointX: 0.5, focalPointY: 0.5, magnification: 1 },
          { frame: 50, focalPointX: 0.3, focalPointY: 0.4, magnification: 2 },
          { frame: 99, focalPointX: 0.5, focalPointY: 0.5, magnification: 1 },
        ],
      },
    },
  });
  const issue = clipQualityIssue(reframed, canvas1080);
  assert.equal(issue?.severity, 'alert', '2× zoom keyframe on 1080p alerts');
  near(issue?.factor, 2, 'worst moment of the reframe curve');

  near(clipUpscaleFactor(clip({ zoom: { shape: 'punch', magnification: 2 } }), canvas1080), 2, 'shape zoom peaks at its magnification');
  near(clipUpscaleFactor(clip({ zoom: { shape: 'hold', magnification: 0.8 } }), canvas1080), 1, 'a zoom-out never enlarges');
  near(
    clipUpscaleFactor(clip({ zoom: { magnification: 2, envelope: [0, 1.5, 1] } }), canvas1080),
    2.5,
    'envelope overshoot (1 + (2 − 1) × 1.5)',
  );
}

// ── scale: static, keyframed (worst key inside the clip), non-uniform, combined with zoom ──
{
  const warning = clipQualityIssue(clip({ transform: { scale: 1.3 } }), canvas1080);
  assert.equal(warning?.severity, 'warning');
  near(warning?.factor, 1.3, 'static scale 130 %');

  near(
    clipUpscaleFactor(clip({ keyframes: { scale: [{ frame: 0, value: 1 }, { frame: 60, value: 1.8 }, { frame: 99, value: 1 }] } }), canvas1080),
    1.8,
    'peak scale keyframe',
  );
  near(
    clipUpscaleFactor(clip({ keyframes: { scale: [{ frame: 0, value: 1 }, { frame: 200, value: 3 }] } }), canvas1080),
    1 + 2 * (99 / 200),
    'a key past the trimmed clip end only counts as far as the clip reaches it',
  );
  near(clipUpscaleFactor(clip({ transform: { scaleX: 1.6, scaleY: 1 } }), canvas1080), 1.6, 'the wider axis decides');
  near(
    clipUpscaleFactor(clip({ width: 1280, height: 720, transform: { scale: 1.2 }, zoom: { shape: 'hold', magnification: 1.5 } }), canvas1080),
    1.5 * 1.2 * 1.5,
    'fit × scale × zoom multiply',
  );
  assert.equal(clipQualityIssue(clip({ width: 1280, height: 720, transform: { scale: 0.5 } }), canvas1080), null, 'a small PiP of a 720p clip is fine');
}

// ── fit: cover enlarges what contain letterboxes ──
{
  const fourByThree = clip({ width: 1440, height: 1080 });
  assert.equal(clipQualityIssue(fourByThree, canvas1080), null, 'contain keeps 4:3 at 100 %');
  near(clipUpscaleFactor(fourByThree, { ...canvas1080, fit: 'cover' }), 1920 / 1440, 'cover crops 4:3 to fill 16:9');
  const vertical = clip({ width: 1080, height: 1920 });
  near(clipUpscaleFactor(vertical, { ...canvas1080, fit: 'cover' }), 1920 / 1080, 'a phone video covering a horizontal canvas');
  near(clipUpscaleFactor(vertical, canvas1080), 1080 / 1920, 'contained it shrinks instead');
}

// ── images are evaluated; audio, text, shapes, vectors and motion graphics are not ──
{
  const photo = clip({ id: 'photo', kind: 'image', src: '/m/photo.jpg', width: 800, height: 600 });
  const photoIssue = clipQualityIssue(photo, canvas1080);
  assert.equal(photoIssue?.severity, 'alert');
  near(photoIssue?.factor, 1.8, '800×600 image contained in 1080p');
  assert.equal(clipQualityIssue({ ...photo, transform: { scale: 0.25 } }, canvas1080), null, 'a small logo is fine');

  const ignored: TimelineItem[] = [
    clip({ id: 'a', kind: 'audio', track: 'A1', width: 320, height: 240 }),
    clip({ id: 't', kind: 'text', width: 200, height: 80, transform: { scale: 4 } }),
    clip({ id: 's', kind: 'solid', width: 16, height: 16 }),
    clip({ id: 'svg', kind: 'svg', width: 64, height: 64 }),
    clip({ id: 'mg', kind: 'motion-graphic', width: 400, height: 300 }),
    clip({ id: 'seq', kind: 'sequence', width: 640, height: 360 }),
  ];
  assert.deepEqual(assessTimelineQuality(timeline(ignored)), [], 'only video and image clips are evaluated');
  assert.equal(clipUpscaleFactor(clip({ width: undefined, height: undefined }), canvas1080), null, 'unknown source size is not guessed');
}

// ── hidden tracks are not in the output; the clip itself still reports ──
{
  const low = clip({ id: 'low', track: 'V2', width: 640, height: 360 });
  const hidden = timeline([low], { tracks: { V1: { kind: 'video' }, V2: { kind: 'video', hidden: true } } });
  assert.deepEqual(assessTimelineQuality(hidden), []);
  assert.equal(clipQualityIssue(low, hidden)?.severity, 'alert');
}

// ── export: the chosen resolution scales every clip and is compared with the largest source ──
{
  const sources = timeline([clip({ id: 'main' }), clip({ id: 'broll', width: 1280, height: 720, startFrame: 100 })]);
  assert.deepEqual(
    assessTimelineQuality(sources).map((issue) => issue.itemId),
    ['broll'],
    'editing: only the 720p clip is enlarged',
  );

  const at4k = assessTimelineQuality(sources, { exportResolution: '4k' });
  const above = at4k.find((issue) => issue.code === 'export_above_sources');
  assert.equal(above?.severity, 'alert', '4K export over 1080p sources');
  near(above?.factor, 2, '2160 / 1080');
  assert.equal(above?.sourceShortSide, 1080);
  near(at4k.find((issue) => issue.itemId === 'main')?.factor, 2, '1080p clip doubled at 4K');
  near(at4k.find((issue) => issue.itemId === 'broll')?.factor, 3, '720p clip tripled at 4K');

  assert.equal(
    assessTimelineQuality(sources, { exportResolution: '1080p' }).some((issue) => issue.code === 'export_above_sources'),
    false,
    '1080p export with a 1080p source adds nothing',
  );
  assert.deepEqual(
    assessTimelineQuality(sources, { exportResolution: '720p' }),
    [],
    'a 720p export downscales everything',
  );
  assert.deepEqual(
    assessTimelineQuality(timeline([clip({ kind: 'text', width: 200, height: 80 })]), { exportResolution: '4k' }),
    [],
    'no picture sources → no export comparison',
  );
  const vertical = assessTimelineQuality(
    timeline([clip({ width: 1080, height: 1920 })], { width: 1080, height: 1920 }),
    { exportResolution: '4k' },
  ).find((issue) => issue.code === 'export_above_sources');
  assert.equal(vertical?.sourceShortSide, 1080, 'vertical sources are measured by their short side too');
}

console.log('qualityAlerts.verify: ok (bandas 110/150 %, encaje, escala y zoom en el peor momento, tipos ignorados, exportación sobre las fuentes)');
