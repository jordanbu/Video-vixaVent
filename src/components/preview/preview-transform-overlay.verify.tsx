import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PlayerRef } from '@remotion/player';
import type { RefObject } from 'react';
import type { TimelineItem, TimelineState } from '../../editor/types';
import { t } from '../../i18n/locale';
import { PreviewTransformOverlay } from './PreviewTransformOverlay';
import { fitPreviewCanvasSize, previewPaddedClientSize, previewStageContentSize } from './previewCanvasGeometry';

const item: TimelineItem = {
  id: 'card',
  track: 'V2',
  startFrame: 0,
  durationInFrames: 90,
  kind: 'motion-graphic',
  name: 'Quote card',
  width: 1080,
  height: 1920,
  transform: { x: 5, y: -4, scale: 0.8, rotation: 8 },
};

const stateOf = (trackPatch: Record<string, unknown> = {}, selectedId: string | null = 'card'): TimelineState => ({
  fps: 30,
  width: 1080,
  height: 1920,
  fit: 'contain',
  selectedId,
  selectedIds: selectedId ? [selectedId] : [],
  trackOrder: ['V2'],
  tracks: { V2: { kind: 'video', ...trackPatch } },
  items: [item],
});

const playerRef = {
  current: { getCurrentFrame: () => 20, pause: () => undefined } as unknown as PlayerRef,
} as RefObject<PlayerRef | null>;

const props = {
  playerRef,
  onSelectItem: () => undefined,
  onSetItemTransform: () => undefined,
  onSetItemKeyframe: () => undefined,
  onBeginHistoryGesture: () => undefined,
  onEndHistoryGesture: () => undefined,
};

// The canvas wrapper itself must be the contained composition rect. All
// interactive overlays are inset:0 children of this wrapper, so keeping its
// aspect is what makes caption hit boxes and clip handles share one coordinate
// space after an aspect switch.
assert.deepEqual(
  fitPreviewCanvasSize(
    { width: 558, height: 770 },
    { width: 1920, height: 1080 },
  ),
  { width: 558, height: 313.875 },
  '16:9 should contain by width in a tall preview pane, with one shared scale for width and height',
);
assert.deepEqual(
  fitPreviewCanvasSize(
    { width: 558, height: 770 },
    { width: 1080, height: 1080 },
  ),
  { width: 558, height: 558 },
  '1:1 should get a square hit layer and edit box',
);
assert.deepEqual(
  fitPreviewCanvasSize(
    { width: 900, height: 500 },
    { width: 1080, height: 1920 },
  ),
  { width: 281.25, height: 500 },
  '9:16 should contain by height in a wide preview pane without rounding 281.25 to 281',
);
{
  const fitted = fitPreviewCanvasSize({ width: 360, height: 776 }, { width: 1080, height: 1920 });
  assert.equal(fitted.width * 1920, fitted.height * 1080, 'preview wrapper aspect must equal the composition');
  assert.deepEqual(fitted, { width: 360, height: 640 });
}
assert.deepEqual(
  previewStageContentSize({
    contentBoxSize: [{ inlineSize: 360, blockSize: 776 }],
    contentRect: { width: 360, height: 776 },
  }),
  { width: 360, height: 776 },
  'stage size is the content box, not clientWidth with padding',
);
assert.deepEqual(
  previewPaddedClientSize(
    { width: 400, height: 800 },
    { left: 20, right: 20, top: 12, bottom: 12 },
  ),
  { width: 360, height: 776 },
  '12px 20px stage padding must not be treated as composition space',
);
const previewPanelSource = readFileSync(new URL('../PreviewPanel.tsx', import.meta.url), 'utf8');
assert.match(
  previewPanelSource,
  /fitPreviewCanvasSize\(stageSize,\s*\{\s*width:\s*state\.width,\s*height:\s*state\.height/s,
  'the preview panel must give the same contained canvas size to the player, the caption hit layer and the clip transform layer',
);
assert.match(
  previewPanelSource,
  /previewStageContentSize/,
  'ResizeObserver must use the stage content box so padding is not composition space',
);
assert.match(
  previewPanelSource,
  /previewPaddedClientSize/,
  'first layout must subtract stage padding from clientWidth',
);

// A selected editable clip exposes one compact transform frame and nine handles.
{
  const markup = renderToStaticMarkup(<PreviewTransformOverlay state={stateOf()} {...props} />);
  assert.ok(markup.includes(`aria-label="${t('Preview canvas clip transform')}"`));
  assert.match(markup, /data-preview-selection="card"/);
  assert.equal((markup.match(/data-preview-handle="scale-[0-3]"/g) ?? []).length, 4, 'all four corners should scale proportionally');
  assert.equal((markup.match(/data-preview-handle="crop-[nsew]"/g) ?? []).length, 4, 'the four edge midpoints should crop');
  assert.equal((markup.match(/data-preview-handle="rotate"/g) ?? []).length, 1, 'there should be a rotation handle at the top');
  assert.match(markup, /var\(--vx-accent\)/, 'the control box color follows the current skin accent');
}

// Locked and hidden tracks can never expose writable controls.
for (const trackPatch of [{ locked: true }, { hidden: true }]) {
  const markup = renderToStaticMarkup(<PreviewTransformOverlay state={stateOf(trackPatch)} {...props} />);
  assert.doesNotMatch(markup, /data-preview-selection=/);
  assert.doesNotMatch(markup, /data-preview-handle=/);
}

// A timeline selection outside the current frame must not leave a stale box.
{
  const state = stateOf();
  state.items = [{ ...item, startFrame: 30 }];
  const markup = renderToStaticMarkup(<PreviewTransformOverlay state={state} {...props} />);
  assert.doesNotMatch(markup, /data-preview-selection=/);
}

// Window resize can briefly report a zero-size composition; controls stay hidden until geometry is valid.
{
  const state = stateOf();
  state.width = 0;
  state.height = 0;
  const markup = renderToStaticMarkup(<PreviewTransformOverlay state={state} {...props} />);
  assert.doesNotMatch(markup, /data-preview-selection=/);
  assert.doesNotMatch(markup, /data-preview-handle=/);
}

console.log('preview-transform-overlay.verify: ok (semantics/skin/four corners/four-edge crop/rotation/hidden when locked/frame range)');
