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
  if (level === 'alert') return t('检查级别：问题');
  if (level === 'warning') return t('检查级别：注意');
  return t('检查级别：建议');
}

/** Card line for an issue. */
export function issueText(t: Translate, issue: ReviewIssue, fps: number): string {
  const name = tData(issue.names[0] ?? '');
  switch (issue.code) {
    case 'upscaled_clip': return t('「{name}」放大到 {percent}%，可能会模糊', { name, percent: issue.percent ?? 0 });
    case 'stale_motion_graphic': return t('{n} 个动态图形片段还在用旧版设计', { n: issue.itemIds.length });
    case 'black_gap': return t('{from} 到 {to} 画面是黑的', { from: formatFrameTime(issue.fromFrame ?? 0, fps), to: formatFrameTime(issue.toFrame ?? 0, fps) });
    case 'audio_past_picture': return t('画面结束后，音频还持续 {seconds} 秒', { seconds: issue.seconds ?? 0 });
    case 'hard_cut_between_graphics': return t('图形之间的硬切：{n}', { n: issue.itemIds.length });
    case 'music_without_fade':
      if (issue.edge === 'both') return t('「{name}」开头和结尾都太突然', { name });
      return issue.edge === 'in' ? t('「{name}」开头太突然', { name }) : t('「{name}」结尾太突然', { name });
  }
}

/** The request "Fix" sends to the agent, in the UI language. */
export function issueFixPrompt(t: Translate, issue: ReviewIssue, fps: number): string {
  const name = tData(issue.names[0] ?? '');
  switch (issue.code) {
    case 'upscaled_clip': return t('降低「{name}」的放大比例，避免模糊（现在是 {percent}%）。', { name, percent: issue.percent ?? 0 });
    case 'stale_motion_graphic': return t('把这些动态图形片段更新到素材的最新设计。');
    case 'black_gap': return t('填补 {from} 到 {to} 之间的黑屏。', { from: formatFrameTime(issue.fromFrame ?? 0, fps), to: formatFrameTime(issue.toFrame ?? 0, fps) });
    case 'audio_past_picture': return t('让音频和画面同时结束。');
    case 'hard_cut_between_graphics': return t('在这些图形之间的硬切处加上转场。');
    case 'music_without_fade': return t('给「{name}」加上淡入和淡出。', { name });
  }
}
