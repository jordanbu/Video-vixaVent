// Texts of the end-of-run card (specs/10): issue lines and the fix requests sent to the agent.
import { tData, type useT } from '../../i18n/locale';
import type { ReviewIssue, ReviewLevel } from '../../editor/timelineReview';
import { formatFrameTime } from '../../agent/selection-refs';

export type Translate = ReturnType<typeof useT>;

/** m:ss for sequence lengths (2250 frames at 30 fps → "1:15"). */
export function clock(frames: number, fps: number): string {
  const total = Math.round(frames / Math.max(1, fps));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function levelLabel(t: Translate, level: ReviewLevel): string {
  if (level === 'alert') return t('Alert');
  if (level === 'warning') return t('Warning');
  return t('Suggestion');
}

/** Card line for an issue. */
export function issueText(t: Translate, issue: ReviewIssue, fps: number): string {
  const name = tData(issue.names[0] ?? '');
  switch (issue.code) {
    case 'upscaled_clip': return t('“{name}” is enlarged to {percent}%: it may look blurry', { name, percent: issue.percent ?? 0 });
    case 'stale_motion_graphic': return t('Graphics still on an old design: {n}', { n: issue.itemIds.length });
    case 'black_gap': return t('Black screen from {from} to {to}', { from: formatFrameTime(issue.fromFrame ?? 0, fps), to: formatFrameTime(issue.toFrame ?? 0, fps) });
    case 'audio_past_picture': return t('Audio keeps playing {seconds} s after the picture ends', { seconds: issue.seconds ?? 0 });
    case 'hard_cut_between_graphics': return t('Dry cuts between graphic plates: {n}', { n: issue.itemIds.length });
    case 'music_without_fade':
      if (issue.edge === 'both') return t('“{name}” starts and ends abruptly', { name });
      return issue.edge === 'in' ? t('“{name}” starts abruptly', { name }) : t('“{name}” ends abruptly', { name });
  }
}

/** The request "Fix" sends to the agent, in the UI language. */
export function issueFixPrompt(t: Translate, issue: ReviewIssue, fps: number): string {
  const name = tData(issue.names[0] ?? '');
  switch (issue.code) {
    case 'upscaled_clip': return t('Reduce the scale of “{name}” so it does not look blurry (it is at {percent}% now).', { name, percent: issue.percent ?? 0 });
    case 'stale_motion_graphic': return t('Update these graphics to the latest design of their asset.');
    case 'black_gap': return t('Fill the black screen from {from} to {to}.', { from: formatFrameTime(issue.fromFrame ?? 0, fps), to: formatFrameTime(issue.toFrame ?? 0, fps) });
    case 'audio_past_picture': return t('Make the audio end together with the picture.');
    case 'hard_cut_between_graphics': return t('Add transitions at these dry cuts between graphic plates.');
    case 'music_without_fade': return t('Add a fade in and a fade out to “{name}”.', { name });
  }
}
