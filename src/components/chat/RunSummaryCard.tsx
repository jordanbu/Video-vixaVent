// End-of-run card in the chat (specs/10-chat-resumen-y-revision.md): what the run changed,
// what it exported, and the timeline review with a "Fix" button per issue.
import type { ReactNode } from 'react';
import { theme } from '../../theme';
import { tData, useT } from '../../i18n/locale';
import type { RunChangeSummary, RunClipRef, RunSummaryData } from '../../agent/runSummary';
import type { ReviewIssue, ReviewLevel } from '../../editor/timelineReview';
import { clock, issueFixPrompt, issueText, levelLabel, type Translate } from './runSummaryText';

export interface RunSummaryCardProps {
  summary: RunSummaryData;
  /** Disables "Fix" while a run is in flight. */
  running?: boolean;
  /** Select the given clips on the timeline (absent ids are skipped by the caller). */
  onSelectClips?: ((ids: string[]) => void) | null;
  /** Send the issue's fix request to the agent. */
  onFixIssue?: ((issue: ReviewIssue, prompt: string) => void) | null;
}

const MAX_CHIPS = 3;

const LEVEL_COLOR: Record<ReviewLevel, string> = {
  alert: theme.danger,
  warning: theme.gold,
  suggestion: theme.textMuted,
};

function ClipChips({ clips, onSelect, t }: { clips: RunClipRef[]; onSelect?: ((ids: string[]) => void) | null; t: Translate }) {
  if (!clips.length || !onSelect) return null;
  const shown = clips.slice(0, MAX_CHIPS);
  const rest = clips.length - shown.length;
  const chip = (key: string, label: string, ids: string[]) => (
    <button key={key} type="button" title={t('在时间线上选中')} onClick={() => onSelect(ids)}
      style={{ border: `0.5px solid ${theme.border}`, background: theme.panel, color: theme.textMuted, borderRadius: 4, padding: '1px 7px', fontSize: 11.5, cursor: 'pointer', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {label}
    </button>
  );
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginLeft: 6 }}>
      {shown.map((clip) => chip(clip.id, tData(clip.name) || clip.kind, [clip.id]))}
      {rest > 0 && chip('rest', `+${rest}`, clips.map((clip) => clip.id))}
    </span>
  );
}

function ChangeLine({ children, chips }: { children: ReactNode; chips?: ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 4, margin: '3px 0', color: theme.text }}>
      <span aria-hidden="true" style={{ color: theme.success, width: 16, flex: '0 0 auto' }}>✓</span>
      <span>{children}</span>
      {chips}
    </li>
  );
}

function ChangeList({ changes, exports, onSelect, t }: { changes: RunChangeSummary | null; exports: string[]; onSelect?: ((ids: string[]) => void) | null; t: Translate }) {
  const lines: ReactNode[] = [];
  if (changes) {
    if (changes.clipsAdded.length) lines.push(<ChangeLine key="added" chips={<ClipChips clips={changes.clipsAdded} onSelect={onSelect} t={t} />}>{t('新增片段：{n}', { n: changes.clipsAdded.length })}</ChangeLine>);
    if (changes.clipsRemoved.length) lines.push(<ChangeLine key="removed">{t('移除片段：{n}', { n: changes.clipsRemoved.length })}</ChangeLine>);
    if (changes.clipsChanged.length) lines.push(<ChangeLine key="changed" chips={<ClipChips clips={changes.clipsChanged} onSelect={onSelect} t={t} />}>{t('修改片段：{n}', { n: changes.clipsChanged.length })}</ChangeLine>);
    if (changes.clipsRecoded.length) lines.push(<ChangeLine key="recoded" chips={<ClipChips clips={changes.clipsRecoded} onSelect={onSelect} t={t} />}>{t('更新了设计的动态图形：{n}', { n: changes.clipsRecoded.length })}</ChangeLine>);
    if (changes.transitionsAdded) lines.push(<ChangeLine key="tr-add">{t('新增转场：{n}', { n: changes.transitionsAdded })}</ChangeLine>);
    if (changes.transitionsRemoved) lines.push(<ChangeLine key="tr-rm">{t('移除转场：{n}', { n: changes.transitionsRemoved })}</ChangeLine>);
    if (changes.tracksAdded) lines.push(<ChangeLine key="tracks">{t('新增轨道：{n}', { n: changes.tracksAdded })}</ChangeLine>);
    if (changes.assetsAdded.length) lines.push(<ChangeLine key="assets">{t('新增素材：{names}', { names: changes.assetsAdded.map((asset) => tData(asset.name)).join(', ') })}</ChangeLine>);
    for (const volume of changes.volumeChanges) {
      lines.push(<ChangeLine key={`vol-${volume.from}-${volume.to}`}>{t('音量 {from}% → {to}%（{n}）', { from: volume.from, to: volume.to, n: volume.count })}</ChangeLine>);
    }
    if (changes.durationFrom !== changes.durationTo) {
      lines.push(<ChangeLine key="length">{t('时长 {from} → {to}', { from: clock(changes.durationFrom, changes.fps), to: clock(changes.durationTo, changes.fps) })}</ChangeLine>);
    }
  }
  for (const name of exports) lines.push(<ChangeLine key={`export-${name}`}>{t('已导出：{name}', { name })}</ChangeLine>);
  return <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{lines}</ul>;
}

function IssueRow({ issue, fps, running, onFix, t }: { issue: ReviewIssue; fps: number; running: boolean; onFix?: RunSummaryCardProps['onFixIssue']; t: Translate }) {
  const color = LEVEL_COLOR[issue.level];
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '5px 0' }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, marginTop: 6, borderRadius: '50%', flex: '0 0 auto', background: color }} />
      <span style={{ flex: 1, minWidth: 0, color: theme.text, lineHeight: 1.45 }}>
        <span style={{ color, fontWeight: 600, marginRight: 6 }}>{levelLabel(t, issue.level)}</span>
        {issueText(t, issue, fps)}
      </span>
      {onFix && (
        <button type="button" disabled={running} title={t('把修复请求发给 Agent')}
          onClick={() => onFix(issue, issueFixPrompt(t, issue, fps))}
          style={{ flex: '0 0 auto', border: `0.5px solid ${theme.accent}`, background: 'transparent', color: theme.accent, borderRadius: 6, padding: '2px 10px', fontSize: 12, cursor: running ? 'default' : 'pointer', opacity: running ? 0.45 : 1 }}>
          {t('让 Agent 修复')}
        </button>
      )}
    </li>
  );
}

const sectionTitle = { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: theme.textDim, margin: '0 0 6px' };

export function RunSummaryCard({ summary, running = false, onSelectClips, onFixIssue }: RunSummaryCardProps) {
  const t = useT();
  const fps = summary.changes?.fps ?? 30;
  return (
    <section aria-label={t('本次改动')} style={{
      margin: '10px 0', padding: '10px 12px', border: `0.5px solid ${theme.border}`, borderRadius: 6,
      background: theme.panelAlt, fontSize: 12.5, overflowWrap: 'anywhere',
    }}>
      <h3 style={sectionTitle}>{t('本次改动')}</h3>
      <ChangeList changes={summary.changes} exports={summary.exports} onSelect={onSelectClips} t={t} />
      <div style={{ height: 0.5, background: theme.border, margin: '10px 0' }} />
      <h3 style={sectionTitle}>{t('质量检查')}</h3>
      {summary.issues.length ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {summary.issues.map((issue, index) => (
            <IssueRow key={`${issue.code}-${index}`} issue={issue} fps={fps} running={running} onFix={onFixIssue} t={t} />
          ))}
        </ul>
      ) : (
        <div style={{ color: theme.textMuted }}>
          <span aria-hidden="true" style={{ color: theme.success, marginRight: 6 }}>✓</span>{t('没有质量问题')}
        </div>
      )}
    </section>
  );
}
