// Quality alerts (specs/05-alertas-de-calidad.md): how far each picture clip is
// enlarged past its own pixels, measured from data the clip already carries.
// Pure — no React, no DOM — so the timeline badge, the inspector line and the
// export dialog all read the same numbers.
import { exportScale, type ExportResolution } from '../export/mediaSettings';
import { resolveClipScaleAxes } from './clipTransformScale';
import { sampleKeyframes } from './keyframes';
import type { TimelineItem, TimelineState, ZoomEffect } from './types';
import { renderedVisualFrameRect } from './visualFrameGeometry';
import { zoomAt } from './zoom';

export type QualityIssueCode = 'upscaled_clip' | 'export_above_sources';
export type QualitySeverity = 'warning' | 'alert';

export interface QualityIssue {
  code: QualityIssueCode;
  severity: QualitySeverity;
  /** Affected clip (`upscaled_clip`). */
  itemId?: string;
  /** How much the picture is enlarged: 1.8 = 180 %. */
  factor: number;
  /** `export_above_sources`: short side of the largest source in pixels (1080 = 1080p). */
  sourceShortSide?: number;
}

export interface QualityOptions {
  /** Preset picked in the export dialog. Absent while editing: clips are measured against the canvas. */
  exportResolution?: ExportResolution;
}

/** Up to 110 % says nothing; 150 % and above is an alert (720p on a 1080p canvas is exactly 150 %). */
export const QUALITY_WARNING_FACTOR = 1.1;
export const QUALITY_ALERT_FACTOR = 1.5;
// Fit geometry snaps to whole pixels, so an exact ratio can land a hair to either side.
const FACTOR_EPSILON = 1e-6;

type QualityCanvas = Pick<TimelineState, 'width' | 'height' | 'fit'>;
type QualityTimeline = QualityCanvas & Pick<TimelineState, 'items' | 'tracks'>;

const SCALE_PROPS = ['scale', 'scaleX', 'scaleY'] as const;

export function qualitySeverity(factor: number): QualitySeverity | null {
  if (!Number.isFinite(factor)) return null;
  if (factor >= QUALITY_ALERT_FACTOR - FACTOR_EPSILON) return 'alert';
  if (factor > QUALITY_WARNING_FACTOR + FACTOR_EPSILON) return 'warning';
  return null;
}

/** Video and still images lose sharpness when enlarged; audio, text, shapes and vector graphics do not. */
function sourceSize(item: TimelineItem): { width: number; height: number } | null {
  if (item.kind !== 'video' && item.kind !== 'image') return null;
  const width = item.width ?? 0;
  const height = item.height ?? 0;
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * Largest scale on each axis over the clip. Keyframes are sampled at both clip
 * edges and at every key inside it, where linear and eased segments peak
 * (a bezier overshoot between two keys is not chased).
 */
function peakScaleAxes(item: TimelineItem): { scaleX: number; scaleY: number } {
  const last = Math.max(0, item.durationInFrames - 1);
  const frames = new Set([0, last]);
  for (const prop of SCALE_PROPS) {
    for (const key of item.keyframes?.[prop] ?? []) frames.add(Math.min(last, Math.max(0, key.frame)));
  }
  const sample = (prop: typeof SCALE_PROPS[number], frame: number): number | undefined => {
    const keys = item.keyframes?.[prop];
    return keys?.length ? sampleKeyframes(keys, frame) : undefined;
  };
  let scaleX = 0;
  let scaleY = 0;
  for (const frame of frames) {
    const axes = resolveClipScaleAxes(item.transform, {
      scale: sample('scale', frame),
      scaleX: sample('scaleX', frame),
      scaleY: sample('scaleY', frame),
    });
    scaleX = Math.max(scaleX, Math.abs(axes.scaleX));
    scaleY = Math.max(scaleY, Math.abs(axes.scaleY));
  }
  return { scaleX, scaleY };
}

/**
 * Largest zoom over the clip. Reframe keys and plugin envelopes interpolate
 * linearly, so their peak sits on one of their own points; a shape curve tops
 * out at its magnification.
 */
function peakZoom(zoom: ZoomEffect | undefined, durationInFrames: number): number {
  if (!zoom) return 1;
  const last = Math.max(0, durationInFrames - 1);
  const keys = zoom.reframeCurve?.keyframes ?? [];
  const envelope = zoom.envelope ?? [];
  const frames = keys.length
    ? keys.map((key) => Math.min(last, Math.max(0, key.frame)))
    : envelope.length >= 2
      ? envelope.map((_, index) => (index * last) / (envelope.length - 1))
      : null;
  if (!frames) return Math.max(1, zoom.magnification ?? 1.5);
  return Math.max(...[0, last, ...frames].map((frame) => zoomAt(zoom, frame, durationInFrames).magnification));
}

/**
 * Effective enlargement of one picture clip at its worst moment:
 * fit (contain/cover) × peak scale × peak zoom × export scale.
 * Null when the clip is not a raster picture or its source size is unknown.
 */
export function clipUpscaleFactor(item: TimelineItem, canvas: QualityCanvas, scale = 1): number | null {
  const source = sourceSize(item);
  if (!source) return null;
  const rendered = renderedVisualFrameRect(
    { width: canvas.width, height: canvas.height },
    source,
    canvas.fit ?? 'contain',
  );
  if (!rendered.width || !rendered.height) return null;
  const axes = peakScaleAxes(item);
  const fitted = Math.max(
    (rendered.width / source.width) * axes.scaleX,
    (rendered.height / source.height) * axes.scaleY,
  );
  return fitted * peakZoom(item.zoom, item.durationInFrames) * scale;
}

/** The `upscaled_clip` issue for one clip, or null when it stays at or below 110 %. */
export function clipQualityIssue(item: TimelineItem, canvas: QualityCanvas, scale = 1): QualityIssue | null {
  const factor = clipUpscaleFactor(item, canvas, scale);
  if (factor === null) return null;
  const severity = qualitySeverity(factor);
  return severity ? { code: 'upscaled_clip', severity, itemId: item.id, factor } : null;
}

/**
 * Every quality issue of a timeline. While editing (no export resolution) clips
 * are measured against the canvas; in the export dialog the chosen preset adds
 * its scale and the `export_above_sources` check. Clips on hidden tracks are
 * skipped: they are not in the output.
 */
export function assessTimelineQuality(timeline: QualityTimeline, options: QualityOptions = {}): QualityIssue[] {
  const scale = options.exportResolution ? exportScale(timeline, options.exportResolution) : 1;
  const issues: QualityIssue[] = [];
  let largestShortSide = 0;
  for (const item of timeline.items) {
    if (timeline.tracks?.[item.track]?.hidden) continue;
    const source = sourceSize(item);
    if (!source) continue;
    largestShortSide = Math.max(largestShortSide, Math.min(source.width, source.height));
    const issue = clipQualityIssue(item, timeline, scale);
    if (issue) issues.push(issue);
  }
  if (options.exportResolution && largestShortSide > 0) {
    const factor = (Math.min(timeline.width, timeline.height) * scale) / largestShortSide;
    const severity = qualitySeverity(factor);
    if (severity) issues.push({ code: 'export_above_sources', severity, factor, sourceShortSide: largestShortSide });
  }
  return issues;
}

/** 1.8 → 180, for "Se amplía al 180 %". */
export function qualityPercent(factor: number): number {
  return Math.round(factor * 100);
}
