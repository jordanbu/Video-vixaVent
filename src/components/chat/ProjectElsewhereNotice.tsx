import type { ExternalProposalController } from '../../agent/useExternalAgentBridge';
import { useT } from '../../i18n/locale';
import { theme, themeAlpha } from '../../theme';
import { Icon } from '../icons';

const noticeStyle = {
  position: 'fixed',
  top: 49,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 180,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: 'max-content',
  maxWidth: 'min(560px, calc(100vw - 36px))',
  padding: '9px 10px 9px 12px',
  border: `0.5px solid ${theme.border}`,
  borderRadius: 5,
  background: theme.panel,
  color: theme.text,
  boxShadow: `0 10px 28px ${themeAlpha.shadow(0.3)}`,
  fontSize: 12.5,
  lineHeight: 1.45,
} as const;

const actionStyle = {
  flex: '0 0 auto',
  padding: '5px 10px',
  border: `0.5px solid ${theme.accent}`,
  borderRadius: 4,
  background: 'none',
  color: theme.text,
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
} as const;

/** Non-blocking notice for a tab whose project is being edited in another tab or
 * browser (spec 07). Shown whether the chat panel is open or collapsed. */
export function ProjectElsewhereNotice({ external }: { external: ExternalProposalController }) {
  const t = useT();
  const notice = external.ownershipNotice;
  if (!notice) return null;
  const reload = notice === 'reload-required';
  return (
    <div role="status" aria-live="polite" style={noticeStyle} data-vx-project-elsewhere={notice}>
      <span style={{ color: theme.textDim, lineHeight: 0 }}><Icon name="info" size={14} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {reload
          ? t('工程已在另一个标签页中更改。重新加载此页面即可在这里继续。')
          : t('此工程已在另一个标签页中打开。智能体的修改会应用在那里。')}
      </span>
      <button
        type="button"
        style={actionStyle}
        onClick={reload ? () => window.location.reload() : external.takeOwnership}
      >
        {reload ? t('重新加载') : t('在此标签页中使用')}
      </button>
    </div>
  );
}
