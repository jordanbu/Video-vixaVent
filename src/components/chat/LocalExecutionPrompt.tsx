import { useEffect, useSyncExternalStore } from 'react';
import {
  answerLocalExecutionPrompt,
  attachLocalExecutionUi,
  currentLocalExecutionPrompt,
  subscribeLocalExecutionPrompts,
} from '../../agent/local-execution-prompts';
import { useT } from '../../i18n/locale';
import { theme, themeAlpha } from '../../theme';
import { Icon } from '../icons';

const cardStyle = {
  position: 'fixed',
  top: 49,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 190,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: 'min(520px, calc(100vw - 36px))',
  padding: '12px 14px',
  border: `0.5px solid ${theme.accent}`,
  borderRadius: 6,
  background: theme.panel,
  color: theme.text,
  boxShadow: `0 12px 32px ${themeAlpha.shadow(0.35)}`,
  fontSize: 12.5,
  lineHeight: 1.45,
  boxSizing: 'border-box',
} as const;

const codeStyle = {
  margin: 0,
  padding: '7px 9px',
  maxHeight: 140,
  overflow: 'auto',
  border: `0.5px solid ${theme.border}`,
  borderRadius: 4,
  background: theme.panelAlt,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
} as const;

const buttonStyle = {
  padding: '5px 10px',
  border: `0.5px solid ${theme.border}`,
  borderRadius: 4,
  background: 'none',
  color: theme.text,
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
} as const;

/**
 * Card asking whether the agent may run skill code on this machine (spec 08). Mounted
 * next to the chat panel, open or collapsed; while it is mounted, local-execution
 * requests wait for it instead of a native confirm.
 */
export function LocalExecutionPrompt() {
  const t = useT();
  useEffect(() => attachLocalExecutionUi(), []);
  const request = useSyncExternalStore(subscribeLocalExecutionPrompts, currentLocalExecutionPrompt, currentLocalExecutionPrompt);
  if (!request) return null;
  const script = request.tool === 'run_skill_script';
  const answer = (decision: 'allow' | 'allow-skill-session' | 'deny') => answerLocalExecutionPrompt(request.id, decision);
  return (
    <div
      role="alertdialog"
      aria-labelledby={`${request.id}-title`}
      style={cardStyle}
      data-vx-local-execution={request.tool}
      onKeyDown={(event) => { if (event.key === 'Escape') answer('deny'); }}
    >
      <div id={`${request.id}-title`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
        <span style={{ color: theme.accent, lineHeight: 0 }}><Icon name="info" size={14} /></span>
        {t('智能体想在这台电脑上运行代码')}
      </div>
      <div style={{ color: theme.textDim }}>
        {script ? t('技能「{skill}」的命令：', { skill: request.skill ?? '' }) : t('从 GitHub 安装技能：')}
      </div>
      <pre style={codeStyle}>{script ? request.command : request.repo}</pre>
      <div style={{ color: theme.textDim }}>
        {script
          ? t('只有信任这个技能时才允许。')
          : t('安装后，它的脚本可以在这台电脑上运行。只有信任来源时才允许。')}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }}>
        <button type="button" style={buttonStyle} autoFocus onClick={() => answer('deny')}>
          {t('不允许')}
        </button>
        {script && (
          <button type="button" style={buttonStyle} onClick={() => answer('allow-skill-session')}>
            {t('本次会话中始终允许这个技能')}
          </button>
        )}
        <button type="button" style={{ ...buttonStyle, borderColor: theme.accent }} onClick={() => answer('allow')}>
          {t('允许')}
        </button>
      </div>
    </div>
  );
}
