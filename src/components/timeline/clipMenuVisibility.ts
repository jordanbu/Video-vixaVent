// Which clip context-menu entries exist for a clip (specs/09).
//
// An entry that can never apply to this kind of clip is hidden instead of greyed out:
// "Speed" on a motion graphic or "Paste effects" on an audio clip only made the menu
// longer. An entry that applies but is missing something right now (split with the
// playhead outside the clip, paste with nothing copied, multicam with one clip selected,
// relink on a locked track) stays visible and disabled, so the user learns it exists.
import type { TimelineItem } from '../../editor/types';
import { canMulticamItem } from '../../multicam/sync';

export interface ClipMenuVisibility {
  /** AI multicam sync: video/audio with media, or a clip already in a multicam group. */
  readonly multicam: boolean;
  /** Link the selected audio and video: video/audio clips, or a clip already linked. */
  readonly linkAudioVideo: boolean;
  /** Copy / paste effects: visual clips. */
  readonly effects: boolean;
  /** Speed: clips with a playback rate. */
  readonly speed: boolean;
  /** Relink file: clips that point at a media file. */
  readonly relink: boolean;
  /** Export MG animation: DOM-rendered clips. */
  readonly exportMg: boolean;
  /** Convert to video: visual clips. */
  readonly convertToVideo: boolean;
}

const RELINKABLE: ReadonlySet<TimelineItem['kind']> = new Set(['video', 'audio', 'image', 'gif', 'svg']);

export function clipMenuVisibility(
  item: TimelineItem,
  state: { readonly inMulticamGroup: boolean; readonly linked: boolean },
): ClipMenuVisibility {
  const audioVideo = item.kind === 'video' || item.kind === 'audio';
  const visual = item.kind !== 'audio';
  return {
    multicam: canMulticamItem(item) || state.inMulticamGroup,
    linkAudioVideo: audioVideo || state.linked,
    effects: visual,
    speed: audioVideo || item.kind === 'sequence',
    relink: RELINKABLE.has(item.kind) && !!item.src,
    exportMg: item.kind === 'motion-graphic' || item.kind === 'text',
    convertToVideo: visual,
  };
}
