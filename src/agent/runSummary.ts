// What an agent run changed, and the review of where it left the timeline
// (specs/10-chat-resumen-y-revision.md). Pure: built from two project documents and the
// run's tool messages, so it covers every tool without knowing what each one does.
import { activeTimeline, type MediaAsset, type ProjectDoc, type Timeline, type TimelineItem } from '../editor/types';
import { reviewTimeline, type ReviewIssue } from '../editor/timelineReview';
import type { DisplayMessage } from './agent-session';

export interface RunClipRef {
  id: string;
  kind: TimelineItem['kind'];
  name: string;
}

export interface RunVolumeChange {
  /** Percent before and after (100 = unchanged gain). */
  from: number;
  to: number;
  count: number;
}

export interface RunChangeSummary {
  clipsAdded: RunClipRef[];
  clipsRemoved: RunClipRef[];
  /** Moved, trimmed, retimed, new props or effects… anything but a volume-only or code-only change. */
  clipsChanged: RunClipRef[];
  /** Motion-graphic clips that received new code (a redesign of their asset). */
  clipsRecoded: RunClipRef[];
  transitionsAdded: number;
  transitionsRemoved: number;
  tracksAdded: number;
  assetsAdded: { id: string; kind: MediaAsset['kind']; name: string }[];
  volumeChanges: RunVolumeChange[];
  /** Sequence length in frames before and after. */
  durationFrom: number;
  durationTo: number;
  fps: number;
}

export interface RunSummaryData {
  /** Null when the run only exported. */
  changes: RunChangeSummary | null;
  issues: ReviewIssue[];
  /** File names the run exported. */
  exports: string[];
  /** The sequence the card talks about. */
  timelineId?: string;
}

const ref = (item: TimelineItem): RunClipRef => ({ id: item.id, kind: item.kind, name: item.name });
const lengthOf = (items: readonly TimelineItem[]) => Math.max(0, ...items.map((item) => item.startFrame + item.durationInFrames));
const percent = (volume: number | null | undefined) => Math.round((volume ?? 1) * 100);

/** JSON with sorted keys, so two equal clips compare equal whatever their key order. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

function withoutVolumeAndCode(item: TimelineItem): Partial<TimelineItem> {
  const { volume: _volume, code: _code, ...rest } = item;
  return rest;
}

function volumeChanges(pairs: ReadonlyArray<readonly [TimelineItem, TimelineItem]>): RunVolumeChange[] {
  const groups = new Map<string, RunVolumeChange>();
  for (const [before, after] of pairs) {
    const from = percent(before.volume);
    const to = percent(after.volume);
    if (from === to) continue;
    const key = `${from}>${to}`;
    const group = groups.get(key) ?? { from, to, count: 0 };
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()];
}

function timelineIn(doc: ProjectDoc, id: string): Timeline | undefined {
  return doc.timelines.find((timeline) => timeline.id === id);
}

/** What changed in the active sequence and the media pool; null when nothing did. */
export function summarizeProjectChange(before: ProjectDoc, after: ProjectDoc): RunChangeSummary | null {
  const now = activeTimeline(after);
  if (!now) return null;
  const then = timelineIn(before, now.id);
  const beforeItems = new Map((then?.items ?? []).map((item) => [item.id, item]));
  const afterIds = new Set(now.items.map((item) => item.id));

  const clipsAdded = now.items.filter((item) => !beforeItems.has(item.id)).map(ref);
  const clipsRemoved = (then?.items ?? []).filter((item) => !afterIds.has(item.id)).map(ref);
  const kept = now.items
    .filter((item) => beforeItems.has(item.id))
    .map((item) => [beforeItems.get(item.id)!, item] as const)
    .filter(([old, current]) => old !== current);
  const clipsChanged = kept
    .filter(([old, current]) => stableJson(withoutVolumeAndCode(old)) !== stableJson(withoutVolumeAndCode(current)))
    .map(([, current]) => ref(current));
  const clipsRecoded = kept.filter(([old, current]) => current.kind === 'motion-graphic' && old.code !== current.code).map(([, current]) => ref(current));

  const beforeTransitions = new Set((then?.transitions ?? []).map((transition) => transition.id));
  const afterTransitions = new Set((now.transitions ?? []).map((transition) => transition.id));
  const transitionsAdded = [...afterTransitions].filter((id) => !beforeTransitions.has(id)).length;
  const transitionsRemoved = [...beforeTransitions].filter((id) => !afterTransitions.has(id)).length;
  const beforeTracks = new Set(Object.keys(then?.tracks ?? {}));
  const tracksAdded = then ? Object.keys(now.tracks ?? {}).filter((id) => !beforeTracks.has(id)).length : 0;

  const beforeAssets = new Set(before.assets.map((asset) => asset.id));
  const assetsAdded = after.assets
    .filter((asset) => !beforeAssets.has(asset.id))
    .map((asset) => ({ id: asset.id, kind: asset.kind, name: asset.name }));

  const summary: RunChangeSummary = {
    clipsAdded, clipsRemoved, clipsChanged, clipsRecoded,
    transitionsAdded, transitionsRemoved, tracksAdded, assetsAdded,
    volumeChanges: volumeChanges(kept),
    durationFrom: lengthOf(then?.items ?? []),
    durationTo: lengthOf(now.items),
    fps: now.fps,
  };
  const changed = clipsAdded.length + clipsRemoved.length + clipsChanged.length + clipsRecoded.length
    + transitionsAdded + transitionsRemoved + tracksAdded + assetsAdded.length + summary.volumeChanges.length > 0;
  return changed ? summary : null;
}

/** Messages of the latest turn: everything after the last user message. */
function latestTurn(messages: readonly DisplayMessage[]): readonly DisplayMessage[] {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]!.role === 'user') return messages.slice(index + 1);
  }
  return messages;
}

/** File names of the successful `submit_export` calls of the latest turn. */
export function runExports(messages: readonly DisplayMessage[]): string[] {
  return latestTurn(messages).flatMap((message) => {
    if (message.role !== 'tool' || message.tool?.name !== 'submit_export') return [];
    const result = message.tool.result as { ok?: unknown; name?: unknown } | null | undefined;
    return result && result.ok === true && typeof result.name === 'string' && result.name ? [result.name] : [];
  });
}

/** The card for a finished run, or null when it neither changed the project nor exported. */
export function buildRunSummary(before: ProjectDoc, after: ProjectDoc, exports: readonly string[]): RunSummaryData | null {
  const changes = summarizeProjectChange(before, after);
  if (!changes && !exports.length) return null;
  const timeline = activeTimeline(after);
  return {
    changes,
    issues: timeline ? reviewTimeline(timeline, after.assets) : [],
    exports: [...exports],
    ...(timeline ? { timelineId: timeline.id } : {}),
  };
}

/** Append the run's card to the chat, once per turn. */
export function appendRunSummary(messages: DisplayMessage[], before: ProjectDoc, after: ProjectDoc): DisplayMessage[] {
  if (latestTurn(messages).some((message) => message.role === 'summary')) return messages;
  const summary = buildRunSummary(before, after, runExports(messages));
  return summary ? [...messages, { role: 'summary', text: '', summary }] : messages;
}
