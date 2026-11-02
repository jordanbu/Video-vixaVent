// Timeline review for the chat's end-of-run card (specs/10-chat-resumen-y-revision.md):
// quality alerts and improvement suggestions read straight from the timeline data.
// Pure — no React, no DOM, no network — so the card and its verify read the same result.
import { assessTimelineQuality, qualityPercent } from './qualityAlerts';
import { timelineItemAssetId } from './mediaAssetUsage';
import { AUDIO_ASSETS } from '../audio/library';
import type { MediaAsset, TimelineItem, TimelineState } from './types';

export type ReviewIssueCode =
  | 'upscaled_clip'
  | 'stale_motion_graphic'
  | 'black_gap'
  | 'audio_past_picture'
  | 'hard_cut_between_graphics'
  | 'music_without_fade';

/** `alert` breaks the result, `warning` probably shows, `suggestion` is a craft improvement. */
export type ReviewLevel = 'alert' | 'warning' | 'suggestion';

export interface ReviewIssue {
  code: ReviewIssueCode;
  level: ReviewLevel;
  /** Clips the issue is about (empty for a black gap). */
  itemIds: string[];
  /** Their names, in the same order, for the card text and the fix request. */
  names: string[];
  /** `upscaled_clip`: how far it is enlarged (180 = 180 %). */
  percent?: number;
  /** `black_gap`: the empty span in timeline frames, end exclusive. */
  fromFrame?: number;
  toFrame?: number;
  /** `audio_past_picture`: seconds of sound after the last picture, one decimal. */
  seconds?: number;
  /** `music_without_fade`: which edge starts or stops abruptly. */
  edge?: 'in' | 'out' | 'both';
}

type ReviewTimeline = Pick<TimelineState, 'fps' | 'width' | 'height' | 'fit' | 'items' | 'tracks' | 'transitions'>;

/** A gap or tail shorter than this is a cut, not a problem. */
export const REVIEW_MIN_GAP_SECONDS = 0.5;
/** Shorter audio clips are sound effects: they are meant to hit, not to fade. */
export const REVIEW_MUSIC_MIN_SECONDS = 5;
/** At most this many black gaps are listed one by one. */
const MAX_GAPS = 3;

const GRAPHIC_KINDS: ReadonlySet<TimelineItem['kind']> = new Set(['motion-graphic', 'image', 'text', 'solid', 'svg']);
/** Built-in background tracks: audio known to be music. */
const LIBRARY_MUSIC_SRCS: ReadonlySet<string> = new Set(AUDIO_ASSETS.filter((asset) => asset.category === 'music').map((asset) => asset.src));
const LEVEL_ORDER: Record<ReviewLevel, number> = { alert: 0, warning: 1, suggestion: 2 };

const end = (item: TimelineItem) => item.startFrame + item.durationInFrames;

function trackOf(timeline: ReviewTimeline, item: TimelineItem) {
  return timeline.tracks?.[item.track];
}

/** Picture on a track that renders: not audio, not a caption lane, not hidden. */
function isVisiblePicture(timeline: ReviewTimeline, item: TimelineItem): boolean {
  const track = trackOf(timeline, item);
  return item.kind !== 'audio' && track?.kind !== 'caption' && track?.kind !== 'audio' && !track?.hidden;
}

/** Sound that plays: an audio clip on a track that is neither hidden nor muted. */
function isAudibleAudio(timeline: ReviewTimeline, item: TimelineItem): boolean {
  const track = trackOf(timeline, item);
  return item.kind === 'audio' && !track?.hidden && !track?.muted && (item.volume ?? 1) > 0;
}

function upscaled(timeline: ReviewTimeline): ReviewIssue[] {
  const byId = new Map(timeline.items.map((item) => [item.id, item]));
  return assessTimelineQuality(timeline)
    .filter((issue) => issue.code === 'upscaled_clip' && issue.itemId)
    .map((issue) => ({
      code: 'upscaled_clip' as const,
      level: issue.severity,
      itemIds: [issue.itemId!],
      names: [byId.get(issue.itemId!)?.name ?? ''],
      percent: qualityPercent(issue.factor),
    }));
}

function staleMotionGraphics(timeline: ReviewTimeline, assets: readonly MediaAsset[]): ReviewIssue[] {
  const stale = timeline.items.filter((item) => {
    if (item.kind !== 'motion-graphic') return false;
    const assetId = timelineItemAssetId(item, assets);
    const asset = assetId ? assets.find((candidate) => candidate.id === assetId) : undefined;
    return !!asset?.code && item.code !== asset.code;
  });
  if (!stale.length) return [];
  return [{ code: 'stale_motion_graphic', level: 'warning', itemIds: stale.map((item) => item.id), names: stale.map((item) => item.name) }];
}

/** Spans with no picture at all between the first frame and the last picture. */
function blackGaps(timeline: ReviewTimeline, pictures: readonly TimelineItem[]): ReviewIssue[] {
  if (!pictures.length) return [];
  const minGap = Math.round(REVIEW_MIN_GAP_SECONDS * timeline.fps);
  const spans = pictures.map((item) => [item.startFrame, end(item)] as const).sort((a, b) => a[0] - b[0]);
  const gaps: ReviewIssue[] = [];
  let covered = 0;
  for (const [from, to] of spans) {
    if (from - covered >= minGap) {
      gaps.push({ code: 'black_gap', level: 'alert', itemIds: [], names: [], fromFrame: covered, toFrame: from });
    }
    covered = Math.max(covered, to);
  }
  return gaps.slice(0, MAX_GAPS);
}

function audioPastPicture(timeline: ReviewTimeline, pictures: readonly TimelineItem[], sounds: readonly TimelineItem[]): ReviewIssue[] {
  if (!pictures.length || !sounds.length) return [];
  const lastPicture = Math.max(...pictures.map(end));
  const late = sounds.filter((item) => end(item) - lastPicture >= REVIEW_MIN_GAP_SECONDS * timeline.fps);
  if (!late.length) return [];
  const lastSound = Math.max(...late.map(end));
  return [{
    code: 'audio_past_picture', level: 'warning',
    itemIds: late.map((item) => item.id), names: late.map((item) => item.name),
    seconds: Math.round(((lastSound - lastPicture) / timeline.fps) * 10) / 10,
  }];
}

/** Two graphic plates touching on the same track with no transition: reads as a slide deck. */
function hardCutsBetweenGraphics(timeline: ReviewTimeline, pictures: readonly TimelineItem[]): ReviewIssue[] {
  const withTransition = new Set((timeline.transitions ?? [])
    .filter((transition) => transition.enabled !== false)
    .map((transition) => `${transition.outgoingItemId}>${transition.incomingItemId}`));
  const incoming: TimelineItem[] = [];
  const byTrack = new Map<string, TimelineItem[]>();
  for (const item of pictures) byTrack.set(item.track, [...(byTrack.get(item.track) ?? []), item]);
  for (const items of byTrack.values()) {
    const sorted = [...items].sort((a, b) => a.startFrame - b.startFrame);
    for (let index = 1; index < sorted.length; index += 1) {
      const before = sorted[index - 1]!;
      const after = sorted[index]!;
      if (!GRAPHIC_KINDS.has(before.kind) || !GRAPHIC_KINDS.has(after.kind)) continue;
      if (Math.abs(after.startFrame - end(before)) > 1) continue;
      if (withTransition.has(`${before.id}>${after.id}`)) continue;
      incoming.push(after);
    }
  }
  if (!incoming.length) return [];
  return [{ code: 'hard_cut_between_graphics', level: 'suggestion', itemIds: incoming.map((item) => item.id), names: incoming.map((item) => item.name) }];
}

/**
 * Music that starts on the first frame or stops on the last one with no fade. Only audio known
 * to be music counts: a library background track, or a clip on a track marked as music that
 * ducks under speech (role `follower`). An uploaded clip says nothing about its content —
 * in the real commercial the only hit was the narration — so it is left alone (specs/10).
 */
function musicWithoutFade(timeline: ReviewTimeline, sounds: readonly TimelineItem[], timelineEnd: number): ReviewIssue[] {
  const minLength = REVIEW_MUSIC_MIN_SECONDS * timeline.fps;
  return sounds.flatMap((item): ReviewIssue[] => {
    const role = trackOf(timeline, item)?.role;
    const isMusic = role === 'follower' || (role !== 'anchor' && !!item.src && LIBRARY_MUSIC_SRCS.has(item.src));
    if (!isMusic || item.durationInFrames < minLength || item.transcript?.length) return [];
    const abruptIn = item.startFrame === 0 && !((item.fadeInFrames ?? 0) > 0);
    const abruptOut = end(item) >= timelineEnd - 1 && !((item.fadeOutFrames ?? 0) > 0);
    if (!abruptIn && !abruptOut) return [];
    const edge = abruptIn && abruptOut ? 'both' : abruptIn ? 'in' : 'out';
    return [{ code: 'music_without_fade', level: 'suggestion', itemIds: [item.id], names: [item.name], edge }];
  });
}

/** Every issue on the timeline, alerts first. */
export function reviewTimeline(timeline: ReviewTimeline, assets: readonly MediaAsset[]): ReviewIssue[] {
  const pictures = timeline.items.filter((item) => isVisiblePicture(timeline, item));
  const sounds = timeline.items.filter((item) => isAudibleAudio(timeline, item));
  // Hidden tracks render nothing, so they do not stretch the sequence the viewer sees.
  const timelineEnd = Math.max(0, ...pictures.map(end), ...sounds.map(end));
  const issues = [
    ...upscaled(timeline),
    ...staleMotionGraphics(timeline, assets),
    ...blackGaps(timeline, pictures),
    ...audioPastPicture(timeline, pictures, sounds),
    ...hardCutsBetweenGraphics(timeline, pictures),
    ...musicWithoutFade(timeline, sounds, timelineEnd),
  ];
  return issues
    .map((issue, index) => ({ issue, index }))
    .sort((a, b) => LEVEL_ORDER[a.issue.level] - LEVEL_ORDER[b.issue.level] || a.index - b.index)
    .map(({ issue }) => issue);
}
