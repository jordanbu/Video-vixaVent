// Caption overlay visibility checks: npx tsx src/editor/caption-overlay-visibility.verify.ts
// The toolbar (CC button) and the render layer must use the same rule for the default when
// captionsHidden is unset. They used to decide separately: the render layer only counted "an enabled
// caption track", the toolbar also counted "text/MG clips exist". So after turning a caption track off,
// MGs with text or color props were silently hidden in the frame while the CC button still showed
// "on" — the user just saw the MG vanish with no hint pointing at captions.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { captionOverlayVisible } from './timelineTypes';
import type { TimelineState } from './timelineTypes';

const base = (over: Partial<TimelineState> = {}): TimelineState => ({
  id: 'tl', name: 't', fps: 30, width: 1920, height: 1080, items: [], tracks: {}, ...over,
} as TimelineState);

const mg = { id: 'i1', track: 'V2', kind: 'motion-graphic', startFrame: 0, durationInFrames: 30, name: 'badge' } as TimelineState['items'][number];
const captionTrack = (enabled: boolean) => ({
  C1: {
    kind: 'caption',
    captions: { enabled, template: 'bubble-pop', pacing: 'phrase', sources: [], sourceMode: 'item', bilingual: false },
  },
} as unknown as TimelineState['tracks']);

// ── An explicit toggle always wins ──────────────────────────────────────────────
assert.equal(captionOverlayVisible(base({ captionsHidden: true, items: [mg] })), false, 'explicitly hidden');
assert.equal(captionOverlayVisible(base({ captionsHidden: false, tracks: captionTrack(false) })), true, 'explicitly shown');

// ── Regression guard: caption track off + MG present → still visible ─────────
assert.equal(
  captionOverlayVisible(base({ tracks: captionTrack(false), items: [mg] })),
  true,
  'turning a caption track off must not hide MGs too (the production bug described at the top)',
);

// ── Remaining default branches ──────────────────────────────────────────────
assert.equal(captionOverlayVisible(base({ tracks: captionTrack(true) })), true, 'an enabled caption track');
assert.equal(captionOverlayVisible(base({ tracks: captionTrack(false) })), false, 'neither captions nor text/MG clips');

// ── Both call sites must use this helper instead of inlining their own ─────
for (const file of ['./TimelineComposition.tsx', '../components/timeline/useTimelineController.ts']) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  assert.match(source, /captionOverlayVisible\(state\)/, `${file} must call the shared helper`);
  assert.doesNotMatch(
    source,
    /captionsHidden === undefined &&/,
    `${file} must not inline its own captionsHidden fallback rule`,
  );
}

console.log('caption-overlay-visibility.verify: ok (explicit toggle/track off keeps MG/default branches/both ends share the helper)');
